import type { FormatPreset, FooterStyle } from './exportFormats'
import { dataUrlToImage } from './exportCapture'
import { fonts } from '../tokens'

export type ComposeMeta = {
  title: string
  source: string
  colors: {
    bg: string
    ink: string
    red: string
    muted: string
    border: string
  }
  lang: 'de' | 'en'
}

export async function composeExport(
  captureDataUrl: string,
  preset: FormatPreset,
  meta: ComposeMeta,
): Promise<Blob> {
  await document.fonts.ready

  const contentImg = await dataUrlToImage(captureDataUrl)

  const targetW = preset.width
  const footerH = preset.footer.height
  const headerH = preset.header ? 44 : 0
  const contentAreaH =
    preset.height === 'auto'
      ? Math.round((contentImg.height / contentImg.width) * targetW)
      : preset.height - headerH - footerH

  const totalH = headerH + contentAreaH + footerH

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = totalH
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = meta.colors.bg
  ctx.fillRect(0, 0, targetW, totalH)

  if (preset.header) {
    drawHeader(ctx, targetW, headerH, meta)
  }

  ctx.drawImage(contentImg, 0, headerH, targetW, contentAreaH)

  ctx.fillStyle = meta.colors.border
  ctx.fillRect(0, headerH + contentAreaH, targetW, 1)

  drawFooter(ctx, targetW, headerH + contentAreaH + 1, footerH - 1, preset.footer.style, meta)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/png',
    )
  })
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  meta: ComposeMeta,
) {
  const pad = 20

  ctx.fillStyle = meta.colors.ink
  ctx.font = `600 ${h * 0.4}px ${fonts.body}`
  ctx.textBaseline = 'middle'
  ctx.fillText(meta.title, pad, h / 2, w * 0.7)

  drawLogo(ctx, w - pad, h / 2, h * 0.38, meta, 'right')
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  h: number,
  style: FooterStyle,
  meta: ComposeMeta,
) {
  ctx.fillStyle = meta.colors.bg
  ctx.fillRect(0, y, w, h)

  if (style === 'branded') drawBrandedFooter(ctx, w, y, h, meta)
  else if (style === 'citation') drawCitationFooter(ctx, w, y, h, meta)
  else drawMinimalFooter(ctx, w, y, h, meta)
}

function drawBrandedFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  h: number,
  meta: ComposeMeta,
) {
  const pad = 16
  const midY = y + h / 2

  drawLogo(ctx, pad, midY, h * 0.32, meta, 'left')

  ctx.fillStyle = meta.colors.muted
  ctx.font = `400 ${h * 0.2}px ${fonts.mono}`
  ctx.textBaseline = 'middle'
  ctx.fillText('respublica.media', pad, midY + h * 0.28)

  ctx.fillStyle = meta.colors.ink
  ctx.font = `600 ${h * 0.26}px ${fonts.body}`
  ctx.textAlign = 'center'
  ctx.fillText(meta.title, w / 2, midY - h * 0.08, w * 0.4)
  ctx.textAlign = 'left'

  ctx.fillStyle = meta.colors.muted
  ctx.font = `400 ${h * 0.2}px ${fonts.mono}`
  ctx.textAlign = 'right'
  ctx.fillText(meta.source, w - pad, midY - h * 0.05, w * 0.35)

  const dateStr = new Date().toLocaleDateString(meta.lang === 'de' ? 'de-DE' : 'en-GB')
  ctx.fillText(dateStr, w - pad, midY + h * 0.25)
  ctx.textAlign = 'left'
}

function drawCitationFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  h: number,
  meta: ComposeMeta,
) {
  const pad = 16
  const fontSize = Math.max(10, h * 0.24)
  const retrieved = meta.lang === 'de' ? 'abgerufen am' : 'retrieved on'
  const dateStr = new Date().toLocaleDateString(meta.lang === 'de' ? 'de-DE' : 'en-GB')
  const viz = meta.lang === 'de' ? 'Darstellung' : 'Visualization'

  const line = `${meta.source}. ${viz}: Res.Publica (respublica.media), ${retrieved} ${dateStr}.`

  ctx.fillStyle = meta.colors.ink
  ctx.font = `400 ${fontSize}px ${fonts.mono}`
  ctx.textBaseline = 'middle'
  ctx.fillText(line, pad, y + h / 2, w - pad * 2)
}

function drawMinimalFooter(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  h: number,
  meta: ComposeMeta,
) {
  const pad = 16
  const fontSize = Math.max(9, h * 0.4)
  const dateStr = new Date().toLocaleDateString(meta.lang === 'de' ? 'de-DE' : 'en-GB')

  ctx.fillStyle = meta.colors.muted
  ctx.font = `400 ${fontSize}px ${fonts.mono}`
  ctx.textBaseline = 'middle'
  ctx.fillText(meta.source, pad, y + h / 2, w * 0.7)

  ctx.textAlign = 'right'
  ctx.fillText(dateStr, w - pad, y + h / 2)
  ctx.textAlign = 'left'
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  fontSize: number,
  meta: ComposeMeta,
  align: 'left' | 'right',
) {
  ctx.font = `900 ${fontSize}px ${fonts.display}`
  ctx.textBaseline = 'middle'

  const resMeasure = ctx.measureText('Res')
  const dotMeasure = ctx.measureText('.')
  const pubMeasure = ctx.measureText('Publica')
  const totalW = resMeasure.width + dotMeasure.width + pubMeasure.width

  const startX = align === 'right' ? x - totalW : x

  ctx.fillStyle = meta.colors.ink
  ctx.fillText('Res', startX, centerY)

  ctx.fillStyle = meta.colors.red
  ctx.fillText('.', startX + resMeasure.width, centerY)

  ctx.fillStyle = meta.colors.ink
  ctx.fillText('Publica', startX + resMeasure.width + dotMeasure.width, centerY)
}
