#!/bin/bash
set -euo pipefail
APPUSER='billiardtoday_srv'
APPHOME='/var/www/vhosts/billiardtoday.com'
USER_PM2='PM2_HOME=/var/www/vhosts/billiardtoday.com/.pm2 pm2'
install -d -m 755 -o ${APPUSER} -g psacln ${APPHOME}/.pm2
pm2 stop billiardtoday-frontend || true
su - ${APPUSER} -c "${USER_PM2} delete billiardtoday-frontend >/dev/null 2>&1 || true; ${USER_PM2} start /var/www/vhosts/billiardtoday.com/httpdocs/server.js --name billiardtoday-frontend --cwd /var/www/vhosts/billiardtoday.com/httpdocs --interpreter /usr/bin/node --update-env"
pm2 stop billiardtoday-ws || true
su - ${APPUSER} -c "${USER_PM2} delete billiardtoday-ws >/dev/null 2>&1 || true; PORT=3010 NODE_ENV=production ${USER_PM2} start /var/www/vhosts/billiardtoday.com/ws.billiardtoday.com/httpdocs/server.js --name billiardtoday-ws --cwd /var/www/vhosts/billiardtoday.com/ws.billiardtoday.com/httpdocs --interpreter /usr/bin/node --update-env"
pm2 stop strapi-prod || true
su - ${APPUSER} -c "${USER_PM2} delete strapi-prod >/dev/null 2>&1 || true; HOST=0.0.0.0 PORT=1337 NODE_ENV=production ${USER_PM2} start /usr/bin/npm --name strapi-prod --cwd /var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs --interpreter /usr/bin/node --node-args='--max-old-space-size=2048' -- run start"
pm2 stop billiardtoday-admin || true
su - ${APPUSER} -c "${USER_PM2} delete billiardtoday-admin >/dev/null 2>&1 || true; PORT=3002 NODE_ENV=production ${USER_PM2} start /usr/bin/npm --name billiardtoday-admin --cwd /var/www/vhosts/billiardtoday.com/admin.billiardtoday.com/httpdocs --interpreter /usr/bin/node -- run start"
pm2 stop scoreboard || true
su - ${APPUSER} -c "${USER_PM2} delete scoreboard >/dev/null 2>&1 || true; PORT=3001 NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096 ${USER_PM2} start /usr/bin/npm --name scoreboard --cwd /var/www/vhosts/billiardtoday.com/scoreboard.billiardtoday.com/httpdocs --interpreter /usr/bin/node -- run start"
su - ${APPUSER} -c "${USER_PM2} save"
env PATH=$PATH:/usr/bin PM2_HOME=/var/www/vhosts/billiardtoday.com/.pm2 pm2 startup systemd -u ${APPUSER} --hp ${APPHOME} >/tmp/pm2-startup-nonroot.txt
bash /tmp/pm2-startup-nonroot.txt >/dev/null 2>&1 || true
systemctl daemon-reload
systemctl enable pm2-${APPUSER} >/dev/null 2>&1 || true
systemctl restart pm2-${APPUSER} || true
systemctl disable pm2-root >/dev/null 2>&1 || true
systemctl stop pm2-root >/dev/null 2>&1 || true
pm2 kill >/dev/null 2>&1 || true