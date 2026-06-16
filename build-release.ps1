param(
    [string]$Configuration = "Release",
    [string]$Changelog
)

$ErrorActionPreference = "Stop"

function Join-RepoPath {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Parts
    )

    $path = $Parts[0]

    for ($i = 1; $i -lt $Parts.Count; $i++) {
        $path = [System.IO.Path]::Combine($path, $Parts[$i])
    }

    return $path
}

function Run {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,

        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,

        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    & $Command @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "$ErrorMessage Exit code: $LASTEXITCODE"
    }
}

function Get-ProjectProperty {
    param(
        [Parameter(Mandatory = $true)]
        [xml]$ProjectXml,

        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $node = $ProjectXml.SelectSingleNode("/*[local-name()='Project']/*[local-name()='PropertyGroup']/*[local-name()='$Name']")

    if ($null -eq $node) {
        return $null
    }

    return [string]$node.InnerText
}

function Get-PackageVersion {
    param(
        [Parameter(Mandatory = $true)]
        [xml]$ProjectXml,

        [Parameter(Mandatory = $true)]
        [string]$PackageName
    )

    $nodes = $ProjectXml.SelectNodes("/*[local-name()='Project']/*[local-name()='ItemGroup']/*[local-name()='PackageReference']")

    foreach ($node in $nodes) {
        if ($node.GetAttribute("Include") -ne $PackageName) {
            continue
        }

        $version = $node.GetAttribute("Version")

        if (-not [string]::IsNullOrWhiteSpace($version)) {
            return $version
        }

        $versionNode = $node.SelectSingleNode("*[local-name()='Version']")

        if ($null -ne $versionNode -and -not [string]::IsNullOrWhiteSpace($versionNode.InnerText)) {
            return [string]$versionNode.InnerText
        }
    }

    return $null
}

function Get-CurrentPowerShell {
    $processPath = (Get-Process -Id $PID).Path

    if (-not [string]::IsNullOrWhiteSpace($processPath) -and (Test-Path -LiteralPath $processPath)) {
        return $processPath
    }

    $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
    if ($pwsh) {
        return $pwsh.Source
    }

    $powershell = Get-Command powershell -ErrorAction SilentlyContinue
    if ($powershell) {
        return $powershell.Source
    }

    throw "Could not find PowerShell executable."
}

function Remove-TempBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    try {
        Remove-Item -LiteralPath $Path -Recurse -Force
    } catch {
        Write-Warning "Could not remove temporary build folder: $Path"
        Write-Warning $_.Exception.Message
    }
}

function Step {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Text
    )

    Write-Host ""
    Write-Host "==> $Text"
}

$repoRoot = if ($PSScriptRoot) {
    $PSScriptRoot
} else {
    Split-Path -Parent $MyInvocation.MyCommand.Path
}

$repoRoot = [System.IO.Path]::GetFullPath($repoRoot)

$projectDir = Join-RepoPath @($repoRoot, "Jellyfin.Plugin.MediaPreview")
$projectFile = Join-RepoPath @($projectDir, "Jellyfin.Plugin.MediaPreview.csproj")

$pluginName = "MediaPreview"
$pluginDisplayName = "Media Preview"
$pluginGuid = "2c2ee6c1-bcd7-48e4-a7e8-e6b4d77d3df2"
$pluginOwner = "spkesDE"
$pluginCategory = "General"
$pluginOverview = "Hover previews for Jellyfin Web using Trickplay and trailers."
$pluginDescription = "Adds hover previews to movie, series, and episode cards in Jellyfin Web using Jellyfin Trickplay images and trailers."

$releaseRoot = Join-RepoPath @($repoRoot, "release")
$buildOutput = Join-RepoPath @($releaseRoot, ".build-$([Guid]::NewGuid().ToString("N"))")
$stageDir = Join-RepoPath @($releaseRoot, $pluginName)
$zipPath = Join-RepoPath @($releaseRoot, "$pluginName.zip")
$bundlePath = Join-RepoPath @($repoRoot, "dist", "mediapreview.bundle.js")
$configBundlePath = Join-RepoPath @($repoRoot, "dist", "config.bundle.js")
$verifyScript = Join-RepoPath @($repoRoot, "scripts", "verify-embedded-bundle.ps1")

