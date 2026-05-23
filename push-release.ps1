param(
    [string]$Tag,
    [string]$ManifestChangelog,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectFile = Join-Path $repoRoot "Jellyfin.Plugin.MediaPreview\Jellyfin.Plugin.MediaPreview.csproj"
$releaseMetadataFile = Join-Path $repoRoot "release-metadata.json"

Set-Location $repoRoot

$status = git status --porcelain
if ($status) {
    throw "Working tree is not clean. Commit or stash your changes before pushing a release."
}

[xml]$projectXml = Get-Content $projectFile
$version = [string]($projectXml.Project.PropertyGroup | Select-Object -First 1).Version
if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Could not determine version from $projectFile"
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = "release-v$version"
}

if ([string]::IsNullOrWhiteSpace($ManifestChangelog)) {
    $ManifestChangelog = Read-Host "Please enter the changelog for manifest.json"
}

if ([string]::IsNullOrWhiteSpace($ManifestChangelog)) {
    throw "Manifest changelog cannot be empty."
}

$displayTag = $Tag
if ($displayTag.StartsWith("release-")) {
    $displayTag = $displayTag.Substring("release-".Length)
}

$branch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "Could not determine current branch."
}

$null = git rev-parse --verify --quiet "refs/tags/$Tag" 2>$null
if ($LASTEXITCODE -eq 0) {
    throw "Tag '$Tag' already exists locally."
}

$null = git ls-remote --exit-code --tags origin $Tag 2>$null
if ($LASTEXITCODE -eq 0) {
    throw "Tag '$Tag' already exists on origin."
}

$releaseMetadata = [ordered]@{
    tag = $Tag
    displayTag = $displayTag
    manifestChangelog = $ManifestChangelog
    releaseTitle = "Release $displayTag"
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$releaseMetadataJson = $releaseMetadata | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($releaseMetadataFile, $releaseMetadataJson, $utf8NoBom)

git add release-metadata.json
if ($LASTEXITCODE -ne 0) {
    throw "Failed to stage release metadata."
}

git commit -m "Prepare release $displayTag"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to commit release metadata."
}

if (-not $SkipBuild) {
    & (Join-Path $repoRoot "build-release.ps1") -Changelog $ManifestChangelog
}

Write-Host "Pushing branch '$branch'..."
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    throw "Failed to push branch '$branch'."
}

Write-Host "Creating tag '$Tag'..."
git tag -a $Tag -m "Release $displayTag"
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create tag '$Tag'."
}

Write-Host "Pushing tag '$Tag'..."
git push origin $Tag
if ($LASTEXITCODE -ne 0) {
    throw "Failed to push tag '$Tag'."
}

Write-Host ""
Write-Host "Release tag pushed successfully."
Write-Host "GitHub Actions will now build the ZIP, generate the changelog via git-cliff, create the GitHub release, and update manifest.json."
