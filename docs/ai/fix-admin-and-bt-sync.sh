python3 - <<'PY'
from pathlib import Path
p = Path('/usr/local/sbin/bt-sync')
lines = p.read_text().splitlines()
replacements = {
    '  pm2 restart billiardtoday-frontend --update-env': '  su -s /bin/bash - "'$'PLESK_USER" -c '\''pm2 restart billiardtoday-frontend --update-env'\''',
    '  pm2 restart strapi-prod --update-env': '  su -s /bin/bash - "'$'PLESK_USER" -c '\''pm2 restart strapi-prod --update-env'\''',
    '  pm2 restart billiardtoday-admin --update-env': '  su -s /bin/bash - "'$'PLESK_USER" -c '\''pm2 restart billiardtoday-admin --update-env'\''',
    '  pm2 restart scoreboard --update-env': '  su -s /bin/bash - "'$'PLESK_USER" -c '\''pm2 restart scoreboard --update-env'\''',
    '  pm2 restart billiardtoday-ws --update-env': '  su -s /bin/bash - "'$'PLESK_USER" -c '\''pm2 restart billiardtoday-ws --update-env'\''',
    'pm2 save >/dev/null': 'su -s /bin/bash - "'$'PLESK_USER" -c '\''pm2 save >/dev/null'\''',
}
lines = [replacements.get(line, line) for line in lines]
p.write_text('\n'.join(lines) + '\n')
PY
chmod 755 /usr/local/sbin/bt-sync
grep -n 'pm2 restart\|pm2 save' /usr/local/sbin/bt-sync
GOOD=$(grep '^STRAPI_API_TOKEN=' /var/www/vhosts/billiardtoday.com/httpdocs/.env.production | cut -d= -f2-)
sed -i "s#^STRAPI_API_TOKEN=.*#STRAPI_API_TOKEN=$GOOD#" /var/www/vhosts/billiardtoday.com/admin.billiardtoday.com/httpdocs/.env.production /root/bt-admin.env.production
grep '^STRAPI_API_TOKEN=' /var/www/vhosts/billiardtoday.com/admin.billiardtoday.com/httpdocs/.env.production
su -s /bin/bash - billiardtoday_srv -c 'pm2 restart billiardtoday-admin --update-env'