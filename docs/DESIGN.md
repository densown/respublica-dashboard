# Gestaltungsrichtlinie Res.Publica Dashboard

Verbindlich für allen Frontend-Code in diesem Repo. Wer eine Regel bricht,
schreibt daneben, warum.

---

## Warum es dieses Dokument gibt

Eine Messung über `src/pages/` und `src/components/` (August 2026):

| Befund | Zahl |
|---|---|
| `fontSize`-Token verwendet | **0×** |
| Rohe `rem`-Angaben stattdessen | 381× |
| `radius`-Token verwendet | 11× — gegenüber 159 rohen Zahlen |
| Hartkodierte Hex-Farben | **196× in 23 Dateien** |
| Inline gebaute `<button>` | 96× |
| `FilterToolbar` verwendet | **0×** |
| Muster für Abschnittsüberschriften | 4 nebeneinander |
| Seiten ohne jede Mobile-Behandlung | 8 von 15 |

Der Grund für die Nichtnutzung war nicht Nachlässigkeit: **kein einziger
Wert der alten `fontSize`-Skala traf eine Größe, die tatsächlich gebraucht
wurde.** Die Skala stand auf 0,8125 und 0,9375 rem, verwendet wurden 0,8 /
0,82 / 0,85 / 0,9 / 0,95. Token, die man beim Schreiben umrechnen muss,
benutzt niemand.

Daraus folgt das Grundprinzip dieses Dokuments: **Die Regel muss der
bequemere Weg sein.** Wo eine Regel mehr Arbeit macht als der Verstoß, ist
nicht die Disziplin schuld, sondern die Regel.

---

## 1. Grundsätze

1. **Journalistisch, nicht dashboardartig.** Die Seite ist ein
   redaktionelles Erzeugnis. Eine Kachelreihe aus Kennzahlen ist selten die
   richtige Antwort; ein Vorspann, eine Aussage, ein Beleg meistens schon.
2. **Die Daten tragen die Farbe, das Layout ist ruhig.** Parteifarben,
   Ja/Nein-Grün und -Rot sind Datenfarben. Alles andere ist Papier, Tinte
   und eine Grenzlinie.
3. **Rot ist Akzent, keine Datenfarbe.** `c.red` markiert Aktives,
   Ausgewähltes, den einen Handlungsaufruf. Nicht Flächen einfärben.
4. **Ein Element, ein Ort.** Gibt es eine Komponente, wird sie verwendet.
   Reicht sie nicht, wird sie erweitert — nicht danebengebaut.
5. **Dunkelmodus und Handy sind kein Nachtrag.** Beides gilt ab der ersten
   Zeile, nicht nach dem Merge.

---

## 2. Raster und Rhythmus

Der vertikale Rhythmus ist die halbe Miete für „aus einem Guss". Nur diese
Abstände, nie dazwischen:

| Zweck | Wert |
|---|---|
| Innerhalb einer Zeile, Icon zu Text | `spacing.xs` (4) / `spacing.sm` (8) |
| Innerhalb eines Blocks, Zeile zu Zeile | `spacing.md` (12) |
| Block zu Block innerhalb eines Abschnitts | `spacing.lg` (16) |
| Kopfbereich zu erstem Abschnitt | `spacing.xl` (24) |
| **Abschnitt zu Abschnitt** | `spacing.xxl` (32) |
| Seitenende | `spacing.xxl` (32) |

Nie `padding: '16px'` schreiben, immer `spacing.lg`. Rohe Pixel sind nur
erlaubt für optische Feinheiten unter 4 px (Randstärken, 2-px-Versätze).

**Zeilenlänge.** Fließtext bekommt `maxWidth: '68ch'`, Überschriften
`maxWidth: '22ch'`. Text, der über die volle Breite eines 1440er-Monitors
läuft, ist unlesbar.

---

## 3. Typografie

Drei Schriften, drei Aufgaben. Keine vierte.

- `fonts.display` — Playfair Display. Nur Seitentitel und
  Abschnittsüberschriften.
