"""OCR the WhatsApp ranking image with tesseract (scaled + thresholded)."""
import sys
from PIL import Image, ImageOps
import pytesseract

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

SRC = r"D:\Projects\4-billiardtoday-frontend\docs\ai\ceb-ranking\WhatsApp Image 2026-10-06 at 21.12.46.jpeg"
img = Image.open(SRC)

# upscale x3 then grayscale + threshold
big = img.resize((img.width * 3, img.height * 3), Image.LANCZOS).convert("L")
big = ImageOps.autocontrast(big)
bw = big.point(lambda p: 0 if p < 150 else 255)

for name, im in (("gray", big), ("bw", bw)):
    for psm in (6, 4):
        txt = pytesseract.image_to_string(im, lang="eng", config=f"--psm {psm}")
        out = f"ocr_{name}_psm{psm}.txt"
        with open(out, "w", encoding="utf-8") as f:
            f.write(txt)
        print("==", out, len(txt), "chars")
