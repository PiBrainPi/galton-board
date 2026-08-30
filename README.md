# Galton Board – Edle Simulation mit realer Physik

Ein vollständig eigenständiges (100 % offline, keine externen Abhängigkeiten) Galton Board
als **eine HTML-Datei**. Edler Holzrahmen, goldene Messingnägel, glänzende Kugeln,
Live-Histogramm mit Normalverteilungs-Overlay, interaktiver Wahrscheinlichkeitsrechner
sowie ausführliche Theorie.

**Aktuelle Version:** `build/Galton_Board_V10.html`

**🌐 Live:** [https://galton-board.ingenieur-tools.de/](https://galton-board.ingenieur-tools.de/)

## Schnellstart

Einfach `build/Galton_Board_V10.html` im Browser öffnen (Doppelklick genügt – keine
Installation, kein Server).

## Features

| Bereich | Beschreibung |
|---|---|
| **Simulation** | Substep-Physik (120 Hz fix, semi-implicit Euler), Gravitation, teilelastische Stöße, Luftwiderstand, Kugel-Rotation, Kugel-Kugel-Kollisionen mit räumlichen Buckets |
| **Optik** | Prozedurales Holz mit Maserung, Messingnägel mit Glanz, polierte Kugeln, Glasscheiben-Glanz, Vignette – alles Canvas, keine Assets |
| **Parameter** | Kugelanzahl (1–10000), Ebenen (1–60), Kugelgröße, Elastizität, Gravitation, Geschwindigkeit (geschwindigkeitsunabhängige Physik bis ×20), Abwurf-Intervall, Seed, Sound – alle Felder frei eingebbar |
| **Steuerung** | **▶ Start** ⇄ **■ Stopp** (Toggle), **⏸ Pause** ⇄ **▶ Weiter**, **↺ Reset** (setzt alle Parameter auf Default). Leertaste togglet Start/Pause |
| **Histogramm** | Live-Fächerzähler + theoretische Normalverteilungs-Kurve aus den Daten (empirisches μ/σ) |
| **Rechner** | Binomialkoeffizient, P(X=k), kumuliert, μ, σ², σ, z-Score, Normalnäherung, Pascal-Dreieck – alles Echtzeit |
| **Theorie** | Bernoulli → Binomial → Pascal → De Moivre-Laplace → Zentraler Grenzwertsatz |
| **Historie** | Francis Galton, Quincunx (1873/1889) – mit kritischer Einordnung zur Eugenik |
| **Anwendungen** | Six Sigma, Random Walk/Black-Scholes, Brownsche Bewegung, Genetik, Sozialwissenschaften, Random Forests |
| **Audio** | Kollisions-Klacker per WebAudio (offline, abschaltbar) |

## Bedienung

- **Start / Stopp / Pause / Reset** – Buttons oder **Leertaste** (außerhalb von Eingabefeldern)
- Parameter ändern → Brett wird neu gebaut (Parameter bleiben erhalten)
- **Reset** setzt ALLE Parameter auf ihre Default-Werte (300 Kugeln / 12 Ebenen / …)
- **Stopp** bricht die Simulation ab, lässt Parameter unangetastet
- Sound startet erst mit erstem Klick (Browser-Autoplay-Regel)

## Projektstruktur

```
Galton Board/
├── build/
│   └── Galton_Board_V10.html      ← Lieferbare Datei (iteriert als _V01 … _V10.1)
├── docs/
│   ├── Physik-Modell.md           ← Formeln, Konstanten, Substep-Verfahren
│   └── Theorie-Referenz.md        ← Mathe + Historie + Anwendungen
├── tests/
│   ├── verify_static.py           ← JS-Syntax + ID-Referenzcheck
│   ├── verify_physics.js          ← χ²-Glockentest (Harness, v. a. für ältere Versionen)
│   ├── verify_fullrun.js          ← Volllauf-Harness (inkl. render/drawHistogram/updateStats)
│   ├── verify_speed20.js          ← 20-Lauf-Geschwindigkeitsunabhängigkeitstest
│   ├── verify_batch15.js          ← 15-Simulationen-Batchtest (alle Parameter-Kombinationen)
│   ├── diag_rows.js               ← Randfach-Diagnose über Ebenenzahlen
│   ├── diag_speed.js              ← Speed-Identitäts-Diagnose
│   ├── calib_small_n.js           ← Kalibrierung für wenige Ebenen
│   └── calib_adaptive.js          ← Adaptive-Parameter-Kalibrierung
├── README.md
└── CHANGELOG.md
```

## Verifikation

Jede Version wird vor Auslieferung hart geprüft:

```bash
cd "~/Projects/Galton Board"

# 1) Statisch: Syntax + IDs
python3 tests/verify_static.py build/Galton_Board_V10.html

# 2) Volllauf: Physik + Rendering
node tests/verify_fullrun.js build/Galton_Board_V10.html 300 12
node tests/verify_fullrun.js build/Galton_Board_V10.html 600 12

# 3) Geschwindigkeitsunabhängigkeit (20 Läufe, speed 1–20)
node tests/verify_speed20.js build/Galton_Board_V10.html

# 4) Randfach-Diagnose über alle Ebenenzahlen
node tests/diag_rows.js build/Galton_Board_V10.html
```

Der Physik-Harness testet die Fachverteilung mit χ²-Gütetest gegen B(n, 0.5):
μ ≈ n/2, σ ≈ √(n/4), χ² unter dem kritischen Wert.

**Aktuelle Referenzwerte (V10.1):**
- 300 Kugeln / 12 Ebenen: μ=5.91, σ=1.70, χ²=3.30 ✅
- 600 Kugeln / 12 Ebenen: μ=5.87, σ=1.66, χ²=12.24 ✅
- 300 Kugeln / 20 Ebenen: μ=9.94, σ=2.38, χ²=6.78 ✅

## Bedienungshinweise

- **Kugelanzahl > 2000**: Der χ²-Test wird überempfindlich (jede kleine Abweichung
  wird statistisch signifikant). Der Harness prüft dort nur σ statt χ².
- **Wenige Ebenen (< 8)**: Die adaptive Rollreibung sorgt für ausreichende Streuung
  bis in die Randfächer. Erwartungswerte folgen weiterhin B(n, 0.5), die gemessene
  Verteilung kann etwas breiter ausfallen – physikalisch korrekt (wenige Kollisionen).
- **Geschwindigkeit ×20**: Physik bleibt identisch (MAX_SUBSTEPS=120, speed als
  Frame-Wiederholungen, Spawn skaliert mit speed).

## Versionshistorie

Siehe `CHANGELOG.md`.

## Datenschutz (DSGVO)

Das Galton Board ist eine **vollständig lokale Anwendung** (100 % offline, keine externen
Abhängigkeiten). Es werden **keine Cookies, kein Tracking und keine Analyse-Dienste** verwendet;
alle Berechnungen erfolgen direkt im Browser. Der optionale Kollisions-Sound wird per WebAudio
lokal erzeugt (keine Datenübertragung). Beim Hosting über GitHub Pages können technisch notwendige
Server-Logdaten (IP-Adresse, Zeitpunkt) verarbeitet werden. **Impressum + Datenschutzerklärung**
sind in der App im Footer eingebaut (Links „Impressum" / „Datenschutz").

**Betreiber:** Fabian Bussenius · Jüthornstraße 50 · 22043 Hamburg · fabibuss@web.de (§ 5 DDG)

## Lizenz

MIT — siehe [LICENSE](LICENSE). © 2026 Fabian Bussenius.
