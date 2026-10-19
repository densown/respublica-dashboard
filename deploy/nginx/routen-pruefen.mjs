#!/usr/bin/env node
// Prueft, ob die nginx-Regeln (app-routen.conf) zu den Routen in src/App.tsx
// und zur sitemap.xml passen. Faellt eine Seite aus der Liste, liefert der
// Server fuer sie Status 404, obwohl die App sie anzeigt, und Google nimmt
// sie aus dem Index. Laeuft in der CI, ohne Abhaengigkeiten:
//
//   node deploy/nginx/routen-pruefen.mjs

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const lesen = (pfad) => readFileSync(join(wurzel, pfad), 'utf8')

const app = lesen('src/App.tsx')
const conf = lesen('deploy/nginx/app-routen.conf')
const sitemap = lesen('public/sitemap.xml')

// Routen aus App.tsx: Pfad und Element, auch ueber mehrere Zeilen
const routen = []
for (const m of app.matchAll(/<Route\s+(?:path="([^"]*)"|index)\s+element=\{<(\w+)/g)) {
  routen.push({ pfad: `/${(m[1] ?? '').replace(/^\//, '')}`, element: m[2] })
}
if (routen.length < 10) {
  console.error(`Nur ${routen.length} Routen in src/App.tsx gefunden, Muster passt nicht mehr.`)
  process.exit(1)
}

// Muster der Seiten steht in der Zeile nach "# routen-pruefen: seiten"
const zeilen = conf.split('\n')
const marke = zeilen.findIndex((z) => z.trim() === '# routen-pruefen: seiten')
const seitenZeile = marke >= 0 ? zeilen[marke + 1] : ''
const muster = seitenZeile.match(/^location ~ (\S+) \{$/)?.[1]
if (!muster) {
  console.error('Muster der Seiten in app-routen.conf nicht gefunden.')
  process.exit(1)
}
const seite = new RegExp(muster)
const genau = new Set([...conf.matchAll(/^location = (\S+)/gm)].map((m) => m[1]))
const praefixe = [...conf.matchAll(/^location \^~ (\S+)/gm)].map((m) => m[1])

const weiterleitung = (p) => genau.has(p) || praefixe.some((v) => p.startsWith(v))
const istSeite = (p) => (p === '/' ? genau.has('/') : seite.test(p))
const beispiel = (p) => p.replace(/:[A-Za-z]+/g, '123')

const fehler = []
for (const { pfad, element } of routen) {
  if (pfad === '/*') continue
  const p = beispiel(pfad)
  if (element === 'Navigate' || element === 'AlteAdresse') {
    if (!weiterleitung(p)) fehler.push(`${pfad}: Weiterleitung in der App, aber keine in nginx`)
  } else if (!istSeite(p)) {
    fehler.push(`${pfad}: Seite in der App, nginx liefert 404`)
  }
}

for (const m of sitemap.matchAll(/<loc>https:\/\/app\.respublica\.media([^<]*)<\/loc>/g)) {
  const p = m[1] || '/'
  if (!istSeite(p)) fehler.push(`${p}: steht in sitemap.xml, nginx liefert 404`)
}

// Gegenproben: diese Pfade muessen 404 bleiben
for (const p of ['/gibtsnicht', '/bundestag/abc', '/wahlen/xyz', '/bundestag/abgeordnete', '/api/x']) {
  if (istSeite(p)) fehler.push(`${p}: sollte 404 sein, gilt aber als Seite`)
}

if (fehler.length) {
  console.error('nginx-Routen passen nicht zur App:\n' + fehler.map((f) => `  ${f}`).join('\n'))
  console.error('Liste in deploy/nginx/app-routen.conf anpassen.')
  process.exit(1)
}
console.log(`nginx-Routen passen: ${routen.length} Routen, sitemap.xml geprueft.`)
