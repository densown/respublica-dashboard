#!/bin/bash
set -e
cd /root/apps/dashboard
echo "$(date): Starting deploy..." >> deploy.log
git pull origin main
npm ci --production=false
npm run build
echo "$(date): Deploy complete." >> deploy.log

# === WICHTIG ===
# Dashboard-Source: /root/apps/dashboard/ (DIESES Verzeichnis)
# NICHT bearbeiten: /root/respublica-dashboard-UNUSED-DO-NOT-EDIT/
