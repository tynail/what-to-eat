#requires -Version 5.1
<#
.SYNOPSIS
Builds and tests this checkout against a disposable backend and SQLite database.
.EXAMPLE
pwsh -File scripts/test-e2e.ps1
.EXAMPLE
pwsh -File scripts/test-e2e.ps1 -SkipBuild -Port 5089 -TestFilter kitchen.spec.ts
.EXAMPLE
pwsh -File scripts/test-e2e.ps1 -Ui
.NOTES
Requires .NET 10, Node 24, and Playwright Chromium installed with
`npx playwright install chromium` from client. Preserves logs under ignored .local.
#>
param(
  [ValidateRange(1024, 65535)] [int] $Port = 5088,
  [string] $TestFilter = '',
  [switch] $SkipBuild,
  [switch] $Ui
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$clientRoot = Join-Path $repoRoot 'client'
$contentRoot = Join-Path $repoRoot 'server'
$webRoot = Join-Path $clientRoot 'dist'
$serverDll = Join-Path $contentRoot 'bin/Debug/net10.0/MealPlanner.dll'
$fixtureData = Join-Path $repoRoot ('.local/e2e-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $fixtureData | Out-Null
$fixtureServer = $null
$fixtureFailed = $false
$originalEnvironment = @{}
$environmentNames = @(
  'ASPNETCORE_ENVIRONMENT', 'DataDirectory', 'ASPNETCORE_STATICWEBASSETS',
  'Logging__LogLevel__Default', 'BOOTSTRAP_USERNAME', 'BOOTSTRAP_PASSWORD',
  'E2E_USERNAME', 'E2E_PASSWORD', 'E2E_URL', 'PLAYWRIGHT_BROWSERS_PATH'
)
foreach ($name in $environmentNames) {
  $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
  # Reject an occupied port before bootstrapping or starting another process.
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
  try { $listener.Start() } finally { $listener.Stop() }

  if (-not $SkipBuild) {
    & dotnet restore $contentRoot --configfile (Join-Path $repoRoot 'NuGet.Config')
    if ($LASTEXITCODE -ne 0) { throw 'Backend restore failed.' }
    & dotnet build $contentRoot --no-restore --configuration Debug
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    & npm ci --prefix $clientRoot
    if ($LASTEXITCODE -ne 0) { throw 'Client dependency installation failed.' }
    & npm run build --prefix $clientRoot
    if ($LASTEXITCODE -ne 0) { throw 'Client build failed.' }
  }
  if (-not (Test-Path -LiteralPath $serverDll) -or -not (Test-Path -LiteralPath (Join-Path $webRoot 'index.html'))) {
    throw 'Build outputs missing. Run without -SkipBuild.'
  }

  $env:ASPNETCORE_ENVIRONMENT = 'Development'
  $env:DataDirectory = $fixtureData
  # Development manifests can shadow --webroot with assets from an older build.
  $env:ASPNETCORE_STATICWEBASSETS = Join-Path $fixtureData 'no-static-assets-manifest.json'
  $env:Logging__LogLevel__Default = 'Warning'
  $env:BOOTSTRAP_USERNAME = 'e2eadmin'
  $env:BOOTSTRAP_PASSWORD = 'LocalOnly!Test42'
  $env:E2E_USERNAME = $env:BOOTSTRAP_USERNAME
  $env:E2E_PASSWORD = $env:BOOTSTRAP_PASSWORD
  $env:E2E_URL = "http://127.0.0.1:$Port"
  $localBrowsers = Join-Path $repoRoot '.local/browsers'
  if (-not $env:PLAYWRIGHT_BROWSERS_PATH -and (Test-Path -LiteralPath $localBrowsers)) {
    $env:PLAYWRIGHT_BROWSERS_PATH = $localBrowsers
  }

  & dotnet $serverDll --contentRoot $contentRoot --webroot $webRoot bootstrap-admin
  if ($LASTEXITCODE -ne 0) { throw 'Fixture admin bootstrap failed.' }
  Remove-Item Env:BOOTSTRAP_USERNAME, Env:BOOTSTRAP_PASSWORD

  # Quote paths so Windows PowerShell can start the server from directories with spaces.
  $startInfo = [Diagnostics.ProcessStartInfo]::new('dotnet')
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.WorkingDirectory = $repoRoot
  $startInfo.Arguments = (@($serverDll, '--contentRoot', $contentRoot, '--webroot', $webRoot, '--urls', $env:E2E_URL) |
    ForEach-Object { '"' + ($_ -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }) -join ' '
  $fixtureServer = [Diagnostics.Process]::Start($startInfo)
  $stdout = $fixtureServer.StandardOutput.ReadToEndAsync()
  $stderr = $fixtureServer.StandardError.ReadToEndAsync()

  $ready = $false
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if ($fixtureServer.HasExited) { throw 'Fixture backend exited before readiness.' }
    try {
      Invoke-WebRequest "$env:E2E_URL/health" -TimeoutSec 2 -UseBasicParsing | Out-Null
      $ready = $true
      break
    } catch { Start-Sleep -Milliseconds 250 }
  }
  if (-not $ready) { throw 'Fixture backend did not become healthy.' }

  $expectedIndex = Get-Content -Raw -LiteralPath (Join-Path $webRoot 'index.html')
  $bundlePath = [regex]::Match($expectedIndex, '/assets/[^" ]+\.js').Value
  $servedIndex = (Invoke-WebRequest $env:E2E_URL -UseBasicParsing).Content
  if (-not $bundlePath -or -not $servedIndex.Contains($bundlePath)) {
    throw "Wrong frontend served. Expected bundle $bundlePath."
  }
  $bundleResponse = Invoke-WebRequest ($env:E2E_URL + $bundlePath) -UseBasicParsing
  $sha256 = [Security.Cryptography.SHA256]::Create()
  try { $servedHash = [BitConverter]::ToString($sha256.ComputeHash($bundleResponse.RawContentStream.ToArray())).Replace('-', '') }
  finally { $sha256.Dispose() }
  $expectedHash = (Get-FileHash -LiteralPath (Join-Path $webRoot $bundlePath.TrimStart('/')) -Algorithm SHA256).Hash
  if ($servedHash -ne $expectedHash) { throw 'Served JavaScript differs from this checkout build.' }
  Write-Host "Verified frontend $bundlePath SHA256 $expectedHash"

  Push-Location $clientRoot
  try {
    $playwrightArgs = @('playwright', 'test')
    if ($TestFilter) { $playwrightArgs += $TestFilter }
    if ($Ui) { $playwrightArgs += '--ui' }
    & npx @playwrightArgs
    if ($LASTEXITCODE -ne 0) { throw 'Browser tests failed.' }
  } finally { Pop-Location }
} catch {
  $fixtureFailed = $true
  throw
} finally {
  try {
    if ($fixtureServer) {
      try {
        if (-not $fixtureServer.HasExited) { $fixtureServer.Kill() }
        $fixtureServer.WaitForExit()
        [IO.File]::WriteAllText((Join-Path $fixtureData 'server.log'), $stdout.GetAwaiter().GetResult())
        [IO.File]::WriteAllText((Join-Path $fixtureData 'server-error.log'), $stderr.GetAwaiter().GetResult())
        if ($fixtureFailed) {
          Get-Content -LiteralPath (Join-Path $fixtureData 'server.log'), (Join-Path $fixtureData 'server-error.log') -Tail 60
        }
      } finally { $fixtureServer.Dispose() }
    }
  } finally {
    foreach ($name in $environmentNames) {
      [Environment]::SetEnvironmentVariable($name, $originalEnvironment[$name], 'Process')
    }
    Write-Host "Fixture data and logs: $fixtureData"
  }
}
