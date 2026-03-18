#!/bin/bash
set -e
ENV_FILE=/var/www/vhosts/billiardtoday.com/httpdocs/.env.production
TOKEN=$(sed -n 's/^STRAPI_API_TOKEN=//p' "$ENV_FILE")
echo "env_file_exists=$(test -f "$ENV_FILE" && echo yes || echo no)"
echo "token_len=${#TOKEN}"
echo "pages_status=$(curl -g -sS -o /tmp/pages.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:1337/api/pages?filters[slug][$eq]=home&pagination[page]=1&pagination[pageSize]=1&populate[sections][populate]=*&populate[seo][populate]=*&populate[coverImage][populate]=*')"
head -c 200 /tmp/pages.out; echo
echo "site_status=$(curl -g -sS -o /tmp/site.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:1337/api/site-setting?populate=*')"
head -c 200 /tmp/site.out; echo
echo "pm2_env:"
su -s /bin/bash - billiardtoday_srv -c "pm2 env billiardtoday-frontend | grep -E 'STRAPI_API_TOKEN|NEXT_PUBLIC_STRAPI_URL' || true"