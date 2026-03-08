# Δυνατότητες Puck Για Το Strapi CMS

## Σκοπός

Αυτό το έγγραφο ορίζει τι μπορεί να υποστηρίξει ο editor `Puck` στο `2-billiardtoday-admin`, τι είναι ήδη ενεργό στον τωρινό CMS editor, τι θέλει custom υλοποίηση και τι πρέπει να μείνει κρυφό από τους χρήστες προς το παρόν.

Ο στόχος είναι απλός:

- να δίνουμε στους CMS χρήστες μόνο ασφαλή και χρήσιμα features
- να μην αντιγράφουμε τυφλά το public demo του `Puck`
- να κρατήσουμε τον editor όσο πιο κοντά γίνεται στο mental model του WordPress / Gutenberg

## Source Of Truth

Αυτό το matrix βασίζεται στα εξής:

- local package: `D:\Projects\2-billiardtoday-admin\node_modules\@puckeditor\core`
- current editor implementation: `D:\Projects\2-billiardtoday-admin\src\components\cms\puck\PuckPageEditor.tsx`
- current CMS section model για τις public σελίδες του Strapi

Εγκατεστημένη έκδοση:

- `@puckeditor/core` `0.21.1`
- άδεια: `MIT`

## Τι Προσφέρει Το Puck Έτοιμο

Το τοπικό package εκθέτει ήδη τα παρακάτω χρήσιμα primitives:

- editor component: `Puck`
- built-in panes/components: `Puck.Components`, `Puck.Fields`, `Puck.Layout`, `Puck.Outline`, `Puck.Preview`
- editor hook: `usePuck()`
- plugins API
- overrides API
- field transforms API
- action dispatch system
- drag/drop και reorder support
- field types όπως:
  - `text`
  - `textarea`
  - `radio`
  - `select`
  - `array`
  - `object`
  - `richtext`
- viewport controls
- preview/edit mode state

## Διαθέσιμα Overrides

Τα παρακάτω override keys υπάρχουν στο εγκατεστημένο package:

- `header`
- `headerActions`
- `fields`
- `fieldLabel`
- `drawer`
- `drawerItem`
- `componentOverlay`
- `outline`
- `puck`
- `preview`
- `actionBar`

Αυτό είναι σημαντικό γιατί σημαίνει ότι η αριστερή στήλη, ο δεξιός inspector, το block toolbar, τα header actions και το preview shell μπορούν να παραμετροποιηθούν χωρίς fork του `Puck`.

## Διαθέσιμοι Τύποι Actions

Το current package υποστηρίζει action dispatch για operations όπως:

- `insert`
- `move`
- `duplicate`
- `remove`
- `replace`
- `set`
- `setData`
- `setUi`

Αυτό αρκεί για WordPress-like block flow όπως:

- add block
- move up/down
- duplicate
- delete
- custom sidebars
- custom top bar actions

## Τι Έχουμε Ήδη Υλοποιήσει

Τα παρακάτω λειτουργούν ήδη στον current Billiard Today CMS editor:

- visual editor για protected public pages
- Strapi section mapping για:
  - `cms.hero-section`
  - `cms.rich-text-section`
  - `cms.feature-grid-section`
  - `cms.cta-banner`
  - `cms.faq-section`
- inline editing για τα βασικά text fields μέσα στο canvas
- WordPress-like top bar με:
  - `Back to Pages`
  - page title
  - draft/published state
  - `Save Draft`
  - `Preview`
  - `Publish/Update`
- custom block action bar με:
  - `Add Below`
  - `Up`
  - `Down`
  - `Duplicate`
  - `Delete`
- hide/open settings panel
- fullscreen editor entry από τη λίστα σελίδων
- external page settings sidebar με:
  - title
  - slug
  - summary
  - page type
  - SEO fields
- Strapi save flow που γράφει canonical structured sections

## Τι Είναι Ασφαλές Να Δείξουμε Τώρα

Αυτά μπορούν να εμφανιστούν άμεσα στους χρήστες γιατί ήδη δουλεύουν και ταιριάζουν στο current content model:

