# Res.Publica Dashboard

React + Vite + TypeScript App unter [https://app.respublica.media](https://app.respublica.media). Nginx liefert das gebaute SPA aus `/root/apps/dashboard/dist` (siehe `/root/SERVER.md`).

## Tech Stack

- React **18.3.1** (laut `package.json`)
- Vite **5.4.10**
- TypeScript **5.6.2**
- Recharts **3.8.0** (Diagramme)
- MapLibre GL **5.22.0** (Weltkarte)

## Seiten

Routen aus `src/App.tsx` und Komponenten unter `src/pages/`:

| Pfad / Datei | Kurzbeschreibung |
|--------------|------------------|
| `/` — `Overview.tsx` | Dashboard-Übersicht, KPIs und Einstieg |
| `/wahlen` — `Elections.tsx` | Wahlen, regionale Auswertungen |
| `/quellen` — `Sources.tsx` | Datenquellen und Credits; Abschnitt Weltkarte lädt Metadaten und Nutzungszähler live von `GET /api/world/sources` (übrige Domains weiter statisch aus `sourcesCatalog.ts`) |
| `/bundestag`, `/bundestag/:pollId` — `Bundestag.tsx` | Abstimmungen, namentliche Abstimmungen, Hemicycle-Tooltip und MdB-Modal mit persönlicher Abstimmungshistorie |
| `/gesetze`, `/gesetze/:id` — `Legislation.tsx` | Gesetzgebung, Änderungsdetails |
| `/eu-recht`, `/eu-recht/:id` — `EuLaw.tsx` | EU-Recht / Rechtsakte |
| `/koalition` — `Coalition.tsx` | Koalitionsdarstellung |
| `/demokratie` — `DemocracyIndex.tsx` | Demokratie-Indikatoren |
| `/demokratie-index` | Permanent-Redirect nach `/demokratie` (alte URLs / Bookmarks) |
| `/weltkarte` — `WorldMap.tsx` | `MapTopbar.tsx` (Kategorie-Pills, Indikator, Jahr, Projektionstoggle Mercator/Globe, „+ Widget“-Menü); Projektion persistent in `localStorage` (`rp-map-projection`), Globe mit Fallback (legacy iOS/WebGL2 fehlt → Toggle disabled + Hinweis). Schwebende Widgets in `WidgetDashboard.tsx` nur bei aktivem Typ, Sichtbarkeit `localStorage` `rp-visible-widgets-v1`, Panel-Offsets `rp-widget-layout-v1` (ohne Sichtbarkeits-Default). Console `CountrySidebar.tsx`: sechs Tabs mit Land, ohne Land nur GlobalView; Snap links/rechts `localStorage` `rp-console-dock`. **Multi-Select:** ein Primärland plus bis zu drei Vergleichsländer (Strg/Cmd-Klick, Kontextmenü, Vergleich-Tab); Karte: fester roter Rand (Primär), gestrichelt (Vergleich). **Console-Dock:** links / rechts / unten (`rp-console-dock`), Tab-Strip horizontal scrollbar; Unten: ca. 40vh Panel unter der Karte. Handel lazy per `/api/world/trade/:iso3?breakdown=sections` plus Zeitreihe `/api/world/trade/:iso3/timeseries`; Trade-Tab mit ViewToggle (`rp-trade-timeseries-view`), Linien/Bilanz/Stacked und HS-Section-Breakdown mit lesbaren HS-Labels (DE/EN), lokalisierte Top-Partnernamen statt ISO3, PartnerPicker (Default: Top-Partner je Export/Import-Modus, API-Reload mit optionalem `partner=ISO3`) sowie lokalisierte Mrd./bn-Formate, CARTO-Basemaps, Kontextmenü auf der Karte |
| `/eu-parlament` — `EuParliament.tsx` | EU-Parlament |
| `/lobbyregister` — `LobbyRegister.tsx` | Lobbyregister mit Stats, Treemap nach Branche, geografischer Verteilung (Karte + Städte-Ranking), Registrierungen im Zeitverlauf (Monat + kumuliert), Suche, Sortierung, Detailansicht mit Tabs (Übersicht + Gesetzesprojekte) |
| `/admin` — `Admin.tsx` | Admin-Ansicht (nicht in der öffentlichen Navigation; optional `VITE_SHOW_ADMIN_NAV=true`) |
| `*` — `NotFound.tsx` | 404 |

Unterverzeichnisse: `src/pages/elections/`, `src/pages/worldmap/` (Hilfskomponenten für die obigen Seiten), `src/data/sourcesCatalog.ts` (Quellenkatalog und Footer-Zuordnung je Route).

## Design System

- Pfad: `src/design-system/`
- Fonts: Playfair Display, Source Serif 4, IBM Plex Mono (Einbindung in `App.tsx` über Google Fonts)
- Farben: Rot `#C8102E`, Tinte `#0F0F0F`, Papier `#F5F0E8` (siehe `tokens.ts`)
- Themes: Light + Dark über `ThemeProvider` / `useTheme()` in `ThemeContext.tsx`
- i18n: DE + EN (`src/design-system/i18n.ts`)

## API

- Öffentliche Base-URL: `https://api.respublica.media` (serverseitig Node auf Port **3002**; dasselbe API-Prefix kann unter `app.respublica.media` über `/api/` erreicht werden)
- Hook: `src/hooks/useApi.ts`
- **Wichtig:** Query-Parameter direkt in den Endpoint-String einbetten, **nicht** als zweites Argument-Objekt an `useApi`
- Optional: `VITE_SHOW_ADMIN_NAV=true` — zeigt den Eintrag „Admin“ in Sidebar und mobiler Navigation (Standard: ausgeblendet; Route `/admin` bleibt direkt aufrufbar).

## Entwicklung

```bash
# Lokal (z. B. Cursor Remote SSH)
cd /root/apps/dashboard
npm run dev
```

### Deploy

```bash
cd /root/apps/dashboard
./deploy.sh
```

`deploy.sh` macht derzeit: `git pull origin main`, `npm ci`, `npm run build`. Auslieferung: Nginx `root` zeigt auf `/root/apps/dashboard/dist` (kein separates Kopieren nach `/var/www/...` nötig).

Alternativ manuell:

```bash
cd /root/apps/dashboard
npm run build
# bei Bedarf: rsync oder erneut ./deploy.sh
```

## Git

- Repo: [densown/respublica-dashboard](https://github.com/densown/respublica-dashboard)
- Branch: `main`

---

**Zuletzt aktualisiert:** 11. Mai 2026 (UX-Audit Run 1: Wahlen-/GERDA-Copy, EU-Zahlen, Admin-Nav optional, Redirect `demokratie-index`; offene Punkte: `notes/BUG8-gesetz-titel-TODO.md`)
