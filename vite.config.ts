import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

// Traegt nach dem Build die Liste der Skripte und Stile in dist/sw.js ein.
// Der Service Worker laedt sie nach der Installation im Hintergrund, damit
// die App auch ohne Netz jede Seite oeffnen kann, nicht nur schon besuchte.
// Die Kartenbibliothek (maplibre, gut 1 MB) bleibt draussen und kommt bei Bedarf.
function serviceWorkerListe(): Plugin {
  let dateien: string[] = []
  let ausgabe = 'dist'
  return {
    name: 'rp-service-worker-liste',
    apply: 'build',
    configResolved(config) {
      ausgabe = resolve(config.root, config.build.outDir)
    },
    generateBundle(_optionen, bundle) {
      dateien = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/') && /\.(?:js|css)$/.test(f) && !/vendor-map|maplibre/.test(f))
        .map((f) => `/${f}`)
        .sort()
    },
    closeBundle() {
      const pfad = resolve(ausgabe, 'sw.js')
      const alt = readFileSync(pfad, 'utf8')
      const neu = alt.replace('const VORLADEN = []', `const VORLADEN = ${JSON.stringify(dateien)}`)
      if (neu === alt) throw new Error('sw.js: Platzhalter VORLADEN fehlt')
      writeFileSync(pfad, neu)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serviceWorkerListe()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-map': ['maplibre-gl'],
          'vendor-d3': ['d3'],
          'vendor-charts': ['recharts'],
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
