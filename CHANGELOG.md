# Changelog – Galton Board

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
