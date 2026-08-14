"""Titelkarten fuer das Werbevideo, in beiden Seitenverhaeltnissen.

    RP_FONTS=<pfad> python3 scripts/promo/cards.py

Die Zahlen und der Wahltermin werden zur Laufzeit aus der oeffentlichen
API geholt, nicht eingetippt. Das ist der Punkt an der ganzen Uebung: die
Staerke des Projekts ist die Aktualitaet, und eine Karte mit "noch 23 Tage"
ist am naechsten Morgen falsch. Skript neu laufen lassen, Video stimmt wieder.

Gesetzt wird in logischen Einheiten und mit Faktor 2 gerendert — dasselbe
Verfahren wie beim Teilen-Bild, aus demselben Grund: verkleinern schaerft.

Der Satz laeuft ueber gestapelte Bloecke, nicht ueber feste Hoehenangaben.
Ein erster Entwurf mit Prozentwerten je Zeile lief sofort ineinander, sobald
ein Wahlname laenger war als der zum Ausprobieren benutzte; und was in 16:9
passte, kollidierte in 9:16. Bloecke messen ihre eigene Hoehe und der Stapel
wird als Ganzes mittig gesetzt, damit beide Formate und jeder Wahlname ohne
Nachjustieren sitzen.
"""
import json
import os
import urllib.request
from datetime import date, datetime

from PIL import Image, ImageDraw, ImageFont

API = os.environ.get('RP_API', 'http://localhost:3002/api')
F = os.environ.get('RP_FONTS', os.path.expanduser('~/.cache/respublica-fonts'))
AUS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cards')

PAPIER = (245, 240, 232)
TINTE = (15, 15, 15)
GEDAEMPFT = (82, 89, 96)
ROT = (200, 16, 46)
RAND = (232, 228, 220)

MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
          'August', 'September', 'Oktober', 'November', 'Dezember']


def hole(pfad):
    with urllib.request.urlopen(f'{API}{pfad}', timeout=15) as r:
        return json.load(r)


def tausend(n):
    return f'{n:,}'.replace(',', '.')


# --- Lebende Zahlen ----------------------------------------------------
g = hole('/gesetze/stats')
lob = hole('/lobbyregister/stats')
termine = [w for w in hole('/wahltermine?status=kommend')['wahltermine'] if w.get('datum')]
termine.sort(key=lambda w: w['datum'])
naechste = termine[0]

d0 = datetime.strptime(naechste['datum'], '%Y-%m-%d').date()
TAGE = (d0 - date.today()).days
DATUM = f'{d0.day}. {MONATE[d0.month - 1]} {d0.year}'
# "Landtagswahl Sachsen-Anhalt 2026" -> Wahlart und Ort auf zwei Zeilen,
# sonst steht die Zeile in 9:16 winzig da, nur um in die Breite zu passen.
WAHL_ART, _, WAHL_ORT = naechste['name_de'].partition(' ')

Z = {
    'gesetze': tausend(g['gesetze_count']),
    'aenderungen': tausend(g['aenderungen_count']),
    'lobby': tausend(lob['total']),
    'umfragen': str(naechste['umfragen']),
}

# b/h in logischen Einheiten, s hebt auf die Zielaufloesung.
PROFILE = {
    'quer': dict(b=960, h=540, s=2, h1=64, h2=52, gross=92, klein=20, kicker=18),
    'hoch': dict(b=540, h=960, s=2, h1=52, h2=44, gross=68, klein=19, kicker=17),
}


