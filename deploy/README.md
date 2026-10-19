# Automatisches Deployment

Beschreibung und Einrichtung fuer API und Dashboard zusammen: [respublica-api/deploy/README.md](https://github.com/densown/respublica-api/blob/main/deploy/README.md).

Kurz: Ein systemd-Timer ruft alle 5 Minuten `deploy/autodeploy.sh` auf. Das Skript deployt nur Commits mit gruener CI, baut nach `dist.next` und tauscht `dist` erst nach erfolgreichem Build aus. `deploy.sh` im Repo-Root ruft dasselbe Skript fuer einen Deploy von Hand.

## Zurueck auf eine fruehere Version

Jeder erfolgreiche Deploy legt seinen Build zusaetzlich im Archiv `releases/` ab (die letzten 8). Geht nach einem Deploy etwas kaputt, liefert `deploy/rollback.sh` eine fruehere Fassung wieder aus, ohne neuen Build und in Sekunden:

```bash
cd /root/apps/dashboard
deploy/rollback.sh            # Versionen auflisten, nichts aendern
deploy/rollback.sh zurueck    # eine Version zurueck
deploy/rollback.sh 77507db    # auf eine bestimmte Version (Name oder Commit)
```

Der Timer laesst die Version danach stehen und liefert erst den naechsten neuen Commit auf main wieder aus. Mehr, auch zur API: [respublica-api/deploy/README.md](https://github.com/densown/respublica-api/blob/main/deploy/README.md#zurueck-auf-eine-fruehere-version).

## nginx

Welche Pfade der Server als Seite, Weiterleitung oder 404 ausliefert, steht in [nginx/app-routen.conf](nginx/app-routen.conf). Die Datei wird nicht automatisch eingespielt, Anleitung in [nginx/README.md](nginx/README.md).