try {
    Step "Reading project metadata"

    if (-not (Test-Path -LiteralPath $projectFile)) {
        throw "Project file not found: $projectFile"
    }

    [xml]$projectXml = Get-Content -LiteralPath $projectFile

    $pluginVersion = Get-ProjectProperty -ProjectXml $projectXml -Name "Version"
    $assemblyVersion = Get-ProjectProperty -ProjectXml $projectXml -Name "AssemblyVersion"
    $fileVersion = Get-ProjectProperty -ProjectXml $projectXml -Name "FileVersion"

    if ([string]::IsNullOrWhiteSpace($pluginVersion)) {
        throw "Could not determine plugin version from $projectFile"
    }

    if ($assemblyVersion -ne $pluginVersion -or $fileVersion -ne $pluginVersion) {
        throw "Project versions must match before packaging. Version=$pluginVersion AssemblyVersion=$assemblyVersion FileVersion=$fileVersion"
    }

    $controllerVersion = Get-PackageVersion -ProjectXml $projectXml -PackageName "Jellyfin.Controller"

    if ([string]::IsNullOrWhiteSpace($controllerVersion)) {
        throw "Could not determine Jellyfin.Controller package version from $projectFile"
    }

    $controllerVersion = $controllerVersion.Split("-")[0]
    $versionParts = @($controllerVersion.Split("."))

    while ($versionParts.Count -lt 4) {
        $versionParts += "0"
    }

    $targetAbi = ($versionParts | Select-Object -First 4) -join "."

    if ([string]::IsNullOrWhiteSpace($Changelog)) {
        $Changelog = "Initial release."
    }

    Write-Host "Plugin version: $pluginVersion"
    Write-Host "Target ABI:     $targetAbi"

    Step "Installing frontend dependencies"

    if (Test-Path -LiteralPath (Join-RepoPath @($repoRoot, "package-lock.json"))) {
        npm --prefix $repoRoot ci

        if ($LASTEXITCODE -ne 0) {
            Write-Warning "npm ci failed. Removing node_modules and retrying once..."

            $nodeModulesPath = Join-RepoPath @($repoRoot, "node_modules")

            if (Test-Path -LiteralPath $nodeModulesPath) {
                Remove-Item -LiteralPath $nodeModulesPath -Recurse -Force
            }

            Run "npm" @("--prefix", $repoRoot, "ci") "npm ci failed."
        }
    } else {
        Run "npm" @("--prefix", $repoRoot, "install") "npm install failed."
    }

    Step "Building frontend bundle"

    Run "npm" @("--prefix", $repoRoot, "run", "build") "npm run build failed."

    if (-not (Test-Path -LiteralPath $bundlePath)) {
        throw "Frontend bundle not found: $bundlePath"
    }

    if (-not (Test-Path -LiteralPath $configBundlePath)) {
        throw "Configuration bundle not found: $configBundlePath"
    }

    Run "node" @("--check", $bundlePath) "Frontend bundle syntax check failed."
    Run "node" @("--check", $configBundlePath) "Configuration bundle syntax check failed."

    Step "Building plugin"

    New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null

    Run "dotnet" @(
        "build",
        $projectFile,
        "-c",
        $Configuration,
        "-p:UseSharedCompilation=false",
        "--output",
        $buildOutput
    ) "dotnet build failed."

    $builtAssemblyPath = Join-RepoPath @($buildOutput, "Jellyfin.Plugin.MediaPreview.dll")

    if (-not (Test-Path -LiteralPath $builtAssemblyPath)) {
        throw "Built plugin assembly not found: $builtAssemblyPath"
    }

    $builtAssemblyVersion = [System.Reflection.AssemblyName]::GetAssemblyName($builtAssemblyPath).Version.ToString()
    $builtFileVersion = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($builtAssemblyPath).FileVersion

    if ($builtAssemblyVersion -ne $pluginVersion -or $builtFileVersion -ne $pluginVersion) {
        throw "Built plugin versions do not match package version. Package=$pluginVersion Assembly=$builtAssemblyVersion File=$builtFileVersion"
    }

    Step "Verifying embedded frontend bundle"

    if (-not (Test-Path -LiteralPath $verifyScript)) {
        throw "Verify script not found: $verifyScript"
    }

    $powerShellExe = Get-CurrentPowerShell

    if ($env:OS -eq "Windows_NT") {
        Run $powerShellExe @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            $verifyScript,
            "-AssemblyPath",
            $builtAssemblyPath,
            "-BundlePath",
            $bundlePath,
            "-ConfigBundlePath",
            $configBundlePath
        ) "Embedded frontend bundle verification failed."
    } else {
        Run $powerShellExe @(
            "-NoProfile",
            "-File",
            $verifyScript,
            "-AssemblyPath",
            $builtAssemblyPath,
            "-BundlePath",
            $bundlePath,
            "-ConfigBundlePath",
            $configBundlePath
        ) "Embedded frontend bundle verification failed."
    }

    Step "Preparing release folder"

    if (Test-Path -LiteralPath $stageDir) {
        Remove-Item -LiteralPath $stageDir -Recurse -Force
    }

    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

    $includeFiles = @(
        "Jellyfin.Plugin.MediaPreview.dll",
        "Jellyfin.Plugin.MediaPreview.deps.json",
        "Jellyfin.Plugin.MediaPreview.runtimeconfig.json",
        "Newtonsoft.Json.dll"
    )

    foreach ($file in $includeFiles) {
        $sourcePath = Join-RepoPath @($buildOutput, $file)

        if (Test-Path -LiteralPath $sourcePath) {
            Copy-Item -LiteralPath $sourcePath -Destination $stageDir
        }
    }

    $readmePath = Join-RepoPath @($repoRoot, "README.md")
    $licensePath = Join-RepoPath @($repoRoot, "LICENSE")

    if (Test-Path -LiteralPath $readmePath) {
        Copy-Item -LiteralPath $readmePath -Destination $stageDir
    }

    if (Test-Path -LiteralPath $licensePath) {
        Copy-Item -LiteralPath $licensePath -Destination $stageDir
    }

    Step "Writing meta.json"

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

    $metaJsonPath = Join-RepoPath @($stageDir, "meta.json")
    $metaJson = $meta | ConvertTo-Json -Depth 5
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText($metaJsonPath, $metaJson, $utf8NoBom)

    Step "Creating ZIP"

    Compress-Archive -Path (Join-Path $stageDir "*") -DestinationPath $zipPath -Force

    Write-Host ""
    Write-Host "Release folder:"
    Write-Host "  $stageDir"
    Write-Host "Release zip:"
    Write-Host "  $zipPath"
} finally {
    Remove-TempBuild -Path $buildOutput
}
