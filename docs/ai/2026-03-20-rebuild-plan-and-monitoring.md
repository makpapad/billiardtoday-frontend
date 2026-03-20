# 2026-03-20 Rebuild Plan And Monitoring

## Current Status

The server `138.201.29.162` must still be treated as historically `root`-compromised and therefore not fully trustworthy.

What has been confirmed:

- Historical `root` compromise on 2026-03-17.
- Reinfection on 2026-03-20 through the `billiardtoday.com` frontend web surface.
- Active malicious webshell/RCE paths were found and removed.
- Exposed runtime/API credentials have been rotated.

Current operational status:

- `app.billiardtoday.com` is up.
- `billiardtoday.com` is up.
- `admin.billiardtoday.com` is up.
- `scoreboard.billiardtoday.com` is up.
- `ws` is up.

Important limitation:

- Cleanup and rotation reduce immediate risk.
- They do not make the current host fully trusted again.
- Final remediation is still rebuild from a known-clean base.

## What Has Been Done So Far

### Containment

- Killed active reverse shell and miner processes.
- Removed repeated malicious `billiardtoday_srv` crontab persistence.
- Quarantined malicious binaries and `/var/tmp` artifacts.
- Removed `d1337` backdoor files from the `billiardtoday.com` frontend tree.
- Restarted the affected frontend process after cleanup.

### Root Cause / Entry Findings

- Strongest active reinfection path was unauthenticated command execution through the `billiardtoday.com` frontend.
- Access logs tied the attack window to malicious `POST /` activity and later live command execution.
- Frontend runtime logs showed attacker command execution attempts inside the Next.js runtime.
- `billiardtoday.com` frontend was running vulnerable `Next.js 15.0.4` before patching.
- `mobilerepairs.gr` WordPress/PHP surface was also treated as a likely separate attack surface and hardened.

### Token / Secret Rotation

- Rotated the shared Strapi runtime token used by:
  - `billiardtoday.com`
  - `admin.billiardtoday.com`
  - `ws`
- Revoked the old shared Strapi runtime token.
- Rotated the dedicated `scoreboard` Strapi token.
- Revoked the old `scoreboard` Strapi token.
- Rotated broader application secrets, including:
  - `APP_KEYS`
  - `ADMIN_JWT_SECRET`
  - `JWT_SECRET`
  - `TRANSFER_TOKEN_SALT`
  - `AUTH_SECRET`
  - `NEXTAUTH_SECRET`
  - `ADMIN_LOGIN_LOG_SECRET`
  - `SCREEN_ACTIVATION_SECRET`
  - WS tokens
  - ads impressions token
- Rotated the PostgreSQL password and updated Strapi config.

### App / Runtime Hardening

- Patched `billiardtoday.com` frontend from vulnerable Next.js to `15.0.7`.
- Patched `scoreboard` from `15.4.6` to `15.4.10`.
- Verified the main public endpoints after restarts.

### Access Hardening

- Added a new confirmed working root SSH key.
- Verified access with PuTTY/WinSCP-compatible key and OpenSSH key.
- Removed the old root SSH key after confirmation.

## What Still Remains True

- The host had `root` compromise.
- There may still be persistence or tampering not yet discovered.
- The correct end state is still rebuild and cutover.

## Monitoring Plan For The Next Few Days

Run and review the following at least daily, and immediately if anything looks wrong:

### Process / Persistence Checks

- Confirm no unexpected crontabs for `root` or `billiardtoday_srv`.
- Confirm no suspicious processes under `/tmp`, `/var/tmp`, or random filenames.
- Confirm no unexpected `bash -c`, `sh -c`, miner-like, or long-running outbound processes.

### File Integrity Checks

- Watch for new files under:
  - `/var/tmp`
  - `/tmp`
  - `/var/www/vhosts/billiardtoday.com/httpdocs/pages/api`
  - `/var/www/vhosts/billiardtoday.com/httpdocs/src/pages/api`
  - `/var/www/vhosts/billiardtoday.com/httpdocs/public`
- Watch for unexpected `.php`, `.js`, or executable files inside frontend/public trees.

### Log Review

- Review `billiardtoday.com` access logs for:
  - suspicious `POST /`
  - probes to random paths
  - command-like query strings
  - repeated requests from new attacker IPs
- Review PM2 logs for:
  - command execution errors
  - unexpected shell output
  - file write attempts into app directories

### App Health

- Verify:
  - `https://billiardtoday.com/`
  - `https://app.billiardtoday.com/admin`
  - `https://admin.billiardtoday.com/`
  - `https://scoreboard.billiardtoday.com/scoreboard`
  - `http://127.0.0.1:3010/presence`

### Secret Misuse Indicators

- Monitor whether revoked Strapi tokens show any continued attempted use in logs.
- Watch for authentication failures after rotations that could indicate forgotten old dependencies.

## Rebuild Plan

### Goal

Replace the current server with a known-clean host and move only verified code, config, and data.

### Target Approach

1. Provision a new clean Hetzner server or clean OS image.
2. Install only the required runtime stack.
3. Recreate apps and services from clean repositories and clean deployment artifacts.
4. Recreate env files using only the newly rotated secrets.
5. Restore database and uploads carefully.
6. Validate all domains and internal service flows.
7. Cut over traffic.
8. Decommission the old host.

