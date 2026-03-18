# MVP Σχεδιασμός AI Security Agent για Server

Ημερομηνία: 2026-03-17
Στόχος: Linux servers με Plesk, Node, PHP, WordPress, systemd, cron
Σκοπός: γρήγορος εντοπισμός, triage και ασφαλές containment περιστατικών ασφαλείας χωρίς να δοθεί σε LLM ανεξέλεγκτο root shell

## Στόχος

Να φτιαχτεί ένας AI-assisted security agent που να μπορεί:
- να εντοπίζει persistence και sabotage γρήγορα
- να συσχετίζει anomalies από filesystem, processes, network και services
- να παράγει αυτόματα incident reports
- να εκτελεί ένα μικρό, αυστηρά ελεγχόμενο σύνολο από containment actions

Δεν πρέπει να είναι “αυτόνομο root shell”.

## Βασικές Αρχές

- Read-only by default
- Least privilege παντού
- Deterministic wrappers για system actions
- Πολύ μικρό allowlist για remediation
- Πλήρες audit trail για κάθε observation και action
- Human approval για risky ή destructive ενέργειες
- Local-first evidence collection
- Το LLM να χρησιμοποιείται για ανάλυση και σύνοψη, όχι για ανεξέλεγκτη εκτέλεση commands

## Υψηλού Επιπέδου Αρχιτεκτονική

Το σύστημα έχει 5 επίπεδα:

1. Collectors
- μαζεύουν facts από τον host
- τρέχουν περιοδικά και προαιρετικά με event triggers

2. Normalizer
- μετατρέπει raw outputs σε structured JSON events
- κόβει θόρυβο και, όπου γίνεται, ευαίσθητα δεδομένα

3. Detection Engine
- rules και heuristics πιάνουν τα προφανή malicious patterns
- παράγουν findings με severity και confidence

4. AI Analyzer
- διαβάζει τα structured findings και επιλεγμένο evidence
- χτίζει timeline, hypotheses και recommended actions

5. Response Engine
- εκτελεί μόνο pre-approved wrapper actions
- όλες οι ενέργειες καταγράφονται

## Κύρια Components

### 1. Collector Agent

Τρέχει περιοδικά, π.χ. κάθε 5 λεπτά.

Συλλέγει:
- `ps`, `/proc`, deleted-running executables
- `ss`, listeners, established outbound connections
- `systemctl`, `journalctl`, failed units, masked units
- `/etc/systemd/system`, `/run/systemd/system`
- `/etc/cron*`, `/var/spool/cron/crontabs`
- `/etc/udev/rules.d`
- root dotfiles και critical service binaries
- auth events και SSH events
- Plesk panel logs και extension/task state
- web access/error logs για ύποπτα endpoints
- file metadata changes σε critical paths
- package ownership για modified binaries

Outputs:
- newline-delimited JSON
- ένα event ανά fact

Ενδεικτικά event types:
- `process.deleted_exe`
- `service.masked_runtime`
- `file.permission_anomaly`
- `cron.suspicious_entry`
- `udev.suspicious_rule`
- `network.unexpected_outbound`
- `web.suspicious_request`

### 2. Rule Engine

Αυτό πιάνει τα high-signal patterns χωρίς AI.

Παραδείγματα:
- executable που τρέχει από `/tmp`
- deleted executable που συνεχίζει να τρέχει
- zero-byte executable σε package-owned path
- zero-byte systemd unit
- immutable flag σε κρίσιμα αρχεία χωρίς λόγο
- αρχείο στο `/etc/cron.d` με `curl|sh`, `wget|sh`, `base64 -d`
- `udev` rule με `RUN+=`
- world-writable file σε `/etc`, `/root`, `/opt/plesk`
- runtime mask σε critical services
- package-owned binary που άλλαξε πρόσφατα
- αλλαγές σε root dotfiles
- outbound connection προς σπάνιο ή ύποπτο external IP

Output:
- finding id
- severity
- evidence refs
- confidence
- recommended action class

### 3. AI Analyzer

Το LLM δεν πρέπει να έχει raw shell access.

Παίρνει:
- structured findings
- επιλεγμένα evidence snippets
- baseline
- metadata για τον ρόλο του host

Επιστρέφει:
- summary
- πιθανό timeline
- attack hypothesis
- impact estimate
- recommended next actions
- αν απαιτείται human approval

Κατάλληλο για:
- correlation πολλών αδύναμων σημάτων
- διάκριση outage vs compromise
- σύνταξη incident report
- προτεραιοποίηση ενεργειών

### 4. Response Engine

Αυτό είναι αυστηρό wrapper layer.

Επιτρεπτές ενέργειες στο MVP:
- stop συγκεκριμένου service από allowlist
- remove συγκεκριμένου known-malicious path
- quarantine αρχείου σε incident folder
- fix permissions σε συγκεκριμένα critical directories
- unmask και restart συγκεκριμένου allowlisted service
- forensic copy και hashing
- reload `sshd`, `systemd`, `udev`
- προσωρινό firewall block σε συγκεκριμένο IP

