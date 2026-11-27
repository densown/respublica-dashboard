import type { CSSProperties } from 'react'

/**
 * Eigene Piktogramme in einer Strichstaerke. Ersetzen die Unicode-Zeichen im
 * Menue (Kreis, Raute, Stern), die nichts bedeuteten und je nach Geraet
 * anders oder gar nicht dargestellt wurden.
 *
 * Alle Zeichen stehen im Raster 24 x 24 und erben die Farbe vom Text.
 */
export type PiktogrammName =
  | 'start'
  | 'bundestag'
  | 'wahlen'
  | 'gesetze'
  | 'lobby'
  | 'mehr'
  | 'suche'
  | 'anfragen'
  | 'welt'
  | 'demokratie'
  | 'versammlungen'
  | 'quellen'
  | 'teilen'
  | 'pfeil'
  | 'zurueck'
  | 'schliessen'
  | 'ort'
  | 'haken'
  | 'sonne'
  | 'mond'
  | 'funke'
  | 'magazin'
  | 'laden'
  | 'hinzufuegen'

export type PiktogrammProps = {
  name: PiktogrammName
  /** Kantenlaenge in Pixeln. */
  size?: number
  style?: CSSProperties
  /** Beschriftung fuer Vorlesehilfen. Ohne sie gilt das Zeichen als Schmuck. */
  label?: string
}

function zeichnung(name: PiktogrammName) {
  switch (name) {
    case 'start':
      // Zeitungsseite: Kopf, Aufmacher, zwei Spalten
      return (
        <>
          <rect x="4" y="3.5" width="16" height="17" rx="1.5" />
          <path d="M7.5 7.5h9" strokeWidth="2.2" />
          <rect x="7.5" y="11" width="4" height="5.5" />
          <path d="M14 11.2h2.5M14 13.8h2.5M14 16.4h2.5" />
        </>
      )
    case 'bundestag':
      // Halbrund: zwei Sitzreihen und das Rednerpult
      return (
        <>
          <path d="M3.5 17a8.5 8.5 0 0 1 17 0" />
          <path d="M7.5 17a4.5 4.5 0 0 1 9 0" strokeDasharray="0.1 2.6" strokeWidth="2.4" />
          <path d="M10.5 20.5h3" strokeWidth="2.2" />
        </>
      )
    case 'wahlen':
      // Urne mit Stimmzettel
      return (
        <>
          <path d="M4 12.5h16v7.5H4z" />
          <path d="M8.5 12.5V4.5h7v8" />
          <path d="M10.6 6.8l2.8 2.8M13.4 6.8l-2.8 2.8" />
        </>
      )
    case 'gesetze':
      // Paragrafenzeichen, gezeichnet statt gesetzt
      return (
        <>
          <path d="M15 6.8c0-1.7-1.3-2.8-3-2.8s-3 1.1-3 2.7c0 3.4 6.5 3 6.5 6.6 0 1.5-1.1 2.5-2.5 2.9" />
          <path d="M9 17.2c0 1.7 1.3 2.8 3 2.8s3-1.1 3-2.7c0-3.4-6.5-3-6.5-6.6 0-1.5 1.1-2.5 2.5-2.9" />
        </>
      )
    case 'lobby':
      // Wandelhalle: Giebel und Saeulen
      return (
        <>
          <path d="M3.5 9.5L12 4l8.5 5.5z" />
          <path d="M6.5 12v5.5M10.2 12v5.5M13.8 12v5.5M17.5 12v5.5" />
          <path d="M3.5 20h17" strokeWidth="2" />
        </>
      )
    case 'mehr':
      return (
        <>
          <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </>
      )
    case 'suche':
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" strokeWidth="2" />
        </>
      )
    case 'anfragen':
      // Sprechblase mit Fragezeichen
      return (
        <>
          <path d="M4 5.5h16v10.5h-8l-4 3.5v-3.5H4z" />
          <path d="M10 9.4c.2-1 1-1.6 2-1.6 1.2 0 2 .7 2 1.7 0 1.5-2 1.5-2 3" />
          <circle cx="12" cy="13.8" r="0.5" fill="currentColor" stroke="none" />
        </>
      )
    case 'welt':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17" />
        </>
      )
    case 'demokratie':
      // Streifen wie im Demokratie-Diagramm
      return (
        <>
          <path d="M5 5v14M9 5v14M13 5v14M17 5v14" strokeWidth="2.6" strokeLinecap="butt" />
          <path d="M21 5v14" strokeWidth="1" />
        </>
      )
    case 'versammlungen':
      // Megafon
      return (
        <>
          <path d="M4 10v4l3 .6L15 19V5L7 9.4z" />
          <path d="M7.5 14.8l1 4.2h2.5l-.8-3.2" />
          <path d="M18 9.5c1 .8 1 4.2 0 5" />
        </>
      )
    case 'quellen':
      // Fussnote: Buch mit Lesezeichen
      return (
        <>
          <path d="M5 4.5h11.5A2.5 2.5 0 0 1 19 7v12.5H7.5A2.5 2.5 0 0 1 5 17z" />
          <path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H19" />
          <path d="M9 8h6M9 11h4" />
        </>
      )
    case 'teilen':
      return (
        <>
          <path d="M12 15V4M8 7.5L12 3.5l4 4" />
          <path d="M5.5 12v7.5h13V12" />
        </>
      )
    case 'pfeil':
      return <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" />
    case 'zurueck':
      return <path d="M19 12H6M11 6.5L5.5 12l5.5 5.5" />
    case 'schliessen':
      return <path d="M6 6l12 12M18 6L6 18" />
    case 'ort':
      return (
        <>
          <path d="M12 21s6.5-6.2 6.5-11A6.5 6.5 0 0 0 5.500 10c0 4.800 6.500 11 6.500 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </>
      )
    case 'haken':
      return <path d="M5 12.5l4.5 4.5L19 7.500" strokeWidth="2" />
    case 'sonne':
      return (
        <>
          <circle cx="12" cy="12" r="3.800" />
          <path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800" />
        </>
      )
    case 'mond':
      return <path d="M19.500 14.500A8 8 0 0 1 9.500 4.500a8 8 0 1 0 10 10z" />
    case 'funke':
      // Kennzeichen fuer automatisch erzeugten Text
      return <path d="M12 3.500l1.900 5.600 5.600 1.900-5.600 1.900L12 18.500l-1.900-5.600-5.600-1.900 5.600-1.900z" />
    case 'laden':
      // Web-App installieren
      return (
        <>
          <path d="M12 4v10.500M7.500 10l4.500 4.500 4.500-4.500" />
          <path d="M5 16.500V19.500h14v-3" />
        </>
      )
    case 'hinzufuegen':
      // Wie das iOS-Symbol "Zum Home-Bildschirm": Plus im Quadrat
      return (
        <>
          <rect x="4.500" y="4.500" width="15" height="15" rx="3" />
          <path d="M12 8.500v7M8.500 12h7" />
        </>
      )
    case 'magazin':
      return (
        <>
          <path d="M4 5.500c3-1 5.500-.6 8 1 2.500-1.600 5-2 8-1v13c-3-1-5.500-.6-8 1-2.500-1.600-5-2-8-1z" />
          <path d="M12 6.500v13" />
        </>
      )
  }
}

export function Piktogramm({ name, size = 22, style, label }: PiktogrammProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flexShrink: 0, display: 'block', ...style }}
    >
      {zeichnung(name)}
    </svg>
  )
}
