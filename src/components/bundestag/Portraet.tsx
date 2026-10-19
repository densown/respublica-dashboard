import { useState } from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import { fotoInGroesse, initialen } from './foto'

/**
 * Foto einer oder eines Abgeordneten, rund, mit Initialen, wo keins da ist
 * oder es nicht laedt. Adressen und Groessen: foto.ts.
 */
export function Portraet({
  name,
  fotoUrl,
  groesse,
  alt = '',
}: {
  name: string
  fotoUrl: string | null
  /** Durchmesser in Pixel */
  groesse: number
  /** Leer in Listen, wo der Name daneben steht */
  alt?: string
}) {
  const { c } = useTheme()
  const [kaputt, setKaputt] = useState(false)
  const rahmen = {
    width: groesse,
    height: groesse,
    flexShrink: 0,
    borderRadius: '50%',
    border: `1px solid ${c.border}`,
    background: c.bgAlt,
  } as const

  if (fotoUrl && !kaputt) {
    return (
      <img
        src={fotoInGroesse(fotoUrl, groesse * 2)}
        alt={alt}
        width={groesse}
        height={groesse}
        loading="lazy"
        decoding="async"
        onError={() => setKaputt(true)}
        // Portraets auf Commons sind meist Brustbilder: oben anschneiden
        style={{ ...rahmen, objectFit: 'cover', objectPosition: '50% 20%' }}
      />
    )
  }
  return (
    <span
      aria-hidden
      style={{
        ...rahmen,
        display: 'grid',
        placeItems: 'center',
        fontFamily: fonts.display,
        fontWeight: 700,
        // Initialen wachsen mit dem Kreis; kein Token passt fuer 40 und 96 px
        fontSize: Math.round(groesse * 0.36),
        color: c.muted,
      }}
    >
      {initialen(name)}
    </span>
  )
}
