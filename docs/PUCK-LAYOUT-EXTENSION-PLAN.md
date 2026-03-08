# Πλάνο Επέκτασης Puck Editor

## Στόχος

Να επεκτείνουμε τον `Puck` ώστε να καλύπτει σωστά:

- σύνθετα page layouts
- header / footer visual composition
- reusable dynamic blocks που τραβάνε δεδομένα από το CMS
- ασφαλές save/load στο Strapi
- ενιαίο render model για editor και public frontend

Ο στόχος δεν είναι να γυρίσουμε σε raw HTML builder.  
Ο στόχος είναι να μείνουμε σε `schema-first visual editor`, αλλά με πιο δυνατό layout system.

---

## Γιατί χρειάζεται αυτή η επέκταση

Αυτή τη στιγμή έχουμε:

- `Puck` editor που είναι καλός για sections/blocks
- menu manager που είναι καλός για τη δομή των μενού
- theme system για χρώματα / fonts / tokens

Αυτό που λείπει είναι πραγματικό visual layout control:

- logo στο κέντρο και menus δεξιά / αριστερά
- logo στο κέντρο και menu από κάτω
- 20 / 60 / 20 layout
- 30 / 70 layout
- grid με custom columns και rows
- header / footer σύνθεση με blocks

Το σημερινό `Grid Canvas / Flex Canvas` ήταν σωστό προσωρινό βήμα, αλλά όχι το τελικό layout system.

---

## Νέα Αρχιτεκτονική

### 1. Menu Manager

Η σελίδα `/admin/cms/appearance/menu` θα έχει μόνο:

- δημιουργία / επεξεργασία / duplicate / delete menus
- menu items + submenu items
- assignment:
  - active header menu
  - active footer menu
- sticky header
- orientation ανά menu όταν χρειάζεται

Δηλαδή: μόνο data structure.

### 2. Themes

Η σελίδα `/admin/cms/themes` θα έχει μόνο:

- colors
- fonts
- radius
- global visual tokens

Δηλαδή: μόνο global visual identity.

### 3. Header / Footer Visual Editor

Η σελίδα `/admin/cms/appearance/header-footer` θα γίνει visual editor πάνω σε `Puck`.

Δεν θα αποθηκεύει μενού.  
Θα αποθηκεύει μόνο layout/composition:

- πού μπαίνει το logo
- πού μπαίνει το menu block
- πού μπαίνουν social/contact/buttons
- στοίχιση / spacing / grid / rows / columns

### 4. Νέο Layout Core στον Puck

Θα αντικαταστήσουμε σταδιακά τα προσωρινά layout blocks με ένα πιο καθαρό σύστημα:

- `Layout Section`
- `Layout Cell`
- `Stack`
- `Spacer`

και προαιρετικά:

- `Row Layout`
- `Grid Layout`

Αυτό το core θα χρησιμοποιείται:

- στις σελίδες
- στο header
- στο footer

---

## Νέα Blocks που θα προστεθούν

### A. Layout Blocks

- `Layout Section`
- `Stack`
- `Spacer`
- `Divider`

### B. Dynamic Header/Footer Blocks

- `Logo`
- `Menu`
- `Social Links`
- `Contact Info`
- `Button Group`

### C. Content Blocks

Θα συνεχίσουν να υπάρχουν:

- `Hero`
- `Card`
- `Rich Text`
- `Image`
- `Image + Text`
- `Feature Grid`
- `FAQ`
- `Buttons`

---

## Layout Capabilities που θέλουμε

### Φάση 1

Preset-based layouts:

- `1 column`
- `2 columns`
- `3 columns`
- `4 columns`
- `70 / 30`
- `30 / 70`
- `25 / 50 / 25`
- `20 / 60 / 20`

### Φάση 2

Advanced layout controls:

- `gridColumns`
- `gridRows`
- `columnTemplate`
- `rowTemplate`
- `gap`
- `padding`
- `justify`
- `align`

