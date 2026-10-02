#!/bin/bash
# Manueller Deploy: dasselbe wie der Timer, also nur gruene Commits, Build
# nach dist.next und Tausch erst nach erfolgreichem Build.
# Einrichtung des Timers: deploy/README.md
set -e
exec /root/apps/dashboard/deploy/autodeploy.sh "$@"

# === WICHTIG ===
# Dashboard-Source: /root/apps/dashboard/ (DIESES Verzeichnis)
# NICHT bearbeiten: /root/respublica-dashboard-UNUSED-DO-NOT-EDIT/
