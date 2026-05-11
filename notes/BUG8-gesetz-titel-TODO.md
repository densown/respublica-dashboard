# TODO (Bug 8, UX audit): Gesetz-Listenansicht — Anzeigetitel statt Dateikürzel

**Status:** Zurückgestellt bis zur **Datenquellen-Entscheidung**.

## Problem

Die Gesetzgebungsliste zeigt `gesetze.kuerzel` (Dateiname aus dem kmein/gesetze-Pipeline-Import). Nutzer erwarten lesbare Kurztitel (vergleichbar DIP `kurztitel` / `titel`).

## Aktueller Stand (Code / Schema)

- DB-Tabelle `gesetze`: Felder `kuerzel`, `pfad` (siehe `apps/gesetze/docs/schema.md`).
- API `GET /api/gesetze` und `GET /api/gesetze/:id`: `kuerzel` und `name` (derzeit identisch zu `kuerzel`).
- Frontend: `Legislation.tsx` listet u. a. `g.kuerzel`.

## Offene Entscheidung

1. **Quelle für Anzeigetext:** z. B. Markdown-Frontmatter im kmein-Repo, manuelle Mapping-Tabelle, oder Anbindung an eine externe Normdaten-API — jeweils mit Pflege- und Lizenzimplikationen.
2. **Schema:** ggf. Spalten `titel_anzeige` / `kurztitel` + Backfill-Strategie.
3. **Reihenfolge:** Sinnvoll **nach** Bug 1 (Encoding-Backfill der `kuerzel`), damit Kürzel und Titel konsistent bleiben.

## Bei Umsetzung

- API um Anzeigefeld erweitern, `Legislation.tsx` auf Fallback `kuerzel` umbauen.
- DE/EN i18n prüfen (Listen-Labels, leerer Titel).
- `apps/gesetze/SERVER-DOKU.md` und ggf. Dashboard-README ergänzen.
