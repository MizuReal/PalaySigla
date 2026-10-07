// Renders the PalaySigla scan sheet PDF from the shared template spec.
// The spec (ocr_templates/scan-sheet-v1.json) is the single source of truth:
// the backend loads the same file to crop every digit cell, so print geometry
// and recognition geometry can never drift apart.
import { readFileSync } from 'node:fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const PT_PER_MM = 72 / 25.4
const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z')

const PAGE_BORDER_MARGIN_MM = 8
const PAGE_BORDER_WIDTH_PT = 0.8
const BLOCK_BORDER_WIDTH_PT = 0.5
const CELL_BORDER_WIDTH_PT = 0.7
const TITLE_SIZE_PT = 20
const TITLE_LEFT_MM = 20
const TITLE_TOP_MM = 18
const INSTRUCTION_SIZE_PT = 9.5
const INSTRUCTION_TOP_MM = 30
const INSTRUCTION_LINE_MM = 5.5
const LABEL_SIZE_PT = 11
const UNIT_SIZE_PT = 9
const LABEL_INSET_MM = 3
const LABEL_TOP_INSET_MM = 7
const DECIMAL_SIZE_PT = 16
const DECIMAL_BASELINE_RATIO = 0.2

const BLACK = rgb(0, 0, 0)
const HAIRLINE = rgb(0.8, 0.8, 0.8)
const MUTE = rgb(0.45, 0.45, 0.45)

export function loadScanSheetSpec(specPath) {
  return JSON.parse(readFileSync(specPath, 'utf8'))
}

export async function buildScanSheetPdf(spec) {
  const document = await PDFDocument.create()
  document.setTitle(spec.title)
  document.setProducer('PalaySigla scan-sheet generator')
  document.setCreationDate(FIXED_DATE)
  document.setModificationDate(FIXED_DATE)

  const pageWidth = spec.page.width_mm * PT_PER_MM
  const pageHeight = spec.page.height_mm * PT_PER_MM
  const page = document.addPage([pageWidth, pageHeight])
  const font = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)

  const toPdfRect = ([x, y, width, height]) => ({
    x: x * pageWidth,
    y: pageHeight - (y + height) * pageHeight,
    width: width * pageWidth,
    height: height * pageHeight,
  })

  page.drawRectangle({
    x: PAGE_BORDER_MARGIN_MM * PT_PER_MM,
    y: PAGE_BORDER_MARGIN_MM * PT_PER_MM,
    width: pageWidth - 2 * PAGE_BORDER_MARGIN_MM * PT_PER_MM,
    height: pageHeight - 2 * PAGE_BORDER_MARGIN_MM * PT_PER_MM,
    borderColor: BLACK,
    borderWidth: PAGE_BORDER_WIDTH_PT,
  })

  page.drawText(spec.title, {
    x: TITLE_LEFT_MM * PT_PER_MM,
    y: pageHeight - TITLE_TOP_MM * PT_PER_MM,
    size: TITLE_SIZE_PT,
    font: bold,
    color: BLACK,
  })

  spec.instructions.forEach((line, index) => {
    page.drawText(line, {
      x: TITLE_LEFT_MM * PT_PER_MM,
      y:
        pageHeight -
        (INSTRUCTION_TOP_MM + index * INSTRUCTION_LINE_MM) * PT_PER_MM,
      size: INSTRUCTION_SIZE_PT,
      font,
      color: MUTE,
    })
  })

  for (const fiducial of spec.fiducials) {
    page.drawRectangle({ ...toPdfRect(fiducial.rect), color: BLACK })
  }

  for (const field of spec.fields) {
    const block = toPdfRect(field.block)
    page.drawRectangle({
      ...block,
      borderColor: HAIRLINE,
      borderWidth: BLOCK_BORDER_WIDTH_PT,
    })
    const labelY = block.y + block.height - LABEL_TOP_INSET_MM * PT_PER_MM
    page.drawText(field.label, {
      x: block.x + LABEL_INSET_MM * PT_PER_MM,
      y: labelY,
      size: LABEL_SIZE_PT,
      font: bold,
      color: BLACK,
    })
    if (field.unit) {
      const unitWidth = font.widthOfTextAtSize(field.unit, UNIT_SIZE_PT)
      page.drawText(field.unit, {
        x: block.x + block.width - unitWidth - LABEL_INSET_MM * PT_PER_MM,
        y: labelY,
        size: UNIT_SIZE_PT,
        font,
        color: MUTE,
      })
    }
    for (const cell of field.cells) {
      const rect = toPdfRect(cell.rect)
      page.drawRectangle({
        ...rect,
        borderColor: BLACK,
        borderWidth: CELL_BORDER_WIDTH_PT,
      })
      if (cell.kind === 'decimal') {
        const dotWidth = bold.widthOfTextAtSize('.', DECIMAL_SIZE_PT)
        page.drawText('.', {
          x: rect.x + (rect.width - dotWidth) / 2,
          y: rect.y + rect.height * DECIMAL_BASELINE_RATIO,
          size: DECIMAL_SIZE_PT,
          font: bold,
          color: BLACK,
        })
      }
    }
  }

  return document.save()
}
