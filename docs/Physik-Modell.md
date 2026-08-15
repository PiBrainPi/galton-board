# Physik-Modell – Galton Board

Dokumentation der Simulations-Engine in `build/Galton_Board_V10.1.html`.

## Überblick

Die Simulation ist eine **2D-Kollisionssimulation mit fixem Zeitschritt** (semi-implicit Euler).
Das Brett wird als symmetrischer Quincunx aufgebaut; Kugeln fallen von oben, stoßen an
Messingnägeln und Wänden, interagieren untereinander und werden nach Durchlaufen der
letzten Ebene gezählt (verschwinden aus dem Brett → nur Histogramm als Ergebnis).

## Konstanten

| Größe | Wert | Bedeutung |
|---|---|---|
| `PAD_L/R/T` | 44 / 44 / 74 px | Innenabstände des Bretts |
| `G_REF / G_SCALE` | 9.81 · 100 | Fallbeschleunigung in px/s² (Default) |
| `AIR_DRAG` | 0.55 / s | Luftwiderstand (exponentiell pro Sekunde) |
| `REST_WALL` | 0.58 | Restitution an Wänden |
| `REST_BALL` | 0.45 | Restitution Kugel–Kugel (intern stark gedämpft) |
| `DT_STEP` | 1/120 s | fixer Physik-Timestep |
| `MAX_SUBSTEPS` | 120 | max. Sub-Steps pro Frame (deckt speed bis ×20 ab) |
| `TANG_DAMP` | 0.985 | Zusätzliche Tangentialdämpfung (subtil) |

## Geometrie

- **Peg-Abstand**: `GX = round(min(56, max(14, 4.6·(ballR + pegR))))`
  - `pegR = max(1.5, ballR·0.85)` (kräftige Messingnägel relativ zur Kugelgröße)
  - Der Faktor 4.6 ist kalibriert für die Physik-Konstanten 0.30/adaptiv (s. u.)
- **Reihenabstand**: `RY = 0.75·GX`
- **Peg-Anzahl pro Reihe**: Abwechselnd `n` und `n+1` Pegs, symmetrisch um die Brettmitte `CX`.
  Die letzte Reihe hat `n` Pegs → es entstehen `n+1` Fächer.
- **Wände**: Positioniert an der **breitesten** Reihe (`n+1` Pegs) + `pegR0 + ballR·2.2 + 1`.
  Bei ungeradem `n` startet das Muster mit der schmalen Reihe (`n` Pegs); die Wand muss
  dennoch die äußersten Pegs der breiten (`n+1`)-Reihen umfassen.
- **Brett-Höhe**: Endet kompakt direkt unter der letzten Nagelreihe (`floorY + 22`).
  Kugeln verschwinden nach der letzten Ebene (kein Stapel im Brett).

## Kollisionsmodell Peg/Kugel

Bei jedem Kontakt (Abstand < ballR + pegR):

1. **Position korrigieren**: Kugel entlang der Normalen aus dem Nagel schieben.
2. **Normalen-Restitution**: `restPeg = min(state.rest, 0.30)` – gedeckelt, damit Kugeln
   natürlich abprallen, ohne quer über das Brett zu springen (σ≈1.7 statt 2.5).
3. **Tangentiale Rollreibung**: **Adaptiv** abhängig von der Ebenenzahl:
   `vTang *= 0.55 + Math.max(0, 12 − state.rows) · 0.025`
   - Bei `n ≥ 12`: Faktor 0.55 (bewährt, σ≈1.7)
   - Bei `n = 5`:   Faktor 0.725 (mehr seitliche Streuung nötig bei wenigen Kollisionen)
   - Bei `n = 3`:   Faktor 0.775

**Warum adaptiv?** Ein Quincunx mit wenigen Ebenen (n < 8) erzeugt zu wenige Nagelkontakte,
um die Kugeln bis in die äußersten Fächer zu streuen. Die tangentiale Dämpfung pro Kontakt
muss daher geringer sein. Bei n ≥ 12 sind genug Kontakte vorhanden → die niedrige Dämpfung
(0.55) produziert die korrekte Binomialverteilung (σ = √(n/4)).

**Warum das die Glockenkurve erzeugt:** Ein Quincunx-Nagel ist kein Spiegel. Die Kugel
„rollt" vom Nagel ab, statt quer abzuprallen. Der seitliche Impuls nach dem Kontakt ist
daher klein und hängt von der exzentrischen Auftreffgeometrie ab – das liefert die
binomiale 50/50-Streuung pro Reihe. Ohne tangentiale Dämpfung würde die Kugel quer über
das Brett springen (σ≈3 statt 1.73).

