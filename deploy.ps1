# Deployment script για Billiard Today Frontend (Windows PowerShell)
# Χρήση: .\deploy.ps1 [environment]
# Παράδειγμα: .\deploy.ps1 production

param(
    [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"

$APP_NAME = "billiardtoday-frontend"
$SERVER_PATH = "/var/www/vhosts/billiardtoday.com/billiardtoday-frontend"

Write-Host "🚀 Deploying $APP_NAME to $Environment..." -ForegroundColor Cyan
Write-Host ""

# 1. Build locally
Write-Host "📦 Building application..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ Build successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# 2. Create deployment package
Write-Host ""
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "deploy-$timestamp.zip"

# Δημιουργία προσωρινού φακέλου
$tempDir = "temp-deploy-$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Αντιγραφή αρχείων
Copy-Item -Path ".next" -Destination "$tempDir\.next" -Recurse -Force
Copy-Item -Path "public" -Destination "$tempDir\public" -Recurse -Force
Copy-Item -Path "package.json" -Destination "$tempDir\" -Force
Copy-Item -Path "package-lock.json" -Destination "$tempDir\" -Force
Copy-Item -Path "next.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path "server.js" -Destination "$tempDir\" -Force
Copy-Item -Path "ecosystem.config.js" -Destination "$tempDir\" -Force
Copy-Item -Path ".env.production" -Destination "$tempDir\" -Force

# Δημιουργία ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $packageName -Force

# Καθαρισμός
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "✅ Package created: $packageName" -ForegroundColor Green

# 3. Upload to server (Optional - Uncomment και ρυθμίστε)
# Χρειάζεται WinSCP ή pscp (PuTTY)
<#
$SERVER_HOST = "your-server.com"
$SERVER_USER = "your-user"

Write-Host ""
Write-Host "📤 Uploading to server..." -ForegroundColor Yellow

# Με WinSCP (αν είναι εγκατεστημένο)
# & "C:\Program Files (x86)\WinSCP\WinSCP.com" `
#     /command `
#     "open sftp://${SERVER_USER}@${SERVER_HOST}" `
#     "put $packageName $SERVER_PATH/" `
#     "exit"

# Ή με pscp (PuTTY)
# & pscp -batch $packageName ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

Write-Host "✅ Upload complete" -ForegroundColor Green
#>

# 4. Deploy on server (Optional - Uncomment)
<#
Write-Host ""
Write-Host "🔧 Deploying on server..." -ForegroundColor Yellow

# Με plink (PuTTY) ή ssh
$deployCommands = @"
cd $SERVER_PATH
if [ -d ".next" ]; then
    mv .next .next.backup.`$(date +%Y%m%d-%H%M%S)
fi
unzip -o $packageName
npm ci --production
pm2 restart $APP_NAME
ls -t .next.backup.* | tail -n +6 | xargs -r rm -rf
echo '✅ Deployment complete!'
"@

# & plink -batch ${SERVER_USER}@${SERVER_HOST} $deployCommands
# Ή με ssh (αν έχετε OpenSSH)
# & ssh ${SERVER_USER}@${SERVER_HOST} $deployCommands

Write-Host "✅ Deployment complete!" -ForegroundColor Green
#>

Write-Host ""
Write-Host "✅ Deployment package ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Upload το $packageName στον server"
Write-Host "2. SSH στον server:"
Write-Host "   cd $SERVER_PATH"
Write-Host "3. Extract: unzip -o $packageName"
Write-Host "4. Install dependencies: npm ci --production"
Write-Host "5. Restart: pm2 restart $APP_NAME"
Write-Host ""
Write-Host "Ή ενεργοποιήστε το automatic deployment στο script." -ForegroundColor Yellow
Write-Host ""
Write-Host "Package location: $(Get-Location)\$packageName" -ForegroundColor Gray
