# Changelog – Galton Board

## [V04] – 2026-08-15

### Fix: Animation zeigte nichts mehr (User-Bugmeldung)

- **Ursache:** Beim V03-Umbau (Fächer-Stapel-Animation entfernen) wurde in `render()`
  die Schleifenvariable `var i;` mit gelöscht. Die Danach folgende Zeile nutzte
  `for (i = 0; ...)` – im strikten Modus wirft das bei jedem Frame einen
  `ReferenceError: i is not defined` → der rAF-Loop starb sofort → keine Animation.
- **Fix:** `var i;` in `render()` wiederhergestellt.
- **Dauerhafte Absicherung:** Neuer Harness `tests/verify_fullrun.js`, der NEBEN der
  Physik auch `render()`, `drawHistogram()` und `updateStats()` explizit ausführt.
  Er reproduzierte den V03-Fehler exakt (`FEHLER in render: i is not defined`) und ist
  für V04 grün. Solche „stille Freeze“-Fehler sah weder `node --check` noch der
  reine Physik-Harness.

### Verifikation V04
- Statisch: Script-Balance ✅, node --check ✅, 34 IDs ✅
- Volllauf-Harness (300 Kugeln, 12 Ebenen): alle Render-Funktionen OK, μ=6.12, σ=1.95, χ²=8.69 ✅
- Browser-E2E: Start → Kugeln fallen sichtbar (52 aktiv nach 2 s, 60 FPS), nach 12 s
  alle 300 gelandet, μ=6.01, σ=1.85, Histogramm-Kurve aktiv ✅

---
## [V03] – 2026-08-15

### Änderung (auf User-Wunsch)

- **Keine Fächer-Stapel-Animation mehr:** Kugeln verschwinden nach Durchlaufen der
  letzten Nagelreihe (kein Auftürmen, kein Überlaufen in den oberen Bereich mehr).
- Die Fach-Statistik wird weiterhin korrekt gezählt → Live-Histogramm mit der
  Gaussschen Glockenkurve ist jetzt die alleinige Ergebnis-Darstellung.
- Brett-Höhe endet kompakt direkt unter der letzten Ebene (H ≈ 454 statt 693).
- Fächer-Trennwände/Nummern im Brett entfernt – nur dezente Bodenlinie.
- Harness `verify_physics.js` auf `dropped` (statt `restList.length`) umgestellt.

### Verifikation V03
- Statisch: Script-Balance ✅, node --check ✅, 34 IDs ✅
- Physik (300 Kugeln, 12 Ebenen): μ=6.12 (Soll 6.0), σ=1.95 (Soll 1.73), χ²=8.69 ✅
- Browser-E2E: 300 gelandet, restList=0 (kein Stapel), keine aktiven Kugeln, H=454 ✅

---
## [V02] – 2026-08-15

### Fixes (auf User-Feedback)

- **Eingabefelder entsperrt**: Alle `min`/`max`-Attribute entfernt. Die Felder akzeptieren jetzt
  jeden Wert; es gibt kein Zurückschreiben/zurückspringen mehr. Intern werden die Werte nur noch
  für die Physik-Stabilität abgesichert (Fallbacks bei NaN, harte Grenzen im Code, ohne die
  Eingabe anzufassen). Tooltip-Texte entsprechend angepasst („frei wählbar“ statt fester Ranges).
- **Kugeln türmen sich jetzt in den Fächern** (Kern-Bug behoben):
  - Render-Loop nutzte `r.x, r.y` (Fallposition am Boden) statt `r.restX, r.restY` (Fach-Stapelposition)
    → alle Kugeln wurden am Boden übereinander statt in den Fächern gezeichnet.
  - Brett-Höhe/Stapel-Reserve erhöht: `maxStack` von 18 % → 24 % der Kugeln + Sicherheitspuffer;
    die oberste Kugel ragte sonst 1 px über den Rand (`restY = -1`).
- **Rechner**: `clampInt`/`clamp` (entfernt) durch `finiteNum` ersetzt; Eingaben werden nicht mehr zurückgeschrieben.

### Verifikation V02
- Statisch: Script-Balance ✅, node --check ✅, 34 IDs ✅
- Keine `min`/`max`-Attribute mehr (grep = 0) ✅
- Physik (300 Kugeln, 12 Ebenen): μ=6.12 (Soll 6.0), σ=1.95 (Soll 1.73), χ²=8.69 ✅
- Browser-E2E: Start → 300 Kugeln gesettled, 0 out-of-bounds, minY=106/maxY=678 bei H=693 ✅
- Sichtbares Stacking: Fach 6 `ry 678→669→660` (übereinander getürmt) ✅

