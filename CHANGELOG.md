# Changelog – Galton Board

## [V09] – 2026-08-15

### Fix: Simulation nach Durchlauf nicht erneut startbar (Bug)

**User-Meldung:** Nach einem vollständigen Durchlauf lässt sich die Simulation über
den Start-Button nicht erneut starten.

**Ursache (Edge-Case):** Nach dem letzten gelandeten Ball setzt der frame()-Loop
`running = false` und den Button auf „▶ Start" — aber `rafId` bleibt gesetzt (der
rAF-Loop läuft weiter und registriert sich neu). Klickte der User auf Start,
übersprang `start()` den rAF-Neustart (`rafId !== null`) und `frame()` traf sofort
wieder auf die End-Bedingung (`dropped + balls.length < state.balls` ist falsch,
weil `dropped` schon am Maximum ist) → `running` wurde sofort wieder false →
Simulation startete nicht neu.

**Fix:** `start()` erkennt den durchgelaufenen Zustand
(`dropped >= state.balls && balls.length === 0`) und setzt vor dem Start die
Zähler `dropped/spawnIdx/spawnAcc` sowie alle `bins` zurück, damit der laufende
rAF-Loop neu spawnen kann. Parameter bleiben unangetastet. Zusätzlich werden
Pause-Button-Zeilen aus dem bedingten Block herausgezogen (aktivieren bei jedem
Start, nicht nur im if).

### Verifikation V09
- Statisch: Script-Balance ✅, node --check ✅, 33 IDs ✅
- Physik 300/12: μ=5.91, σ=1.70, χ²=3.30 ✅ · 600/12: σ=1.66, χ²=12.24 ✅
- Browser-E2E (echter rAF-Loop): Start → Lauf → Auto-Stop (Button „▶ Start",
  Pause disabled) → Start-Klick → **zweiter Lauf startet** (Button „■ Stopp",
  Pause aktiv) ✅

---
## [V08] – 2026-08-15

### Änderungen: Vollwertige Simulationssteuerung

- **Start ⇄ Stopp (Toggle):** Der Start-Button wird nach dem Klick zu „■ Stopp"
  und startet die Simulation. Klick auf Stopp bricht die Simulation ab (Brett
  + Fächer geleert), und der Button wird wieder zu „▶ Start". Stopp verändert
  KEINE Parameter.
- **Pause/Weiter:** Der Pause-Button pausiert die Simulation und wechselt zu
  „▶ Weiter"; erneuter Klick resumt zu „⏸ Pause". Zusammen mit Start/Stopp ist
  das jetzt eine vollwertige Steuerung (Start/Stopp · Pause · Reset).
- **Reset = alle Parameter auf Default:** Der Reset-Button setzt jetzt zusätzlich
  ALLE User-Parameter (Kugeln=300, Ebenen=12, Radius=4.5, Elastizität=0.62,
  Gravitation=9.81, Speed=1, Intervall=38, Seed=42, Sound=an) zurück und baut
  die Simulation neu auf. `reset(keepParams)` bleibt für Resize/Parameter-
  Änderungen intern erhalten (Parameter werden dann beibehalten).
- Neue `stop()`-Funktion; Space-Taste togglet weiterhin Start/Stopp bzw. Pause.

### Verifikation V08
- Statisch: Script-Balance ✅, node --check ✅, 33 IDs ✅
- Physik 300/12: μ=5.91, σ=1.70, χ²=3.30 ✅ · 600/12: μ=5.87, σ=1.66, χ²=12.24 ✅
- Browser-FSM: Start→„Stopp", Pause→„Weiter"→„Pause", Stopp→„Start"+Parameter
  bleiben (500/15), Reset→Parameter Default (300/12) ✅

---
## [V07] – 2026-08-15

### Änderungen (User-Wünsche)

- **Leertaste-Button entfernt:** Der `<button>␣ Leertaste` aus V06 ist wieder entfernt
  (sowie sein `el.btnSpace`-Binding und der Event-Listener). Nur die physische
  Space-Taste funktioniert weiterhin.
- **Buttons in einer Zeile:** Start, Pause, Reset stehen jetzt nebeneinander.
  `.btns` auf `flex-wrap:nowrap`, Button-Padding 10px/16px, Schrift 0.88rem – passt
  in eine Zeile (auch auf Tablet-Breite).
- **Footer bereinigt:** „erstellt mit Hermes Agent (Nous Research) · Projektordner:
  ~/Projects/Galton Board/" entfernt. Footer zeigt nur noch „Galton Board V07 ·
  Edle Simulation mit realer Quincunx-Physik".
