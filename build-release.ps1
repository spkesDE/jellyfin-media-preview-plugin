param(
    [string]$Configuration = "Release",
    [string]$Changelog,

    # Local builds the release folder and ZIP. Server installs the build straight into the
    # Jellyfin plugin folder. When omitted, an interactive session asks; CI and other
    # non-interactive runs build locally.
    [ValidateSet("Local", "Server")]
    [string]$Target,

    [string]$ServerPluginsPath = "U:\Jellyfin\config\plugins"
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

function Test-InteractiveSession {
    if ($env:CI -or $env:GITHUB_ACTIONS) {
        return $false
    }

    if (-not [Environment]::UserInteractive) {
        return $false
    }

    return -not [Console]::IsInputRedirected
}

function Select-BuildTarget {
    param(
        [string]$Requested
    )

    if (-not [string]::IsNullOrWhiteSpace($Requested)) {
        return $Requested
    }

    if (-not (Test-InteractiveSession)) {
        return "Local"
    }

    $choices = [System.Management.Automation.Host.ChoiceDescription[]]@(
        (New-Object System.Management.Automation.Host.ChoiceDescription "&Local", "Build the release folder and ZIP in this repository."),
        (New-Object System.Management.Automation.Host.ChoiceDescription "&Server", "Install the build into the Jellyfin plugin folder at $ServerPluginsPath.")
    )
    $selection = $Host.UI.PromptForChoice("Build target", "Build locally or install on the server?", $choices, 0)

    return @("Local", "Server")[$selection]
}

function Find-InstalledPluginFolder {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PluginsPath,

        [Parameter(Mandatory = $true)]
        [string]$Guid
    )

    if (-not (Test-Path -LiteralPath $PluginsPath)) {
        throw "Jellyfin plugin folder not found: $PluginsPath"
    }

    $candidates = foreach ($folder in Get-ChildItem -LiteralPath $PluginsPath -Directory) {
        $metaPath = Join-Path $folder.FullName "meta.json"

        if (-not (Test-Path -LiteralPath $metaPath)) {
            continue
        }

        try {
            $meta = Get-Content -LiteralPath $metaPath -Raw | ConvertFrom-Json
        } catch {
            Write-Warning "Skipping $($folder.Name): meta.json could not be read."
            continue
        }

        if ([string]$meta.guid -ne $Guid) {
            continue
        }

        $version = [Version]"0.0.0.0"
        [void][Version]::TryParse([string]$meta.version, [ref]$version)

        [pscustomobject]@{
            Path = $folder.FullName
            Name = $folder.Name
            Version = $version
            Status = [string]$meta.status
        }
    }

    if (-not $candidates) {
        throw "No installed plugin with GUID $Guid was found in $PluginsPath. Install it once through the Jellyfin catalog first."
    }

    # Jellyfin loads the newest installed version, so that is the folder to replace.
    return $candidates | Sort-Object -Property Version -Descending | Select-Object -First 1
}

function Install-ToServer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceDir,

        [Parameter(Mandatory = $true)]
        [string[]]$Files,

        [Parameter(Mandatory = $true)]
        [string]$PluginsPath,

        [Parameter(Mandatory = $true)]
        [string]$Guid,

        [Parameter(Mandatory = $true)]
        [string]$BuiltVersion,

        [Parameter(Mandatory = $true)]
        [string]$BackupRoot
    )

    $installed = Find-InstalledPluginFolder -PluginsPath $PluginsPath -Guid $Guid
    Write-Host "Installed plugin folder: $($installed.Path)"

    if ($installed.Status -and $installed.Status -ne "Active") {
        Write-Warning "The installed plugin is marked '$($installed.Status)' in meta.json; Jellyfin may not load it."
    }

    if ($installed.Version.ToString() -ne $BuiltVersion) {
        Write-Warning "Installed version $($installed.Version) differs from built version $BuiltVersion. The files are replaced anyway; meta.json is left unchanged."
    }

    $backupDir = Join-Path $BackupRoot ("{0}_{1}" -f $installed.Name, (Get-Date -Format "yyyyMMdd-HHmmss"))
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

    foreach ($file in $Files) {
        $sourcePath = Join-Path $SourceDir $file

        if (-not (Test-Path -LiteralPath $sourcePath)) {
            continue
        }

        $targetPath = Join-Path $installed.Path $file

        if (Test-Path -LiteralPath $targetPath) {
            Copy-Item -LiteralPath $targetPath -Destination $backupDir -Force
        }

        try {
            Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
        } catch {
            throw "Could not replace $targetPath. Stop Jellyfin if the file is locked, then run the script again. $($_.Exception.Message)"
        }

        Write-Host "  replaced $file"
    }

    Write-Host ""
    Write-Host "Previous files backed up to:"
    Write-Host "  $backupDir"
    Write-Host "Restart Jellyfin to load the new build."
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
$pluginImageUrl = "https://raw.githubusercontent.com/spkesDE/jellyfin-media-preview-plugin/main/logo.png"

$releaseRoot = Join-RepoPath @($repoRoot, "release")
$buildOutput = Join-RepoPath @($releaseRoot, ".build-$([Guid]::NewGuid().ToString("N"))")
$stageDir = Join-RepoPath @($releaseRoot, $pluginName)
$zipPath = Join-RepoPath @($releaseRoot, "$pluginName.zip")
$bundlePath = Join-RepoPath @($repoRoot, "dist", "mediapreview.bundle.js")
$configBundlePath = Join-RepoPath @($repoRoot, "dist", "config.bundle.js")
$verifyScript = Join-RepoPath @($repoRoot, "scripts", "verify-embedded-bundle.ps1")
$syncFrontendVersionScript = Join-RepoPath @($repoRoot, "scripts", "sync-frontend-version.mjs")

$Target = Select-BuildTarget -Requested $Target
Write-Host "Build target: $Target"

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

    if (-not (Test-Path -LiteralPath $syncFrontendVersionScript)) {
        throw "Frontend version sync script not found: $syncFrontendVersionScript"
    }

    Run "node" @($syncFrontendVersionScript, $pluginVersion, "--check") "Frontend package versions do not match plugin version."

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

    Run "dotnet" @(
        "restore",
        (Join-RepoPath @($repoRoot, "Jellyfin.Plugin.MediaPreview.Tests", "Jellyfin.Plugin.MediaPreview.Tests.csproj"))
    ) "Backend test project restore failed."

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

    $includeFiles = @(
        "Jellyfin.Plugin.MediaPreview.dll",
        "Jellyfin.Plugin.MediaPreview.deps.json",
        "Jellyfin.Plugin.MediaPreview.runtimeconfig.json",
        "Newtonsoft.Json.dll"
    )

    if ($Target -eq "Server") {
        Step "Installing into Jellyfin plugin folder"

        Install-ToServer `
            -SourceDir $buildOutput `
            -Files $includeFiles `
            -PluginsPath $ServerPluginsPath `
            -Guid $pluginGuid `
            -BuiltVersion $pluginVersion `
            -BackupRoot (Join-RepoPath @($releaseRoot, "server-backup"))

        return
    }

    Step "Preparing release folder"

    if (Test-Path -LiteralPath $stageDir) {
        Remove-Item -LiteralPath $stageDir -Recurse -Force
    }

    if (Test-Path -LiteralPath $zipPath) {
        Remove-Item -LiteralPath $zipPath -Force
    }

    New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

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
        imageUrl = $pluginImageUrl
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
