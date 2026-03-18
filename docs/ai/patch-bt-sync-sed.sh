sed -i "s#^  pm2 restart billiardtoday-frontend --update-env#  su -s /bin/bash - \"\$PLESK_USER\" -c 'pm2 restart billiardtoday-frontend --update-env'#" /usr/local/sbin/bt-sync
sed -i "s#^  pm2 restart strapi-prod --update-env#  su -s /bin/bash - \"\$PLESK_USER\" -c 'pm2 restart strapi-prod --update-env'#" /usr/local/sbin/bt-sync
sed -i "s#^  pm2 restart billiardtoday-admin --update-env#  su -s /bin/bash - \"\$PLESK_USER\" -c 'pm2 restart billiardtoday-admin --update-env'#" /usr/local/sbin/bt-sync
sed -i "s#^  pm2 restart scoreboard --update-env#  su -s /bin/bash - \"\$PLESK_USER\" -c 'pm2 restart scoreboard --update-env'#" /usr/local/sbin/bt-sync
sed -i "s#^  pm2 restart billiardtoday-ws --update-env#  su -s /bin/bash - \"\$PLESK_USER\" -c 'pm2 restart billiardtoday-ws --update-env'#" /usr/local/sbin/bt-sync
sed -i "s#^pm2 save >/dev/null#su -s /bin/bash - \"\$PLESK_USER\" -c 'pm2 save >/dev/null'#" /usr/local/sbin/bt-sync
grep -n 'pm2 restart\|pm2 save' /usr/local/sbin/bt-sync