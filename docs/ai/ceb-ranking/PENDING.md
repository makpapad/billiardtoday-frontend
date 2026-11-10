# ΕΚΚΡΕΜΟΤΗΤΕΣ — CEB ranking / ροή ομοσπονδιών (08/10/2026)

Σημείο συνέχειας αν ανοίξει νέα συνεδρία. Τα υπόλοιπα στο `CATEGORIES-requirements.md` (ίδιος φάκελος).

## 1. Περιμένουν έγκριση από τον Μάκη (τίποτα δεν έχει εκτελεστεί)
1. **Deploy του nav link**: `4-billiardtoday-frontend/src/components/site/siteHeaderConfig.ts:28` → «Federation login» → `/federation/login` (μέσα στο dropdown «More»). Έτοιμο τοπικά, `tsc` καθαρό, **άσχετο με άλλα working-tree αρχεία** — μην μπουν μαζί στο commit τα docs/ai + public/data.
2. **Χρήστης `ceb`** για `stefano.malacrita@eurobillard.org` (ρόλος `ceb` = up_roles id 13, κανένας χρήστης τώρα). Ο ίδιος ορίζει κωδικό μέσω link «forgot password» (ποτέ plaintext).
3. **Emails**: λείπει `RESEND_API_KEY` από το Strapi `.env` (+ restart `strapi-prod`).
4. **Απόφαση κλειδώματος:** να μπει το `ceb` στο authority του `/account/profile` (code change + admin deploy) ώστε να αλλάζει κωδικό και από μέσα — αλλιώς μην του το υποσχεθούμε.

## 2. Απόφαση που πάρθηκε: τα email settings ΠΑΝΕ ΣΤΗ ΒΑΣΗ, όχι καρφωτά στο env
- **Strapi:** νέο single-type `ranking-mail-setting` (fromName, fromEmail, replyTo, cebRecipients, testRecipient, testMode, adminSiteUrl). **Μόνο το κλειδί Resend μένει στο env.**
- **Admin:** σελίδα «Ranking emails» (authority `['admin','ceb']`) με φόρμα + «δοκιμαστικό email».
- **Mailer:** `1-billiards-strapi/src/utils/ranking-mail.ts` → `sendRankingMail` (from/replyTo/testing) + `services/ranking-review.ts` → `notifyCebOfSubmission` (παραλήπτες). Fallback στο env ώστε να μη σπάσει τίποτα.
- **Υπάρχοντα μοτίβα για αντιγραφή:** Strapi `site-setting` (singleType, `kind: "singleType"`), admin `src/app/(protected-pages)/admin/cms/site-settings/page.tsx`, guards `src/server/admin/rankingReviewAuth.ts` (admin/ceb), API proxy `src/app/api/admin/ranking-review/*`, nav `src/configs/navigation.config/index.ts` (γύρω από `admin.rankingReview`), routes `src/configs/routes.config/routes.config.ts` (γύρω από `/admin/ranking-review`).
- **Κατάσταση: έχει ξεκινήσει ΜΟΝΟ ανάγνωση αρχείων. Καμία αλλαγή κώδικα δεν γράφτηκε ακόμη** (ο χρήστης είπε «περίμενε»).

## 3. Ladies (επόμενη κατηγορία μετά τη ροή)
- V13 ελέγχθηκε: σωστή μετακίνηση σεζόν (206 αθλήτριες, 2.806 πόντοι, 0 διαφορές V12↔V13).
- GP Predator: δικές του ζώνες (9-12:8 / 13-18:4 / 19-24:2) → scale **ανά αγώνα**.
- Σειρά: `Pnts` → `H→G→F→E` → `C` → `A` (επαληθευμένο σε 169 ισοπαλίες, 0 παραβάσεις).
- Στον Stefano έχει σταλεί/δοθεί απάντηση: πρώτα τελειώνει η ροή στην πλατφόρμα, μετά το Ladies.

## 4. Μετά το deploy (γίνονται από εμάς, με το trusted token)
Παραλήπτης ΟΠΩΣ ΔΗΛΩΘΕΙ στο πεδίο των settings (απόφαση χρήστη 08/10/2026 — **χωρίς test mode**): `cebRecipients = stefano.malacrita@eurobillard.org`, `testMode = false`.

```bash
TOKEN=<COMMERCIAL_SERVER_TOKEN / STRAPI_API_TOKEN — server-side, ποτέ σε οθόνη>
# ρυθμίσεις
curl -s -X PUT https://app.billiardtoday.com/api/ranking-review/mail-settings \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"enabled":true,"fromName":"CEB Ranking","fromEmail":"<no-reply@billiardtoday.com>","replyTo":"<φιλικό reply-to>","cebRecipients":"stefano.malacrita@eurobillard.org","testMode":false,"adminSiteUrl":"https://admin.billiardtoday.com"}'
# δοκιμαστικό
curl -s -X POST https://app.billiardtoday.com/api/ranking-review/mail-test -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"to":"stefano.malacrita@eurobillard.org"}'
```
Πρέπει να δει `delivered:true`· αν `not-configured` → λείπει το RESEND_API_KEY από το Strapi .env.

