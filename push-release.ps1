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
$propertyGroup = $projectXml.Project.PropertyGroup | Select-Object -First 1
$version = [string]$propertyGroup.Version
if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Could not determine version from $projectFile"
}

if ([string]::IsNullOrWhiteSpace($ManifestChangelog)) {
    $ManifestChangelog = Read-Host "Please enter the changelog for manifest.json"
}

if ([string]::IsNullOrWhiteSpace($ManifestChangelog)) {
    throw "Manifest changelog cannot be empty."
}

$branch = (git branch --show-current).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "Could not determine current branch."
}

function Test-TagExists {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CandidateTag
    )

    $null = git rev-parse --verify --quiet "refs/tags/$CandidateTag" 2>$null
    if ($LASTEXITCODE -eq 0) {
        return $true
    }

    $null = git ls-remote --exit-code --tags origin $CandidateTag 2>$null
    return $LASTEXITCODE -eq 0
}

function Set-ProjectVersion {
    param(
        [Parameter(Mandatory = $true)]
        [string]$NewVersion
    )

    $propertyGroup.Version = $NewVersion
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $stringWriter = New-Object System.IO.StringWriter
    $xmlWriter = [System.Xml.XmlWriter]::Create($stringWriter, (New-Object System.Xml.XmlWriterSettings -Property @{ Indent = $true; OmitXmlDeclaration = $true }))
    $projectXml.Save($xmlWriter)
    $xmlWriter.Flush()
    $xmlWriter.Close()
    [System.IO.File]::WriteAllText($projectFile, $stringWriter.ToString(), $utf8NoBom)
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = "release-v$version"
}

while (Test-TagExists -CandidateTag $Tag) {
    Write-Host "Tag '$Tag' already exists."
    $newVersion = Read-Host "Please enter the next plugin version"
    if ([string]::IsNullOrWhiteSpace($newVersion)) {
        throw "Version cannot be empty."
    }
    $version = $newVersion.Trim()
    Set-ProjectVersion -NewVersion $version
    git add $projectFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stage updated project version."
    }
    $Tag = "release-v$version"
}

$displayTag = $Tag
if ($displayTag.StartsWith("release-")) {
    $displayTag = $displayTag.Substring("release-".Length)
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
