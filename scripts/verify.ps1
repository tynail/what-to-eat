param([switch] $SkipTests)

$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$env:APPDATA = Join-Path $workspace '.local/appdata'
$env:NUGET_PACKAGES = Join-Path $workspace '.local/packages'

dotnet build (Join-Path $workspace 'tests') --no-restore
npm run build --prefix (Join-Path $workspace 'client')
& (Join-Path $PSScriptRoot 'check-boundaries.ps1')

if (-not $SkipTests) {
  dotnet test (Join-Path $workspace 'tests') --no-build --no-restore
}