class Karte:
    """Ein Stapel mittig gesetzter Bloecke auf Papierfarbe."""

    def __init__(self, profil):
        self.p = profil
        self.S = profil['s']
        self.B = profil['b'] * self.S
        self.H = profil['h'] * self.S
        self.bild = Image.new('RGB', (self.B, self.H), PAPIER)
        self.d = ImageDraw.Draw(self.bild)
        self.bloecke = []           # (hoehe, zeichenfunktion)

    # -- Masse ----------------------------------------------------------
    def E(self, n):
        return round(n * self.S)

    def schrift(self, datei, groesse):
        return ImageFont.truetype(f'{F}/{datei}.ttf', self.E(groesse))

    def passend(self, datei, groesse, text, anteil=0.86, sperrung=0):
        """Verkleinert, bis der Text in die Breite passt. Ohne das reisst
        ein langer Wahlname wie 'Mecklenburg-Vorpommern 2026' ueber den
        Rand — und welcher Name drankommt, entscheidet die Datenbank."""
        max_br = self.B * anteil
        while groesse > 8:
            f = self.schrift(datei, groesse)
            if self.breite(text, f, sperrung) <= max_br:
                return f
            groesse -= 1
        return self.schrift(datei, 8)

    def breite(self, text, font, sperrung=0):
        sp = sperrung * self.S
        if sp:
            return sum(self.d.textlength(z, font=font) + sp for z in text) - sp
        return self.d.textlength(text, font=font)

    @staticmethod
    def zeilenhoehe(font):
        # Ascent + Descent statt der Ausdehnung des konkreten Textes:
        # sonst rueckt eine Zeile ohne Unterlaengen naeher an die naechste
        # als eine mit, und der Stapel atmet ungleichmaessig.
        a, d = font.getmetrics()
        return a + d

    # -- Bloecke --------------------------------------------------------
    def zeile(self, text, font, farbe=TINTE, sperrung=0, luft=0):
        h = self.zeilenhoehe(font) + self.E(luft)

        def zeichne(y):
            sp = sperrung * self.S
            if sp:
                x = (self.B - self.breite(text, font, sperrung)) / 2
                for zeichen in text:
                    self.d.text((x, y), zeichen, font=font, fill=farbe)
                    x += self.d.textlength(zeichen, font=font) + sp
            else:
                self.d.text((self.B / 2, y), text, font=font,
                            fill=farbe, anchor='ma')
        self.bloecke.append((h, zeichne))

    def stempel(self, text, font, luft=0, pad=(30, 14, 18)):
        """Weisser Text auf rotem Block. Das Rot ist keine Dekoration: ein
        roter Stempel auf einem Dokument ist die Geste des Pruefens."""
        px, po, pu = (self.E(v) for v in pad)
        h = self.zeilenhoehe(font) + po + pu + self.E(luft)

        def zeichne(y):
            br = self.breite(text, font)
            self.d.rectangle(
                [(self.B - br) / 2 - px, y,
                 (self.B + br) / 2 + px, y + self.zeilenhoehe(font) + po + pu],
                fill=ROT)
            self.d.text((self.B / 2, y + po), text, font=font,
                        fill=PAPIER, anchor='ma')
        self.bloecke.append((h, zeichne))

    def wortmarke(self, groesse, luft=0):
        """Der Punkt ZWISCHEN Res und Publica ist rot, hinter Publica steht
        keiner. Der Zwischenpunkt ist die Signatur der Marke; ein Punkt am
        Ende macht daraus einen Satz und verwaessert das Zeichen."""
        f = self.schrift('playfair-700', groesse)
        teile = [('Res', TINTE), ('.', ROT), ('Publica', TINTE)]
        h = self.zeilenhoehe(f) + self.E(luft)

        def zeichne(y):
            gesamt = sum(self.d.textlength(t, font=f) for t, _ in teile)
            x = (self.B - gesamt) / 2
            for t, farbe in teile:
                self.d.text((x, y), t, font=f, fill=farbe)
                x += self.d.textlength(t, font=f)
        self.bloecke.append((h, zeichne))

    def linie(self, anteil=0.28, luft=0):
        h = max(1, self.E(1)) + self.E(luft)

        def zeichne(y):
            x = self.B * (1 - anteil) / 2
            self.d.line([(x, y), (self.B - x, y)], fill=RAND,
                        width=max(1, self.E(1)))
        self.bloecke.append((h, zeichne))

    def luft(self, n):
        self.bloecke.append((self.E(n), lambda y: None))

    # -- Ausgabe --------------------------------------------------------
    def sichern(self, name, format_):
        gesamt = sum(h for h, _ in self.bloecke)
        y = (self.H - gesamt) / 2
        for h, zeichne in self.bloecke:
            zeichne(y)
            y += h
        os.makedirs(os.path.join(AUS, format_), exist_ok=True)
        ziel = os.path.join(AUS, format_, f'{name}.png')
        self.bild.save(ziel, 'PNG', optimize=True)
        return f'{format_}/{name}.png'


