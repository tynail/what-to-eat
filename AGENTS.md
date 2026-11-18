# Repository Guidelines

## Project structure

Weekly Table is a household meal planner. In `server/Modules/`, Access owns accounts and invitations, Catalog owns recipes and meals, and Planning owns weekly plans. Use `MealQueries` to read catalog snapshots from Planning. Keep planning rules independent of ASP.NET Core and EF Core. SQLite migrations live in `server/Migrations/`.

Put React screens and hooks in `client/src/features/` and shared HTTP contracts in `client/src/shared/api/`. Use React Query for saved server data and local state for unsaved edits. Keep English and French UI strings together by updating both files in `client/src/locales/`.

## Build and run locally

Use the .NET 10 SDK and Node 24. Run commands from the repository root.

1. Install dependencies with `dotnet restore tests --configfile NuGet.Config` and `npm ci --prefix client`.
2. On a fresh database, bootstrap the first admin using the [local setup instructions](README.md#run-locally).
3. Start the API with `dotnet run --project server --launch-profile http`. In another terminal, run `npm run dev --prefix client`. Open <http://127.0.0.1:5173>.

Use `dotnet build server` to compile the API and `npm run build --prefix client` to type-check and bundle the frontend.

## Style and naming

Use four spaces in C# and two in TypeScript. Name components in PascalCase (`CatalogCard.tsx`) and hooks in camelCase (`useCatalog.ts`). Prettier uses single quotes, trailing commas, and LF line endings. Run `npm run format:check` to check formatting.

## Tests

- Run `dotnet test tests` for xUnit API and planning tests. Name test classes like `PlanningTests`.
- Run `npm test --prefix client` for Vitest. Place `*.test.ts` or `*.test.tsx` beside the code under test.
- Put Playwright flows in `client/e2e/*.spec.ts`. Install Chromium with `npx playwright install chromium` from `client/`, then run `pwsh -File scripts/test-e2e.ps1` from the root. The suite covers desktop and mobile layouts.

CI checks module boundaries and runs all three suites. It sets no numeric coverage threshold.

## Commits and pull requests

Follow the history's lowercase prefixes and imperative subjects, such as `fix: preserve recipe order` or `test: cover plan snapshots`. In a PR, describe the behavior change and list the checks you ran. Link the issue when applicable. For layout changes, include a screenshot at the affected viewport.

## Agent responses

Use Caveman Ultra by default unless the user says `stop caveman` or `normal mode`.
