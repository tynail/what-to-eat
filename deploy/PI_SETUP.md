# Raspberry Pi production setup

This guide installs a production release on a Raspberry Pi 5. The development database stays on your workstation. Production creates a new database and administrator.

The Pi needs 64-bit Linux, working SSH, internet access, a domain managed by Cloudflare, and a Tailscale account. You need administrator access to the GitHub repository. Cloudflare and Tailscale have free personal plans. Domain registration and electricity are separate costs.

The app is available to the internet through Cloudflare after you publish its route. Tailscale is used separately for private SSH and optional GitHub deployments.

## 1. Prepare the Pi

1. Connect using your existing SSH account. Keep this session open while testing any firewall changes.
2. Run `uname -m`. The output must be `aarch64`. Check available storage with `df -h` and confirm the time with `timedatectl`.
3. Update Linux packages using your distribution's normal update commands. Install Docker Engine and the Compose plugin using the [official Docker instructions](https://docs.docker.com/engine/install/). For Raspberry Pi OS, follow the instructions that match your installed distribution.
4. Verify `sudo docker version` and `sudo docker compose version`. Enable Docker to start at boot: `sudo systemctl enable --now docker`.
5. Install `curl`, `sudo`, and `util-linux` using your distribution package manager. The deployment helper uses `flock` from `util-linux`.
6. Install Tailscale on the Pi and your Windows workstation using the [official installation instructions](https://tailscale.com/download). Create a personal tailnet and sign in on both devices. Enable MFA with your identity provider.
7. On the Pi, run `sudo tailscale up`. Complete the sign-in link yourself. Name the device `weekly-table-prod` in the Tailscale admin console. Enable MagicDNS.
8. From the workstation, verify `tailscale ping weekly-table-prod` and SSH to the Pi using its Tailscale name. Keep your existing SSH path until this works. Do not forward SSH or app ports on your router.

## 2. Configure the Cloudflare account

1. Buy a domain if needed. Sign in to Cloudflare and enable MFA. Add your domain to a Free plan.
2. Review imported DNS records, especially mail records. At your registrar, replace the authoritative nameservers with the pair shown by Cloudflare. Wait for the zone to become active.
3. Open Cloudflare **Networking > Tunnels** or the Tunnels page in the Cloudflare dashboard. Create a remotely managed Cloudflared tunnel named `weekly-table-prod`. Choose Docker as the connector type.
4. Keep the tunnel token private. Do not paste it into chat, source control, shell history, or GitHub logs. You will enter it directly into a protected file on the Pi in section 4.
5. Wait to publish the application route until the first admin is created in section 5. Publishing a route makes the hostname reachable from the internet.

## 3. Build a release and transfer its deployment bundle

1. Review and merge the deployment changes into `main`. The release workflow reads commits reachable from `main`. Changes that exist only in your local working tree are not released.
2. In GitHub, open **Actions > Release to Raspberry Pi > Run workflow**. Choose branch `main`, enter the commit or `main` for `ref`, and leave `deploy` unchecked.
3. Wait for verification and the ARM64 image build to succeed. Copy the image digest and revision SHA from the workflow summary. The image has the form `ghcr.io/tynail/what-to-eat@sha256:...`.
4. Download the workflow artifact `weekly-table-deployment-<SHA>`. GitHub downloads an outer ZIP containing `weekly-table-deployment.tar.gz`. Extract the ZIP on the workstation.
5. Copy the tarball to your Pi administrator account over Tailscale, for example from PowerShell: `scp .\weekly-table-deployment.tar.gz <pi-admin>@weekly-table-prod:~/`.
6. On the Pi, extract it into an empty directory and inspect its contents:

   ```sh
   mkdir -p ~/weekly-table-bundle
   tar -xzf ~/weekly-table-deployment.tar.gz -C ~/weekly-table-bundle
   ls -la ~/weekly-table-bundle
   ```

7. Install the reviewed files. Repeat this administrator step when a release changes deployment infrastructure; the CI deploy account cannot replace them.

   ```sh
   sudo install -d -m 0755 /opt/weekly-table
   sudo install -m 0644 ~/weekly-table-bundle/compose.yaml ~/weekly-table-bundle/nginx.conf ~/weekly-table-bundle/backup.py /opt/weekly-table/
   sudo install -m 0755 ~/weekly-table-bundle/deploy.sh ~/weekly-table-bundle/deploy-ssh.sh ~/weekly-table-bundle/nightly-backup.sh /opt/weekly-table/
   sudo install -d -m 0700 /opt/weekly-table/secrets
   sudo install -d -o 1654 -g 1654 -m 0700 /opt/weekly-table/backups
   sudo install -m 0644 ~/weekly-table-bundle/weekly-table-backup.service ~/weekly-table-bundle/weekly-table-backup.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

8. Create a GitHub classic personal access token for a dedicated account that can read this private package. Give it `read:packages` only. On the Pi, run `sudo docker login ghcr.io -u <github-user> --password-stdin`, paste the token at the prompt, and press Enter followed by Ctrl+D. Docker stores the credential under root's Docker configuration. Revoke and replace it if exposed. If the package is public, skip login.

## 4. Set Pi configuration and tunnel token

Replace the example hostname, image digest, and commit SHA below with your actual values. Use the single-level hostname `meals.<your-domain>`.

1. Create `/opt/weekly-table/settings.env` as root, containing exactly `DOMAIN=meals.<your-domain>`. Restrict it with `sudo chmod 600 /opt/weekly-table/settings.env`.
2. Create `/opt/weekly-table/image.env` as root, containing `APP_IMAGE=ghcr.io/tynail/what-to-eat@sha256:<your-digest>`. Restrict it with `sudo chmod 600 /opt/weekly-table/image.env`.
3. Enter the tunnel token without placing it in shell history:

   ```sh
   sudo sh -c 'umask 077; cat > /opt/weekly-table/secrets/tunnel_token'
   ```

   Paste the token, press Enter, then Ctrl+D. The parent directory is root-only. Make the file readable inside the connector container with `sudo chmod 444 /opt/weekly-table/secrets/tunnel_token`.

4. Check for subnet conflicts with `ip route`. The production Compose network uses `172.30.43.0/24`. If it conflicts, change the network subnet, all three static addresses, `ProxyAddress`, and `set_real_ip_from` consistently in the installed Compose and nginx files before continuing.
5. Check configuration and pull the images:

   ```sh
   cd /opt/weekly-table
   sudo docker compose --env-file settings.env --env-file image.env config --quiet
   sudo docker compose --env-file settings.env --env-file image.env pull app proxy tunnel
   ```

## 5. Create production admin and publish the app

1. Create the first admin before publishing the route. The password requires at least 12 characters, uppercase, lowercase, digit, and symbol. Run the following in Bash and type the credentials when prompted:

   ```sh
   cd /opt/weekly-table
   read -r -p 'Admin username: ' BOOTSTRAP_USERNAME
   read -r -s -p 'Admin password: ' BOOTSTRAP_PASSWORD; echo
   export BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
   sudo --preserve-env=BOOTSTRAP_USERNAME,BOOTSTRAP_PASSWORD docker compose --env-file settings.env --env-file image.env run --rm -e BOOTSTRAP_USERNAME -e BOOTSTRAP_PASSWORD app bootstrap-admin
   unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
   ```

2. Start the app and proxy, then request a CSRF token to initialize the persistent Identity keys. Replace the hostname in the command:

   ```sh
   sudo docker compose --env-file settings.env --env-file image.env up -d app proxy
   sudo docker compose --env-file settings.env --env-file image.env exec -T proxy wget -qO- --header='Host: meals.<your-domain>' http://127.0.0.1:8080/api/auth/csrf
   ```

   If startup takes a few seconds, retry the second command. A JSON token response confirms the path works. Do not share that token.

3. Start the connector: `sudo docker compose --env-file settings.env --env-file image.env up -d tunnel`. Confirm its status is Healthy in Cloudflare.
4. In Cloudflare, open the tunnel, select **Routes > Add route > Published application**, then choose subdomain `meals` and your domain. Set the service URL to `http://proxy:8080`. Save the route. Cloudflare creates the DNS record.
5. In Cloudflare, enable **Always Use HTTPS** and create a Cache Rule matching the hostname with **Bypass cache**. Confirm the edge certificate is active.
6. From a device outside your home network, open `https://meals.<your-domain>/health`, then the app. Sign in and verify recipes and saved plans. The production database starts empty.
7. Test an initial backup using `sudo docker compose --env-file settings.env --env-file image.env --profile tools run --rm backup`. Confirm the output says `Backup ready`.
8. Enable nightly backups with `sudo systemctl enable --now weekly-table-backup.timer`. Check the next run with `systemctl list-timers weekly-table-backup.timer`.

## 6. Configure private GitHub deployment

The manual deployment path works without this section. Complete it only if you want the workflow's `deploy` checkbox to deploy to the Pi.

1. In the Tailscale admin console, create tags `tag:weekly-table-prod` and `tag:weekly-table-ci`. Only administrators may assign them. Tag the Pi with the production tag. Assign explicit grants: your administrator identity may reach the Pi on TCP 22; the CI tag may reach only the production tag on TCP 22. Replace any default allow-all rule and add policy tests. Preserve administrator access to any other existing tailnet devices as needed.
2. Configure your Pi firewall to allow SSH on `tailscale0`. Confirm the new private SSH path in a second session before removing any existing firewall access. Do not expose port 22 on the router.
3. Create a separate deploy account and a root-owned home directory:

   ```sh
   sudo useradd --create-home --shell /bin/bash weekly-table-deploy
   sudo passwd -l weekly-table-deploy
   sudo chown root:root /home/weekly-table-deploy
   sudo chmod 755 /home/weekly-table-deploy
   sudo install -d -o root -g root -m 0755 /home/weekly-table-deploy/.ssh
   ```

4. On a trusted workstation, generate an Ed25519 key specifically for CI using `ssh-keygen -t ed25519 -f weekly-table-ci`. Store its private key securely. Do not paste it into chat.
5. Add the public key as one line in `/home/weekly-table-deploy/.ssh/authorized_keys`, owned by root and mode `0644`. Prefix the public key with `restrict,command="/opt/weekly-table/deploy-ssh.sh" `, including the space before `ssh-ed25519`. This account is forced to the deployment entrypoint and cannot get an interactive shell through that key.
6. Use `sudo visudo -f /etc/sudoers.d/weekly-table-deploy` and add this exact line:

   ```text
   weekly-table-deploy ALL=(root) NOPASSWD: /opt/weekly-table/deploy.sh *
   ```

   The account must not belong to the Docker group or have other sudo privileges. The forced-command script validates input before invoking the helper.

7. From a trusted Pi administrator session, run `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. On the workstation, run `ssh-keyscan -t ed25519 weekly-table-prod > weekly-table-known-hosts`, then `ssh-keygen -lf weekly-table-known-hosts`. Compare the fingerprints through your trusted connection. Use this verified known-hosts line for GitHub, not an unchecked scan.
8. Before merging, create the GitHub environment in repository **Settings > Environments > New environment**. Name it `production` and restrict it to the `main` branch. This setting requires no secrets. Later, add environment secrets `PI_DEPLOY_SSH_KEY`, `PI_SSH_KNOWN_HOSTS`, `TS_OAUTH_CLIENT_ID`, and `TS_AUDIENCE`. Add environment variable `PI_TAILSCALE_HOST` with the Pi's MagicDNS name.
9. In Tailscale's **Settings > Trust credentials**, create a federated identity for GitHub Actions. Set issuer `https://token.actions.githubusercontent.com`, audience to the value generated by Tailscale, and `auth_keys` scope only for `tag:weekly-table-ci`. Restrict the subject to `repo:tynail/what-to-eat:environment:production` and restrict the repository and release workflow claims to this repository and `.github/workflows/release.yml` on `main`. Copy the client ID and audience into their GitHub environment secrets.
10. Start the release workflow from `main` with `deploy` checked. The workflow creates an ephemeral Tailscale node, connects through the restricted SSH key, and removes the node when done. Verify the image, backup, and health checks in its output. Verify CI cannot SSH interactively or access other tailnet devices.

## 7. Routine operations and recovery

- Deploy manually: copy the workflow summary's `sudo /opt/weekly-table/deploy.sh <image-digest> <commit-SHA>` command into an administrator SSH session.
- View status: `cd /opt/weekly-table && sudo docker compose --env-file settings.env --env-file image.env ps`. Use the same prefix with `logs app`, `logs proxy`, or `logs tunnel`.
- The systemd timer runs `/opt/weekly-table/nightly-backup.sh` daily. It retains 14 days of backup directories and keeps the latest rollback backup. Review `journalctl -u weekly-table-backup.service` and free disk space regularly.
- Copy backups and the matching image digest to encrypted storage outside the Pi. Backups contain private household data and Identity keys. Test restoration separately.
- On a failed deployment, inspect `rollback-backup`, `last-successful-release`, and logs. Do not start an old image against a migrated database. Stop the app, restore the matching backup into a fresh volume, configure Compose to use that volume, and start the matching image. The original volume must remain untouched until recovery succeeds. See the repository's main README for the existing detailed volume restore procedure.
- Rotate the tunnel token in Cloudflare, replace the protected Pi file, recreate the tunnel container, and confirm Healthy status and HTTPS access. Rotate GitHub package and SSH credentials when required.

The full production test requires a real Pi, Cloudflare hostname, Tailscale policy, and GitHub package. A local Compose configuration check cannot prove that external traffic, forwarding headers, or release recovery works.
