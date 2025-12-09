# Deployment script for Billiard Today Frontend (Windows PowerShell)
# Usage: .\deploy.ps1 [environment]
# Example: .\deploy.ps1 production

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

$APP_NAME = "billiardtoday-frontend"

Write-Host "Deploying $APP_NAME to $Environment..." -ForegroundColor Cyan
Write-Host ""

# 1. Clean old build and build locally
Write-Host "Cleaning old build..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Building application..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "Build successful" -ForegroundColor Green
} catch {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# 2. Create deployment package
Write-Host ""
Write-Host "Creating deployment package..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "deploy-$timestamp.zip"

# Create temp folder
$tempDir = "temp-deploy-$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files
Copy-Item -Path ".next" -Destination "$tempDir\.next" -Recurse -Force
Copy-Item -Path "public" -Destination "$tempDir\public" -Recurse -Force
Copy-Item -Path "package.json" -Destination "$tempDir\" -Force
Copy-Item -Path "package-lock.json" -Destination "$tempDir\" -Force
Copy-Item -Path "next.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path "server.js" -Destination "$tempDir\" -Force
Copy-Item -Path "ecosystem.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path ".env.production" -Destination "$tempDir\" -Force

# Create ZIP with 7-Zip if available
$sevenZipPath = $null
if (Test-Path 'C:\Program Files\7-Zip\7z.exe') {
    $sevenZipPath = 'C:\Program Files\7-Zip\7z.exe'
} elseif (Test-Path 'C:\Program Files (x86)\7-Zip\7z.exe') {
    $sevenZipPath = 'C:\Program Files (x86)\7-Zip\7z.exe'
}

if ($sevenZipPath) {
    Write-Host "Using 7-Zip to create deployment package..." -ForegroundColor Yellow
    Push-Location $tempDir
    & $sevenZipPath a -tzip "..\$packageName" * | Out-Null
    Pop-Location
} else {
    Write-Host "7-Zip not found, using Compress-Archive..." -ForegroundColor Yellow
    Push-Location $tempDir
    Compress-Archive -Path * -DestinationPath "..\$packageName" -Force
    Pop-Location
}

# Cleanup temp folder
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Package created: $packageName" -ForegroundColor Green

# 3. Upload to server via SFTP (WinSCP)
$SERVER_HOST = "billiardtoday.com"
$SERVER_USER = "root"
$REMOTE_PATH = "/var/www/vhosts/billiardtoday.com/tournaments-app"

Write-Host ""
Write-Host "Uploading to server via WinSCP..." -ForegroundColor Yellow

$winScpPath = $null
if (Test-Path 'C:\Program Files\WinSCP\WinSCP.com') {
    $winScpPath = 'C:\Program Files\WinSCP\WinSCP.com'
} elseif (Test-Path 'C:\Program Files (x86)\WinSCP\WinSCP.com') {
    $winScpPath = 'C:\Program Files (x86)\WinSCP\WinSCP.com'
} elseif (Test-Path 'C:\Users\MobileRepairs\AppData\Local\Programs\WinSCP\WinSCP.com') {
    $winScpPath = 'C:\Users\MobileRepairs\AppData\Local\Programs\WinSCP\WinSCP.com'
}

if (-not $winScpPath) {
    Write-Host "WinSCP.com not found. Skipping automatic upload." -ForegroundColor Yellow
} else {
    $privateKey = 'D:\.ssh\priv1.ppk'
    $openCmd = 'open sftp://' + $SERVER_USER + '@' + $SERVER_HOST + '/ -privatekey="' + $privateKey + '" -hostkey=*'
    $putCmd = 'put ' + $packageName + ' ' + $REMOTE_PATH + '/'
    $exitCmd = 'exit'

    & $winScpPath /command $openCmd $putCmd $exitCmd

    Write-Host "Upload complete" -ForegroundColor Green

    # 4. Run remote deploy commands via SSH (unzip, npm ci, pm2 restart)
    Write-Host ""
    Write-Host "Running remote deploy commands..." -ForegroundColor Yellow

    $plinkPath = $null
    if (Test-Path 'C:\Program Files\PuTTY\plink.exe') {
        $plinkPath = 'C:\Program Files\PuTTY\plink.exe'
    } elseif (Test-Path 'C:\Program Files (x86)\PuTTY\plink.exe') {
        $plinkPath = 'C:\Program Files (x86)\PuTTY\plink.exe'
    }

    if (-not $plinkPath) {
        Write-Host "PuTTY plink not found. Please run deploy commands manually on server." -ForegroundColor Yellow
    } else {
        $remoteCmd = 'cd ' + $REMOTE_PATH + ' && unzip -o ' + $packageName + ' && chown -R billiardtoday.com_ubp3p6bqjh:psacln . && npm ci --production && pm2 restart ' + $APP_NAME
        & $plinkPath -ssh $SERVER_USER@$SERVER_HOST -i $privateKey $remoteCmd
        Write-Host "Remote deploy complete" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Deployment package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Package location: $((Get-Location).Path)\$packageName" -ForegroundColor Gray
