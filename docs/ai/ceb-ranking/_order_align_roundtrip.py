# -*- coding: utf-8 -*-
import json

P = "public/data/ceb-ranking/3c-individual.json"
raw = open(P, encoding="utf-8").read()
print("file bytes:", len(raw.encode("utf-8")))
print("ends with newline:", repr(raw[-3:]))
payload = json.loads(raw)
reencoded = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
print("round-trip identical:", reencoded == raw)
print("row0 keys:", list(payload["rows"][0].keys()))
print("row0:", json.dumps(payload["rows"][0], ensure_ascii=False))

# points monotonic?
rows = payload["rows"]
pts = [r["points"] for r in rows]
print("points monotonic non-increasing:", all(pts[i] >= pts[i+1] for i in range(len(pts)-1)))
print("has non-ascii:", any(ord(c) > 127 for c in raw))

# xl points monotonic
xl = json.load(open("docs/ai/ceb-ranking/ceb16_xlsx_final_clean.json", encoding="utf-8"))["rows"]
xp = [r["points"] for r in xl]
print("xl points monotonic:", all(xp[i] >= xp[i+1] for i in range(len(xp)-1)))
print("xl has -4:", xp[-6:])
