#!/bin/bash
set -e
ENV_FILE=/var/www/vhosts/billiardtoday.com/httpdocs/.env.production
TOKEN=$(sed -n 's/^STRAPI_API_TOKEN=//p' "$ENV_FILE")
echo "public_pages_status=$(curl -g -k -sS -o /tmp/public_pages.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'https://app.billiardtoday.com/api/pages?filters[slug][$eq]=home&pagination[page]=1&pagination[pageSize]=1&populate[sections][populate]=*&populate[seo][populate]=*&populate[coverImage][populate]=*')"
head -c 200 /tmp/public_pages.out; echo
echo "public_site_status=$(curl -g -k -sS -o /tmp/public_site.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'https://app.billiardtoday.com/api/site-setting?populate=*')"
head -c 200 /tmp/public_site.out; echo
echo "local_pages_status=$(curl -g -sS -o /tmp/local_pages.out -w '%{http_code}' -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:1337/api/pages?filters[slug][$eq]=home&pagination[page]=1&pagination[pageSize]=1&populate[sections][populate]=*&populate[seo][populate]=*&populate[coverImage][populate]=*')"
head -c 200 /tmp/local_pages.out; echo