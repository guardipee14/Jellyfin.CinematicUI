$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    dotnet restore
    dotnet build -c Release --no-restore
    $out = Join-Path $PSScriptRoot 'dist'
    if (Test-Path $out) { Remove-Item $out -Recurse -Force }
    New-Item -ItemType Directory -Path $out | Out-Null
    Copy-Item '.\bin\Release\net10.0\Jellyfin.Plugin.CinematicUI.dll' $out
    Copy-Item '.\meta.json' $out
    Compress-Archive -Path "$out\*" -DestinationPath '.\CinematicUI-v0.1.5.zip' -Force
    Write-Host 'Built .\CinematicUI-v0.1.5.zip'
}
finally { Pop-Location }
