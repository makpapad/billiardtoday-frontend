"""Ground-truth probe: what does the PDF actually say in the fed column for a few rows?

pdftotext -layout pairs tight rows wrongly (one fed per two ranks), so print the raw
word positions instead of trusting either parse.
"""
import pymupdf, re, sys

doc = pymupdf.open("ceb16.pdf")
targets = {797, 796, 798, 3, 4, 5} if len(sys.argv) < 2 else {int(x) for x in sys.argv[1:]}

found = {}
for pi in range(doc.page_count):
    words = doc[pi].get_text("words")
    # group words into visual rows by y
    rows = {}
    for w in words:
        key = round(w[3], 0)
        rows.setdefault(key, []).append(w)
    for y, ws in rows.items():
        ws.sort(key=lambda w: w[0])
        first = ws[0]
        if first[0] < 64 and re.fullmatch(r"\d+", first[4]):
            rank = int(first[4])
            if rank in targets:
                found[rank] = (pi + 1, y, [(round(w[0]), round(w[2]), w[4]) for w in ws])

for rank in sorted(found):
    page, y, ws = found[rank]
    print(f"--- rank {rank} (page {page}, y={y}) ---")
    for x0, x1, t in ws:
        print(f"   x {x0:>4}-{x1:<4} {t!r}")
