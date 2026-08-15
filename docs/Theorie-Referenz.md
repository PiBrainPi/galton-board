# Theorie-Referenz – Galton Board

Hintergrundwissen, Formeln und Quellen hinter `build/Galton_Board_V01.html`.

## 1. Bernoulli-Experiment

Ein Zufallsexperiment mit zwei Ausgängen („rechts“/„links“). Beim idealen Brett: p = 0.5.

## 2. Binomialverteilung

X = Anzahl „rechts“ unter n unabhängigen Versuchen: X ~ B(n, p).

```
P(X = k) = C(n, k) · p^k · (1 − p)^(n−k)
C(n, k) = n! / (k! · (n−k)!)
```

Mit p = 0.5: `P(X = k) = C(n, k) / 2^n`. Das Brett ist ein Analogrechner für C(n, k).

## 3. Pascal'sches Dreieck

Rekursion `C(n, k) = C(n−1, k−1) + C(n−1, k)`. Zeilensumme = 2^n.
Symmetrie `C(n, k) = C(n, n−k)` → symmetrische Verteilung.

## 4. Erwartungswert & Varianz

```
μ = n·p
σ² = n·p·(1−p)
σ = √(n·p·(1−p))
```

Bei 12 Ebenen: μ = 6.0, σ = √3 ≈ 1.73. Die gemessene Simulation erreicht σ ≈ 1.9–2.0.

## 5. De-Moivre-Laplace-Theorem (1812)

Die Binomialverteilung strebt für n → ∞ gegen die Normalverteilung:

```
P(X = k) ≈ (1 / (σ√(2π))) · exp(−(k−μ)² / (2σ²))
```

Schon bei n = 12 ist die Annäherung für die Praxis sehr gut.

## 6. Zentraler Grenzwertsatz (CLT)

Die Summe vieler unabhängiger, gleichverteilter Effekte ist annähernd normalverteilt –
unabhängig von der Verteilung der Einzeleffekte. Die Kugelposition ist die Summe von n
±1-Entscheidungen → CLT gilt direkt.

## 7. Historie

- **Francis Galton (1822–1911)**: Cousin Darwins, begründete Korrelation, Regression,
  Biometrie; prägte „nature vs. nurture“.
- **Quincunx (um 1873)**: Galtons Demonstrationsgerät, benannt nach der Fünfer-Anordnung
  eines Würfels. Beschrieben in *Natural Inheritance* (1889). Diente zur Veranschaulichung
  des „law of error“ (Normalverteilung) und der Regression zur Mitte.
- **Verbreitung**: Karl Pearson formalisierte Galtons Statistik; das Gerät wurde im
  englischen Sprachraum als „Galton Board“ / „Bean Machine“ (Bohnen-Maschine) bekannt.

### Kritische Einordnung

Galton war Verfechter der **Eugenik**; seine sozialen Forderungen werden von der modernen
Wissenschaft und Gesellschaft klar abgelehnt. Seine statistischen Werkzeuge sind neutrale
Errungenschaften – das Brett zeigt Mathematik, keine Werturteile. Diese Trennung ist
wichtig für eine ehrliche Betrachtung (u. a. Gould, *The Mismeasure of Man*, 1981).

## 8. Anwendungen

| Bereich | Idee | Grenze |
|---|---|---|
| Six Sigma / QC | Variation inhärent → Regelkarten, Cpk | Braucht Normalitäts-Annahme |
| Finanzmärkte | Random Walk, Bachelier 1900, Black-Scholes | Fat Tails, Volatilitäts-Clustering |
| Physik | Brownsche Bewegung, Einstein 1905, Perrin 1909 | — |
| Genetik | Additive Gen-Umwelt-Effekte → Normalverteilung | Viele Merkmale nicht exakt normal |
| Sozialwissenschaften | Messfehler-Modell, Konfidenzintervalle | Einkommen/Vermögen sind lognormal |
| KI / ML | Bagging, Random Forests (Breiman 2001) | Annahme unabhängiger Modelle |

## 9. Quellen

- Galton, F. (1889). *Natural Inheritance*. Macmillan.
- Stigler, S. M. (1986). *The History of Statistics: The Measurement of Uncertainty before 1900*. Harvard University Press.
- Freedman, D., Pisani, R., Purves, R. (2007). *Statistics*, 4. Aufl. W. W. Norton.
- Gould, S. J. (1981). *The Mismeasure of Man*. Norton.
- de Moivre, A. (1733). *The Doctrine of Chances* (Approximation der Binomialverteilung).
- Laplace, P.-S. (1812). *Théorie analytique des probabilités*.
- Bachelier, L. (1900). *Théorie de la spéculation*.
- Breiman, L. (2001). Random Forests. *Machine Learning*, 45(1), 5–32.
- Wikipedia: *Galton board* / *Francis Galton* (Zugriff August 2026).

## 10. Empirische Eichung

Die Simulation verwendet die tangentiale Peg-Reibung 0.35 und Restitution 0.05, um die
binomiale Glockenkurve korrekt zu reproduzieren. Diese beiden Werte wurden per
χ²-Gütetest gegen B(n, 0.5) kalibriert (300/600/20-Ebenen-Läufe). Abweichende
Physik-Parameter (z. B. hohe Elastizität) verschieben σ nach oben – das ist realistisch
(„verspielte“ Bretter streuen breiter).
