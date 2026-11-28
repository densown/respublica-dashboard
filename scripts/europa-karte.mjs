#!/usr/bin/env node
// Erzeugt die Europakarte der App als fertige SVG-Pfade:
//   node scripts/europa-karte.mjs
// Liest public/data/world.json (Laendergrenzen der Weltkarte), projiziert den
// Ausschnitt Europa und schreibt public/data/europa.json. So
// braucht die Seite zur Laufzeit keine Kartenbibliothek und laedt nicht die
// 1,4 MB der Weltkarte. Nur neu ausfuehren, wenn sich world.json aendert.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { geoArea, geoConicConformal, geoPath } from 'd3-geo'

const wurzel = join(dirname(fileURLToPath(import.meta.url)), '..')
const welt = JSON.parse(readFileSync(join(wurzel, 'public/data/world.json'), 'utf8'))

const BREITE = 1000
const W = -11, O = 34.5, S = 34.3, N = 71.3
// Rahmen als dichte Punktfolge, damit die gekruemmten Raender mitzaehlen
const rahmen = { type: 'MultiPoint', coordinates: [] }
for (let i = 0; i <= 40; i++) {
  const lon = W + ((O - W) * i) / 40
  const lat = S + ((N - S) * i) / 40
  rahmen.coordinates.push([lon, S], [lon, N], [W, lat], [O, lat])
}

const projektion = geoConicConformal().parallels([43, 62]).rotate([-10, 0])
projektion.fitWidth(BREITE, rahmen)
const [[, y0], [, y1]] = geoPath(projektion).bounds(rahmen)
const HOEHE = Math.round(y1 - y0)
projektion.clipExtent([[0, 0], [BREITE, HOEHE]])
const pfad = geoPath(projektion).digits(0)

// Laender mit eigener Seite: EU-27, dazu Norwegen und die Schweiz (Strompreise)
const EU = 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ')
const MIT_SEITE = new Set([...EU, 'NO', 'CH'])

// world.json hat teils falsch herum laufende Ringe. d3 liest so einen Ring als
// "alles ausser dem Land"; solche Polygone hier umdrehen.
function richten(geometrie) {
  const teile = geometrie.type === 'MultiPolygon' ? geometrie.coordinates : [geometrie.coordinates]
  const gut = teile.map((ringe) =>
    geoArea({ type: 'Polygon', coordinates: ringe }) > 2 * Math.PI ? ringe.map((r) => [...r].reverse()) : ringe,
  )
  return { type: 'MultiPolygon', coordinates: gut }
}

const laender = []
for (const f of welt.features) {
  if (!f.geometry) continue
  f.geometry = richten(f.geometry)
  const { iso3, name } = f.properties
  // Natural Earth fuehrt Frankreich, Norwegen und Kosovo ohne zweistelligen Code
  const iso2 = { FRA: 'FR', NOR: 'NO', XKX: 'XK' }[iso3] ?? f.properties.iso2
  if (!iso2 || iso2 === '-99' || !iso3) continue
  const d = pfad(f)
  if (!d) continue
  // Mittelpunkt des groessten Teils: bei Frankreich das Festland, nicht Guayana
  const teile = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]
  let bester = null
  for (const t of teile) {
    const g = { type: 'Polygon', coordinates: t }
    const b = pfad.bounds(g)
    if (!Number.isFinite(b[0][0])) continue
    const sichtbar = pfad.area(g)
    if (sichtbar > 0 && (!bester || sichtbar > bester.flaeche)) bester = { flaeche: sichtbar, g }
  }
  if (!bester) continue
  const [cx, cy] = pfad.centroid(bester.g)
  laender.push({
    iso2,
    iso3,
    name,
    eu: EU.includes(iso2),
    seite: MIT_SEITE.has(iso2),
    d,
    // Mittelpunkt und Flaeche in Anteilen der Karte, fuer Beschriftung in HTML
    x: +(cx / BREITE).toFixed(4),
    y: +(cy / HOEHE).toFixed(4),
    flaeche: +(bester.flaeche / (BREITE * HOEHE)).toFixed(5),
    km2: Math.round(geoArea(f) * 6371 * 6371),
  })
}
laender.sort((a, b) => Number(a.seite) - Number(b.seite) || a.iso2.localeCompare(b.iso2))

const aus = join(wurzel, 'public/data/europa.json')
writeFileSync(aus, JSON.stringify({ breite: BREITE, hoehe: HOEHE, laender }))
console.log(`${laender.length} Laender, ${BREITE} x ${HOEHE}, ${(readFileSync(aus).length / 1024).toFixed(0)} KB`)
console.log(laender.filter((l) => l.seite).map((l) => `${l.iso2}:${l.flaeche}`).join(' '))