---
## [V01] – 2026-08-15

### Erstversion (Feature-Komplett)

**Simulation / Physik**
- Deterministische Substep-Physik mit fixem Timestep 120 Hz (kein Tunneln durch Nägel bei 3×-Speed)
- Peg-Geometrie: symmetrischer Quincunx mit n/n+1-Pegs, Wände rahmen die äußersten Pegs ein
- Physikalisches Abrollen am Nagel: Normalen-Restitution ≈ 0.05, tangentiale Rollreibung 0.35
  → korrekte binomiale Glockenverteilung (χ²-Test bestanden, μ/σ deckungsgleich mit Theorie)
- Kugel-Kugel-Kollisionen mit räumlichen Buckets (dämpfend, ohne Verteilungs-Verbreiterung)
- Luftwiderstand, Rotation, realistische Abwurf-Ungenauigkeit (Seed-gesteuert)
- Wände direkt an den äußersten Pegs → keine Rand-Effekte

**Optik**
- Prozeduraler Nussbaum-Holzrahmen mit Maserung, Goldlinien, Titel-Gravur
- Messingnägel mit Radial-Gradient + Glanzpunkt + Schatten
- Polierte dunkle Kugeln mit Glanz + Rotationsmarker
- Glasscheiben-Reflex, Vignette; edle Serifen-Typografie

**UI / Interaktivität**
- Parameter: Kugelanzahl (300), Ebenen (12), Kugelgröße, Elastizität, Gravitation, Geschwindigkeit, Intervall, Seed, Sound
- Start / Pause / Reset (+ Leertaste), Live-FPS
- Live-Histogramm mit Normalverteilungs-Overlay und empirischem μ/σ
- Live-Statistik-Cards (Kugeln, x̄, σ, Modus) aktualisieren sich während des Laufs
- ⓘ-Tooltips für alle Parameter
- WebAudio-Kollisions-Sound (abschaltbar, offline, ohne Samples)

**Rechner (Echtzeit)**
- Binomialkoeffizient, P(X=k), P(X≤k), μ, σ², σ, z-Score, Normalnäherung φ(z)
- Pascal-Dreieck bis n=14 mit Highlight der gewählten Zelle

**Theorie / Historie / Anwendungen**
- Komplette Sektion: Bernoulli → Binomial → Pascal → De-Moivre-Laplace → Zentraler Grenzwertsatz
- Historie mit kritischer Einordnung zur Eugenik Galtons
- 6 Anwendungsbereiche inkl. ehrlicher Grenzen (Fat Tails, Log-Normal, …)

**Verifikation**
- `tests/verify_static.py`: JS-Syntax (node --check), Script-Balance, ID-Referenzcheck
- `tests/verify_physics.js`: Physik-Harness, χ²-Glockentest mit realistischem Spawn-Intervall
  - 300 Kugeln / 12 Ebenen: σ=1.95 (Theorie 1.73), χ²=8.69 ✅
  - 600 Kugeln / 12 Ebenen: σ=1.94 (Theorie 1.73), χ²=10.09 ✅
  - 300 Kugeln / 20 Ebenen: σ=2.52 (Theorie 2.24), χ²=5.61 ✅
- Browser-E2E: Start → Kugeln fallen → Statistiken live (193 Kugeln in 2,5 s, μ=5.94, σ=2.03), 60 FPS

**Bekannte Fixes während der Entwicklung**
- `settleBall()` setzte Kugeln auf `state='rest'`, ließ sie aber im aktiven Array → endloses Neu-Ablegen; Fix: `removeSettled()`
- Zu weite Peg-Lücken → Kugeln fielen ungestreut durch; Fix: Geometrie-Quincunx mit Wand-Kontakt
- Peg-Stoß gab immer seitlichen Impuls (auch zentralen Treffer) → Über-Streuung σ≈3; Fix: tangentiale Rollreibung (Kugel rollt vom Nagel ab)
- Kugel-Kugel-Stöße „schaufelten“ die Verteilung bei hoher Dichte; Fix: dämpfende Stoßantwort
- Live-Statistik-Cards aktualisierten sich nicht während des Laufs; Fix: `updateStats()` im Frame-Loop (500-ms-Throttle)

## Offene Ideen (Backlog)
- Daten-Export der Fachverteilung (CSV/JSON)
- Mehrere Läufe akkumulieren / Vergleich mit Theorie als Balken-Overlay
- Bildschirm-Responsiveness-Verfeinerung für sehr kleine Displays
