#!/bin/bash
set -e
PID=$(su -s /bin/bash - billiardtoday_srv -c "pm2 pid billiardtoday-frontend" | tail -n 1)
echo "pid=$PID"
tr '\0' '\n' < "/proc/${PID}/environ" | grep -E '^(STRAPI_API_TOKEN|NEXT_PUBLIC_STRAPI_URL|NODE_ENV)='
curl -s -o /dev/null https://billiardtoday.com/
sleep 1
tail -n 12 /var/www/vhosts/billiardtoday.com/.pm2/logs/billiardtoday-frontend-error.log
echo ---
tail -n 8 /var/www/vhosts/billiardtoday.com/.pm2/logs/billiardtoday-frontend-out.log