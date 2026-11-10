"""Per-cell OCR with tight crops per column; outputs cells.tsv."""
from PIL import Image, ImageOps
import pytesseract
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
SRC = r"D:\Projects\4-billiardtoday-frontend\docs\ai\ceb-ranking\WhatsApp Image 2026-10-06 at 21.12.46.jpeg"
img = Image.open(SRC).convert("L")
a = np.array(img)
dark = (a < 140)
rowsum = dark.sum(axis=1)
bands, inb, start = [], False, 0
for y, v in enumerate(rowsum):
    if v > 3 and not inb:
        inb, start = True, y
    elif v <= 3 and inb:
        inb = False
        if 440 < start < 1500 and (y - start) > 12:
            bands.append((start, y))

COLS = {"position": (16, 150), "umb_id": (175, 285), "name": (295, 545), "average": (770, 880)}
Z = 6
res = []
for i, (y0, y1) in enumerate(bands):
    cells = {}
    for cname, (x0, x1) in COLS.items():
        crop = img.crop((x0, y0 - 5, x1, y1 + 5))
        big = crop.resize((crop.width * Z, crop.height * Z), Image.LANCZOS)
        big = ImageOps.autocontrast(big)
        cfg = "--psm 7"
        if cname in ("position", "umb_id"):
            cfg += " -c tessedit_char_whitelist=0123456789-"
        if cname == "average":
            cfg += " -c tessedit_char_whitelist=0123456789,."
        t = pytesseract.image_to_string(big, lang="eng", config=cfg).strip()
        cells[cname] = t.replace(" ", "")
    res.append(cells)
    print(f"{i:02d} | {cells['position']:>7} | {cells['umb_id']:>5} | {cells['name']:<22} | {cells['average']}")

with open("cells_raw.tsv", "w", encoding="utf-8") as f:
    for i, c in enumerate(res):
        f.write("\t".join([str(i), c["position"], c["umb_id"], c["name"], c["average"]]) + "\n")
