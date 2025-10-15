# Deployment από Windows

## Μέθοδος 1: PowerShell Script (Προτεινόμενο)

### Βασική Χρήση

```powershell
# Build και δημιουργία deployment package
.\deploy.ps1 production
```

Αυτό θα:
1. ✅ Build το application (`npm run build`)
2. ✅ Δημιουργήσει `deploy-YYYYMMDD-HHMMSS.zip`
3. ℹ️ Θα σας πει τι να κάνετε μετά

### Upload στον Server

#### Με FileZilla / WinSCP (GUI)
1. Ανοίξτε FileZilla/WinSCP
2. Συνδεθείτε στον server
3. Upload το `deploy-YYYYMMDD-HHMMSS.zip` στο `/var/www/vhosts/billiardtoday.com/billiardtoday-frontend/`

#### Με SSH (Command Line)
```powershell
# Αν έχετε OpenSSH
scp deploy-*.zip user@your-server.com:/var/www/vhosts/billiardtoday.com/billiardtoday-frontend/
```

### Deploy στον Server

Συνδεθείτε με SSH (PuTTY ή Windows Terminal):

```bash
cd /var/www/vhosts/billiardtoday.com/billiardtoday-frontend

# Backup current version
if [ -d ".next" ]; then
    mv .next .next.backup.$(date +%Y%m%d-%H%M%S)
fi

# Extract
unzip -o deploy-*.zip

# Install dependencies
npm ci --production

# Restart
pm2 restart billiardtoday-frontend

# Verify
pm2 status
pm2 logs billiardtoday-frontend --lines 50
```

---

## Μέθοδος 2: Git-based Deployment (Πιο Απλό)

### Local (Windows)

```powershell
# Κάντε τις αλλαγές σας
git add .
git commit -m "Update frontend"
git push origin main
```

### Server (SSH)

```bash
cd /var/www/vhosts/billiardtoday.com/billiardtoday-frontend

# Pull latest code
git pull origin main

# Install dependencies (αν χρειάζεται)
npm ci --production

# Build
npm run build

# Restart
pm2 restart billiardtoday-frontend
```

---

## Μέθοδος 3: Automatic Deployment (Advanced)

### Ενεργοποίηση Automatic Upload στο deploy.ps1

Uncomment τα sections 3 & 4 στο `deploy.ps1` και ρυθμίστε:

```powershell
$SERVER_HOST = "your-server.com"
$SERVER_USER = "your-user"
```

### Προαπαιτούμενα

#### Για WinSCP:
1. Download: https://winscp.net/
2. Install
3. Ρυθμίστε SSH key authentication

#### Για PuTTY (pscp/plink):
1. Download: https://www.putty.org/
2. Install
3. Προσθέστε στο PATH: `C:\Program Files\PuTTY\`

#### Για OpenSSH (Windows 10/11):
```powershell
# Ελέγξτε αν υπάρχει
ssh -V

# Αν όχι, εγκαταστήστε από Settings → Apps → Optional Features → OpenSSH Client
```

### SSH Key Setup (Προτεινόμενο)

```powershell
# Δημιουργία SSH key
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key στον server
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh user@server "cat >> ~/.ssh/authorized_keys"
```

---

## Troubleshooting

### "Execution Policy" Error

```powershell
# Αν δείτε error για execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ZIP Command Not Found

Το `Compress-Archive` είναι built-in στο PowerShell 5.0+. Ελέγξτε την έκδοση:

```powershell
$PSVersionTable.PSVersion
```

### Build Fails

```powershell
# Καθαρίστε και ξαναδοκιμάστε
Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
npm install
npm run build
```

### Upload Fails

Ελέγξτε:
- ✅ SSH access στον server
- ✅ Firewall settings
- ✅ Server path exists
- ✅ Permissions

---

## Quick Reference

### PowerShell Commands

```powershell
# Build only
npm run build

# Create package
.\deploy.ps1

# Check package contents
Expand-Archive -Path deploy-*.zip -DestinationPath temp-check
Get-ChildItem temp-check -Recurse
Remove-Item temp-check -Recurse
```

### Server Commands

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs billiardtoday-frontend

# Restart
pm2 restart billiardtoday-frontend

# Stop
pm2 stop billiardtoday-frontend

# Start
pm2 start ecosystem.config.js
```

---

## Σύγκριση Μεθόδων

| Μέθοδος | Πλεονεκτήματα | Μειονεκτήματα |
|---------|---------------|---------------|
| **PowerShell Script** | ✅ Automated<br>✅ Consistent builds<br>✅ Windows-friendly | ⚠️ Manual upload<br>⚠️ Extra step |
| **Git-based** | ✅ Πολύ απλό<br>✅ Version control<br>✅ Rollback εύκολο | ⚠️ Build στον server<br>⚠️ Server resources |
| **Automatic** | ✅ One command<br>✅ Πλήρως automated | ⚠️ Setup required<br>⚠️ SSH keys needed |

---

## Προτεινόμενο Workflow

Για development/testing:
```powershell
# Local testing
npm run dev

# Commit changes
git add .
git commit -m "Feature: xyz"
git push
```

Για production deployment:
```powershell
# Option A: PowerShell script
.\deploy.ps1
# Μετά upload manually

# Option B: Git-based
git push
# SSH στον server και pull
```

---

## Environment Variables

Πριν το deployment, βεβαιωθείτε ότι το `.env.production` έχει τα σωστά values:

```env
NEXT_PUBLIC_STRAPI_URL=https://app.billiardtoday.com
NEXT_PUBLIC_SITE_URL=https://billiardtoday.com
NEXT_PUBLIC_ADMIN_URL=https://admin.billiardtoday.com
NEXT_PUBLIC_SCOREBOARD_URL=https://scoreboard.billiardtoday.com
NODE_ENV=production
PORT=3022
```

⚠️ **Προσοχή**: Μην κάνετε commit το `.env.production` με sensitive data στο Git!
