# Werbevideo

Erzeugt zwei Fassungen aus der **echten Live-Seite**: quer für Reddit und X,
hoch für Instagram und TikTok.

```bash
cd /root/apps/dashboard
node scripts/promo/shots.mjs                                   # 1. aufnehmen
RP_FONTS=~/.cache/respublica-fonts \
  /root/apps/gesetze/.venv/bin/python3 scripts/promo/cards.py  # 2. Titelkarten
/root/apps/gesetze/.venv/bin/python3 scripts/promo/build.py    # 3. zusammenbauen
```

Ergebnis in `out/`. Dauer des ganzen Durchlaufs: rund fünf Minuten.

## Warum aufnehmen statt erzeugen

Die KI-Videogeneratoren können diese Seite nicht zeigen, sie erfinden eine.
Was herauskommt, ist eine plausibel aussehende Oberfläche mit verschmierter
Schrift und ausgedachten Zahlen. Für ein Projekt, dessen Behauptung
„nachprüfbar" lautet, ist das kein Schönheitsfehler, sondern ein Eigentor.

## Warum Standbilder statt Bildschirmaufnahme

- **Schärfe.** Aufgenommen wird mit doppelter bzw. dreifacher Punktdichte und
  erst beim Zusammenbau verkleinert. Eine Bildschirmaufnahme liefert genau die
  Zielauflösung, und danach nimmt der Codec davon weg.
- **Arbeitsspeicher.** Der Server hat 3 GB, davon rund 1 GB frei. Chromium samt
  laufender Videokodierung passt da nicht zuverlässig hinein, ein Bild nach dem
  anderen schon.
- **Wiederholbarkeit.** Kein Mauszeiger, der danebentrifft, keine Aufnahme, die
  je nach Serverlast anders lang wird.

Der Preis: keine sichtbare Bedienung, kein Mauszeiger, keine laufenden
Diagrammanimationen. Wenn das gebraucht wird, kann `shots.mjs` stattdessen
Puppeteers `screencast` benutzen — dann aber bitte vorher `free -g` ansehen.

## Die Zahlen sind lebendig

`cards.py` holt Wahltermin, Resttage und alle Kennzahlen zur Laufzeit aus
`/api`, statt sie einzutippen. Das ist der Grund für den ganzen Aufwand: eine
Karte mit „noch 23 Tage" ist am nächsten Morgen falsch. Skript neu laufen
lassen, Video stimmt wieder.

Aus demselben Grund nimmt `shots.mjs` gegen `https://app.respublica.media` auf
und nicht gegen `localhost`: das Video soll zeigen, was Besucher sehen, samt
Auslieferung über nginx.

## Was wo geändert wird

| Wunsch | Datei | Stelle |
|---|---|---|
| Andere Seiten zeigen | `shots.mjs` | `SZENEN` |
| Reihenfolge, Dauer, Fahrtrichtung | `build.py` | `FOLGE` |
| Text der Titelkarten | `cards.py` | `baue()` |
| Anderes Seitenverhältnis | alle drei | `FORMATE` / `PROFILE` / `FOLGE` |

Reihenfolge und Dauer stehen bewusst nur in `build.py`. Wer den Schnitt ändert,
muss nicht neu aufnehmen.

## Fallstricke, die schon zugeschlagen haben

- **Scrollen.** Das Grundgerüst steht auf `overflow: hidden` und scrollt den
  Inhalt in einem eigenen Bereich. `window.scrollTo` meldet Erfolg und bewegt
  nichts — die Bilder zeigten dann alle den Seitenanfang. `scrollIntoView` sucht
  sich den richtigen Bereich selbst. `shots.mjs` meldet deshalb nicht nur
  „gefunden", sondern auch, um wie viele Punkte tatsächlich gescrollt wurde.
- **Abschnitte über Text suchen, nicht über Pixelhöhen.** Höhen verschieben
  sich, sobald mehr Daten da sind, und das Bild zeigt die falsche Stelle.
- **Warten.** Zwei getrennte Gründe: die API muss antworten, und recharts
  animiert seine Linien beim Einblenden. Ohne die zweite Wartezeit steht im
  Bild ein halb aufgebautes Diagramm.
- **Fahrt erst doppelt groß, dann herunterrechnen.** `zoompan` setzt den
  Ausschnitt auf ganze Bildpunkte. Auf der Zielgröße sieht man dieses Springen
  als Ruckeln, auf der doppelten nicht mehr.
- **Paarweise überblenden statt ein Filtergraph.** Alle dreizehn Abschnitte in
  einen Aufruf zu hängen hält jeden Dekodierer gleichzeitig offen. Bei 1 GB
  freiem Speicher ist das die Art Sparsamkeit, die man einmal ausprobiert und
  danach bereut.
- **Tonlose Tonspur.** Einige Netzwerke behandeln Videos ohne Audiostrom als
  fehlerhaft und zeigen sie gar nicht erst an.

## Noch offen

- **Ton.** Beide Fassungen sind stumm. Auf Reddit egal, dort läuft ohnehin
  alles stumm an. Instagram und TikTok bevorzugen Videos mit Ton spürbar. Dafür
  wird Musik mit klarer Lizenz gebraucht — nichts, was sich hier erfinden lässt.
- **Untertitel.** Für Instagram und TikTok üblich und nützlich, weil dort stumm
  geschaut wird. Bisher tragen die Titelkarten die ganze Aussage.