### Φάση 3

Optional advanced mode:

- custom percentages
- custom template strings

---

## Data Model στο Strapi

Θα προστεθούν νέα JSON-based layout fields για να αποθηκεύουμε:

- `pageLayout` sections
- `headerLayout`
- `footerLayout`

Κάθε layout node θα αποθηκεύει:

- `type`
- `props`
- `children`

Δηλαδή recursive schema-first tree, όχι raw HTML.

---

## Public Frontend Render

Το public frontend θα αποκτήσει:

- κοινό recursive renderer για layout nodes
- support για:
  - `Layout Section`
  - `Stack`
  - `Spacer`
  - `Logo`
  - `Menu`
  - `Social Links`
  - `Contact Info`

Το ίδιο render contract θα χρησιμοποιείται:

- στον editor preview
- στο public site

---

## Σειρά Υλοποίησης

### Phase 1

Νέο `Layout Section` schema και recursive node model.

Παραδοτέα:

- νέα types
- νέα Strapi fields
- admin mappers
- frontend mappers

### Phase 2

Visual layout blocks στον `Puck`.

Παραδοτέα:

- `Layout Section`
- `Stack`
- `Spacer`
- preset layouts

### Phase 3

Dynamic header/footer blocks.

Παραδοτέα:

- `Logo`
- `Menu`
- `Social Links`
- `Contact Info`

### Phase 4

Μετατροπή του `/admin/cms/appearance/header-footer` σε πραγματικό visual editor.

### Phase 5

Σταδιακή αντικατάσταση των προσωρινών `Grid Canvas / Flex Canvas` με το νέο layout core.

---

## Τι θα κερδίσουμε

- πιο φιλικό editor για τελικό χρήστη
- κοινό σύστημα για pages + header + footer
- μεγαλύτερη ελευθερία layout χωρίς raw HTML chaos
- ασφαλές typed contract με Strapi
- reusable blocks
- δυνατότητα μελλοντικών patterns/layout presets

---

## Άμεσο επόμενο βήμα

Ξεκινάμε από:

1. νέο unified `Layout Section` schema
2. recursive save/load contract
3. προετοιμασία για `Header Layout` και `Footer Layout`

Αυτό είναι το θεμέλιο.  
Αν αυτό γίνει σωστά, μετά όλα τα υπόλοιπα μπαίνουν πάνω του καθαρά.

---

## Τρέχουσα πρόοδος

Έχουν ήδη υλοποιηθεί τα παρακάτω:

- νέα πεδία JSON για `layoutTree`, `headerLayout`, `footerLayout`
- πρώτο `Layout Section` block με:
  - preset layouts
  - `Grid Columns`
  - `Grid Rows`
  - `Custom Columns Template`
- dynamic layout blocks:
  - `Logo`
  - `Menu`
  - `Button Group`
  - `Social Links`
  - `Contact Info`
- visual `Header / Footer` editor πάνω σε `Puck`
- public frontend renderer που διαβάζει:
  - `layoutTree`
  - `headerLayout`
  - `footerLayout`
- το `layoutTree` είναι πλέον το canonical persistence path για τις νέες pages που σώζονται από τον νέο editor

Τι μένει στα επόμενα βήματα:

- περισσότερα polished starter layouts για pages / header / footer
- σταδιακή απόσυρση του παλιού canvas model από το υπόλοιπο editor code
- ενοποίηση της ίδιας layout λογικής σε όλα τα CMS authoring flows
## Update 2026-03-08

- Προστέθηκε νέο dynamic block `Button Group` για use cases σε pages, header και footer.
- Προστέθηκαν νέα starter patterns στον page editor:
  - `Starter Page`
  - `Contact Page`
  - `About Page`
  - `Feature Landing`
- Τα νέα patterns χτίζονται πάνω στο `Layout Section` και όχι στο παλιό canvas-only path.