def baue(format_, p):
    erzeugt = []

    # --- 00 Auftakt: dieselbe Aussage wie das Teilen-Bild ---------------
    k = Karte(p)
    k.wortmarke(p['kicker'] * 2.0, luft=p['h'] * 0.10)
    k.zeile('Politik,', k.schrift('playfair-900', p['gross']), luft=p['h'] * 0.01)
    k.stempel('nachprüfbar', k.schrift('playfair-900', p['gross']))
    erzeugt.append(k.sichern('00-auftakt', format_))

    # --- 01 Der Anlass --------------------------------------------------
    k = Karte(p)
    k.zeile('SONNTAGSFRAGE', k.schrift('plexmono-600', p['kicker']), ROT,
            sperrung=2, luft=p['h'] * 0.055)
    k.zeile(WAHL_ART, k.passend('playfair-900', p['h1'], WAHL_ART))
    k.zeile(WAHL_ORT, k.passend('playfair-900', p['h1'], WAHL_ORT),
            luft=p['h'] * 0.05)
    k.linie(0.24, luft=p['h'] * 0.05)
    k.stempel(f'noch {TAGE} Tage',
              k.passend('playfair-900', p['h2'], f'noch {TAGE} Tage', 0.7),
              luft=p['h'] * 0.045)
    k.zeile(f'{DATUM}  ·  {Z["umfragen"]} Umfragen',
            k.passend('plexmono-400', p['klein'],
                      f'{DATUM}  ·  {Z["umfragen"]} Umfragen'), GEDAEMPFT)
    erzeugt.append(k.sichern('01-anlass', format_))

    # --- 02 Der Umfang --------------------------------------------------
    k = Karte(p)
    k.zeile('Nicht nur Wahlen',
            k.passend('playfair-900', p['h2'], 'Nicht nur Wahlen'),
            luft=p['h'] * 0.05)
    k.linie(0.2, luft=p['h'] * 0.055)
    for wert, wofuer in [(Z['gesetze'], 'GESETZE'),
                         (Z['aenderungen'], 'ÄNDERUNGEN MIT SYNOPSE'),
                         (Z['lobby'], 'LOBBY-EINTRÄGE')]:
        k.zeile(wert, k.schrift('playfair-900', p['h2'] * 0.92), luft=p['h'] * 0.004)
        k.zeile(wofuer, k.passend('plexmono-400', p['klein'] * 0.9, wofuer,
                                  0.8, sperrung=1.5),
                GEDAEMPFT, sperrung=1.5, luft=p['h'] * 0.045)
    erzeugt.append(k.sichern('02-umfang', format_))

    # --- 03 Abspann -----------------------------------------------------
    k = Karte(p)
    k.wortmarke(p['h2'] * 1.1, luft=p['h'] * 0.055)
    k.zeile('AUS AMTLICHEN QUELLEN, TÄGLICH AKTUALISIERT',
            k.passend('plexmono-600', p['klein'] * 0.85,
                      'AUS AMTLICHEN QUELLEN, TÄGLICH AKTUALISIERT',
                      0.82, sperrung=1.5),
            TINTE, sperrung=1.5, luft=p['h'] * 0.05)
    k.stempel('app.respublica.media',
              k.passend('plexmono-600', p['klein'] * 1.3,
                        'app.respublica.media', 0.66),
              pad=(24, 12, 16))
    erzeugt.append(k.sichern('03-abspann', format_))
    return erzeugt


if __name__ == '__main__':
    print(f'  Wahl: {WAHL_ART} {WAHL_ORT}, {DATUM}, noch {TAGE} Tage, '
          f'{Z["umfragen"]} Umfragen')
    print(f'  Zahlen: {Z["gesetze"]} Gesetze, {Z["aenderungen"]} Änderungen, '
          f'{Z["lobby"]} Lobby-Einträge')
    for format_, p in PROFILE.items():
        for name in baue(format_, p):
            print(f'  {name}')
