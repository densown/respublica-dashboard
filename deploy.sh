#!/bin/bash
set -e
cd /root/apps/dashboard
echo "$(date): Starting deploy..." >> deploy.log
git pull origin main
npm ci --production=false
npm run build
echo "$(date): Deploy complete." >> deploy.log