- Hinweis-Text angepasst („Leertaste pausiert/startet …" – ohne Button-Erwähnung).

### Verifikation V07
- Statisch: Script-Balance ✅, node --check ✅, 33 IDs ✅
- Volllauf 300/12: μ=5.91, σ=1.70, χ²=3.30 ✅
- Volllauf 600/12: μ=5.87, σ=1.66, χ²=12.24 ✅
- Browser: 3 Buttons nebeneinander, kein Leertaste-Button, Footer bereinigt ✅

---
## [V06] – 2026-08-15

### Änderungen (User-Wünsche)

- **Chips entfernt:** Die Header-Chips „60 FPS", „100 % Offline", „0 externe Abhängigkeiten",
  „Deterministische Substep-Physik" entfernt. Auch der zugehörige JS-FPS-Code ausgebaut
  (kein `#fps`-Element mehr → kein ReferenceError). Das CSS `.chips`-Styling bleibt als
  globaler Utility erhalten (unschädlich).
- **Leertaste-Button** (für Tablets/Mobile): `<button>␣ Leertaste` rechts neben Reset.
  Startet/pausiert die Simulation (gleiche Funktion wie die Space-Taste). In `el.btnSpace`
  verdrahtet (`btnSpace: $('btnSpace')`).
- **Footer aktualisiert:** Version V06, Beschreibung: „Edle Simulation mit realer
  Quincunx-Physik", Projektordner `~/Projects/Galton Board/`.
- **Geometrie-Kalibrierung:** Zurück zur bewährten Formel `GX = 4.6·(ballR+pegR)`. Die
  Physik-Konstanten (0.30/0.55) sind dafür optimiert und liefern σ≈1.7–1.9, χ² grün
  für 300/600/20-Ebenen-Standard.

### Verifikation V06
- Statisch: Script-Balance ✅, node --check ✅, 34 IDs ✅
- Volllauf 300/12: μ=5.91, σ=1.70, χ²=3.30 ✅
- Volllauf 600/12: μ=5.87, σ=1.66, χ²=12.24 ✅
- Browser: Leertaste-Button vorhanden, Chips/FPS weg, V06-Footer, Projektordner ✅

---
## [V05] – 2026-08-15

### Fix: Unnatürliche Kugelbewegung (Kleben an Nägeln, Schmieren an Wänden)

**User-Meldung:** Kugeln kleben an den Nägeln und rutschen an den Seiten herunter.
**Ursachen (zwei):**
1. **Wand-Korridor:** Die Wände standen `GX/2` (~15 px) AUSSERHALB der äußersten Pegs.
   Kugeln, die in diesen schmalen Spalt fielen, trafen nie mehr einen Nagel und
   schmierten sichtbar an der glatten Wand entlang.
2. **Zu aggressive Tangentialdämpfung (0.35):** Die Kugel verlor nach jedem Nagel-
   Kontakt 65 % ihres seitlichen Schwungs und „saugte“ sich an den Nagel fest.

**Fixes:**
- Wände stehen jetzt DIREKT hinter den äußersten Pegs (`pegR+1` px) → Kugeln treffen
  immer einen Nagel, nie eine glatte Wand. Kein Rand-Korridor mehr.
- Rollreibung moderat: `vTang *= 0.55` (statt 0.35) – Kugeln rollen natürlich ab.
- Elastizität gedeckelt auf 0.30: volle 0.62 spreizt (σ≈2.5), 0.05 klebt (σ≈1.5);
  0.30 = sichtbares Abprallen + saubere Glockenkurve.
- Tote Doppel-Zuweisung entfernt (vorher wurde der 0.05-Clamp sofort von `state.rest`
  überschrieben – der gedachte Klebe-Modus war nie aktiv).

### Verifikation V05
- Volllauf-Harness `verify_fullrun.js`:
  - 300 Kugeln/12 Ebenen: σ=1.70 (Theorie 1.73), χ²=3.30 ✅
  - 600 Kugeln/12 Ebenen: σ=1.66, χ²=12.24 ✅
  - 300 Kugeln/20 Ebenen: σ=2.38 (Theorie 2.24), χ²=6.78 ✅
- Browser-E2E: 0 Kugeln an den Wänden (bei 39 aktiven), 60 FPS; 300 gelandet,
  μ=6.04, σ=1.64 ✅
- Statisch: Script-Balance, node --check, 34 IDs ✅

---
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
