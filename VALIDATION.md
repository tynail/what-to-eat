# Local validation

Verified September 4, 2026 (Toronto):

- .NET 10 backend builds with zero warnings/errors.
- 10 unit/integration tests pass against isolated real SQLite databases.
- React/TypeScript production build passes.
- Desktop and mobile Chromium end-to-end flows pass (2 projects). Screenshots visually reviewed; no horizontal overflow.
- Initial EF migration applies to a fresh database; restart recognizes the existing migration.
- Online Python SQLite backup passes integrity check. Copied backup starts successfully as an independent app instance; admin login and saved weekly snapshots verified.
- NuGet transitive dependency audit and npm audit report zero known vulnerabilities at validation time.
- Docker Compose configuration validates.

Docker CLI exists, but its engine is unavailable on this host. Container build/startup, Caddy certificate issuance, and real-server network behavior were not executed locally. CI includes Docker image build; deployment instructions cover production setup and persistent volumes.

Browser fixtures use disposable `.local` data and test-only credentials. No production account, external invitation, or public deployment was created.