- `Blocks`
- `Outline`
- block insertion για τα πέντε supported public blocks
- block reorder
- block duplicate
- block delete
- page title editing
- slug editing
- summary editing
- page type editing
- SEO editing
- draft save
- preview
- publish/update

## Τι Θέλει Custom Υλοποίηση Πριν Εμφανιστεί

Τα παρακάτω είναι εφικτά με το `Puck`, αλλά δεν πρέπει να εμφανιστούν πριν τα υλοποιήσουμε σωστά για Strapi:

- searchable block inserter
- block categories/groups
- reusable patterns
- reusable sections
- media library integration
- featured image workflow
- page templates μέσα στον editor
- πραγματικό preview mode χωρίς editor chrome
- autosave
- last edited / revision history
- unsaved changes warning
- reusable style presets
- page-level settings panel ενσωματωμένο στον `Puck` sidebar αντί για το current external sidebar
- richer inline editing για links, buttons και array items

## Τι Πρέπει Να Μείνει Κρυφό Προς Το Παρόν

Τα παρακάτω δεν πρέπει να δοθούν ακόμα στους χρήστες γιατί είναι incomplete, πολύ technical ή εύκολο να χαλάσουν το content model:

- generic raw HTML editing
- legacy GrapesJS-like visual builder publish flow
- experimental plugins χωρίς Strapi mapping
- arbitrary component types που δεν αντιστοιχούν στο CMS schema μας
- technical field transforms UI
- οποιοδήποτε action μπορεί να flattenάρει structured sections σε HTML blobs

## Προτεινόμενη Δομή Αριστερής Στήλης

Για να μείνει κοντά σε WordPress αλλά και ασφαλές, η αριστερή στήλη πρέπει να κινηθεί προς αυτή τη δομή:

1. `Blocks`
   Προσθήκη και επιλογή των υποστηριζόμενων sections.

2. `Structure`
   Outline της σελίδας και σειρά των sections.

3. `Patterns`
   Να μείνει κρυφό μέχρι να υλοποιηθούν σωστά reusable patterns.

4. `Media`
   Να μείνει κρυφό μέχρι να συνδεθεί με Strapi media.

5. `Page`
   Προαιρετικό shortcut για page-level settings αν αργότερα τα μεταφέρουμε από το δεξί panel.

## Τι Πρέπει Να Δει Ο Χρήστης Στη Συνέχεια

Η επόμενη ασφαλής επέκταση του editor πρέπει να είναι:

1. searchable `Blocks` inserter
2. πιο καθαρό `Structure` / outline view
3. lightweight `Patterns` placeholder, αλλά hidden αν δεν υπάρχουν πραγματικά patterns
4. όχι `Media` tab μέχρι να υπάρχει κανονικό Strapi media integration

## Κανόνας Απόφασης

Ένα feature πρέπει να εμφανίζεται στο CMS UI μόνο αν ισχύουν και τα τρία:

1. το `Puck` το υποστηρίζει άμεσα ή έχουμε working custom implementation
2. αντιστοιχεί με ασφάλεια στο Strapi page schema
3. ένας μη τεχνικός CMS χρήστης μπορεί να το καταλάβει χωρίς εκπαίδευση

Αν ένα από τα παραπάνω είναι ψευδές, το feature μένει κρυφό.

## Τρέχον Συμπέρασμα

Δεν χρειάζεται να μαντεύουμε τι θα δώσουμε στους χρήστες.

Ήδη ξέρουμε:

- τι υποστηρίζει τεχνικά το `Puck`
- τι έχουμε ήδη ενεργό στον current editor
- τι χρειάζεται ακόμα custom δουλειά για να λειτουργήσει σωστά με Strapi

Άρα το editor roadmap πρέπει να είναι capability-driven και όχι demo-driven.

Το άμεσο επόμενο βήμα είναι να υλοποιηθεί η αριστερή στήλη πάνω στο current safe set:

- `Blocks`
- `Structure`

και να μείνουν για αργότερα:

- `Patterns`
- `Media`
- advanced plugins

μέχρι να υπάρχουν τα αντίστοιχα Strapi workflows.