- `fonts.body` — Source Serif. Fließtext, Namen, alles zum Lesen.
- `fonts.mono` — IBM Plex Mono. Zahlen, Daten, Labels, Metazeilen. Alles,
  was man vergleicht statt liest.

### Skala

Neu geschnitten nach tatsächlichem Bedarf. Immer `fontSize.*`, nie rohe
`rem`:

| Token | rem | px | Verwendung |
|---|---|---|---|
| `fontSize.micro` | 0.6875 | 11 | Mono-Label, Versalien, Legenden |
| `fontSize.xs` | 0.75 | 12 | Metazeile, Fußnote, Quellenangabe |
| `fontSize.sm` | 0.8125 | 13 | Tabellendaten, Chips, Hilfstext |
| `fontSize.md` | 0.875 | 14 | Sekundärer Fließtext |
| `fontSize.base` | 0.9375 | 15 | Fließtext |
| `fontSize.lg` | 1.0625 | 17 | Vorspann, hervorgehobene Zahl |
| `fontSize.xl` | 1.25 | 20 | Abschnittsüberschrift |
| `fontSize.xxl` | 1.5 | 24 | Seitentitel Handy |
| `fontSize.hero` | 2.25 | 36 | Seitentitel Desktop |

Zeilenhöhe: `lineHeight.tight` (1.2) für Überschriften,
`lineHeight.normal` (1.5) für Kurztext, `lineHeight.relaxed` (1.7) für
Fließtext ab drei Zeilen.

---

## 4. Farbe

**Regel ohne Ausnahme: kein Hex-Literal in `pages/` oder `components/`.**
Jede Farbe kommt aus `useTheme().c` oder aus `partyColors.ts`. Fehlt ein
Ton, wird er als Token ergänzt — in beiden Paletten.

Warum so hart: die 196 gefundenen Hex-Werte enthalten 24× Weiß und 6×
`#0F0F0F`. Beide sind im Dunkelmodus falsch, per Definition, unabhängig vom
Kontext.

Für Flächenabstufungen (Choroplethen, Dichten) wird ein Token mit Alpha
hinterlegt, nicht ein neuer Farbwert erfunden.

### Dunkelmodus

Nicht invertieren, sondern umschichten. Der Dunkelmodus ist eine eigene
Palette mit eigenen Kontrasten:

- Text auf Fläche mindestens 4,5:1, große Schrift 3:1.
- Parteifarben brauchen im Dunkeln teils eigene Werte — siehe
  `PARTY_COLORS_DARK`, wo CDU/CSU von `#1A1A1A` auf `#8899AA` wechselt,
  weil Schwarz auf dunklem Grund verschwindet.
- Ränder werden im Dunkeln heller, nicht dunkler.
- **Prüfen heißt umschalten.** Jede neue Ansicht wird in beiden Modi
  angesehen, bevor sie eingecheckt wird.

---

## 5. Seitenaufbau

Jede Seite folgt derselben Abfolge. Abweichung nur mit Begründung im Code.

```
PageShell
├── PageHeader        Titel, Untertitel — immer die Komponente, nie eigenes <h1>
├── [Unternavigation] wenn das Modul Unterseiten hat
├── [Toolbar]         Filter, Umschalter — eine Zeile, nicht drei
└── Section*          Überschrift + Inhalt, Abstand xxl dazwischen
```

**Kein eigenes `<h1>`.** Zwei Seiten hatten das (`ElectionPolls`,
`ElectionCandidates`) und waren dadurch die einzigen, die aus der Reihe
fielen. Braucht der Titel mehr — Kicker, Datumszeile —, wird `PageHeader`
erweitert.

**Eine Sorte Abschnittsüberschrift.** `Section` mit `title`. Nicht mal
`SectionDivider`, mal `<h2>`, mal `<h3>`, mal ein Mono-Label.

---

## 6. Bedienelemente

96 inline gebaute Knöpfe sind der Grund, warum nichts zusammenpasst. Es
gibt drei zugelassene Formen:

| Form | Komponente | Wofür |
|---|---|---|
| Umschalter | `ViewToggle` | Sich ausschließende Ansichten |
| Auswahl-Chip | `Chip` | Filter, Mehrfachauswahl, Wahl aus einer Menge |
| Schaltfläche | `Button` | Aktion mit Folge |

