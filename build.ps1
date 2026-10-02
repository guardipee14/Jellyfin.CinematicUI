param([string]$Python = 'python')
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $version = & $Python scripts/release.py check-source
    if ($LASTEXITCODE -ne 0) { throw 'Source validation failed' }
    dotnet restore Jellyfin.Plugin.CinematicUI.csproj
    if ($LASTEXITCODE -ne 0) { throw 'Restore failed' }
    dotnet build Jellyfin.Plugin.CinematicUI.csproj -c Release --no-restore -warnaserror
    if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
    dotnet run --project tests/Contracts/Contracts.csproj -c Release -- .
    if ($LASTEXITCODE -ne 0) { throw 'Assembly verification failed' }
    & $Python scripts/release.py package --tag ('v' + $version.Substring(0, $version.Length - 2))
    if ($LASTEXITCODE -ne 0) { throw 'Packaging failed' }
} finally { Pop-Location }
