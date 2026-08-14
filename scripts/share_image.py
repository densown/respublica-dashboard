"""Teilen-Bild fuer Res.Publica.

Erzeugen:
    RP_FONTS=<pfad-zu-ttf> python3 scripts/share_image.py

Benoetigt Pillow und die Schriften Playfair Display (900, 700) sowie
IBM Plex Mono (400, 600) als TTF. Beziehbar ueber @fontsource auf jsdelivr,
die woff2-Dateien lassen sich mit fontTools nach TTF wandeln.

Aufbau als typografische Titelseite. Mittig gesetzt, nicht linksbuendig:
WhatsApp und einige Feeds beschneiden auf quadratisch, dabei ueberlebt nur
die Bildmitte. Ein linksbuendiger Satz waere dort angeschnitten.
"""
from PIL import Image, ImageDraw, ImageFont

# Gesetzt wird in logischen Einheiten auf 1200x630, gerendert wird das
# Doppelte. 1200x630 ist die MINDEST-Vorgabe der Plattformen, nicht die
# empfohlene: Reddit rechnet die Karte in JPEG um und schneidet fuer den
# Feed eine Miniatur heraus, und auf einem Bildschirm mit doppelter
# Punktdichte wird die grosse Karte doppelt so gross angezeigt, wie sie
# Punkte hat. Beides frisst Schaerfe, die bei 1x nicht vorhanden ist.
S = 2
E = lambda n: round(n * S)     # logische Einheit -> Bildpunkt
B, H = E(1200), E(630)
PAPIER = (245, 240, 232)      # c.bg
TINTE = (15, 15, 15)          # c.ink
GEDAEMPFT = (82, 89, 96)      # c.muted
ROT = (200, 16, 46)           # c.red
RAND = (232, 228, 220)        # c.border

import os
F = os.environ.get('RP_FONTS', os.path.expanduser('~/.cache/respublica-fonts'))
playfair = lambda g: ImageFont.truetype(f'{F}/playfair-900.ttf', E(g))
playfair7 = lambda g: ImageFont.truetype(f'{F}/playfair-700.ttf', E(g))
mono = lambda g: ImageFont.truetype(f'{F}/plexmono-400.ttf', E(g))
mono6 = lambda g: ImageFont.truetype(f'{F}/plexmono-600.ttf', E(g))

bild = Image.new('RGB', (B, H), PAPIER)
d = ImageDraw.Draw(bild)

def mitte(text, font, y, farbe=TINTE, sperrung=0):
    y = E(y)
    sperrung = sperrung * S
    if sperrung:
        breite = sum(d.textlength(z, font=font) + sperrung for z in text) - sperrung
        x = (B - breite) / 2
        for z in text:
            d.text((x, y), z, font=font, fill=farbe)
            x += d.textlength(z, font=font) + sperrung
        return breite
    br = d.textlength(text, font=font)
    d.text(((B - br) / 2, y), text, font=font, fill=farbe)
    return br

# --- Wortmarke oben ----------------------------------------------------
# Der Punkt ZWISCHEN Res und Publica ist rot, hinter Publica steht keiner.
# Der Zwischenpunkt ist die Signatur der Marke; ein zusaetzlicher Punkt am
# Ende macht daraus einen Satz und verwaessert das Zeichen.
wm = playfair7(38)
teile = [('Res', TINTE), ('.', ROT), ('Publica', TINTE)]
gesamt = sum(d.textlength(t, font=wm) for t, _ in teile)
x0 = (B - gesamt) / 2
for t, farbe in teile:
    d.text((x0, E(74)), t, font=wm, fill=farbe)
    x0 += d.textlength(t, font=wm)

# --- Die Behauptung ----------------------------------------------------
# Kurz gehalten, damit der Satz gross stehen kann: in der Reddit-Miniatur
# von rund 140 Pixeln bleibt nur lesbar, was hier gross gesetzt ist.
mitte('Politik,', playfair(128), 158)

# "nachprüfbar" als roter Stempel. Das Rot ist hier nicht Dekoration: ein
# roter Stempel auf einem Dokument ist die Geste des Pruefens, Form und
# Aussage sagen dasselbe. Zugleich bekommt die Karte einen Fokuspunkt —
# ohne ihn ist sie im Feed ein beiges Rechteck.
schrift = playfair(128)
wort = 'nachprüfbar'
y_text = 300
# Block aus der tatsaechlichen Textausdehnung ableiten statt zu raten,
# sonst sitzt die Schrift bei anderer Groesse schief im Feld.
l, o, r, u = d.textbbox((0, E(y_text)), wort, font=schrift)
breite = r - l
pad_x, pad_o, pad_u = E(36), E(20), E(24)
d.rectangle(
    [(B - breite) / 2 - pad_x, o - pad_o, (B + breite) / 2 + pad_x, u + pad_u],
    fill=ROT,
)
mitte(wort, schrift, y_text, PAPIER)

# --- Trennlinie --------------------------------------------------------
d.line([(E(300), E(470)), (E(900), E(470))], fill=RAND, width=E(2))

# --- Belegzeile: echte Zahlen aus der Datenbank ------------------------
mitte('7.540 GESETZE   ·   25.604 LOBBY-VERKNÜPFUNGEN   ·   28.977 EINZELSTIMMEN',
      mono(20), 506, GEDAEMPFT)
mitte('AUS AMTLICHEN QUELLEN, TÄGLICH AKTUALISIERT', mono6(18), 546, TINTE, sperrung=1.5)

# --- Adresse ganz unten ------------------------------------------------
mitte('app.respublica.media', mono(18), 584, GEDAEMPFT)

# Der Dateiname traegt eine Fassungsnummer. Reddit, X und WhatsApp
# speichern Vorschaubilder unter ihrer Adresse zwischen; aendert sich nur
# der Inhalt bei gleichem Namen, zeigen sie weiter die alte Fassung. Bei
# jeder gestalterischen Aenderung hochzaehlen und in index.html nachziehen,
# dort auch og:image:width und og:image:height.
FASSUNG = 3
ziel = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'public', f'share-og-v{FASSUNG}.png')
bild.save(ziel, 'PNG', optimize=True)
import os
print(f'{ziel}  {os.path.getsize(ziel)/1024:.0f} KB  {bild.size}')