Alle drei erfüllen von sich aus:

- Touch-Ziel mindestens **44 px** Höhe. Ohne Ausnahme, auch auf dem
  Desktop — Zeigegenauigkeit ist keine Frage des Geräts.
- Sichtbarer Fokus **nur bei Tastaturbedienung** (`:focus-visible`), nie
  ein Rahmen nach Mausklick.
- Aktiver Zustand über Rand und Schriftstärke, nicht allein über Farbe.

Bei mehr als etwa zwölf Auswahlmöglichkeiten wird nicht die Chip-Reihe
länger, sondern auf ein Auswahlfeld gewechselt. 41 nummerierte Knöpfe
nebeneinander sind eine Liste, keine Bedienung.

---

## 7. Handy

Der Entwurf beginnt bei 320 px, nicht am Desktop.

- Kein waagerechtes Scrollen der Seite. Breite Inhalte scrollen in ihrem
  eigenen Behälter.
- **Tabellen ab vier Spalten werden auf dem Handy zur Karten-Liste.**
  Vier Tabellen im Bestand tun das nicht und sind dort unbenutzbar.
- Zwei Spalten werden zu einer. Grid-Definitionen laufen über
  `useIsMobile()`, nicht über Medienabfragen im Stil-Objekt.
- Fixierte Bereiche kosten Höhe. Auf dem Handy nichts kleben lassen, was
  nicht bedient wird.

---

## 8. Zustände

Jede Ansicht, die lädt, braucht vier Antworten. Fehlt eine, ist die Ansicht
nicht fertig.

| Zustand | Regel |
|---|---|
| Erstes Laden | `LoadingSpinner`, sonst nichts |
| **Nachladen** | Bestehenden Inhalt **stehen lassen**, leicht abblenden |
| Leer | `EmptyState` mit Erklärung, warum leer |
| Fehler | Klartext, kein Fehlercode |

Das Nachladen ist die Regel, die am häufigsten verletzt wird. Wer den
Inhalt beim Filterwechsel aushängt, lässt die Seite auf Spinnerhöhe
zusammenfallen — der Browser springt nach oben, und interner Zustand von
Kindkomponenten geht verloren.

---

## 9. Datenherkunft

Jede fremde Datenquelle wird an der Ansicht genannt, nicht im Impressum.
Bei dawum (ODbL) und den Geodaten der Landesämter ist das Lizenzbedingung,
sonst schlicht redaktioneller Anstand.

---

## 10. Prüfliste vor dem Merge

- [ ] `npm run build` fehlerfrei
- [ ] Kein Hex-Literal hinzugekommen
- [ ] Keine rohe `rem`- oder `px`-Angabe für Schrift, Abstand, Radius
- [ ] In beiden Farbmodi angesehen
- [ ] Bei 320 px angesehen, kein waagerechtes Scrollen
- [ ] Touch-Ziele ≥ 44 px
- [ ] Alle vier Ladezustände bedacht
- [ ] i18n-Schlüssel in **beiden** Blöcken, kein roher String im UI
- [ ] Bundle nicht gewachsen (liegt bei ~2,3 MB, `vendor-map` allein 1 MB)

---

## Anhang: was es schon gibt

Vor jedem Neubau hier nachsehen. Ungenutzt heißt nicht unbrauchbar —
`FilterToolbar`, `ProgressBar`, `CompareBar`, `VoteBar` und `ShareCompact`
existieren und werden in `pages/` bislang nicht verwendet.

Zwei Fallen im Bestand:

- **`MultiLineChart` ist kein allgemeiner Liniendiagramm-Baustein.** Er ist
  auf Handelsdaten verdrahtet (`total_export_usd`, USD-Formatierung, zwei
  feste Linien). Für Zeitreihen mit mehreren Reihen ist `TimeSeriesChart`
  in `pages/elections/` das Muster.
- **`recharts` ist bereits Abhängigkeit** und liegt im Chunk
  `vendor-charts`. Für Diagramme keine weitere Bibliothek aufnehmen.
