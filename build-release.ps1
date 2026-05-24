param(
    [string]$Configuration = "Release",
    [string]$Changelog
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDir = Join-Path $repoRoot "Jellyfin.Plugin.MediaPreview"
$projectFile = Join-Path $projectDir "Jellyfin.Plugin.MediaPreview.csproj"
$pluginName = "MediaPreview"
$pluginDisplayName = "Media Preview"
$pluginGuid = "2c2ee6c1-bcd7-48e4-a7e8-e6b4d77d3df2"
$pluginOwner = "spkesDE"
$pluginCategory = "General"
$pluginOverview = "Hover previews for Jellyfin Web using Trickplay and trailers."
$pluginDescription = "Adds hover previews to movie, series, and episode cards in Jellyfin Web using Jellyfin Trickplay images and trailers."
$framework = "net9.0"
$buildOutput = Join-Path $projectDir ("bin\" + $Configuration + "\" + $framework)
$releaseRoot = Join-Path $repoRoot "release"
$stageDir = Join-Path $releaseRoot $pluginName
$zipPath = Join-Path $releaseRoot ($pluginName + ".zip")
$releaseMetadataPath = Join-Path $repoRoot "release-metadata.json"

[xml]$projectXml = Get-Content $projectFile
$propertyGroup = $projectXml.Project.PropertyGroup | Select-Object -First 1
$packageReferences = @($projectXml.Project.ItemGroup.PackageReference)

$pluginVersion = $propertyGroup.Version
if ([string]::IsNullOrWhiteSpace($pluginVersion)) {
    throw "Could not determine plugin version from $projectFile"
}

$jellyfinControllerReference = $packageReferences | Where-Object { $_.Include -eq "Jellyfin.Controller" } | Select-Object -First 1
if (-not $jellyfinControllerReference) {
    throw "Could not determine Jellyfin.Controller package version from $projectFile"
}

$controllerVersion = [string]$jellyfinControllerReference.Version
$versionParts = $controllerVersion.Split('.')
while ($versionParts.Count -lt 4) {
    $versionParts += "0"
}
$targetAbi = ($versionParts | Select-Object -First 4) -join '.'

if ([string]::IsNullOrWhiteSpace($Changelog) -and (Test-Path $releaseMetadataPath)) {
    $releaseMetadata = Get-Content $releaseMetadataPath -Raw | ConvertFrom-Json
    if (-not [string]::IsNullOrWhiteSpace([string]$releaseMetadata.manifestChangelog)) {
        $Changelog = [string]$releaseMetadata.manifestChangelog
    }
}

if ([string]::IsNullOrWhiteSpace($Changelog)) {
    $Changelog = "Initial release."
}

Write-Host "Building plugin..."
Write-Host "Building frontend bundle..."
if (Test-Path (Join-Path $repoRoot "package-lock.json")) {
    Write-Host "Installing frontend dependencies with npm ci..."
    npm --prefix $repoRoot ci
} else {
    Write-Host "Installing frontend dependencies with npm install..."
    npm --prefix $repoRoot install
}
if ($LASTEXITCODE -ne 0) {
    throw "npm dependency install failed with exit code $LASTEXITCODE"
}

npm --prefix $repoRoot run build
if ($LASTEXITCODE -ne 0) {
    throw "npm run build failed with exit code $LASTEXITCODE"
}

dotnet build $projectFile -c $Configuration -p:UseSharedCompilation=false
if ($LASTEXITCODE -ne 0) {
    throw "dotnet build failed with exit code $LASTEXITCODE"
}

if (Test-Path $stageDir) {
    Remove-Item -LiteralPath $stageDir -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $stageDir | Out-Null

$includePatterns = @(
    "Jellyfin.Plugin.MediaPreview.dll",
    "Jellyfin.Plugin.MediaPreview.deps.json",
    "Jellyfin.Plugin.MediaPreview.runtimeconfig.json",
    "Newtonsoft.Json.dll"
)

foreach ($pattern in $includePatterns) {
    $sourcePath = Join-Path $buildOutput $pattern
    if (Test-Path $sourcePath) {
        Copy-Item -LiteralPath $sourcePath -Destination $stageDir
    }
}

Copy-Item -LiteralPath (Join-Path $repoRoot "README.md") -Destination $stageDir
Copy-Item -LiteralPath (Join-Path $repoRoot "LICENSE") -Destination $stageDir

$timestamp = [DateTime]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffffffZ")
$meta = [ordered]@{
    category = $pluginCategory
    changelog = $Changelog
    description = $pluginDescription
    guid = $pluginGuid
    name = $pluginDisplayName
    overview = $pluginOverview
    owner = $pluginOwner
    targetAbi = $targetAbi
    timestamp = $timestamp
    version = $pluginVersion
    status = "Active"
    autoUpdate = $true
    assemblies = @(
        "Jellyfin.Plugin.MediaPreview.dll"
    )
}

$metaJsonPath = Join-Path $stageDir "meta.json"
$metaJson = $meta | ConvertTo-Json -Depth 5
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($metaJsonPath, $metaJson, $utf8NoBom)

Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath

Write-Host ""
Write-Host "Release folder:"
Write-Host "  $stageDir"
Write-Host "Release zip:"
Write-Host "  $zipPath"
