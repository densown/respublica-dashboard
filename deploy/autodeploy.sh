#!/usr/bin/env bash
# Automatisches Deployment des Dashboards (Pull statt Push).
#
# Laeuft per systemd-Timer alle 5 Minuten auf dem Server. Holt origin/main und
# deployt nur, wenn die GitHub-CI fuer genau diesen Commit gruen ist. Gebaut
# wird nach dist.next; erst wenn der Build vollstaendig ist, wird dist
# ausgetauscht. Ein abgebrochener Build laesst die laufende Seite unberuehrt.
# Die vorige Fassung bleibt als dist.prev liegen. Jede ausgelieferte Fassung
# kommt ausserdem ins Archiv releases/ (die letzten KEEP_RELEASES, Standard 8);
# zurueck auf eine davon geht es mit deploy/rollback.sh.
#
# Konfiguration ueber Umgebung (systemd: /etc/respublica/autodeploy.env):
#   DEPLOY_ALERT_URL  Ping-URL, z. B. healthchecks.io. Erfolg pingt die URL,
#                     Fehler pingen URL/fail mit dem Grund. Leer: nur Logdatei.
#   GITHUB_TOKEN      optional, nur gegen das API-Limit (60 Abfragen/Stunde)
#   HEALTH_URL        oeffentliche Adresse, die nach dem Tausch 200 liefern muss
#                     (leer gesetzt: keine Pruefung)
#   KEEP_RELEASES     wie viele Versionen das Archiv behaelt (Standard 8)
set -euo pipefail

REPO_SLUG=densown/respublica-dashboard
APP_DIR=${APP_DIR:-/root/apps/dashboard}
BRANCH=${BRANCH:-main}
HEALTH_URL=${HEALTH_URL-https://app.respublica.media/}
STATE_DIR=${STATE_DIR:-/var/lib/respublica-autodeploy}
LOG=${LOG:-$APP_DIR/deploy.log}
DEPLOY_ALERT_URL=${DEPLOY_ALERT_URL:-}
GITHUB_API=${GITHUB_API:-https://api.github.com}
RELEASES=${RELEASES:-$APP_DIR/releases}
KEEP_RELEASES=${KEEP_RELEASES:-8}

# dist_ok, archivieren, archiv_anlegen, aufraeumen
source "$(dirname "$(readlink -f "$0")")/versionen.sh"

mkdir -p "$STATE_DIR"
BLOCKED_FILE=$STATE_DIR/dashboard.blocked
LAST_FILE=$STATE_DIR/dashboard.last

exec 9>"$STATE_DIR/dashboard.lock"
flock -n 9 || exit 0

log() { echo "$(date -Is) $*" | tee -a "$LOG"; }
ping_ok() { [ -z "$DEPLOY_ALERT_URL" ] || curl -fsS -m 10 -o /dev/null "$DEPLOY_ALERT_URL" || true; }
ping_fail() { [ -z "$DEPLOY_ALERT_URL" ] || curl -fsS -m 10 -o /dev/null --data-raw "dashboard: $1" "$DEPLOY_ALERT_URL/fail" || true; }

# Haelt an und meldet einmal pro Commit und Grund, nicht bei jedem Timerlauf.
# halt:  Grund kann sich ohne neuen Commit erledigen (lokale Aenderungen,
#        lokale Commits), wird also beim naechsten Lauf erneut geprueft.
# block: Commit ist endgueltig durchgefallen (CI rot, Healthcheck), wird erst
#        mit einem neuen Commit auf main wieder versucht.
halt() {
  if [ "$(cat "$LAST_FILE" 2>/dev/null)" != "$NEW $1" ]; then
    log "ANGEHALTEN bei ${NEW:0:7}: $1"
    ping_fail "$1"
    echo "$NEW $1" > "$LAST_FILE"
  fi
  exit 1
}
block() {
  echo "$NEW" > "$BLOCKED_FILE"
  halt "$1"
}

# success | pending | failure fuer alle Check-Runs eines Commits
ci_state() {
  curl -fsS -m 20 \
    -H "Accept: application/vnd.github+json" \
    ${GITHUB_TOKEN:+-H "Authorization: Bearer $GITHUB_TOKEN"} \
    "$GITHUB_API/repos/$REPO_SLUG/commits/$1/check-runs?per_page=100" |
    python3 -c '
import json, sys
runs = json.load(sys.stdin).get("check_runs", [])
if not runs or any(r["status"] != "completed" for r in runs):
    print("pending")
elif all(r["conclusion"] in ("success", "skipped", "neutral") for r in runs):
    print("success")
else:
    print("failure")
'
}

cd "$APP_DIR"
git fetch -q origin "$BRANCH" || { log "git fetch fehlgeschlagen, naechster Versuch beim naechsten Lauf"; exit 0; }
CUR=$(git rev-parse HEAD)
NEW=$(git rev-parse "origin/$BRANCH")

if [ "$CUR" = "$NEW" ]; then
  rm -f "$BLOCKED_FILE" "$LAST_FILE"
  ping_ok
  exit 0
fi
if [ "$(cat "$BLOCKED_FILE" 2>/dev/null)" = "$NEW" ]; then
  exit 1
fi

# Von Hand geaenderte Dateien auf dem Server wuerden still ueberschrieben.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  halt "lokale Aenderungen in $APP_DIR (git status), bitte committen oder verwerfen"
fi
if ! git merge-base --is-ancestor "$CUR" "$NEW"; then
  halt "HEAD ${CUR:0:7} ist nicht Teil von origin/$BRANCH (lokale Commits auf dem Server?)"
fi

STATE=$(ci_state "$NEW") || { log "GitHub nicht erreichbar, naechster Versuch beim naechsten Lauf"; exit 0; }
case "$STATE" in
  pending) log "CI fuer ${NEW:0:7} laeuft noch"; exit 0 ;;
  failure) block "CI fuer ${NEW:0:7} ist rot, wird nicht deployt" ;;