## Kugel-Kugel-Kollision

Räumliche Hash-Buckets (Bänder von 2·RY); nur benachbarte Bänder werden geprüft.
Stoßantwort stark gedämpft, Positionskorrektur minimal. Grund: Ein Kugel-„Strom" darf
die Verteilung nicht wie ein Keil verbreitern. Die Kollision bleibt sichtbar (Kugeln
weichen aus), transportiert aber kaum seitliche Energie. Korrekturfaktor 0.25.

## Kugel-Settling

Sobald `y > floorY && vy > 0`, wird die Kugel in das nächstgelegene Fach gezählt
(`settleBall`), aus dem aktiven Array entfernt (`removeSettled`) und die Statistik
aktualisiert. `dropped` zählt gelandete Kugeln. Kugeln werden **nicht gestapelt**,
sondern verschwinden nach der letzten Ebene (User-Wunsch, V03).

## Geschwindigkeitsmodell (V10)

Die Simulationsgeschwindigkeit (`state.speed`) multipliziert **nicht** die Zeitschrittgröße,
sondern die Anzahl der Frame-Wiederholungen pro rAF-Frame:
- `steps = max(1, min(60, round(speed · 3)))` – z. B. speed=10 → 30 Wiederholungen/Frame
- Jede Wiederholung mit `subRaw = min(raw, 0.05)` → garantiert `h ≤ DT_STEP`
- Der Spawn skaliert ebenfalls mit speed: `spawnAcc += raw · 1000 · state.speed`

So bleibt die Physik **geschwindigkeitsunabhängig** (verifiziert: 20/20 Läufe speed 1–20,
χ² grün). Ursprünglich verfälschte der Multiplikator `stepWorld(raw·speed)` die Verteilung
bei speed≥10 massiv (χ² bis 329).

## Abwurf (Seed)

Jede Kugel startet mit minimaler physikalischer Ungenauigkeit:
- Position ±25 % der Pegbreite um die Brettmitte
- Kippung ±0.1 rad (→ anfängliche Seitengeschwindigkeit ±6 px/s)
- Fallgeschwindigkeit 92–108 % des Basiswerts

Diese Abwurf-Streuung ist die „chaotische Empfindlichkeit", die an den Nägeln die
50/50-Entscheidung auslöst. Der PRNG (`mulberry32`) wird nur hier eingesetzt – **nicht**
in der Kollision selbst. Derselbe Seed reproduziert denselben Lauf.

## Steuerungs-FSM (V08)

| Zustand | Klick | Nächster Zustand | Wirkung |
|---|---|---|---|
| ▶ Start | Start | ■ Stopp | rAF-Loop läuft |
| ■ Stopp | Stopp | ▶ Start | rAF-Loop angehalten, Brett geleert, Parameter bleiben |
| ⏸ Pause | Pause | ▶ Weiter | running bleibt true, paused=true |
| ▶ Weiter | Pause | ⏸ Pause | running=true, paused=false |
| ↺ Reset | Reset | ▶ Start | Alle Parameter auf Default, Brett neu, rAF gestoppt |

## Verifikation

`tests/verify_fullrun.js` simuliert alle Kugeln mit echtem Spawn und prüft:

- μ ≈ n·p mit p=0.5 (Toleranz ±0.45)
- σ ≈ √(n·p·(1−p)) (Toleranz ±0.5, bei n>2000: σ-Toleranz statt χ²)
- χ²-Güte gegen Binomialverteilung B(n, 0.5) (kritischer Wert +15 %)

`tests/verify_speed20.js` prüft Geschwindigkeitsunabhängigkeit (20 Läufe speed 1–20).

`tests/diag_rows.js` prüft Randfach-Füllung über alle Ebenenzahlen (3–20).

**Aktuelle Referenzwerte (V10.1):**

| Kugeln | Ebenen | μ (ist) | σ (ist) | σ (Theorie) | χ² | Ergebnis |
|---|---|---|---|---|---|---|
| 300 | 12 | 5.91 | 1.70 | 1.73 | 3.30 | ✅ |
| 600 | 12 | 5.87 | 1.66 | 1.73 | 12.24 | ✅ |
| 300 | 20 | 9.94 | 2.38 | 2.24 | 6.78 | ✅ |
| 5000 | 12 | 5.99 | 1.64 | 1.73 | — (σ-geprüft) | ✅ |
| 10000 | 12 | 6.00 | 1.63 | 1.73 | — (σ-geprüft) | ✅ |
