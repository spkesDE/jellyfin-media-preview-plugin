param(
    [Parameter(Mandatory = $true)]
    [string]$SourceUrl,

    [Parameter(Mandatory = $true)]
    [string]$Checksum,

    [Parameter(Mandatory = $true)]
    [string]$Timestamp,

    [string]$ManifestPath = "manifest.json",
    [string]$MetaPath = "release/MediaPreview/meta.json"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestFullPath = Join-Path $repoRoot $ManifestPath
$metaFullPath = Join-Path $repoRoot $MetaPath

if (-not (Test-Path $metaFullPath)) {
    throw "Meta file not found: $metaFullPath"
}

$meta = Get-Content $metaFullPath -Raw | ConvertFrom-Json

$versionEntry = [ordered]@{
    version = $meta.version
    changelog = $meta.changelog
    targetAbi = $meta.targetAbi
    sourceUrl = $SourceUrl
    checksum = $Checksum
    timestamp = $Timestamp
}

$manifest = @()
if (Test-Path $manifestFullPath) {
    $existing = Get-Content $manifestFullPath -Raw | ConvertFrom-Json
    if ($existing -is [System.Array]) {
        $manifest = @($existing)
    } elseif ($null -ne $existing) {
        $manifest = @($existing)
    }
}

$pluginEntry = $manifest | Where-Object { $_.guid -eq $meta.guid } | Select-Object -First 1
if (-not $pluginEntry) {
    $pluginEntry = [ordered]@{
        guid = $meta.guid
        name = $meta.name
        overview = $meta.overview
        description = $meta.description
        owner = $meta.owner
        category = $meta.category
        versions = @()
    }
    $manifest = @($pluginEntry) + @($manifest)
}

$pluginEntry.guid = $meta.guid
$pluginEntry.name = $meta.name
$pluginEntry.overview = $meta.overview
$pluginEntry.description = $meta.description
$pluginEntry.owner = $meta.owner
$pluginEntry.category = $meta.category

$existingVersions = @($pluginEntry.versions | Where-Object { $_.version -ne $meta.version })
$pluginEntry.versions = @($versionEntry) + $existingVersions

$jsonBody = $manifest | ConvertTo-Json -Depth 10
$json = if ($manifest.Count -eq 1 -and -not $jsonBody.TrimStart().StartsWith("[")) {
    "[`n$jsonBody`n]"
} else {
    $jsonBody
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($manifestFullPath, $json, $utf8NoBom)

Write-Host "Updated manifest:"
Write-Host "  $manifestFullPath"
