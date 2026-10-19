#!/usr/bin/env bash
# Prueft nach dem Einspielen von app-routen.conf, ob der Server richtig
# antwortet: Seiten 200, alte Adressen 301 an die richtige Stelle,
# Unbekanntes 404 mit der App als Inhalt, Dateien und API unberuehrt.
#
#   deploy/nginx/pruefen.sh                         # gegen app.respublica.media
#   deploy/nginx/pruefen.sh http://127.0.0.1:8080   # gegen einen anderen Server
#
# Rueckgabewert 0 nur, wenn alles stimmt.

set -u
BASIS=${1:-https://app.respublica.media}
fehler=0

pruefe() {
  local pfad=$1 status_soll=$2 ziel_soll=${3:-}
  local antwort status ziel
  antwort=$(curl -s -o /dev/null -m 15 -w '%{http_code} %{redirect_url}' "$BASIS$pfad")
  status=${antwort%% *}
  ziel=${antwort#* }
  if [ "$status" != "$status_soll" ]; then
    echo "FEHLER $pfad: Status $status, erwartet $status_soll"
    fehler=1
  elif [ -n "$ziel_soll" ] && [ "$ziel" != "$BASIS$ziel_soll" ]; then
    echo "FEHLER $pfad: leitet nach $ziel, erwartet $BASIS$ziel_soll"
    fehler=1
  else
    echo "ok     $pfad $status${ziel_soll:+ -> $ziel_soll}"
  fi
}

# Seiten
for p in / /wahlen /wahlen/umfragen /wahlen/kandidaturen /quellen /bundestag \
  /bundestag/1 /bundestag/abgeordnete/1 /gesetze /gesetze/1 /gesetzgebung \
  /eu-recht /koalition /koalitionsvertrag /demokratie /versammlungen \
  /weltkarte /eu-parlament /lobbyregister /bundestag/ "/bundestag?ansicht=abgeordnete"; do
  pruefe "$p" 200
done

# Alte Adressen
pruefe /abstimmungen 301 /bundestag
pruefe /abstimmungen/ 301 /bundestag
pruefe /abstimmungen/6720 301 /bundestag/6720
pruefe "/abstimmungen/6720?x=1" 301 /bundestag/6720
pruefe /abstimmungen/abc 301 /bundestag
pruefe /abgeordnete 301 "/bundestag?ansicht=abgeordnete"
pruefe /abgeordnete/12345 301 /bundestag/abgeordnete/12345
pruefe /demokratie-index 301 /demokratie

# Unbekanntes
for p in /gibtsnicht /bundestag/abc /wahlen/xyz /bundestag/abgeordnete /a/b/c; do
  pruefe "$p" 404
done
# Die 404 muss trotzdem die App ausliefern, sonst sieht man nur eine nginx-Seite
if curl -s -m 15 "$BASIS/gibtsnicht" | grep -q '<div id="root">'; then
  echo "ok     /gibtsnicht liefert die App als Inhalt"
else
  echo "FEHLER /gibtsnicht liefert nicht die App als Inhalt"
  fehler=1
fi

# Dateien und API
for p in /robots.txt /sitemap.xml /share-og-v3.png /manifest.webmanifest /api/bundestag/sitzverteilung; do
  pruefe "$p" 200
done
skript=$(curl -s -m 15 "$BASIS/" | grep -o '/assets/[^"]*\.js' | head -1)
if [ -n "$skript" ]; then pruefe "$skript" 200; else echo "FEHLER kein Skript in index.html"; fehler=1; fi

if [ "$fehler" = 0 ]; then echo "Alles in Ordnung."; else echo "Mindestens eine Pruefung fehlgeschlagen."; fi
exit "$fehler"
