from pathlib import Path
p = Path('/usr/local/sbin/bt-sync')
lines = p.read_text().splitlines()
replacements = {
    "  pm2 restart billiardtoday-frontend --update-env": "  su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart billiardtoday-frontend --update-env'",
    "  pm2 restart strapi-prod --update-env": "  su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart strapi-prod --update-env'",
    "  pm2 restart billiardtoday-admin --update-env": "  su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart billiardtoday-admin --update-env'",
    "  pm2 restart scoreboard --update-env": "  su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart scoreboard --update-env'",
    "  pm2 restart billiardtoday-ws --update-env": "  su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 restart billiardtoday-ws --update-env'",
    "pm2 save >/dev/null": "su -s /bin/bash - \"$PLESK_USER\" -c 'pm2 save >/dev/null'",
}
lines = [replacements.get(line, line) for line in lines]
p.write_text("\n".join(lines) + "\n")
