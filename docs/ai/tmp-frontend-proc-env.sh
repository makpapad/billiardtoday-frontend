#!/bin/bash
set -e
PID=$(su -s /bin/bash - billiardtoday_srv -c "pm2 pid billiardtoday-frontend" | tail -n 1)
echo "pid=$PID"
tr '\0' '\n' < "/proc/${PID}/environ" | grep -E '^(STRAPI_API_TOKEN|NEXT_PUBLIC_STRAPI_URL|NODE_ENV|CMS_FETCH_TIMEOUT_MS)=' || true