from pathlib import Path
p = Path("/usr/local/sbin/bt-sync")
text = p.read_text()
repls = {
    "pm2 restart billiardtoday-frontend --update-env": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart billiardtoday-frontend --update-env'",
    "pm2 restart strapi-prod --update-env": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart strapi-prod --update-env'",
    "pm2 restart billiardtoday-admin --update-env": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart billiardtoday-admin --update-env'",
    "pm2 restart scoreboard --update-env": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart scoreboard --update-env'",
    "pm2 restart billiardtoday-ws --update-env": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart billiardtoday-ws --update-env'",
    "pm2 save >/dev/null": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 save >/dev/null'",
}
for old, new in repls.items():
    text = text.replace(old, new)
p.write_text(text)
