param([switch] $SkipTests)

$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$env:APPDATA = Join-Path $workspace '.local/appdata'
$env:NUGET_PACKAGES = Join-Path $workspace '.local/packages'

npm run format:check --prefix $workspace
if ($LASTEXITCODE -ne 0) { throw 'npm run format:check failed' }

dotnet build (Join-Path $workspace 'tests') --no-restore
if ($LASTEXITCODE -ne 0) { throw 'dotnet build failed' }
npm run build --prefix (Join-Path $workspace 'client')
if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
& (Join-Path $PSScriptRoot 'check-boundaries.ps1')

if (-not $SkipTests) {
  npm test --prefix (Join-Path $workspace 'client')
  if ($LASTEXITCODE -ne 0) { throw 'npm test failed' }
  dotnet test (Join-Path $workspace 'tests') --no-build --no-restore
  if ($LASTEXITCODE -ne 0) { throw 'dotnet test failed' }
}
