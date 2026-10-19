# nginx-Regeln fuer app.respublica.media

`app-routen.conf` regelt, welche Pfade der Server als Seite ausliefert:

| Pfad | Antwort |
|---|---|
| Seiten der App (`/`, `/bundestag`, `/bundestag/123`, `/gesetze/...`, ...) | 200, index.html |
| `/abstimmungen`, `/abstimmungen/<nr>` | 301 nach `/bundestag` bzw. `/bundestag/<nr>` |
| `/abgeordnete`, `/abgeordnete/<nr>` | 301 nach `/bundestag?ansicht=abgeordnete` bzw. `/bundestag/abgeordnete/<nr>` |
| `/demokratie-index` | 301 nach `/demokratie` |
| Dateien aus `dist` (Skripte, Bilder, `robots.txt`, `sitemap.xml`, `data/`) | 200 |
| alles andere | 404, als Inhalt die App mit ihrer Fehlerseite, nicht im Cache |

Vorher lieferte jeder Pfad index.html mit Status 200. Wer ohne JavaScript
abruft (Suchmaschinen, KI-Assistenten), sah unter jeder Adresse dieselbe
leere Seite.

Die Datei liegt im Repo, wirkt aber erst, wenn sie auf dem Server
eingespielt ist. Der automatische Deploy fasst nginx nicht an.

## Einspielen (einmalig, als root)

Das Snippet setzt den server-Block voraus, wie er im Oktober 2026 auf dem
Server steht: `snippets/security-headers.conf` (alle Header mit `always`),
`location = /index.html` mit `no-store`, die Regex-Location fuer Skripte und
Bilder, `^~ /data/`, `= /manifest.webmanifest` und `/api/`. Weicht der Block
davon ab, erst abgleichen.

```bash
# 1. Datei finden und sichern. sites-enabled enthaelt einen Symlink,
#    grep -r folgt ihm nicht, deshalb mit Stern.
grep -l "app.respublica.media" /etc/nginx/sites-enabled/*
DATEI=/etc/nginx/sites-available/app.respublica.media
mkdir -p /root/backups/nginx
cp "$DATEI" /root/backups/nginx/app.respublica.media.bak-$(date +%F)

# 2. Regeln an ihren Platz kopieren
cp /root/apps/dashboard/deploy/nginx/app-routen.conf /etc/nginx/snippets/respublica-app-routen.conf

# 3. Im server-Block mit "listen 443" nur diesen Block
#        location / {
#            try_files $uri $uri/ /index.html;
#            include snippets/security-headers.conf;
#        }
#    ersetzen durch
#        include snippets/respublica-app-routen.conf;
#    Alle anderen Locations bleiben stehen, besonders location = /index.html.

# 4. Pruefen und neu laden
/usr/sbin/nginx -t && systemctl reload nginx

# 5. Antworten pruefen, alles muss "ok" sein
/root/apps/dashboard/deploy/nginx/pruefen.sh
```

Zurueck, falls etwas nicht stimmt:

```bash
cp /root/backups/nginx/app.respublica.media.bak-<datum> /etc/nginx/sites-available/app.respublica.media
/usr/sbin/nginx -t && systemctl reload nginx
```

## Neue Route in der App

Neue Seite in `src/App.tsx`: in `app-routen.conf` in die Liste der Seiten
aufnehmen, sonst liefert der Server fuer sie 404. Die CI faellt dann rot
aus (`node deploy/nginx/routen-pruefen.mjs`), auch wenn ein Eintrag in
`public/sitemap.xml` nicht zur Liste passt.

Nach dem Merge Schritt 2 und 4 bis 5 von oben wiederholen. Ohne das bleibt
auf dem Server die alte Liste aktiv.

## Lokal testen

`pruefen.sh` nimmt eine andere Adresse als Argument. Mit einem nginx im
Container, der den server-Block von oben nachbaut, `dist/` ausliefert und
`app-routen.conf` an Stelle von `location /` einbindet:

```bash
npm run build
deploy/nginx/pruefen.sh http://127.0.0.1:8088
```
