# Gemeinsame Funktionen fuer autodeploy.sh und rollback.sh: das Archiv der
# ausgelieferten Builds unter releases/.
#
# Jede Version ist ein Ordner releases/<JJJJMMTT-HHMMSS>-<Commit, 12 Zeichen>,
# die Zeit ist die Bauzeit in UTC. Angelegt wird er als Hardlink-Kopie von
# dist: Solange dieselbe Fassung live ist, liegen die Dateien nur einmal auf
# der Platte. Builds schreiben immer in einen neuen Ordner und nie in
# vorhandene Dateien, daher bleiben die Hardlinks unveraendert.
#
# Erwartet das Arbeitsverzeichnis APP_DIR und die Variablen RELEASES,
# KEEP_RELEASES und LOG.

VERSION_RE='^[0-9]{8}-[0-9]{6}-([0-9a-f]{12}|unbekannt)$'

# Prueft, ob index.html da ist und jede dort verlinkte Datei unter /assets existiert.
dist_ok() {
  local dir=$1 f
  [ -s "$dir/index.html" ] || return 1
  for f in $(grep -oE '/assets/[^"'"'"' )]+' "$dir/index.html" | sort -u); do
    [ -s "$dir$f" ] || return 1
  done
}

# Alle Versionen im Archiv, aelteste zuerst.
versionen() {
  [ -d "$RELEASES" ] || return 0
  ls -1 "$RELEASES" | grep -E "$VERSION_RE" || true
}

# Legt einen Build als Version ins Archiv.
archivieren() {
  local dir=$1 commit=$2 name
  name="$(date -u -r "$dir/index.html" +%Y%m%d-%H%M%S)-${commit:0:12}"
  mkdir -p "$RELEASES"
  [ -d "$RELEASES/$name" ] && return 0
  rm -rf "$RELEASES/.neu"
  cp -al "$dir" "$RELEASES/.neu" && mv "$RELEASES/.neu" "$RELEASES/$name"
}

# Name der Version, die gerade als dist ausgeliefert wird (dieselbe Datei per
# Hardlink). Leer, wenn dist nicht aus dem Archiv stammt.
live_version() {
  local ino name
  ino=$(stat -c %i dist/index.html 2>/dev/null) || return 0
  for name in $(versionen); do
    if [ "$(stat -c %i "$RELEASES/$name/index.html" 2>/dev/null)" = "$ino" ]; then
      echo "$name"
      return 0
    fi
  done
}

# Behaelt die neuesten KEEP_RELEASES Versionen und in jedem Fall die laufende.
aufraeumen() {
  local keep=$KEEP_RELEASES live name
  [ "$keep" -ge 2 ] 2>/dev/null || keep=2
  live=$(live_version)
  for name in $(versionen | head -n -"$keep"); do
    [ "$name" = "$live" ] || rm -rf "${RELEASES:?}/$name"
  done
}

# Einmalig nach der Umstellung: Bis dahin gab es nur dist und dist.prev. Beide
# kommen ins Archiv, damit man sofort eine Version zurueck kann. Den Commit von
# dist.prev nennt die Zeile "Deploy <alt> -> <aktuell>" im Log.
archiv_anlegen() {
  [ ! -d "$RELEASES" ] || return 0
  local cur prev7 prev=unbekannt
  cur=$(git rev-parse HEAD)
  mkdir -p "$RELEASES"
  if [ -d dist.prev ] && dist_ok dist.prev; then
    prev7=$(grep -oE "Deploy [0-9a-f]{7} -> ${cur:0:7}\$" "$LOG" 2>/dev/null | tail -n 1 | cut -d' ' -f2 || true)
    if [ -n "$prev7" ]; then
      prev=$(git rev-parse -q --verify "$prev7^{commit}" || echo unbekannt)
    fi
    archivieren dist.prev "$prev"
  fi
  if [ -d dist ] && dist_ok dist; then
    archivieren dist "$cur"
  fi
}
