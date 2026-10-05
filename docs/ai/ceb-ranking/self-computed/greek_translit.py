"""Μεταγραμματισμός ελληνικών ονομάτων -> λατινικά (όπως τα γράφει η CEB)"""
import re, unicodedata

# σειρά έχει σημασία (τα δίψηφα πρώτα)
GREEK_MAP = [
    ("ΜΠ", "B"), ("ΓΓ", "G"), ("ΓΚ", "G"), ("ΝΤ", "NT"), ("ΤΣ", "TS"), ("ΤΖ", "TZ"),
    ("ΟΥ", "OU"), ("ΑΥ", "AV"), ("ΕΥ", "EV"), ("ΑΙ", "AI"), ("ΕΙ", "EI"), ("ΟΙ", "OI"),
    ("ΥΙ", "YI"), ("ΗΥ", "IV"),
    ("Α", "A"), ("Β", "V"), ("Γ", "G"), ("Δ", "D"), ("Ε", "E"), ("Ζ", "Z"), ("Η", "I"),
    ("Θ", "TH"), ("Ι", "I"), ("Κ", "K"), ("Λ", "L"), ("Μ", "M"), ("Ν", "N"), ("Ξ", "X"),
    ("Ο", "O"), ("Π", "P"), ("Ρ", "R"), ("Σ", "S"), ("Τ", "T"), ("Υ", "Y"), ("Φ", "F"),
    ("Χ", "CH"), ("Ψ", "PS"), ("Ω", "O"),
]


def is_greek(s: str) -> bool:
    return any("\u0370" <= ch <= "\u03ff" or "\u1f00" <= ch <= "\u1fff" for ch in s)


def translit(s: str) -> str:
    out = []
    i = 0
    up = s.upper()
    while i < len(up):
        for g, l in GREEK_MAP:
            if up.startswith(g, i):
                out.append(l)
                i += len(g)
                break
        else:
            out.append(up[i])
            i += 1
    s = "".join(out)
    # τόνους/σημεία
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^A-Z0-9 ]", " ", s).strip()


def latinize_fullname(name: str) -> str:
    """Ελληνικό ονοματεπώνυμο -> λατινικά (κάθε λέξη)."""
    if not name:
        return ""
    words = []
    for w in name.split():
        words.append(translit(w) if is_greek(w) else w.upper())
    return " ".join(words)


if __name__ == "__main__":
    for t in ["ΠΟΛΥΧΡΟΝΟΠΟΥΛΟΣ Νικολαος", "ΣΕΛΕΒΕΝΤΑΣ Δημητριος", "ΠΑΠΑΚΩΝΣΤΑΝΤΙΝΟΥ Κωνσταντινος",
              "ΤΣΟΚΑΝΤΑΣ Διονυσιος", "ΜΑΥΡΙΔΟΓΛΟΥ Λιτσα", "ΧΑΛΚΙΑΔΑΚΗΣ Εμμανουηλ"]:
        print(f"  {t:34s} -> {latinize_fullname(t)}")
