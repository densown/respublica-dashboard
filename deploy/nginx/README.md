# nginx-Regeln fuer app.respublica.media

`app-routen.conf` regelt, welche Pfade der Server als Seite ausliefert:

| Pfad | Antwort |
|---|---|
| Seiten der App (`/`, `/bundestag`, `/bundestag/123`, `/gesetze/...`, ...) | 200, index.html |
| `/abstimmungen`, `/abstimmungen/<nr>` | 301 nach `/bundestag` bzw. `/bundestag/<nr>` |
| `/abgeordnete`, `/abgeordnete/<nr>` | 301 nach `/bundestag?ansicht=abgeordnete` bzw. `/bundestag/abgeordnete/<nr>` |
| `/demokratie-index` | 301 nach `/demokratie` |
| Dateien aus `dist` (Skripte, Bilder, `robots.txt`, `sitemap.xml`, `data/`) | 200 |
| alles andere | 404, als Inhalt die App mit ihrer Fehlerseite |

Vorher lieferte jeder Pfad index.html mit Status 200. Wer ohne JavaScript
abruft (Suchmaschinen, KI-Assistenten), sah unter jeder Adresse dieselbe
leere Seite.

Die Datei liegt im Repo, wirkt aber erst, wenn sie auf dem Server
eingespielt ist. Der automatische Deploy fasst nginx nicht an.

## Einspielen (einmalig, als root)

```bash
# 1. Server-Block finden und sichern
grep -rln "app.respublica.media" /etc/nginx/sites-enabled/
DATEI=/etc/nginx/sites-available/<datei aus Schritt 1>
mkdir -p /root/backups/nginx
cp "$DATEI" /root/backups/nginx/$(basename "$DATEI").bak-$(date +%F)

# 2. Regeln an ihren Platz kopieren
cp /root/apps/dashboard/deploy/nginx/app-routen.conf /etc/nginx/snippets/respublica-app-routen.conf

# 3. Im server-Block mit "listen 443" fuer app.respublica.media den bisherigen
#    Block   location / { try_files $uri $uri/ /index.html; }   ersetzen durch
#        include snippets/respublica-app-routen.conf;
#    root, location /api/ und Zertifikatszeilen bleiben stehen.
#    Gibt es dort schon "location = /", weitere Weiterleitungen oder
#    error_page, vorher abgleichen.

# 4. Pruefen und neu laden
nginx -t && systemctl reload nginx

# 5. Antworten pruefen, alles muss "ok" sein
/root/apps/dashboard/deploy/nginx/pruefen.sh
```

Zurueck, falls etwas nicht stimmt:

```bash
cp /root/backups/nginx/<datei>.bak-<datum> "$DATEI"
nginx -t && systemctl reload nginx
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
Container, der `dist/` ausliefert und `app-routen.conf` einbindet:

```bash
npm run build
deploy/nginx/pruefen.sh http://127.0.0.1:8088
```
