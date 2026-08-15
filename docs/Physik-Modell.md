# Physik-Modell – Galton Board

Dokumentation der Simulations-Engine in `build/Galton_Board_V01.html`.

## Überblick

Die Simulation ist eine **2D-Kollisionssimulation mit fixem Zeitschritt** (semi-implicit Euler).
Das Brett wird als symmetrischer Quincunx aufgebaut; Kugeln fallen von oben, stoßen an
Messingnägeln und Wänden, interagieren untereinander und sammeln sich in Fächern.

## Konstanten

| Größe | Wert | Bedeutung |
|---|---|---|
| `PAD_L/R/T` | 44 / 44 / 74 px | Innenabstände des Brettes |
| `G_REF / G_SCALE` | 9.81 · 100 | Fallbeschleunigung in px/s² (Default) |
| `AIR_DRAG` | 0.55 / s | Luftwiderstand (exponentiell pro Sekunde) |
| `REST_WALL` | 0.58 | Restitution an Wänden |
| `REST_BALL` | 0.45 | Restitution Kugel–Kugel (intern stark gedämpft) |
| `DT_STEP` | 1/120 s | fixer Physik-Timestep |
| `MAX_SUBSTEPS` | 10 | max. Sub-Steps pro Frame |

## Geometrie

- **Peg-Abstand** `GX = round(min(56, max(16, 4.6·(ballR + pegR))))`
  - `pegR = max(1.5, ballR·0.85)` (kräftige Messingnägel)
  - GX gewährleistet, dass eine fallende Kugel den versetzten Peg der nächsten Reihe
    treffen kann, mit genug Lücke für zentrale (nicht-seitliche) Treffer.
- **Reihenabstand** `RY = 0.75·GX`
- **Peg-Anzahl pro Reihe**: abwechselnd `n` und `n+1`, symmetrisch um die Brettmitte `CX`.
  Die letzte Reihe hat `n` Pegs → es entstehen `n+1` Fächer.
- **Wände** rahmen die äußersten Pegs seitlich ein (kein Wand-Korridor, keine Rand-Effekte).
- **Fächer-Boden** `floorY = binY + 0.55·RY`; die Fachhöhe wächst dynamisch mit der
  erwarteten Stapelhöhe (≈18 % der Kugeln im vollsten Fach).

## Kollisionsmodell Peg/Kugel

Bei jedem Kontakt (Abstand < ballR + pegR):

1. **Position korrigieren**: Kugel entlang der Normalen aus dem Nagel schieben.
2. **Normalen-Restitution** `restPeg = min(state.rest, 0.05)` – fast vollständig absorbierend.
3. **Tangentiale Rollreibung**: Die tangentiale Komponente `vTang` wird mit **0.35**
   multipliziert, die normale Komponente `vNorm` fast auf 0 gesetzt.

```js
vn  = v · n
imp = -(1 + restPeg) * vn
v  += imp * n
vTang = v·t  (t = (-ny, nx))
vTang *= 0.35
vNorm = v·n
v = vTang·t + vNorm·n
```

**Warum das die Glockenkurve erzeugt:** Ein Quincunx-Nagel ist kein Spiegel. Die Kugel
„rollt“ vom Nagel ab, statt quer abzuprallen. Der seitliche Impuls nach dem Kontakt ist
daher klein und hängt von der exzentrischen Auftreffgeometrie ab – genau das liefert die
binomiale 50/50-Streuung pro Reihe. Ohne die tangentiale Dämpfung (nur Normalen-Restitution)
würde die Kugel mit hoher Seitengeschwindigkeit quer über das Brett springen (σ≈3 statt 1.73).

## Kugel-Kugel-Kollision

Räumliche Hash-Buckets (Bänder von 2·RY); nur benachbarte Bänder werden geprüft.
Stoßantwort stark gedämpft (`jimp = -(1 + REST_BALL·0.15)·vnn·0.12`), Positionskorrektur
minimal (0.12). Grund: Ein Kugel-„Strom“ darf die Verteilung nicht wie ein Keil verbreitern.
Die Kollision bleibt sichtbar (Kugeln weichen aus), transportiert aber kaum seitliche Energie.

## Kugel-Settling

Sobald `y > floorY && vy > 0`, wird die Kugel in das nächstgelegene Fach gelegt
(`settleBall`), aus dem aktiven Array entfernt (`removeSettled`) und im `restList`
deterministisch gestapelt. `dropped` zählt gelandete Kugeln.

## Abwurf (Seed)

Jede Kugel startet mit minimaler physikalischer Ungenauigkeit:
- Position ±25 % der Pegbreite um die Brettmitte
- Kippung ±0.1 rad (→ anfängliche Seitengeschwindigkeit)
- Fallgeschwindigkeit 92–108 % des Basiswerts

Diese Abwurf-Streuung ist die „chaotische Empfindlichkeit“, die an den Nägeln die
50/50-Entscheidung auslöst. Der PRNG (`mulberry32`) wird nur hier eingesetzt – **nicht**
in der Kollision selbst. Derselbe Seed reproduziert denselben Lauf.

## Verifikation

`tests/verify_physics.js` simuliert die Kugeln mit **realistischem Spawn-Intervall**
(38 ms, nicht alle gleichzeitig – sonst entsteht ein Dichte-Artefakt), sammelt die
Fachverteilung und testet:

- μ ≈ n·p mit p=0.5 (Toleranz ±0.45)
- σ ≈ √(n·p·(1−p)) (Toleranz ±0.5)
- χ²-Güte gegen Binomialverteilung B(n, 0.5) (kritischer Wert mit 15 % Toleranz)

Referenz-Werte (gemessen):

| Kugeln | Ebenen | μ (ist) | σ (ist) | σ (Theorie) | χ² | Ergebnis |
|---|---|---|---|---|---|---|
| 300 | 12 | 6.12 | 1.95 | 1.73 | 8.69 | ✅ |
| 600 | 12 | 6.04 | 1.94 | 1.73 | 10.09 | ✅ |
| 300 | 20 | 10.12 | 2.52 | 2.24 | 5.61 | ✅ |
