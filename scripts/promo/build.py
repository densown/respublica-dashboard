"""Setzt Karten und Bildschirmaufnahmen zum Werbevideo zusammen.

    python3 scripts/promo/build.py [--nur quer|hoch]

Voraussetzung: scripts/promo/shots.mjs und cards.py sind gelaufen.

Die Textfassung steht in FOLGE. Wer die Reihenfolge oder die Dauer aendern
will, aendert nur diese Liste — aufgenommen werden muss dafuer nichts neu.

Zum Verfahren: jedes Standbild wird einzeln zu einem Abschnitt gerendert
und die Abschnitte werden anschliessend paarweise ueberblendet. Alle
dreizehn Abschnitte in einen einzigen Filtergraphen zu haengen waere ein
Aufruf statt vierzehn, haelt aber alle Dekodierer gleichzeitig offen. Auf
einer Maschine mit 3 GB Arbeitsspeicher, von denen rund 1 GB frei ist, ist
das die Art Sparsamkeit, die man einmal ausprobiert und danach bereut.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HIER, 'frames')
CARDS = os.path.join(HIER, 'cards')
AUS = os.path.join(HIER, 'out')

FPS = 30
BLENDE = 0.5          # Ueberblendung in Sekunden
BLENDE_HOCH = 0.35    # kuerzer, weil die hohe Fassung insgesamt schneller ist

# art: 'karte' = Standbild ohne Bewegung. Schrift, die langsam zoomt,
# sieht nach Bildschirmschoner aus. 'schuss' = Aufnahme mit langsamer
# Fahrt; richtung wechselt, damit nicht alles gleich atmet.
FOLGE = {
    'quer': dict(
        groesse=(1920, 1080), blende=BLENDE,
        clips=[
            ('karte',  '00-auftakt',      2.6, 0),
            ('schuss', '01-uebersicht',   3.4, +1),
            ('karte',  '01-anlass',       2.6, 0),
            ('schuss', '02-umfragen',     3.6, -1),
            ('schuss', '03-koalition',    3.2, +1),
            ('schuss', '04-verlauf',      3.6, -1),
            ('schuss', '05-kandidaturen', 3.2, +1),
            ('karte',  '02-umfang',       2.6, 0),
            ('schuss', '06-bundestag',    3.0, -1),
            ('schuss', '07-gesetzgebung', 3.0, +1),
            ('schuss', '08-lobbyregister', 3.0, -1),
            ('schuss', '09-eu-recht',     3.0, +1),
            ('karte',  '03-abspann',      3.2, 0),
        ]),
    'hoch': dict(
        groesse=(1080, 1920), blende=BLENDE_HOCH,
        clips=[
            ('karte',  '00-auftakt',      2.2, 0),
            ('schuss', '01-uebersicht',   2.6, +1),
            ('karte',  '01-anlass',       2.2, 0),
            ('schuss', '02-umfragen',     2.8, -1),
            ('schuss', '03-koalition',    2.6, +1),
            ('schuss', '04-verlauf',      2.8, -1),
            ('karte',  '02-umfang',       2.2, 0),
            ('schuss', '06-bundestag',    2.4, +1),
            ('schuss', '08-lobbyregister', 2.4, -1),
            ('karte',  '03-abspann',      2.6, 0),
        ]),
}


def lauf(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f'ffmpeg: {r.stderr.strip().splitlines()[-6:]}')
    return r


def quelle(art, name, format_):
    ordner = CARDS if art == 'karte' else FRAMES
    weg = os.path.join(ordner, format_, f'{name}.png')
    if not os.path.exists(weg):
        raise FileNotFoundError(weg)
    return weg


def abschnitt(art, weg, dauer, richtung, groesse, ziel):
    """Ein Standbild wird zu einem Videoabschnitt.

    Die Aufnahmen liegen groesser vor als das Ziel (2880x1620 bzw.
    1215x2160). Die Fahrt bleibt deshalb im Bereich des Verkleinerns, und
    genau da entsteht das ruhige Bild: wuerde ueber die Quellaufloesung
    hinaus vergroessert, flimmerten die duennen Linien der Diagramme.
    """
    b, h = groesse
    n = max(2, int(round(dauer * FPS)))
    if art == 'karte' or richtung == 0:
        kette = f'scale={b}:{h}:flags=lanczos,format=yuv420p'
    else:
        # 4 % Fahrt. Mehr wirkt bei Bildschirminhalten unruhig, weniger
        # sieht aus wie ein Standbild, das nicht ganz stillsteht.
        z = (f"'1+0.04*on/{n - 1}'" if richtung > 0
             else f"'1.04-0.04*on/{n - 1}'")
        kette = (
            f'scale={b * 2}:{h * 2}:flags=lanczos,'
            f'zoompan=z={z}:d={n}:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\''
            f':s={b * 2}x{h * 2}:fps={FPS},'
            # Erst doppelt gross fahren, dann herunterrechnen. zoompan setzt
            # den Ausschnitt auf ganze Bildpunkte; auf der Zielgroesse sieht
            # man dieses Springen als Ruckeln, auf der doppelten nicht mehr.
            f'scale={b}:{h}:flags=lanczos,format=yuv420p'
        )
    lauf(['ffmpeg', '-y', '-loglevel', 'error', '-loop', '1', '-i', weg,
          '-t', f'{dauer}', '-r', str(FPS), '-vf', kette,
          '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
          '-pix_fmt', 'yuv420p', ziel])


def blende_zusammen(a, b, dauer_a, blende, ziel):
    """Zwei Abschnitte ueberblenden. offset ist der Zeitpunkt in a, an dem
    die Blende beginnt."""
    lauf(['ffmpeg', '-y', '-loglevel', 'error', '-i', a, '-i', b,
          '-filter_complex',
          f'[0][1]xfade=transition=fade:duration={blende}'
          f':offset={max(0, dauer_a - blende):.3f},format=yuv420p[v]',
          '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
          '-pix_fmt', 'yuv420p', ziel])


def baue(format_):
    cfg = FOLGE[format_]
    b, h = cfg['groesse']
    blende = cfg['blende']
    os.makedirs(AUS, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix=f'promo-{format_}-')
    try:
        teile = []
        for i, (art, name, dauer, richtung) in enumerate(cfg['clips']):
            ziel = os.path.join(tmp, f'{i:02d}.mp4')
            abschnitt(art, quelle(art, name, format_), dauer, richtung,
                      (b, h), ziel)
            teile.append((ziel, dauer))
            print(f'    {i + 1}/{len(cfg["clips"])}  {name}', flush=True)

        # Von links falten. Die laufende Gesamtdauer ist die Summe der
        # Einzeldauern abzueglich einer Blende je Uebergang, weil sich die
        # Abschnitte dabei ueberlappen.
        aktuell, gesamt = teile[0]
        for i, (naechster, dauer) in enumerate(teile[1:], start=1):
            neu = os.path.join(tmp, f'mix{i:02d}.mp4')
            blende_zusammen(aktuell, naechster, gesamt, blende, neu)
            gesamt = gesamt + dauer - blende
            aktuell = neu

        ziel = os.path.join(AUS, f'respublica-{format_}-{b}x{h}.mp4')
        # Tonlose Tonspur: einige Netzwerke behandeln Videos ohne
        # Audiostrom als fehlerhaft und zeigen sie gar nicht erst an.
        # -shortest, damit die Stille nicht laenger wird als das Bild.
        lauf(['ffmpeg', '-y', '-loglevel', 'error', '-i', aktuell,
              '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
              '-shortest', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
              '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
              '-movflags', '+faststart',   # Abspielen beginnt vor dem Ende des Ladens
              '-c:a', 'aac', '-b:a', '64k', ziel])
        return ziel, gesamt
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    nur = None
    if '--nur' in sys.argv:
        nur = sys.argv[sys.argv.index('--nur') + 1]
    for format_ in FOLGE:
        if nur and format_ != nur:
            continue
        print(f'  {format_}:')
        weg, dauer = baue(format_)
        gr = os.path.getsize(weg) / 1024 / 1024
        probe = json.loads(subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json',
             '-show_format', '-show_streams', weg],
            capture_output=True, text=True).stdout)
        v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        print(f'  -> {os.path.relpath(weg, HIER)}  '
              f'{v["width"]}x{v["height"]}  '
              f'{float(probe["format"]["duration"]):.1f}s  {gr:.1f} MB')
