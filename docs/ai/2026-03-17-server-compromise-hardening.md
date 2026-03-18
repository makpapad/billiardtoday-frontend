# Server Compromise and Hardening Report

Date: 2026-03-17
Host: `138.201.29.162`
Scope: outage recovery, malware containment, persistence cleanup, PHP/Plesk recovery, basic hardening

## Executive Summary

The server was compromised at `2026-03-17 14:09:29-14:09:31 EET` with root-level impact.

Confirmed malicious activity included:
- a malicious binary from `/tmp/OlLW7jOk (deleted)` running as `root`
- outbound communication to `51.81.211.221:19999`
- cron persistence via `/etc/cron.d/auto-upgrade`
- udev persistence via `/etc/udev/rules.d/99-auto-upgrade.rules`
- destructive tampering of:
  - `/root/.profile`
  - `/root/.bashrc`
  - `/etc/systemd/system/plesk-php83-fpm.service`
  - `/run/systemd/system/plesk-php83-fpm.service`
  - `/opt/plesk/php/8.3/sbin/php-fpm`

The host must be treated as fully compromised as `root`.

## Outage Root Cause

The original `Service Unavailable` issue was not caused by Strapi deployment code.

Observed:
- PM2 process list had been lost until `pm2 resurrect`
- Strapi then failed because PostgreSQL was down
- `postgresql@16-main` was not running

Recovery performed:
- `pm2 resurrect`
- `systemctl start postgresql@16-main`
- `pm2 restart strapi-prod`
- `systemctl enable postgresql@16-main`

Result:
- Strapi admin recovered
- Node/scoreboard services recovered

## Malware and Persistence

### Malicious process

- Process: `./OlLW7jOk`
- Run context: `root`, orphaned under `PID 1`
- Origin: `/tmp/OlLW7jOk (deleted)`
- Network: outbound to `51.81.211.221:19999`

Forensic copy:
- `/root/incident-2026-03-17-malware/OlLW7jOk.bin`
- SHA256: `bdb1991d4c6577c48379d9761a47728211eb6d156e8561fe02091ef9eb01510e`

### Persistence mechanisms

1. Cron persistence
- File: `/etc/cron.d/auto-upgrade`
- Behavior: fetched and executed remote shell from `http://abcdefghijklmnopqrst.net/sh`

2. Udev persistence
- File: `/etc/udev/rules.d/99-auto-upgrade.rules`
- Behavior: recreated `/etc/cron.d/auto-upgrade` using the same payload

### Destructive tampering

At `2026-03-17 14:09:29-14:09:31` the attacker also modified or created:
- `/root/.profile`
- `/root/.bashrc`
- `/root/.autoinstallerrc`
- cron files and cron permissions
- `/etc/systemd/system/plesk-php83-fpm.service` as zero-byte immutable file
- `/run/systemd/system/plesk-php83-fpm.service` as zero-byte immutable file
- `/opt/plesk/php/8.3/sbin/php-fpm` as zero-byte immutable file

This was sabotage, not only persistence.

## Containment and Repair Performed

### Containment

- killed malicious process
- collected forensic binary copy
- collected malicious cron copy
- collected malicious udev rule copy
- removed `/etc/cron.d/auto-upgrade`
- removed `/etc/udev/rules.d/99-auto-upgrade.rules`
- corrected cron and crontab permissions

Forensic folder:
- `/root/incident-2026-03-17-malware/`

### Root shell repair

- backed up tampered files:
  - `/root/incident-2026-03-17-malware/root-shell-init/.profile.2026-03-17-145228`
  - `/root/incident-2026-03-17-malware/root-shell-init/.bashrc.2026-03-17-145228`
- restored `/root/.profile` and `/root/.bashrc` from `/etc/skel`

### PHP/Plesk repair

- removed bogus immutable masked unit files
- reinstalled package `plesk-php83-fpm`
- restored `/opt/plesk/php/8.3/sbin/php-fpm`
- unmasked and restarted `plesk-php83-fpm`

Verified after repair:
- `mobilerepairs.gr` -> `HTTP/2 200`
- `cardhobby.gr` -> `HTTP/2 200`
- `billiardtoday.com` -> `HTTP/2 200`
- `admin.billiardtoday.com` -> `HTTP/2 302`
- `app.billiardtoday.com` -> `HTTP/2 302`
- `scoreboard.billiardtoday.com` -> `HTTP/2 200`

## Hardening Applied

### SSH

Added `/etc/ssh/sshd_config.d/99-local-hardening.conf` with:
- `X11Forwarding no`
- `AllowTcpForwarding no`
- `AllowAgentForwarding no`
- `PermitEmptyPasswords no`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`
- `PermitRootLogin prohibit-password`

Effective SSH state after reload:
- `passwordauthentication no`
- `pubkeyauthentication yes`
- `permitrootlogin without-password`
- `x11forwarding no`
- `allowtcpforwarding no`
- `allowagentforwarding no`

### Permissions

Corrected:
- `/root/.autoinstallerrc` -> `600`
- forensic root-shell-init backups -> `600`
- cron trees and crontabs restored to sane ownership and permissions

## Persistence Sweep Status

No active malicious persistence remained in:
- `/etc/cron.d`
- `/etc/udev/rules.d`
- `/etc/systemd/system`
- `/run/systemd/system`

Remaining related files are only forensic copies:
- `/root/incident-2026-03-17-malware/99-auto-upgrade.rules`
- `/root/incident-2026-03-17-malware/auto-upgrade.cron`
- `/root/incident-2026-03-17-malware/OlLW7jOk.bin`

## Credentials to Rotate Immediately

Treat all secrets on the host as compromised.

Rotate:
- all SSH keys for `root` and `deploy`
- Plesk admin credentials and API tokens
- Strapi secrets in:
  - `/var/www/vhosts/billiardtoday.com/app.billiardtoday.com/httpdocs/.env`
- PostgreSQL password used by Strapi
- WordPress database credentials and salts for:
  - `mobilerepairs.gr`
  - `cardhobby.gr`
  - `aranitisroses.gr`
  - `deligreco.dk`
  - `yeerro.com`
- any SMTP or third-party tokens stored in env/config files

## Current Best Assessment of Entry Path

There is still no single smoking-gun request proving initial access.

Most likely path at this stage:
- compromise through web-facing PHP/Plesk/WordPress surface
- local privilege escalation or root-capable panel execution
- persistence and sabotage executed as `root`

What is not supported by current evidence:
- direct compromise through the Node apps
- rogue SSH key insertion as the primary entry path

## Recommended Next Steps

1. Rotate all secrets immediately.
2. Audit Plesk admin accounts, extensions, scheduled tasks, and event handlers.
3. Audit WordPress plugins and themes on all hosted PHP sites.
4. Export and preserve forensic artifacts and key logs.
5. Rebuild the host from a known-clean base image.
6. Restore only verified application code, data, and minimal configuration.

## Important Note

This server is operational again, but it is not trustworthy.

Hardening and cleanup reduce immediate risk. They do not make a root-compromised host clean.
