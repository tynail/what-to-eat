# Weekly Table

A responsive, invite-only meal planner for one household. React 19 + TypeScript, ASP.NET Core 10 Identity, EF Core, and SQLite. Meals combine recipes; weekly plans keep independent, versioned recipe snapshots for future grocery integrations.

## Architecture

The backend is a modular monolith. `Modules/Access` owns identity, members, and invitation/reset links. `Modules/Catalog` owns recipes and meals. `Modules/Planning` owns weekly-plan persistence and selection. `Program.cs` remains the HTTP/hosting composition root, and `AppDb` remains the persistence boundary. Modules use the shared scoped EF Core context for this single-process SQLite application, but planning consumes catalog snapshots rather than writing catalog state.

The frontend keeps HTTP and shared contracts under `client/src/shared/api`. Feature code must keep server state in React Query and unsaved form or planner state local to its screen. No module adds a repository layer or interface without a real alternate implementation.

## Run locally

Install .NET 10 SDK and Node 24. From the repository root:

```powershell
dotnet restore server --configfile NuGet.Config
npm ci --prefix client
```

Bootstrap the first admin once. Enter a username and a password of at least 12 characters containing uppercase, lowercase, a digit, and a symbol. Avoid putting passwords in shell command history:

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:BOOTSTRAP_USERNAME = Read-Host 'Admin username'
$secret = Read-Host 'Admin password' -AsSecureString
$env:BOOTSTRAP_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
dotnet run --project server --no-launch-profile -- bootstrap-admin
Remove-Item Env:BOOTSTRAP_PASSWORD
Remove-Item Env:BOOTSTRAP_USERNAME
dotnet run --project server --no-launch-profile --urls http://127.0.0.1:5080
```

In another terminal: `npm run dev --prefix client`, then open http://127.0.0.1:5173. Vite proxies `/api` to the backend. Development permits HTTP cookies; production requires HTTPS. Never expose Development mode publicly.

For the production frontend served locally by ASP.NET, run `npm run build --prefix client`, copy `client/dist/*` into `server/wwwroot`, and open http://127.0.0.1:5080 instead.

If Windows sandboxing blocks the inherited NuGet user configuration, set `APPDATA` to a writable workspace directory and `NUGET_PACKAGES` to `.local/packages` for all .NET commands. These directories are ignored by Git.

## Use the app

1. Add recipes: base servings, ingredients with quantities/units, ordered cooking steps. Choose `unspecified` for ingredients such as salt to taste; quantity can then be blank.
2. Add meals containing one or more recipes. Target servings determine ingredient scaling.
3. Choose a week and meal count. Exclude unwanted meals, generate a preview, reroll individual entries, or replace them manually. Selection is uniform without replacement. Prior weeks may repeat. Insufficient candidates produce an error without altering the selection.
4. Save the week. Replacing an existing week requires confirmation. Historical ingredients and instructions survive edits or deletions in the library.
5. Admins use Settings to create invitation links, issue password reset links, or disable members. Links contain secrets in URL fragments, expire, work once, and are stored hashed. Send them privately. No email provider is required.

Weeks start Monday using a date-only value. Maximum 50 distinct meals per week. Recipes allow 100 ingredients and 100 steps; meals allow 30 distinct recipes. Serving counts must be positive, at most 1000. Ingredients accept count, g/kg, oz/lb, ml/l, tsp/tbsp/cup, or unspecified. Quantities are decimals; display rounds to three decimals while snapshots retain precision. No automatic unit conversion or nutritional/dietary interpretation occurs.

## Deploy on a private server

Requires Docker Compose, a domain pointing to the server, inbound ports 80/443, and persistent local disk. SQLite is intended for one application instance; do not scale replicas or place the DB on a network filesystem.

```sh
cp .env.example .env
# Set DOMAIN to your actual hostname (no scheme/path).
docker compose build
# Create the first admin before starting the long-running app.
read -r -p 'Admin username: ' BOOTSTRAP_USERNAME
read -r -s -p 'Admin password: ' BOOTSTRAP_PASSWORD; echo
export BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
docker compose run --rm -e BOOTSTRAP_USERNAME -e BOOTSTRAP_PASSWORD app bootstrap-admin
unset BOOTSTRAP_USERNAME BOOTSTRAP_PASSWORD
docker compose up -d
```

Caddy obtains/renews TLS certificates. Only Caddy publishes ports. The application trusts forwarded headers solely from the configured Caddy address. If subnet `172.30.42.0/24` conflicts with your server network, change the subnet, both static addresses, and `ProxyAddress` together. Restrict server/network access using your normal firewall or VPN policy.

The app runs as an unprivileged user with dropped capabilities. `kitchen-data` contains the SQLite database and persistent Identity data-protection keys. Keep that volume across redeployments. Caddy certificate volumes must also persist. Do not use `docker compose down -v` unless intentionally destroying all data.

Migrations run before request serving. For upgrades, back up first, then `docker compose build`, stop the app, and `docker compose up -d`. Review migration changes before deployment. Rollback to an older schema requires restoring its matching backup and application image, not merely running the old image against a newer database.

Health: `GET /health` returns minimal process readiness after migrations. Monitor HTTPS reachability, app/container restarts, disk space, backup success, and `/health`. It is not a continuous database integrity probe. Do not enable request-body logging or sensitive EF logging. Logs exclude passwords and issued link values.

## Back up and restore

Online SQLite backups use Python's backup API so WAL transactions are included consistently:

```sh
mkdir -p backups
sudo chown 1654:1654 backups
chmod 700 backups
docker compose --profile tools run --rm backup
```

Each backup directory contains `meals.db` and `keys/`; the script checks database integrity. Copy backups to protected off-server storage and encrypt them at rest. Schedule this command through your server's existing scheduler; choose retention appropriate to your household. Backup failure exits nonzero. Restrict database, key, and backup permissions to the service/admin account; these files contain private household data and authentication material.

Restore into a **new empty volume**, leaving the original volume intact for recovery:

1. Stop app: `docker compose stop app`.
2. Create a new named Docker volume. Copy the chosen backup's `meals.db` and `keys/` into its root using a temporary container; set ownership to UID/GID `1654:1654`. Do not copy stale `-wal` or `-shm` files from another database.
3. Configure the `kitchen-data` volume with `external: true` and `name: YOUR_NEW_VOLUME` in a local Compose override. Run the application image matching that backup, then apply later upgrades deliberately.
4. Start app, verify login, recipes, and saved weeks. Retain the original volume until recovery is confirmed.

For local backup verification, set `DATA_DIRECTORY` and `BACKUP_DIRECTORY`, then run `python scripts/backup.py`. Restore the resulting directory under a separate `DataDirectory` and start the app against it.

## Formatting

Install the pinned client tools with `npm ci --prefix client`. From the repository root, run:

```powershell
npm run format
npm run format:check
```

Both commands cover the entire repository, including the React client, browser tests, HTML, CSS, JSON configuration, Markdown documentation, and YAML workflows. Run them from the client directory with `npm run format` or `npm run format:check` as well. Prettier configuration lives in `.prettierrc.json`; `.prettierignore` excludes generated lockfiles, installed dependencies, build outputs, local data, and browser artifacts. CI and `scripts/verify.ps1` run the check without rewriting files.

Prettier does not support the repository's C#, Python, PowerShell, XML project/NuGet files, Dockerfile, or Caddyfile without additional language-specific tools. These files are skipped by `--ignore-unknown`. No third-party formatting plugins are installed, and the check does not claim to validate those languages.

## Tests

```powershell
dotnet restore tests --configfile NuGet.Config
dotnet test tests --no-restore
npm run build --prefix client
```

For one repeatable local check, run `pwsh -File scripts/verify.ps1`. Use `-SkipTests` when the local VSTest host cannot start; CI still runs the test command itself.

Backend tests use real isolated SQLite databases and the ASP.NET test server. Coverage includes authentication, role isolation, CSRF, CRUD, reference blocking, stale versions, saved snapshots, single-use/expired links, random selection, and serving scaling.

Browser tests require a running backend serving the built frontend and an **isolated disposable test database**, bootstrapped with a test admin. Set `E2E_USERNAME`, `E2E_PASSWORD`, and optionally `E2E_URL`; defaults are only test fixture credentials and never seed production. Tests create members and data, so never target production.

```powershell
cd client
npx playwright install chromium
npm run test:e2e
```

Desktop and Pixel-sized Chromium flows cover invitations/login, recipe edits, meal creation, generation/save, history after deletion, dialog keyboard dismissal, and horizontal overflow. Screenshots and failure traces are written under ignored `test-results/`.

## API and security notes

Authenticated OpenAPI document: `/openapi/v1.json`. REST routes are under `/api`: `auth`, `admin`, `recipes`, `meals`, `planner/generate`, `planner/reroll`, and `plans`. Mutation clients must first fetch `/api/auth/csrf`, retain its cookie, and send the returned token as `X-CSRF-TOKEN`. Refresh the token after login/logout. Sessions use HttpOnly SameSite cookies, not browser-storage tokens.

Updates/deletes require the last-read GUID `version`; conflicts return HTTP 409 with reload guidance. Creating a saved week sends a null version; overwriting sends the existing version. Recipe deletion returns referencing meal names until those links are removed. Snapshots have schema version 1 and deliberately remain independent from current recipe IDs. The saved-plan API accepts validated snapshot content, enabling household edits without requiring still-existing library records; all signed-in members can edit shared plans.

No public registration, external HTML, uploads, arbitrary URLs, grocery credentials, or external synchronization. Future grocery adapters should consume structured snapshot ingredients through an explicit integration boundary. Security controls reduce risk but do not replace deployment patching, protected backups, and periodic review.
