# Galton Board – Edle Simulation mit realer Physik

Ein vollständig eigenständiges (100 % offline, keine externen Abhängigkeiten) Galton Board als **eine HTML-Datei**.
Edler Holzrahmen, goldene Messingnägel, glänzende Kugeln, Live-Histogramm mit Normalverteilungs-Overlay,
interaktiver Wahrscheinlichkeitsrechner sowie ausführliche Theorie, Historie und Anwendungen.

## Schnellstart

Einfach `build/Galton_Board_V01.html` im Browser öffnen (Doppelklick genügt – keine Installation, kein Server).

## Features

| Bereich | Beschreibung |
|---|---|
| **Simulation** | Deterministische Substep-Physik (120 Hz fix), Gravitation `9.81` skaliert, teilelastische Stöße, Luftwiderstand, Kugel-Rotation, Kugel-Kugel-Kollisionen |
| **Optik** | Prozedurales Holz mit Maserung, Messingnägel mit Glanz, polierte Kugeln, Glasscheiben-Glanz, Vignette – alles Canvas, keine Assets |
| **Parameter** | Kugelanzahl (1–1500), Ebenen (3–30), Kugelgröße, Elastizität, Gravitation, Geschwindigkeit, Abwurf-Intervall, Seed, Sound |
| **Histogramm** | Live-Fächerzähler + theoretische Glockenkurve (Normalverteilung aus den Daten μ/σ) |
| **Rechner** | Binomialkoeffizient, P(X=k), kumuliert, μ, σ², σ, z-Score, Normalnäherung, Pascal-Dreieck – alles in Echtzeit |
| **Theorie** | Bernoulli → Binomial → Pascal → De Moivre-Laplace → Zentraler Grenzwertsatz |
| **Historie** | Francis Galton, Quincunx (1873/1889), Verbreitung – inkl. kritischer Einordnung zur Eugenik |
| **Anwendungen** | Six Sigma, Random Walk/Black-Scholes, Diffusion, Genetik, Sozialwissenschaften (mit Grenzen), Random Forests |
| **Audio** | Kollisions-Klacker per WebAudio (offline, abschaltbar) |

## Bedienung

- **Start / Pause / Reset** – Buttons oder Leertaste (außerhalb von Eingabefeldern)
- Parameter ändern: `Kugelanzahl`/`Ebenen`/`Kugelgröße` setzen die Simulation zurück (Geometrie-Änderung)
- Übrige Parameter (Elastizität, Gravitation, Geschwindigkeit, Intervall, Seed) greifen live
- Sound startet erst nach dem ersten Klick (Browser-Autoplay-Regel)

## Projektstruktur

```
Galton Board/
├── build/
│   └── Galton_Board_V01.html   ← Auslieferbare Datei (Version iteriert als _V02, _V03, …)
├── docs/
│   ├── Physik-Modell.md        ← Formeln, Konstanten, Substep-Verfahren
│   └── Theorie-Referenz.md     ← Mathe + Historie + Anwendungen mit Quellen
├── tests/
│   ├── verify_static.py        ← JS-Syntax + ID-Referenzcheck
│   └── verify_physics.js       ← Wiederverwendbarer Physik-Harness (χ²-Glockentest)
└── CHANGELOG.md
```

## Verifikation

Jede Version wird vor Auslieferung hart geprüft:

```bash
cd "~/Projects/Galton Board"
python3 tests/verify_static.py build/Galton_Board_V01.html   # Syntax + IDs
node tests/verify_physics.js build/Galton_Board_V01.html 300 12   # Physik (Glocke)
node tests/verify_physics.js build/Galton_Board_V01.html 600 12   # Stresstest
```

Der Physik-Test simuliert alle Kugeln mit realistischem 38-ms-Spawn-Intervall und prüft die
resultierende Fachverteilung mit einem χ²-Gütetest gegen die Binomialverteilung B(n, 0.5).
Erwartet: μ ≈ n/2, σ ≈ √(n/4), χ² unter dem kritischen Wert.

## Versionshistorie

Siehe `CHANGELOG.md`.

---

Erstellt mit Hermes Agent (Nous Research) · Projekt: `~/Projects/Galton Board/`
