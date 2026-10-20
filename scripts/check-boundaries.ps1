$ErrorActionPreference = 'Stop'

function Assert-NoMatch([string] $path, [string] $pattern, [string] $message) {
  if (Select-String -Path $path -Pattern $pattern -Quiet) { throw $message }
}

Assert-NoMatch 'server/Modules/Planning/PlanningEndpoints.cs' 'db\.(Recipes|Meals)' 'Planning must read catalog data through MealQueries.'
Assert-NoMatch 'server/Modules/Planning/PlanningRules.cs' 'Microsoft\.(AspNetCore|EntityFrameworkCore)' 'Planning rules must stay framework-independent.'
Assert-NoMatch 'client/src/features/*/*.tsx' 'from "\.\./\.\./main"' 'Features must not import the application entry point.'

Write-Host 'Module boundary checks passed.'
