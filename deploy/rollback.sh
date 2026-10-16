#!/usr/bin/env bash
# Dashboard auf eine fruehere Version zuruecksetzen, ohne neuen Build.
#
# Jeder erfolgreiche Deploy legt seinen Build im Archiv releases/ ab (siehe
# versionen.sh). Dieses Skript liefert eine Version daraus wieder als dist aus
# und ruft danach die Seite ab. Antwortet sie nicht, bleibt die bisherige
# Fassung live. Das Ganze dauert Sekunden.
#
# Aufruf (auf dem Server, als root):
#   deploy/rollback.sh            Versionen auflisten, nichts aendern
#   deploy/rollback.sh zurueck    eine Version zurueck
#   deploy/rollback.sh <version>  auf diese Version (Name oder Commit aus der Liste)
#
# Der Timer laesst die Version danach stehen und liefert erst den naechsten
# neuen Commit auf main wieder aus, also typischerweise den Fix. Die verlassene
# Version gilt als zurueckgenommen und wird bei "zurueck" uebersprungen.
set -euo pipefail

APP_DIR=${APP_DIR:-/root/apps/dashboard}
HEALTH_URL=${HEALTH_URL-https://app.respublica.media/}
STATE_DIR=${STATE_DIR:-/var/lib/respublica-autodeploy}
LOG=${LOG:-$APP_DIR/deploy.log}
RELEASES=${RELEASES:-$APP_DIR/releases}
KEEP_RELEASES=${KEEP_RELEASES:-8}
ZURUECK_FILE=$STATE_DIR/dashboard.zurueckgenommen

# dist_ok, versionen, live_version, archiv_anlegen
source "$(dirname "$(readlink -f "$0")")/versionen.sh"

mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/dashboard.lock"
flock -w 900 9 || { echo "Ein Deploy laeuft noch. Bitte spaeter erneut versuchen." >&2; exit 1; }

log() { echo "$(date -Is) $*" | tee -a "$LOG"; }
zurueckgenommen() { grep -qx "$1" "$ZURUECK_FILE" 2>/dev/null; }

# Datum und Titel des Commits zu einer Version
beschreibung() {
  local commit=${1##*-}
  [ "$commit" != unbekannt ] || return 0
  git log -1 --format='%cs %s' "$commit" 2>/dev/null || true
}

auflisten() {
  local i name marke
  echo "Versionen des Dashboards, neueste oben:"
  for (( i=${#ALLE[@]}-1; i>=0; i-- )); do
    name=${ALLE[$i]}
    marke=""
    [ "$name" != "$LIVE" ] || marke="  <- live"
    ! zurueckgenommen "$name" || marke="$marke  (zurueckgenommen)"
    printf '  %s  %s%s\n' "$name" "$(beschreibung "$name")" "$marke"
  done
  [ -n "$LIVE" ] || echo "Hinweis: Die laufende Fassung liegt nicht im Archiv (von Hand gebaut?)."
}

# Gibt den Namen der Zielversion aus.
ziel_finden() {
  local arg=$1 i idx=-1 name treffer=""
  if [ "$arg" = zurueck ]; then
    [ -n "$LIVE" ] || { echo "Die laufende Fassung liegt nicht im Archiv. Bitte eine Version nennen." >&2; return 1; }
    for i in "${!ALLE[@]}"; do
      [ "${ALLE[$i]}" != "$LIVE" ] || idx=$i
    done
    for (( i=idx-1; i>=0; i-- )); do
      zurueckgenommen "${ALLE[$i]}" || { echo "${ALLE[$i]}"; return 0; }
    done
    echo "Im Archiv liegt keine aeltere Version." >&2
    return 1
  fi
  # Name oder Commit (ab 7 Zeichen); passen mehrere, gilt die neueste.
  for name in "${ALLE[@]}"; do
    if [ "$name" = "$arg" ] || { [ ${#arg} -ge 7 ] && [[ ${name##*-} == "${arg:0:12}"* ]]; }; then
      treffer=$name
    fi
  done
  [ -n "$treffer" ] || { echo "Keine Version passt zu \"$arg\". Liste: deploy/rollback.sh" >&2; return 1; }
  echo "$treffer"
}

cd "$APP_DIR"
archiv_anlegen
LIVE=$(live_version)
mapfile -t ALLE < <(versionen)

if [ $# -eq 0 ]; then
  auflisten
  echo
  echo "Eine Version zurueck:  deploy/rollback.sh zurueck"
  echo "Bestimmte Version:     deploy/rollback.sh <Name oder Commit>"
  exit 0
fi

ZIEL=$(ziel_finden "$1")
if [ "$ZIEL" = "$LIVE" ]; then
  echo "$ZIEL ist schon live."
  exit 0
fi
dist_ok "$RELEASES/$ZIEL" || { echo "Version $ZIEL ist unvollstaendig, nichts geaendert." >&2; exit 1; }

rm -rf dist.next
cp -al "$RELEASES/$ZIEL" dist.next
rm -rf dist.prev
[ ! -d dist ] || mv dist dist.prev
mv dist.next dist

if [ -n "$HEALTH_URL" ] && ! curl -fsS -m 15 -o /dev/null "$HEALTH_URL"; then
  rm -rf dist.next
  mv dist dist.next
  [ ! -d dist.prev ] || mv dist.prev dist
  rm -rf dist.next
  log "ZURUECKSETZEN auf $ZIEL abgebrochen: $HEALTH_URL antwortet nicht, ${LIVE:-die bisherige Fassung} bleibt live"
  exit 1
fi

# Ging es rueckwaerts, gilt die verlassene Version als zurueckgenommen. Wer
# bewusst auf eine Version wechselt, nimmt sie von dieser Liste.
if [ -n "$LIVE" ] && [[ "$LIVE" > "$ZIEL" ]]; then
  echo "$LIVE" >> "$ZURUECK_FILE"
fi
if [ -f "$ZURUECK_FILE" ]; then
  grep -vx "$ZIEL" "$ZURUECK_FILE" > "$ZURUECK_FILE.neu" || true
  mv "$ZURUECK_FILE.neu" "$ZURUECK_FILE"
fi

log "ZURUECKGESETZT von Hand: ${LIVE:-unbekannt} -> $ZIEL"
echo "Live ist jetzt $ZIEL ($(beschreibung "$ZIEL"))."
echo "Der Timer liefert erst den naechsten neuen Commit auf main wieder aus."
