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
$releaseRoot = Join-Path $repoRoot "release"
$buildOutput = Join-Path $releaseRoot (".build-" + [Guid]::NewGuid().ToString("N"))
$stageDir = Join-Path $releaseRoot $pluginName
$zipPath = Join-Path $releaseRoot ($pluginName + ".zip")

[xml]$projectXml = Get-Content $projectFile
$propertyGroup = $projectXml.Project.PropertyGroup | Select-Object -First 1
$packageReferences = @($projectXml.Project.ItemGroup.PackageReference)

$pluginVersion = $propertyGroup.Version
if ([string]::IsNullOrWhiteSpace($pluginVersion)) {
    throw "Could not determine plugin version from $projectFile"
}

$assemblyVersion = [string]$propertyGroup.AssemblyVersion
$fileVersion = [string]$propertyGroup.FileVersion
if ($assemblyVersion -ne $pluginVersion -or $fileVersion -ne $pluginVersion) {
    throw "Project versions must match before packaging. Version=$pluginVersion AssemblyVersion=$assemblyVersion FileVersion=$fileVersion"
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

if ([string]::IsNullOrWhiteSpace($Changelog)) {
    $Changelog = "Initial release."
}

Write-Host "Building plugin..."
Write-Host "Building frontend bundle..."
if (Test-Path (Join-Path $repoRoot "package-lock.json")) {
    Write-Host "Installing frontend dependencies with npm ci..."
    npm --prefix $repoRoot ci
    if ($LASTEXITCODE -ne 0) {
        $nodeModulesPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "node_modules"))
        $expectedNodeModulesPath = [System.IO.Path]::GetFullPath("$repoRoot\node_modules")
        if ($nodeModulesPath -ne $expectedNodeModulesPath -or -not $nodeModulesPath.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to clean unexpected node_modules path: $nodeModulesPath"
        }

        Write-Warning "npm ci failed. Cleaning workspace node_modules and retrying once..."
        if (Test-Path -LiteralPath $nodeModulesPath) {
            Remove-Item -LiteralPath $nodeModulesPath -Recurse -Force
        }
        npm --prefix $repoRoot ci
    }
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

$bundlePath = Join-Path $repoRoot "dist\mediapreview.bundle.js"
node --check $bundlePath
if ($LASTEXITCODE -ne 0) {
    throw "Frontend bundle syntax validation failed with exit code $LASTEXITCODE"
}

dotnet build $projectFile -c $Configuration -p:UseSharedCompilation=false --output $buildOutput
if ($LASTEXITCODE -ne 0) {
    throw "dotnet build failed with exit code $LASTEXITCODE"
}

$builtAssemblyPath = Join-Path $buildOutput "Jellyfin.Plugin.MediaPreview.dll"
if (-not (Test-Path $builtAssemblyPath)) {
    throw "Built plugin assembly was not found at $builtAssemblyPath"
}

$builtAssemblyVersion = [System.Reflection.AssemblyName]::GetAssemblyName($builtAssemblyPath).Version.ToString()
$builtFileVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($builtAssemblyPath).FileVersion
if ($builtAssemblyVersion -ne $pluginVersion -or $builtFileVersion -ne $pluginVersion) {
    throw "Built plugin versions do not match package version. Package=$pluginVersion Assembly=$builtAssemblyVersion File=$builtFileVersion"
}

$verifyScript = Join-Path $repoRoot "scripts\verify-embedded-bundle.ps1"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $verifyScript -AssemblyPath $builtAssemblyPath -BundlePath $bundlePath
if ($LASTEXITCODE -ne 0) {
    throw "Embedded frontend bundle verification failed with exit code $LASTEXITCODE"
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

$resolvedBuildOutput = [System.IO.Path]::GetFullPath($buildOutput)
$resolvedReleaseRoot = [System.IO.Path]::GetFullPath($releaseRoot)
if (-not $resolvedBuildOutput.StartsWith($resolvedReleaseRoot + [System.IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean unexpected temporary build path: $resolvedBuildOutput"
}
Remove-Item -LiteralPath $resolvedBuildOutput -Recurse -Force

Write-Host ""
Write-Host "Release folder:"
Write-Host "  $stageDir"
Write-Host "Release zip:"
Write-Host "  $zipPath"
