import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { buildScanSheetPdf, loadScanSheetSpec } from '../scanSheetPdf.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const SPEC_PATH = resolve(scriptDir, '../../../ocr_templates/scan-sheet-v1.json')

const A4_WIDTH_PT = 595.28
const A4_HEIGHT_PT = 841.89

describe('scan sheet PDF', () => {
  it('renders a valid A4 PDF', async () => {
    const spec = loadScanSheetSpec(SPEC_PATH)

    const bytes = await buildScanSheetPdf(spec)

    expect(bytes.byteLength).toBeGreaterThan(1000)
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
    const document = await PDFDocument.load(bytes)
    const [page] = document.getPages()
    expect(page.getWidth()).toBeCloseTo(A4_WIDTH_PT, 1)
    expect(page.getHeight()).toBeCloseTo(A4_HEIGHT_PT, 1)
  })

  it('renders deterministically', async () => {
    const spec = loadScanSheetSpec(SPEC_PATH)

    const first = await buildScanSheetPdf(spec)
    const second = await buildScanSheetPdf(spec)

    expect(first.byteLength).toBe(second.byteLength)
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true)
  })

  it('keeps every spec rect inside the page', () => {
    const spec = loadScanSheetSpec(SPEC_PATH)

    const rects = [
      ...spec.fiducials.map((fiducial) => fiducial.rect),
      ...spec.fields.map((field) => field.block),
      ...spec.fields.flatMap((field) => field.cells.map((cell) => cell.rect)),
    ]
    for (const [x, y, width, height] of rects) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x + width).toBeLessThanOrEqual(1.0001)
      expect(y + height).toBeLessThanOrEqual(1.0001)
    }
  })
})