esac

CHANGED=$(git diff --name-only "$CUR" "$NEW")

build() {
  if grep -qx 'package-lock.json' <<< "$CHANGED" || [ ! -d node_modules ]; then
    log "npm ci"
    npm ci --no-audit --no-fund >> "$LOG" 2>&1 || return 1
  fi
  rm -rf dist.next
  log "Build nach dist.next"
  npx tsc -b >> "$LOG" 2>&1 && npx vite build --outDir dist.next --emptyOutDir >> "$LOG" 2>&1 && dist_ok dist.next
}

swap_in() {
  rm -rf dist.prev
  [ -d dist ] && mv dist dist.prev
  mv dist.next dist
}

archiv_anlegen || log "Archiv releases/ konnte nicht angelegt werden"
log "Deploy ${CUR:0:7} -> ${NEW:0:7}"
git merge -q --ff-only "$NEW"
if ! build; then
  git reset -q --hard "$CUR"
  if grep -qx 'package-lock.json' <<< "$CHANGED"; then npm ci --no-audit --no-fund >> "$LOG" 2>&1 || true; fi
  rm -rf dist.next
  block "Build von ${NEW:0:7} fehlgeschlagen, Seite laeuft unveraendert mit ${CUR:0:7}"
fi

swap_in
if [ -z "$HEALTH_URL" ] || curl -fsS -m 15 -o /dev/null "$HEALTH_URL"; then
  rm -f "$BLOCKED_FILE" "$LAST_FILE"
  log "OK, ${NEW:0:7} ist live"
  { archivieren dist "$NEW" && aufraeumen; } || log "Archivieren von ${NEW:0:7} fehlgeschlagen, Seite laeuft trotzdem"
  ping_ok
  exit 0
fi

log "$HEALTH_URL antwortet nicht, zurueck auf dist.prev (${CUR:0:7})"
if [ -d dist.prev ]; then
  rm -rf dist.next && mv dist dist.next && mv dist.prev dist
fi
git reset -q --hard "$CUR"
block "${NEW:0:7} live nicht erreichbar, zurueckgerollt auf ${CUR:0:7}"
