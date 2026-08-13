<#
.SYNOPSIS
  Builds card-studio's embeddable bundle and deploys it into a local
  moxproxies-website checkout that lives inside WSL.

.DESCRIPTION
  One command for the card-studio -> moxproxies-website loop documented in
  README's "How this is meant to connect to moxproxies-website": build the
  embed bundle (native Windows pnpm, since that's where this checkout's
  node_modules live), then hand off to WSL to copy dist/embed into the
  website's public/vendor/card-studio, stamp SOURCE_COMMIT with this
  build's commit hash, and commit it there. Pass -Push to also push.

  The actual copy/commit logic lives in deploy-to-moxproxies.sh (in this
  same folder) so it can be tested/run on its own from plain bash too —
  this script's only job is "build on Windows, then call that from WSL".

.PARAMETER WebsiteDir
  The moxproxies-website checkout, as a path *inside* WSL (e.g.
  /home/laravel/projects/moxproxies-website) — that repo lives under WSL
  even though card-studio itself is a native Windows checkout.

.PARAMETER WslDistro
  The WSL distro name the website checkout lives under (see `wsl -l`).

.PARAMETER Push
  Also `git push` the moxproxies-website commit once it's made.

.EXAMPLE
  .\scripts\deploy-to-moxproxies.ps1
.EXAMPLE
  .\scripts\deploy-to-moxproxies.ps1 -Push
#>
[CmdletBinding()]
param(
  [string]$WebsiteDir = "/home/laravel/projects/moxproxies-website",
  [string]$WslDistro = "Ubuntu",
  [switch]$Push
)

$ErrorActionPreference = "Stop"

# This script lives in <repo>\scripts\ — repo root is its parent.
$CardStudioDir = Split-Path -Parent $PSScriptRoot

Write-Host "==> Building card-studio embed bundle ($CardStudioDir)" -ForegroundColor Cyan
Push-Location (Join-Path $CardStudioDir "apps\editor")
try {
  pnpm run build
  if ($LASTEXITCODE -ne 0) { throw "pnpm run build failed (exit $LASTEXITCODE)" }
} finally {
  Pop-Location
}

$commitHash = (git -C $CardStudioDir rev-parse HEAD).Trim()
$shortHash = $commitHash.Substring(0, 7)

# Windows path -> the same file as WSL sees it: C:\Users\... -> /mnt/c/Users/...
$driveLetter = $CardStudioDir.Substring(0, 1).ToLower()
$restOfPath = ($CardStudioDir.Substring(2) -replace '\\', '/')
$cardStudioDirInWsl = "/mnt/$driveLetter$restOfPath"
$embedDirInWsl = "$cardStudioDirInWsl/apps/editor/dist/embed"
$deployScriptInWsl = "$cardStudioDirInWsl/scripts/deploy-to-moxproxies.sh"

$pushArg = if ($Push) { "--push" } else { "" }

Write-Host "==> Deploying card-studio@$shortHash into $WebsiteDir (WSL distro: $WslDistro)" -ForegroundColor Cyan
# Windows checkouts of this repo can have deploy-to-moxproxies.sh on disk
# with CRLF line endings (Git for Windows' common core.autocrlf=true
# default, if the working tree was cloned/checked out before .gitattributes
# forced LF for *.sh) — bash then fails parsing e.g. "set -euo pipefail\r"
# as an invalid -o argument. Strip any \r in place inside WSL first,
# unconditionally and idempotently (a no-op if the file is already LF),
# rather than depending on the checkout being correct.
$bashCmd = "sed -i 's/\r`$//' '$deployScriptInWsl' && bash '$deployScriptInWsl' '$embedDirInWsl' '$WebsiteDir' '$commitHash' '$pushArg'"
wsl -d $WslDistro bash -c $bashCmd
if ($LASTEXITCODE -ne 0) { throw "deploy-to-moxproxies.sh failed (exit $LASTEXITCODE)" }

Write-Host "==> Done: card-studio@$shortHash is live in $WebsiteDir/public/vendor/card-studio" -ForegroundColor Green