Μη επιτρεπτές στο MVP:
- arbitrary shell execution από model output
- package uninstall χωρίς approval
- αυτόματο delete σε webroot files
- αυτόματη αλλαγή application config
- αυτόματη αλλαγή DB contents
- αυτόματο reboot

### 5. Incident Reporter

Παράγει:
- markdown incident report
- rotation checklist
- timeline
- impacted services
- actions taken
- remaining risk

Μπορεί να αποθηκεύει reports τοπικά και προαιρετικά να τα στέλνει σε Slack/email/Telegram.

## Μοντέλο Ασφαλείας

### Διαχωρισμός Δικαιωμάτων

Χρησιμοποίησε 3 identities:

1. `collector`
- read-only πρόσβαση σε logs, metadata, service state
- χωρίς write δικαιώματα

2. `responder`
- τρέχει μόνο συγκεκριμένα wrappers μέσω `sudo`
- όχι full shell

3. `operator`
- άνθρωπος
- εγκρίνει risky actions

### Sudo Model

Το `sudoers` πρέπει να επιτρέπει μόνο wrapper scripts, π.χ.:
- `/usr/local/security-agent/bin/quarantine-file`
- `/usr/local/security-agent/bin/fix-cron-perms`
- `/usr/local/security-agent/bin/unmask-service`
- `/usr/local/security-agent/bin/restart-allowlisted-service`
- `/usr/local/security-agent/bin/block-ip`

Όχι wildcard shell access.

### Prompt Safety

Τα logs και τα file contents πρέπει να θεωρούνται hostile input.

Άμυνες:
- structured fields αντί για raw τεράστια logs
- αφαίρεση control chars
- αυστηρό truncation
- το model output να μην γίνεται ποτέ shell direct
- schema-validated action proposals

## Προτεινόμενο MVP Stack

### Επιλογή A: Python

Καλή για γρήγορη υλοποίηση.

Components:
- Python 3.12+
- `systemd` timers
- SQLite ή Postgres για findings/history
- `pydantic` για schemas
- `watchdog` ή periodic scans
- OpenAI API για analysis/reporting

Γιατί:
- η πιο γρήγορη επιλογή για wrappers, parsers και JSON pipelines

### Επιλογή B: Go

Καλή αν θέλεις single static binary και χαμηλό overhead.

Για MVP, η Python είναι πιο γρήγορη.

## Προτεινόμενη Δομή Repo

```text
ai-security-agent/
  README.md
  pyproject.toml
  .env.example
  agent/
    main.py
    config.py
    schemas.py
    scheduler.py
    baseline.py
    detectors/
      processes.py
      systemd.py
      cron.py
      udev.py
      files.py
      network.py
      plesk.py
      web.py
    collectors/
      shell.py
      journal.py
      filesystem.py
      procfs.py
    responders/
      actions.py
      policy.py
      wrappers.py
    ai/
      analyze.py
      report.py
      prompts.py
    output/
      markdown.py
      alerts.py
  wrappers/
    quarantine-file
    fix-cron-perms
    unmask-service
    restart-service
    block-ip
  systemd/
    ai-security-agent.service
    ai-security-agent.timer
  docs/
    architecture.md
    threat-model.md
    runbook.md
```

## Detection Coverage για το Περιβάλλον σου

### systemd

Να εντοπίζει:
- zero-byte units
- runtime masks στο `/run/systemd/system`
- units που δημιουργήθηκαν πρόσφατα
- `ExecStart` προς `/tmp`, deleted binaries ή περίεργα paths
- service binaries που έγιναν replace ή zero-byte

### cron

Να εντοπίζει:
- πρόσφατες αλλαγές σε `/etc/cron*`
- dangerous permissions
- encoded payloads
- fetch-and-exec commands
- orphaned crontabs

### udev

Να εντοπίζει:
- νέα rules σε `/etc/udev/rules.d`
- `RUN+=` rules
- shell invocation μέσα σε udev rules

### processes

Να εντοπίζει:
- deleted executables που τρέχουν
- executables από `/tmp`, `/var/tmp`, `/dev/shm`
- high CPU άγνωστα processes
- ύποπτα parent-child chains

### packages και binaries

Να εντοπίζει:
- package-owned executable που έγινε zero-byte
- immutable flag σε service binaries
- package verification mismatch

### Plesk / WordPress / PHP

Να εντοπίζει:
- νέους admin users
- extension changes
- suspicious scheduled tasks
- plugin/theme file churn
- αλλαγές σε `wp-config.php`
- bursts σε `wp-login.php` και suspicious plugin endpoints

### Node / Strapi