## 5. Χρήστης `ceb` για τον Stefano
`POST https://app.billiardtoday.com/api/users` (Bearer token) με `{username, email, password:<τυχαίο throwaway, δεν κοινοποιείται>, role:13, confirmed:true, blocked:false, provider:"local", initialPasswordChanged:false}` → μετά `POST https://admin.billiardtoday.com/api/auth/forgot-password` με το email του, ώστε **ο ίδιος** να ορίσει κωδικό. Επαλήθευση με SQL: `select u.id,u.email,r.type from up_users u join up_users_role_lnk l on l.user_id=u.id join up_roles r on r.id=l.role_id where u.email='stefano.malacrita@eurobillard.org';`
(Ο `ceb` έχει πλέον και `/account/profile`, οπότε αλλάζει κωδικό και από μέσα.)

## ✅ ΟΛΟΚΛΗΡΩΘΗΚΕ 08/10/2026 (12:04-12:20) — δεν χρειάζεται ξανά
1. **Deploy**: frontend `6de097e` · strapi `77c2f83` · admin `f9e0da19` (committed+pushed) · `bt-sync app/admin/frontend` OK · `RESEND_API_KEY` στο Strapi .env (mirror + live, backup `/root/strapi-env-20261008-1211.bak`) · πίνακας `cms_ranking_mail_settings` υπάρχει.
2. **Live έλεγχοι**: `ping` → `resendConfigured:true` · «Federation login» παρόν στο billiardtoday.com · `/admin/ranking-emails` → 302 (υπάρχει, ζητά sign-in).
3. **Ρυθμίσεις στη βάση** (source=db): from `BilliardToday <noreply@mail.billiardtoday.com>`, reply-to `support@billiardtoday.com`, recipients `stefano.malacrita@eurobillard.org`, testMode **off**, adminSiteUrl `https://admin.billiardtoday.com`.
4. **Δοκιμαστικό email**: `delivered:true` (στάλθηκε σε `support@billiardtoday.com` — το δικό μας γραμματοκιβώτιο, σκόπιμα ΟΧΙ στον Stefano πριν του πούμε ότι είναι έτοιμο).
5. **Χρήστης CEB**: `up_users` id **19**, `stefano.malacrita@eurobillard.org`, confirmed t, blocked f, role `ceb` (id 13). Ο `ceb` έχει πλέον και `/account/profile` → αλλάζει κωδικό και από μέσα.

## ⏳ Τι μένει
- **Σύνδεσμος ορισμού κωδικού στον Stefano** — ΔΕΝ στάλθηκε ακόμη (σκόπιμα): μία εντολή, όποτε θέλεις, ιδανικά μαζί με το μήνυμα «ο λογαριασμός σου είναι έτοιμος»: `POST https://admin.billiardtoday.com/api/auth/forgot-password` με `{"email":"stefano.malacrita@eurobillard.org"}`.
- **Προαιρετικά**: μία πραγματική δοκιμή υποβολής ομοσπονδίας end-to-end (θα στείλει **πραγματικό email στον Stefano**).
- **Επόμενη κατηγορία**: 3C Ladies (V13) — έτοιμα τα στοιχεία στην ενότητα παραπάνω.

## 08/10/2026 — Δοκιμή Λουξεμβούργου: τι έγινε και πού κόλλησε
- **Υποβολή LU**: `ranking_submissions` id 2, 6 γραμμές, submitted από δοκιμαστικό λογαριασμό `lu-federation-test@billiardtoday.com` (up_users id 20, federation 39). Ειδοποίηση email: **ελήφθη** (πραγματικό email, `delivered:true`).
- **Approve + publish**: έγιναν — οι 6 γραμμές γράφτηκαν στο μοντέλο (`ceb_ranking_entries`, origin='submitted', στήλη C=25/26, 131 πόντοι). Το **δημόσιο αρχείο ΔΕΝ ξαναχτίστηκε**.
- **Γιατί κόλλησε**: ο κανόνας πηγής (`CebRankingSourceRuleError`) — 22 διαφορές/10 αθλητές στις δικές μας στήλες [A,H,I,J] έναντι της δημοσιευμένης λίστας. **Δεν πατήθηκε override** (χρειάζεται απόφαση ανθρώπου· env `CEB_ALLOW_SOURCE_DIVERGENCE=1`).
- **Δύο κανόνες που λείπουν**: (1) νέα εθνική σεζόν από υποβολή ⇒ οι παλιότερες εθνικές στήλες της ίδιας ομοσπονδίας δεν μετράνε (τώρα GOEDERT 27 / DA SILVA 13 μένουν ενώ το επίσημο V17 τα έχει 0) · (2) αρχείο: λείπει αντίγραφο της **δικής μας** δημοσιευμένης έκδοσης (`<key>.computed.json`) + UI επιλογέα έκδοσης (το επίσημο αντίγραφο υπάρχει ήδη: `archive/3c-individual/16-2026.json` = 1.482 αθλητές).
- **Τρέχουν subagents**: ① archive computed + κανόνας εθνικών σεζόν (Strapi) · ② επιλογέας έκδοσης στο frontend · ③ έρευνα ρίζας των 22 διαφορών (read-only).
- **Εκκρεμεί**: (α) απόφαση για publish (με ή χωρίς divergence), (β) ενημέρωση/μήνυμα στον Stefano (δεν στάλθηκε τίποτα ακόμη), (γ) ο παραλήπτης ειδοποιήσεων είναι πίσω στον Stefano· reply-to = makpapad@gmail.com.
