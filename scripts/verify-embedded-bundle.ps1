param(
    [Parameter(Mandatory = $true)]
    [string]$AssemblyPath,

    [Parameter(Mandatory = $true)]
    [string]$BundlePath
)

$ErrorActionPreference = "Stop"

$resolvedAssemblyPath = (Resolve-Path -LiteralPath $AssemblyPath).Path
$resolvedBundlePath = (Resolve-Path -LiteralPath $BundlePath).Path
$resourceName = "Jellyfin.Plugin.MediaPreview.dist.mediapreview.bundle.js"

$bundleBytes = [System.IO.File]::ReadAllBytes($resolvedBundlePath)
$assembly = [System.Reflection.Assembly]::LoadFile($resolvedAssemblyPath)
$resourceStream = $assembly.GetManifestResourceStream($resourceName)
if ($null -eq $resourceStream) {
    throw "Built plugin does not contain the embedded frontend bundle '$resourceName'."
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
