# respublica-dashboard

React-App unter app.respublica.media. Auf dem Server: `/root/apps/dashboard`.

- Gestaltungsrichtlinie, verbindlich: `docs/DESIGN.md`
- Laufendes Redesign (Mobile First, teilbare Karten, Tab für Tab): `projekte/app-redesign/` im Brain. Entscheidungen und Befunde zum Redesign dort statt unter `projekte/dashboard/`.

## Dokumentation im Brain

Dieses Repo beschreibt, **wie** etwas funktioniert. Warum etwas entschieden wurde, was gerade kaputt ist und was offen ist, gehört ins Brain (Repo `densown/respublica-brain`, auf dem Server `/root/apps/brain`, Regeln in dessen `CLAUDE.md`).

- Entscheidung getroffen: oben in `projekte/dashboard/entscheidungen.md` unter `## JJJJ-MM-TT`
- Fehler oder Auffälligkeit gefunden: oben in `projekte/dashboard/befunde.md` (Was, Ursache, Fix)
- Etwas bleibt offen: als Aufgabe `- [ ] ...` in `projekte/dashboard/dashboard.md`
- Wikilinks mit vollem Pfad, z. B. `[[projekte/dashboard/befunde|Befunde]]`. Keine Gedankenstriche, keine Emojis.
- In Cloud-Sitzungen auf den zugewiesenen `claude/*`-Branch des Brain-Repos pushen; reine Notizen landen automatisch in `main`.
