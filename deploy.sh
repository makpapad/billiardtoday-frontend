#!/bin/bash

# Deployment script για Billiard Today Frontend
# Χρήση: ./deploy.sh [environment]
# Παράδειγμα: ./deploy.sh production

set -e

ENVIRONMENT=${1:-production}
APP_NAME="billiardtoday-frontend"
$SERVER_PATH = "/var/www/vhosts/billiardtoday.com/tournaments-app"

echo "🚀 Deploying $APP_NAME to $ENVIRONMENT..."

# Colors για output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Build locally
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# 2. Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"
tar -czf deploy-$(date +%Y%m%d-%H%M%S).tar.gz \
    .next \
    public \
    package.json \
    package-lock.json \
    next.config.js \
    server.js \
    ecosystem.config.js \
    .env.production

echo -e "${GREEN}✅ Package created${NC}"

# 3. Upload to server (χρειάζεται SSH access)
# Uncomment και ρυθμίστε το SERVER_HOST
# SERVER_HOST="your-server.com"
# SERVER_USER="your-user"
# 
# echo -e "${YELLOW}📤 Uploading to server...${NC}"
# scp deploy-*.tar.gz $SERVER_USER@$SERVER_HOST:$SERVER_PATH/
# 
# echo -e "${GREEN}✅ Upload complete${NC}"

# 4. Deploy on server (via SSH)
# Uncomment για automatic deployment
# echo -e "${YELLOW}🔧 Deploying on server...${NC}"
# ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
#     cd /var/www/vhosts/billiardtoday.com/billiardtoday-frontend
#     
#     # Backup current version
#     if [ -d ".next" ]; then
#         mv .next .next.backup.$(date +%Y%m%d-%H%M%S)
#     fi
#     
#     # Extract new version
#     tar -xzf deploy-*.tar.gz
#     
#     # Install dependencies
#     npm ci --production
#     
#     # Restart PM2
#     pm2 restart billiardtoday-frontend
#     
#     # Cleanup old backups (κρατάμε τα 5 τελευταία)
#     ls -t .next.backup.* | tail -n +6 | xargs -r rm -rf
#     
#     echo "✅ Deployment complete!"
# ENDSSH

echo ""
echo -e "${GREEN}✅ Deployment package ready!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Upload το tar.gz file στον server"
echo "2. Extract: tar -xzf deploy-*.tar.gz"
echo "3. Install dependencies: npm ci --production"
echo "4. Restart: pm2 restart billiardtoday-frontend"
echo ""
echo "Ή ενεργοποιήστε το automatic deployment στο script."
