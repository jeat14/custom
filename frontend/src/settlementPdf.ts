import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { VaultPayloadV1 } from './ui/WarmNestRenderer'

type Section = {
  title: string
  subtitle?: string
  items: Array<{ label: string; value: string; kind?: 'secret' | 'note' }>
}

function normalize(text: string) {
  return (text ?? '').toString().replace(/\r\n/g, '\n')
}

function wrapLine(text: string, maxChars: number) {
  const s = normalize(text)
  const parts: string[] = []
  for (const rawLine of s.split('\n')) {
    const line = rawLine.trimEnd()
    if (!line) {
      parts.push('')
      continue
    }
    if (line.length <= maxChars) {
      parts.push(line)
      continue
    }
    let i = 0
    while (i < line.length) {
      parts.push(line.slice(i, i + maxChars))
      i += maxChars
    }
  }
  return parts
}

function redactValue(value: string) {
  const v = normalize(value).trim()
  if (!v) return ''
  return '••••••'
}

function classifySections(payload: VaultPayloadV1): Section[] {
  const admin = payload.categories.admin ?? []
  const financials = payload.categories.financials ?? []
  const business = payload.categories.business_ip ?? []
  const sentimental = payload.categories.sentimental ?? []
  return [
    { title: 'Urgent (Day 1)', subtitle: 'Stop ongoing charges and secure access', items: admin },
    { title: 'Financial', subtitle: 'Banking, crypto, subscriptions, points', items: financials },
    { title: 'Business', subtitle: 'Accounts and IP that keep a business running', items: business },
    { title: 'Sentimental', subtitle: 'Memories, memorialization wishes, messages', items: sentimental },
  ]
}

export async function generateSettlementRoadmapPdf(params: {
  vaultId: string
  payload: VaultPayloadV1
  includeSecrets?: boolean
  generatedAtIso?: string
  dutyOfCareApprovedAtIso?: string | null
}) {
  const includeSecrets = !!params.includeSecrets
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const mono = await doc.embedFont(StandardFonts.Courier)

  const pageSize: [number, number] = [612, 792]
  const margin = 48

  let page = doc.addPage(pageSize)
  let y = pageSize[1] - margin

  const ensureSpace = (minY: number) => {
    if (y >= minY) return
    page = doc.addPage(pageSize)
    y = pageSize[1] - margin
  }

  const draw = (text: string, opts?: { size?: number; mono?: boolean; color?: ReturnType<typeof rgb>; gap?: number }) => {
    const size = opts?.size ?? 12
    const useMono = !!opts?.mono
    const color = opts?.color ?? rgb(0.12, 0.16, 0.22)
    const gap = opts?.gap ?? 6
    ensureSpace(margin + 80)
    page.drawText(text, { x: margin, y, size, font: useMono ? mono : font, color })
    y -= size + gap
  }

  const drawWrapped = (
    text: string,
    opts?: { size?: number; mono?: boolean; color?: ReturnType<typeof rgb>; maxChars?: number }
  ) => {
    const size = opts?.size ?? 11
    const maxChars = opts?.maxChars ?? (opts?.mono ? 64 : 78)
    for (const line of wrapLine(text, maxChars)) draw(line, { size, mono: opts?.mono, color: opts?.color, gap: 4 })
  }

  const headerH = 70
  page.drawRectangle({ x: 0, y: pageSize[1] - headerH, width: pageSize[0], height: headerH, color: rgb(0.12, 0.24, 0.17) })
  page.drawText('Evernest', { x: margin, y: pageSize[1] - 42, size: 22, font, color: rgb(1, 1, 1) })
  page.drawText('Settlement Roadmap', { x: margin, y: pageSize[1] - 60, size: 12, font, color: rgb(1, 1, 1) })
  y = pageSize[1] - headerH - 24

  const generatedAt = params.generatedAtIso ?? new Date().toISOString()
  draw(`Vault ID: ${params.vaultId}`, { size: 11, mono: true })
  draw(`Generated: ${generatedAt}`, { size: 11, mono: true })
  if (params.dutyOfCareApprovedAtIso) draw(`Duty-of-care approval: ${params.dutyOfCareApprovedAtIso}`, { size: 11, mono: true })
  y -= 8

  draw('Letter of Wishes (Digital Executor)', { size: 14, color: rgb(0.12, 0.24, 0.17) })
  drawWrapped(
    `I, __________________________, designate __________________________ as my Digital Executor to manage my digital affairs and accounts referenced in this document, in accordance with applicable law and any relevant estate documents.`,
    { size: 11 }
  )
  drawWrapped(
    `This document is intended to reduce stress for loved ones and provide a clear roadmap for memorialization, account closure, and preservation of memories.`,
    { size: 11 }
  )
  y -= 10

  draw('Duty-of-Care Notice', { size: 14, color: rgb(0.12, 0.24, 0.17) })
  drawWrapped(
    `This Settlement Roadmap was generated from a vault decrypted locally in the heir’s browser after a proof-of-death verification workflow. Evernest does not provide legal advice and does not act as executor or probate attorney.`,
    { size: 11 }
  )
  y -= 14

  draw('Prioritized Action List', { size: 14, color: rgb(0.12, 0.24, 0.17) })
  drawWrapped('Start with Urgent items to stop charges and secure access. Then move through Financial, Business, and Sentimental sections.', {
    size: 11,
  })
  y -= 8

  const sections = classifySections(params.payload)
  for (const section of sections) {
    ensureSpace(margin + 140)
    draw(section.title, { size: 14, color: rgb(0.12, 0.24, 0.17) })
    if (section.subtitle) draw(section.subtitle, { size: 11, color: rgb(0.35, 0.42, 0.50) })
    y -= 2

    if (!section.items.length) {
      draw('No entries.', { size: 11, color: rgb(0.35, 0.42, 0.50) })
      y -= 10
      continue
    }

    for (const item of section.items) {
      ensureSpace(margin + 90)
      const label = (item.label ?? '').trim() || 'Untitled'
      const isNote = item.kind === 'note' || label.toLowerCase().includes('letter') || label.toLowerCase().includes('instruction')
      draw(`• ${label}`, { size: 12 })
      const rawValue = normalize(item.value ?? '')
      const value = isNote ? rawValue : includeSecrets ? rawValue : redactValue(rawValue)
      if (value.trim()) {
        drawWrapped(value, { size: 11, mono: !isNote, maxChars: !isNote ? 66 : 78, color: rgb(0.12, 0.16, 0.22) })
      } else {
        draw('(no details)', { size: 11, color: rgb(0.35, 0.42, 0.50) })
      }
      y -= 6
    }
    y -= 10
  }

  return doc.save()
}

