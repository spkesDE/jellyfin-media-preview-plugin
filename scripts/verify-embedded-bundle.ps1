param(
    [Parameter(Mandatory = $true)]
    [string]$AssemblyPath,

    [Parameter(Mandatory = $true)]
    [string]$BundlePath,

    [Parameter(Mandatory = $false)]
    [string]$ConfigBundlePath
)

$ErrorActionPreference = "Stop"

$resolvedAssemblyPath = (Resolve-Path -LiteralPath $AssemblyPath).Path
$assembly = [System.Reflection.Assembly]::LoadFile($resolvedAssemblyPath)

function Verify-Bundle {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [string]$ResourceName
    )

    $resolvedBundlePath = (Resolve-Path -LiteralPath $Path).Path
    $bundleBytes = [System.IO.File]::ReadAllBytes($resolvedBundlePath)
    $resourceStream = $assembly.GetManifestResourceStream($ResourceName)
    if ($null -eq $resourceStream) {
        throw "Built plugin does not contain the embedded frontend bundle '$ResourceName'."
    }

    try {
        $resourceBuffer = New-Object System.IO.MemoryStream
        try {
            $resourceStream.CopyTo($resourceBuffer)
            $resourceBytes = $resourceBuffer.ToArray()
        } finally {
            $resourceBuffer.Dispose()
        }
    } finally {
        $resourceStream.Dispose()
    }

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bundleHash = [System.BitConverter]::ToString($sha256.ComputeHash($bundleBytes)).Replace("-", "")
        $resourceHash = [System.BitConverter]::ToString($sha256.ComputeHash($resourceBytes)).Replace("-", "")
    } finally {
        $sha256.Dispose()
    }

    if ($bundleBytes.Length -ne $resourceBytes.Length -or $bundleHash -ne $resourceHash) {
        throw "Embedded frontend bundle does not match dist output. Dist=$($bundleBytes.Length) bytes/$bundleHash Embedded=$($resourceBytes.Length) bytes/$resourceHash"
    }

    $strictUtf8 = New-Object System.Text.UTF8Encoding($false, $true)
    $resourceText = $strictUtf8.GetString($resourceBytes).TrimEnd()
    if (-not $resourceText.StartsWith('"use strict";') -or -not $resourceText.EndsWith("})();")) {
        throw "Embedded frontend bundle failed content boundary validation."
    }

    Write-Host "Verified embedded frontend bundle: $($resourceBytes.Length) bytes, SHA-256 $resourceHash"
}

Verify-Bundle -Path $BundlePath -ResourceName "Jellyfin.Plugin.MediaPreview.dist.mediapreview.bundle.js"

if (-not [string]::IsNullOrWhiteSpace($ConfigBundlePath)) {
    Verify-Bundle -Path $ConfigBundlePath -ResourceName "Jellyfin.Plugin.MediaPreview.dist.config.bundle.js"
}
