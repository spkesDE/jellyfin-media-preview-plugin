param(
    [string]$Tag,
    [string]$ManifestChangelog,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectFile = Join-Path $repoRoot "Jellyfin.Plugin.MediaPreview\Jellyfin.Plugin.MediaPreview.csproj"

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
$originalVersion = $version

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

function Read-VersionInteractively {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CurrentVersion
    )

    $parts = [System.Collections.Generic.List[int]]::new()
    foreach ($part in $CurrentVersion.Split('.')) {
        $value = 0
        if (-not [int]::TryParse($part, [ref]$value)) {
            throw "Version '$CurrentVersion' is not in a supported numeric format."
        }
        $parts.Add($value)
    }

    while ($parts.Count -lt 4) {
        $parts.Add(0)
    }

    $selectedIndex = 2
    $labels = @("major", "minor", "patch", "build")

    while ($true) {
        Clear-Host
        Write-Host "Tag already exists for version $CurrentVersion." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Choose the next plugin version with the arrow keys:" -ForegroundColor Cyan
        Write-Host "Left/Right = select segment, Up/Down = change value, Enter = accept, C = custom input, Esc = cancel"
        Write-Host ""

        $renderedParts = for ($i = 0; $i -lt 4; $i++) {
            if ($i -eq $selectedIndex) {
                "[$($parts[$i])]"
            } else {
                "$($parts[$i])"
            }
        }

        Write-Host ("Version: " + ($renderedParts -join '.'))
        Write-Host ("Selected: " + $labels[$selectedIndex])

        $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        switch ($key.VirtualKeyCode) {
            37 {
                if ($selectedIndex -gt 0) {
                    $selectedIndex--
                }
            }
            39 {
                if ($selectedIndex -lt 3) {
                    $selectedIndex++
                }
            }
            38 {
                $parts[$selectedIndex]++
                for ($i = $selectedIndex + 1; $i -lt 4; $i++) {
                    $parts[$i] = 0
                }
            }
            40 {
                if ($parts[$selectedIndex] -gt 0) {
                    $parts[$selectedIndex]--
                }
                for ($i = $selectedIndex + 1; $i -lt 4; $i++) {
                    $parts[$i] = 0
                }
            }
            13 {
                Clear-Host
                return ($parts -join '.')
            }
            27 {
                Clear-Host
                throw "Release cancelled."
            }
            default {
                if ($key.Character -in @('c', 'C')) {
                    Clear-Host
                    $customVersion = Read-Host "Please enter the next plugin version"
                    if ([string]::IsNullOrWhiteSpace($customVersion)) {
                        throw "Version cannot be empty."
                    }
                    return $customVersion.Trim()
                }
            }
        }
    }
}

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = "v$version"
}

while (Test-TagExists -CandidateTag $Tag) {
    $version = Read-VersionInteractively -CurrentVersion $version
    Set-ProjectVersion -NewVersion $version
    git add $projectFile
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stage updated project version."
    }
    $Tag = "v$version"
}

Write-Host ""
Write-Host "Release summary:" -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($ManifestChangelog)) {
    Write-Host "Manifest changelog: auto-generated by git-cliff in GitHub Actions"
} else {
    Write-Host "Manifest changelog override: $ManifestChangelog"
}
Write-Host "Old Version: $originalVersion"
Write-Host "Version: $version"
Write-Host "Tag: $Tag"
Write-Host ""
$confirmation = Read-Host "Everything correct? [Y/N]"
if ($confirmation -notin @('Y', 'y')) {
    throw "Release cancelled."
}

git diff --cached --quiet
$hasStagedChanges = $LASTEXITCODE -ne 0

if ($hasStagedChanges) {
    git commit -m "Prepare release $Tag"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to commit release preparation changes."
    }
}

if (-not $SkipBuild) {
    if ([string]::IsNullOrWhiteSpace($ManifestChangelog)) {
        & (Join-Path $repoRoot "build-release.ps1")
    } else {
        & (Join-Path $repoRoot "build-release.ps1") -Changelog $ManifestChangelog
    }
}

Write-Host "Pushing branch '$branch'..."
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    throw "Failed to push branch '$branch'."
}

Write-Host "Creating tag '$Tag'..."
git tag -a $Tag -m "Release $Tag"
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
Write-Host "GitHub Actions will now build the ZIP, generate release notes and the manifest changelog via git-cliff, create the GitHub release, and update manifest.json."
