import { toPng } from 'html-to-image'
import type maplibregl from 'maplibre-gl'

export type CaptureOptions = {
  pixelRatio: number
  backgroundColor: string
  /**
   * Bilder und Schriften neu laden statt aus dem Browser-Cache. Standard an;
   * das Teilbild zur Abstimmung schaltet es ab, weil es beim Hinscrollen
   * vorab gerechnet wird und sonst jedes Mal die Schriften neu holt.
   */
  cacheBust?: boolean
}

export async function captureElement(
  el: HTMLElement,
  opts: CaptureOptions,
): Promise<string> {
  return toPng(el, {
    pixelRatio: opts.pixelRatio,
    backgroundColor: opts.backgroundColor,
    cacheBust: opts.cacheBust ?? true,
    filter: (node: HTMLElement) => {
      if (node.dataset?.exportIgnore === 'true') return false
      return true
    },
  })
}

export function captureMapLibre(
  map: maplibregl.Map,
): string {
  const canvas = map.getCanvas()
  return canvas.toDataURL('image/png')
}

export function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}
