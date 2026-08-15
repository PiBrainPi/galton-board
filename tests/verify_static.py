#!/usr/bin/env python3
"""Statische Verifikation für Galton_Board_V0X.html.

1. extrahiert das <script id="app"> und prüft JS-Syntax via `node --check`
2. prüft, dass jede vom JS via $('#id') referenzierte id im Markup existiert
3. prüft Balance der <script>-Tags
"""
import re, subprocess, sys, tempfile, os

HTML = sys.argv[1] if len(sys.argv) > 1 else "build/Galton_Board_V01.html"
html = open(HTML, encoding="utf-8").read()

ok = True

# --- 1. Script-Balance ---
open_script = html.count("<script")
close_script = html.count("</script")
print(f"<script>: {open_script}  </script>: {close_script}")
if open_script != close_script:
    print("FEHLER: unbalancierte <script>-Tags")
    ok = False

# --- 2. App-Script extrahieren ---
marker = '<script id="app">'
i = html.find(marker)
if i < 0:
    print("FEHLER: <script id=\"app\"> nicht gefunden")
    sys.exit(1)
j = html.find("</script>", i)
app_js = html[i + len(marker):j]

with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
    f.write(app_js)
    js_path = f.name

r = subprocess.run(["node", "--check", js_path], capture_output=True, text=True)
os.unlink(js_path)
if r.returncode != 0:
    print("FEHLER: node --check fehlgeschlagen:\n" + r.stderr)
    ok = False
else:
    print("node --check: OK")

# --- 3. IDs im JS vs Markup ---
js_ids = set(re.findall(r"\$\('([\w-]+)'\)", app_js))
html_ids = set(re.findall(r'id="([\w-]+)"', html))
missing = js_ids - html_ids
if missing:
    print("FEHLER: im JS referenzierte, aber nicht vorhandene IDs:", sorted(missing))
    ok = False
else:
    print(f"IDs: {len(js_ids)} referenziert, alle vorhanden")

# --- 4. Elemente, die per getElementById direkt referenziert werden ---
gbi = re.findall(r"getElementById\('([\w-]+)'\)", app_js)
missing2 = set(gbi) - html_ids
if missing2:
    print("FEHLER: getElementById-Target fehlt:", sorted(missing2))
    ok = False
else:
    print(f"getElementById: {len(gbi)} Targets, alle vorhanden")

print("RESULTAT:", "OK" if ok else "FEHLER")
sys.exit(0 if ok else 1)