### Rebuild Checklist

#### Infra

- Create new server.
- Apply OS updates.
- Create non-root operational user.
- Configure SSH with only current approved keys.
- Lock down firewall.

#### Runtime Stack

- Install Node runtime(s) needed by the apps.
- Install PM2 only if still required.
- Install Nginx/Plesk only if truly needed for the target setup.
- Install PostgreSQL or connect to a separate clean DB host.

#### Apps To Deploy Cleanly

- `app.billiardtoday.com`
- `billiardtoday.com`
- `admin.billiardtoday.com`
- `scoreboard.billiardtoday.com`
- `ws`

#### Secrets / Config

- Do not copy old env files blindly.
- Create fresh env files from reviewed values only.
- Use the rotated secrets, not any historical ones.
- Recreate any additional API tokens only if explicitly needed.

#### Data

- Dump and restore PostgreSQL from the currently validated database state.
- Restore uploads/assets only after malware-oriented review.
- Do not copy temporary directories or old app caches.

#### Validation Before Cutover

- Verify public site pages.
- Verify Strapi/admin login.
- Verify scoreboard and WS flows.
- Verify screen activation/provision flows.
- Verify cron/systemd/PM2 state is expected and minimal.

#### Cutover

- Lower DNS TTL if needed.
- Switch traffic.
- Re-run smoke tests.
- Keep old host isolated but available briefly for rollback reference.

#### Decommission

- Power off old host.
- Remove any remaining trust in old keys/tokens tied only to the old host.

## Recommended Operating Mode Until Rebuild

- Keep monitoring daily.
- Avoid adding new services to this host.
- Treat any new anomaly as potential reinfection.
- Prefer rebuilding soon rather than extending trust in this machine.

## Tracking Notes

- Use this file as the running source of truth for:
  - current server trust status
  - monitoring observations
  - rebuild readiness
  - final cutover checklist

## Daily Check Commands

Run these as read-only checks during the monitoring period.

### Basic Health

```bash
curl -I -sS https://billiardtoday.com/
curl -I -sS https://app.billiardtoday.com/admin
curl -I -sS https://admin.billiardtoday.com/
curl -I -sS https://scoreboard.billiardtoday.com/scoreboard
curl -sS http://127.0.0.1:3010/presence | head -c 300
```

### PM2 Status

```bash
su - billiardtoday_srv -s /bin/bash -c 'pm2 ls'
```

### Suspicious Processes

```bash
ps -ef | grep -E 'bash -c|sh -c|/tmp/|/var/tmp/|xmrig|curl .*sh|wget .*sh' | grep -v grep
```

### Root And App Crontabs

```bash
crontab -l 2>/dev/null || true
crontab -u billiardtoday_srv -l 2>/dev/null || true
```

### Temp Directory Sweep

```bash
find /tmp /var/tmp -maxdepth 2 -type f -printf '%TY-%Tm-%Td %TH:%TM:%TS %u %g %p\n' | sort
```

### Frontend Backdoor Sweep

```bash
find /var/www/vhosts/billiardtoday.com/httpdocs -type f \( -name '*.php' -o -name '*.js' \) | grep -E 'upload-d1337|d1337|OQUxbY' || true
grep -RInE '@eval\(base64_decode|child_process.*execSync|execSync\(q\.query|/OQUxbY' /var/www/vhosts/billiardtoday.com/httpdocs --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist 2>/dev/null
```

### Recent Access Log Review

```bash
tail -n 200 /var/www/vhosts/billiardtoday.com/logs/access_ssl_log
grep "$(date '+%d/%b/%Y')" /var/www/vhosts/billiardtoday.com/logs/access_ssl_log | grep -E 'POST / |OQUxbY|d1337|/login\?a='
```

### PM2 Log Review

```bash
su - billiardtoday_srv -s /bin/bash -c 'pm2 logs billiardtoday-frontend --nostream --lines 80'
su - billiardtoday_srv -s /bin/bash -c 'pm2 logs billiardtoday-ws --nostream --lines 80'
su - billiardtoday_srv -s /bin/bash -c 'pm2 logs scoreboard --nostream --lines 80'
```

## Daily Log

Use the following template once per day during the monitoring window.

### 2026-03-20

- Status:
- Public site:
- Strapi/admin:
- Scoreboard:
- WS/presence:
- Suspicious processes:
- Crontabs:
- Temp artifacts:
- Access log anomalies:
- PM2/frontend anomalies:
- Action taken:

### 2026-03-21

- Status:
- Public site:
- Strapi/admin:
- Scoreboard:
- WS/presence:
- Suspicious processes:
- Crontabs:
- Temp artifacts:
- Access log anomalies:
- PM2/frontend anomalies:
- Action taken:

### 2026-03-22

- Status:
- Public site:
- Strapi/admin:
- Scoreboard:
- WS/presence:
- Suspicious processes:
- Crontabs:
- Temp artifacts:
- Access log anomalies:
- PM2/frontend anomalies:
- Action taken:

### 2026-03-23

- Status:
- Public site:
- Strapi/admin:
- Scoreboard:
- WS/presence:
- Suspicious processes:
- Crontabs:
- Temp artifacts:
- Access log anomalies:
- PM2/frontend anomalies:
- Action taken:
