# Automatisches Deployment

Beschreibung und Einrichtung fuer API und Dashboard zusammen: [respublica-api/deploy/README.md](https://github.com/densown/respublica-api/blob/main/deploy/README.md).

Kurz: Ein systemd-Timer ruft alle 5 Minuten `deploy/autodeploy.sh` auf. Das Skript deployt nur Commits mit gruener CI, baut nach `dist.next` und tauscht `dist` erst nach erfolgreichem Build aus. `deploy.sh` im Repo-Root ruft dasselbe Skript fuer einen Deploy von Hand.
