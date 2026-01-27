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
  const page = doc.addPage([612, 792])

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const mono = await doc.embedFont(StandardFonts.Courier)

  const margin = 48
  let y = 792 - margin

  const draw = (text: string, size = 12, useMono = false, color = rgb(0.12, 0.16, 0.22)) => {
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: useMono ? mono : font,
      color,
    })
    y -= size + 6
  }

  const headerH = 62
  page.drawRectangle({
    x: 0,
    y: 792 - headerH,
    width: 612,
    height: headerH,
    color: rgb(0.12, 0.24, 0.17),
  })
  page.drawText('Evernest', {
    x: margin,
    y: 792 - 40,
    size: 22,
    font,
    color: rgb(1, 1, 1),
  })
  page.drawText('Emergency Recovery Kit', {
    x: margin,
    y: 792 - 58,
    size: 12,
    font,
    color: rgb(1, 1, 1),
  })

  y = 792 - headerH - 24

  const createdAt = params.createdAtIso ?? new Date().toISOString()
  const fp = await fingerprint(params.masterKeyB64)

  draw('Print and store this in a physical safe.', 12, false, rgb(0.12, 0.16, 0.22))
  draw('Your Vault Password is not stored anywhere. This is your last-resort way back in.', 11, false, rgb(0.12, 0.16, 0.22))
  y -= 10

  draw(`Vault ID: ${params.vaultId}`, 11, true, rgb(0.12, 0.16, 0.22))
  draw(`Generated: ${createdAt}`, 11, true, rgb(0.12, 0.16, 0.22))
  draw(`Fingerprint: ${fp}`, 11, true, rgb(0.12, 0.16, 0.22))
  y -= 12

  const boxTop = y
  const boxH = 130
  page.drawRectangle({
    x: margin,
    y: boxTop - boxH,
    width: 612 - margin * 2,
    height: boxH,
    color: rgb(0.98, 0.96, 0.92),
    borderColor: rgb(0.12, 0.24, 0.17),
    borderWidth: 1,
  })
  y -= 18
  draw('Recovery Master Key (base64)', 12, false, rgb(0.12, 0.24, 0.17))
  y -= 2
  const groupedB64 = groupString(params.masterKeyB64, 4)
  for (const line of wrapText(groupedB64, 52)) draw(line, 12, true, rgb(0.12, 0.16, 0.22))
  y = boxTop - boxH - 14

  draw('How to use this key (only if you lose your Vault Password):', 12)
  draw('1) Open Evernest on a trusted device.', 11)
  draw('2) Paste the Recovery Master Key into the “Recovery Key (base64)” field.', 11)
  draw('3) Click “Unlock with Recovery Key”.', 11)
  y -= 6

  draw('Security rules:', 12)
  draw('• Anyone with this key can decrypt your vault. Treat it like a physical master key.', 11)
  draw('• Do not store this in email, cloud notes, screenshots, or password managers.', 11)
  draw('• Recommended: print two copies, seal in envelopes, store in separate safes.', 11)

  return doc.save()
}
