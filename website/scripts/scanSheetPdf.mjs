// Renders the PalaySigla scan-card PDF from the shared template spec.
// The spec (ocr_templates/scan-sheet-v1.json) is the single source of truth:
// the backend loads the same file to find the card's corner markers and crop
// every digit cell, so print geometry and recognition geometry can never
// drift apart. Four A6 cards tile each A4 page; the farmer cuts one card per
// scan.
import { readFileSync } from 'node:fs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const PT_PER_MM = 72 / 25.4
const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z')

const CARD_BORDER_INSET_MM = 4
const CARD_BORDER_WIDTH_PT = 0.8
const BLOCK_BORDER_WIDTH_PT = 0.4
const CELL_BORDER_WIDTH_PT = 0.6
const TITLE_SIZE_PT = 12
const TITLE_TOP_MM = 17
const HINT_SIZE_PT = 7
const HINT_TOP_MM = 22.5
const LABEL_SIZE_PT = 8.5
const UNIT_SIZE_PT = 7
const LABEL_INSET_MM = 2
const LABEL_UNIT_GAP_MM = 2
const DECIMAL_SIZE_PT = 12
const DECIMAL_BASELINE_RATIO = 0.25
const CUT_LINE_WIDTH_PT = 0.5
const CUT_LINE_DASH = [4, 4]

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

  const sheetWidthPt = spec.sheet.width_mm * PT_PER_MM
  const sheetHeightPt = spec.sheet.height_mm * PT_PER_MM
  const cardWidthPt = spec.card.width_mm * PT_PER_MM
  const cardHeightPt = spec.card.height_mm * PT_PER_MM
  const page = document.addPage([sheetWidthPt, sheetHeightPt])
  const font = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)

  const toPdfRect = (originXmm, originYmm, [x, y, width, height]) => ({
    x: (originXmm + x * spec.card.width_mm) * PT_PER_MM,
    y: sheetHeightPt - (originYmm + (y + height) * spec.card.height_mm) * PT_PER_MM,
    width: width * cardWidthPt,
    height: height * cardHeightPt,
  })

  const centeredText = (text, originXmm, originYmm, topMm, size, textFont) => {
    const textWidth = textFont.widthOfTextAtSize(text, size)
    return {
      x: (originXmm + spec.card.width_mm / 2) * PT_PER_MM - textWidth / 2,
      y: sheetHeightPt - (originYmm + topMm) * PT_PER_MM,
      size,
      font: textFont,
    }
  }

  for (let row = 0; row < spec.sheet.rows; row += 1) {
    for (let column = 0; column < spec.sheet.columns; column += 1) {
      const originXmm = column * spec.card.width_mm
      const originYmm = row * spec.card.height_mm

      page.drawRectangle({
        ...toPdfRect(originXmm, originYmm, [
          CARD_BORDER_INSET_MM / spec.card.width_mm,
          CARD_BORDER_INSET_MM / spec.card.height_mm,
          (spec.card.width_mm - 2 * CARD_BORDER_INSET_MM) / spec.card.width_mm,
          (spec.card.height_mm - 2 * CARD_BORDER_INSET_MM) / spec.card.height_mm,
        ]),
        borderColor: BLACK,
        borderWidth: CARD_BORDER_WIDTH_PT,
      })

      // Centered between the top markers so the anchor can never sit on the
      // title (the original full-page layout put the title under it).
      page.drawText(spec.title, {
        ...centeredText(spec.title, originXmm, originYmm, TITLE_TOP_MM, TITLE_SIZE_PT, bold),
        color: BLACK,
      })
      const hint = spec.instructions[0]
      if (hint) {
        page.drawText(hint, {
          ...centeredText(hint, originXmm, originYmm, HINT_TOP_MM, HINT_SIZE_PT, font),
          color: MUTE,
        })
      }

      for (const fiducial of spec.fiducials) {
        page.drawRectangle({
          ...toPdfRect(originXmm, originYmm, fiducial.rect),
          color: BLACK,
        })
      }

      for (const field of spec.fields) {
        const block = toPdfRect(originXmm, originYmm, field.block)
        page.drawRectangle({
          ...block,
          borderColor: HAIRLINE,
          borderWidth: BLOCK_BORDER_WIDTH_PT,
        })
        const labelY = block.y + block.height / 2 - LABEL_SIZE_PT * 0.35
        page.drawText(field.label, {
          x: block.x + LABEL_INSET_MM * PT_PER_MM,
          y: labelY,
          size: LABEL_SIZE_PT,
          font: bold,
          color: BLACK,
        })
        if (field.unit) {
          const labelWidth = bold.widthOfTextAtSize(field.label, LABEL_SIZE_PT)
          page.drawText(field.unit, {
            x: block.x + LABEL_INSET_MM * PT_PER_MM + labelWidth + LABEL_UNIT_GAP_MM * PT_PER_MM,
            y: labelY,
            size: UNIT_SIZE_PT,
            font,
            color: MUTE,
          })
        }
        for (const cell of field.cells) {
          const rect = toPdfRect(originXmm, originYmm, cell.rect)
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
    }
  }

  for (let column = 1; column < spec.sheet.columns; column += 1) {
    const x = column * cardWidthPt
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: sheetHeightPt },
      thickness: CUT_LINE_WIDTH_PT,
      color: HAIRLINE,
      dashArray: CUT_LINE_DASH,
    })
  }
  for (let row = 1; row < spec.sheet.rows; row += 1) {
    const y = sheetHeightPt - row * cardHeightPt
    page.drawLine({
      start: { x: 0, y },
      end: { x: sheetWidthPt, y },
      thickness: CUT_LINE_WIDTH_PT,
      color: HAIRLINE,
      dashArray: CUT_LINE_DASH,
    })
  }

  return document.save()
}
