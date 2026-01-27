import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

function wrapText(text: string, maxLineLength: number) {
  const parts: string[] = []
  let i = 0
  while (i < text.length) {
    parts.push(text.slice(i, i + maxLineLength))
    i += maxLineLength
  }
  return parts
}

function wrapWordsByWidth(params: { text: string; maxWidth: number; font: any; size: number }) {
  const words = params.text.split(/\s+/g).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    const width = params.font.widthOfTextAtSize(candidate, params.size)
    if (width <= params.maxWidth) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function groupString(text: string, groupSize: number) {
  const clean = text.replace(/\s+/g, '')
  const parts: string[] = []
  for (let i = 0; i < clean.length; i += groupSize) parts.push(clean.slice(i, i + groupSize))
  return parts.join(' ')
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function fingerprint(text: string) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = bytesToHex(new Uint8Array(digest))
  return groupString(hex.slice(0, 24).toUpperCase(), 4)
}

export async function generateRecoveryPdf(params: {
  vaultId: string
  masterKeyB64: string
  createdAtIso?: string
}) {
  const doc = await PDFDocument.create()
  const pageW = 612
  const pageH = 792
  let page = doc.addPage([pageW, pageH])

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const mono = await doc.embedFont(StandardFonts.Courier)
  const monoBold = await doc.embedFont(StandardFonts.CourierBold)

  const margin = 46
  const contentW = pageW - margin * 2
  const brand = rgb(0.12, 0.24, 0.17)
  const ink = rgb(0.12, 0.16, 0.22)
  const muted = rgb(0.45, 0.5, 0.56)
  const paper = rgb(0.985, 0.98, 0.965)
  const card = rgb(0.98, 0.96, 0.92)
  const line = rgb(0.86, 0.85, 0.83)

  let y = pageH - margin
  let pageNo = 1

  const drawText = (text: string, opts: { x?: number; size?: number; font?: any; color?: any } = {}) => {
    const size = opts.size ?? 12
    page.drawText(text, {
      x: opts.x ?? margin,
      y,
      size,
      font: opts.font ?? font,
      color: opts.color ?? ink,
    })
    y -= size + 6
  }

  const ensureSpace = (minSpace: number) => {
    if (y - minSpace >= margin) return

    pageNo += 1
    page = doc.addPage([pageW, pageH])
    y = pageH - margin

    page.drawRectangle({ x: 0, y: pageH - 38, width: pageW, height: 38, color: brand })
    page.drawText('Evernest — Emergency Recovery Kit', {
      x: margin,
      y: pageH - 26,
      size: 12,
      font: fontBold,
      color: rgb(1, 1, 1),
    })
    page.drawText(`${pageNo}`, { x: pageW - margin - 8, y: pageH - 26, size: 12, font: fontBold, color: rgb(1, 1, 1) })
    y = pageH - 54
  }

  const drawRule = () => {
    page.drawRectangle({ x: margin, y, width: contentW, height: 1, color: line })
    y -= 12
  }

  const headerH = 72
  page.drawRectangle({
    x: 0,
    y: pageH - headerH,
    width: pageW,
    height: headerH,
    color: brand,
  })
  page.drawText('Evernest', {
    x: margin,
    y: pageH - 44,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  })
  page.drawText('Emergency Recovery Kit', {
    x: margin,
    y: pageH - 64,
    size: 12,
    font: fontItalic,
    color: rgb(1, 1, 1),
  })

  page.drawRectangle({ x: 0, y: 0, width: pageW, height: pageH - headerH, color: paper })

  y = pageH - headerH - 22

  const createdAt = params.createdAtIso ?? new Date().toISOString()
  const fp = await fingerprint(params.masterKeyB64)

  drawText('Print this and store it in a physical safe.', { size: 13, font: fontBold })
  drawText('Your Vault Password is never stored anywhere.', { size: 11, color: muted })
  drawText('This kit is your last-resort way back in.', { size: 11, color: muted })
  y -= 8

  const infoTop = y
  const infoH = 78
  page.drawRectangle({
    x: margin,
    y: infoTop - infoH,
    width: contentW,
    height: infoH,
    color: rgb(1, 1, 1),
    borderColor: line,
    borderWidth: 1,
  })

  const leftX = margin + 14
  const rightX = margin + contentW / 2 + 6
  const rowY1 = infoTop - 22
  const rowY2 = infoTop - 44
  const rowY3 = infoTop - 66

  page.drawText('Vault ID', { x: leftX, y: rowY1, size: 9, font: fontBold, color: muted })
  page.drawText(params.vaultId, { x: leftX, y: rowY1 - 12, size: 10, font: mono, color: ink })

  const localTime = new Date(createdAt).toLocaleString()
  page.drawText('Generated', { x: rightX, y: rowY1, size: 9, font: fontBold, color: muted })
  page.drawText(localTime, { x: rightX, y: rowY1 - 12, size: 10, font: mono, color: ink })

  page.drawText('Fingerprint', { x: leftX, y: rowY3, size: 9, font: fontBold, color: muted })
  page.drawText(fp, { x: leftX, y: rowY3 - 12, size: 10, font: monoBold, color: ink })

  page.drawText('Purpose', { x: rightX, y: rowY3, size: 9, font: fontBold, color: muted })
  page.drawText('Emergency vault recovery', { x: rightX, y: rowY3 - 12, size: 10, font, color: ink })

  y = infoTop - infoH - 18

  drawRule()

  page.drawText('Recovery Master Key (base64)', { x: margin, y, size: 12, font: fontBold, color: brand })
  y -= 12
  page.drawText('Anyone with this key can decrypt your vault. Treat it like a physical master key.', {
    x: margin,
    y,
    size: 10,
    font,
    color: muted,
  })
  y -= 18

  const groupedB64 = groupString(params.masterKeyB64, 4)
  const keyLines = wrapText(groupedB64, 60)
  const keyPadding = 14
  const keyLineSize = 11
  const keyLineH = keyLineSize + 6
  const keyBoxH = keyPadding + 16 + keyPadding + keyLines.length * keyLineH + 8
  const boxTop = y
  page.drawRectangle({
    x: margin,
    y: boxTop - keyBoxH,
    width: contentW,
    height: keyBoxH,
    color: card,
    borderColor: brand,
    borderWidth: 1,
  })
  let keyY = boxTop - keyPadding - 10
  page.drawText('KEY', { x: margin + keyPadding, y: keyY, size: 9, font: fontBold, color: brand })
  keyY -= 18
  for (const lineText of keyLines) {
    page.drawText(lineText, { x: margin + keyPadding, y: keyY, size: keyLineSize, font: mono, color: ink })
    keyY -= keyLineH
  }

  y = boxTop - keyBoxH - 18

  ensureSpace(210)
  page.drawText('Recovery steps (only if you lose your Vault Password)', { x: margin, y, size: 12, font: fontBold, color: brand })
  y -= 10

  const steps = [
    'Open Evernest on a trusted device.',
    'Go to the Vault unlock screen and choose the recovery option.',
    'Paste the Recovery Master Key into the “Recovery Key (base64)” field.',
    'Confirm the fingerprint on-screen matches the fingerprint printed above.',
    'Click “Unlock with Recovery Key”.',
  ]
  const bulletX = margin + 10
  const textX = margin + 24
  for (let i = 0; i < steps.length; i += 1) {
    const lines = wrapWordsByWidth({ text: steps[i], maxWidth: contentW - (textX - margin), font, size: 11 })
    page.drawText(`${i + 1}.`, { x: bulletX, y, size: 11, font: fontBold, color: ink })
    for (let j = 0; j < lines.length; j += 1) {
      page.drawText(lines[j], { x: textX, y, size: 11, font, color: ink })
      y -= 17
    }
    y -= 2
  }

  y -= 4
  drawRule()

  ensureSpace(160)
  page.drawText('Storage checklist', { x: margin, y, size: 12, font: fontBold, color: brand })
  y -= 10

  const checks = [
    'Print two copies and place them in separate sealed envelopes.',
    'Store them in two different physical safes (not in your phone or cloud).',
    'If you ever share this key, rotate your vault immediately.',
  ]
  for (const c of checks) {
    page.drawRectangle({ x: margin + 2, y: y + 4, width: 10, height: 10, borderColor: ink, borderWidth: 1, color: rgb(1, 1, 1) })
    const lines = wrapWordsByWidth({ text: c, maxWidth: contentW - 22, font, size: 11 })
    for (let j = 0; j < lines.length; j += 1) {
      page.drawText(lines[j], { x: margin + 18, y, size: 11, font, color: ink })
      y -= 17
    }
    y -= 2
  }

  ensureSpace(60)
  page.drawText('Support: https://alwaysnest.co.uk/support', { x: margin, y, size: 10, font: fontItalic, color: muted })
  y -= 12

  return doc.save()
}
