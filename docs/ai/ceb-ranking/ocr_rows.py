"""Per-row OCR of the Swedish ranking screenshot -> rows.tsv (raw, unverified)."""
import re
from PIL import Image, ImageOps
import pytesseract
import numpy as np

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
SRC = r"D:\Projects\4-billiardtoday-frontend\docs\ai\ceb-ranking\WhatsApp Image 2026-10-06 at 21.12.46.jpeg"
img = Image.open(SRC).convert("L")
a = np.array(img)

# dark bands = text lines in the table area
dark = (a < 140)
rowsum = dark.sum(axis=1)
bands, inb, start = [], False, 0
for y, v in enumerate(rowsum):
    if v > 3 and not inb:
        inb, start = True, y
    elif v <= 3 and inb:
        inb = False
        if 400 < start < 1500 and (y - start) > 12:
            bands.append((start, y))

# column x-boundaries from vertical dark runs inside the table
sub = dark[bands[1][0]:bands[-1][1], :]
colsum = sub.sum(axis=0)
sep = [x for x in range(len(colsum)) if colsum[x] > 0.85 * (bands[-1][1] - bands[1][0])]
print("vertical separators:", sep)

out = []
for i, (y0, y1) in enumerate(bands):
    crop = img.crop((0, max(0, y0 - 5), img.width, y1 + 5))
    big = crop.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)
    big = ImageOps.autocontrast(big)
    txt = pytesseract.image_to_string(big, lang="eng", config="--psm 7 -c tessedit_char_whitelist=0123456789-,.|ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzåäöéÅÄÖ ").strip()
    out.append((i, y0, y1, txt))
    print(f"{i:02d} y={y0}-{y1} :: {txt}")
with open("rows_raw.txt", "w", encoding="utf-8") as f:
    for i, y0, y1, txt in out:
        f.write(f"{i}\t{y0}\t{y1}\t{txt}\n")