Να εντοπίζει:
- αλλαγές σε env files
- απώλεια PM2 process list
- app restart loops
- DB connectivity failures που συσχετίζονται με sabotage

## Baseline

Ο agent πρέπει να κρατά baseline για:
- expected services
- expected listeners
- expected package-owned critical binaries
- expected cron files
- expected shell users
- expected Plesk extensions
- expected SSH key fingerprints

Και μετά να χτυπά alert για drift.

## MVP Workflow

### Βήμα 1. Περιοδικό Scan

Κάθε 5 ή 10 λεπτά:
- οι collectors μαζεύουν facts
- το rule engine παράγει findings

### Βήμα 2. Triage

Αν είναι low severity:
- μόνο logging

Αν είναι medium severity:
- alert στον άνθρωπο
- σύντομο summary

Αν είναι high severity:
- forensic copy
- containment plan
- προαιρετικά εκτέλεση pre-approved safe actions

### Βήμα 3. AI Report

Το LLM γράφει:
- τι πιθανότατα έγινε
- γιατί το confidence είναι υψηλό ή χαμηλό
- τι προτείνει ως response

### Βήμα 4. Optional Containment

Παραδείγματα:
- quarantine malicious cron file
- remove malicious udev rule
- repair permissions
- stop known malicious process

### Βήμα 5. Post-Incident Report

Παράγει:
- markdown file
- indicators
- secrets to rotate
- rebuild recommendation

## Παραδείγματα Safe Actions

Παραδείγματα allowlisted actions:

- `quarantine_file(path)`
  - μόνο για paths σε allowlisted critical directories

- `kill_process(pid)`
  - μόνο αν υπάρχει evidence για deleted executable ή `/tmp` executable

- `fix_cron_permissions()`

- `remove_runtime_mask(service)`
  - μόνο για allowlisted services

- `restart_service(service)`
  - μόνο για allowlisted services όπως:
    - `plesk-php83-fpm`
    - `postgresql@16-main`
    - `pm2-root`

- `copy_forensics(src, dst)`

- `hash_file(path)`

## Alert Channels

Για MVP:
- local markdown report
- Telegram bot
- Slack webhook
- email

Το alert πρέπει να περιέχει:
- host
- severity
- top indicators
- impacted services
- recommended action

## Τι θα έπρεπε να είχε πιάσει σε αυτό το Incident

Από το πραγματικό περιστατικό αυτού του server, ο agent θα έπρεπε να είχε εντοπίσει:
- `/tmp/OlLW7jOk (deleted)` να τρέχει ως `root`
- outbound προς `51.81.211.221:19999`
- `/etc/cron.d/auto-upgrade`
- `/etc/udev/rules.d/99-auto-upgrade.rules`
- root dotfile tampering
- zero-byte `/opt/plesk/php/8.3/sbin/php-fpm`
- zero-byte masked `plesk-php83-fpm.service`
- dangerous cron permissions

Αυτός είναι και ο βασικός λόγος που έχει αξία το design.

## Προτεινόμενα MVP Milestones

### Milestone 1

Read-only detector και reporter.

Παραδοτέα:
- periodic scans
- findings JSON
- markdown report
- Telegram/Slack alerts

### Milestone 2

Human-approved containment.

Παραδοτέα:
- wrapper actions
- approval flow
- quarantine και permission repair

### Milestone 3

Host baseline και drift detection.

Παραδοτέα:
- approved service baseline
- SSH key baseline
- package binary baseline

### Milestone 4

Multi-host support.

Παραδοτέα:
- central dashboard
- per-host incidents
- fleet-wide search

## Τι να ΜΗΝ Κάνεις

- Μην δώσεις στο model raw root shell access
- Μην κάνεις auto-delete arbitrary files με βάση model text
- Μην αφήσεις raw logs να οδηγούν κατευθείαν command generation
- Μην κάνεις auto rotation secrets στο MVP
- Μην το βαφτίσεις “fully autonomous security”

## Καλύτερη Πρώτη Έκδοση

Για το δικό σου περιβάλλον, η καλύτερη πρώτη έκδοση είναι:

- Python agent σε κάθε host
- read-only scans κάθε 5 λεπτά
- rules πρώτα, LLM δεύτερο
- Slack/Telegram + markdown reports
- προαιρετικά wrappers για:
  - quarantine malicious file
  - fix perms
  - restart allowlisted services

Αυτό δίνει γρήγορα αξία χωρίς να κάνει το σύστημα επικίνδυνο.

## Προτεινόμενο Επόμενο Βήμα Υλοποίησης

Αν αποφασίσεις να το χτίσεις, ξεκίνα με:

1. process detector
2. cron detector
3. systemd detector
4. udev detector
5. AI markdown incident summarizer

Μόνο αυτό το μικρό σετ θα είχε ήδη εντοπίσει πολύ νωρίτερα το συγκεκριμένο compromise.
