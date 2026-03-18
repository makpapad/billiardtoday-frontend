#!/bin/bash
set -e
TOKEN=$(sed -n 's/^STRAPI_API_TOKEN=//p' /var/www/vhosts/billiardtoday.com/httpdocs/.env.production)
echo "api_status=$(curl -g -sS -o /tmp/home.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:1337/api/pages?filters[slug][$eq]=home&pagination[page]=1&pagination[pageSize]=1&populate[sections][populate]=*&populate[seo][populate]=*')"
head -c 1200 /tmp/home.out; echo
echo ---
echo "site_status=$(curl -k -sS -o /tmp/site.out -w '%{http_code}' https://billiardtoday.com/)"
head -c 500 /tmp/site.out; echo