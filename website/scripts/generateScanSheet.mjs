// Generates website/public/palaysigla-scan-sheet.pdf from the shared spec.
// Wired to `predev` and `prebuild` so the downloadable sheet always matches
// the geometry the backend crops against.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildScanSheetPdf, loadScanSheetSpec } from './scanSheetPdf.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const specPath = resolve(scriptDir, '../../ocr_templates/scan-sheet-v1.json')
const outputPath = resolve(scriptDir, '../public/palaysigla-scan-sheet.pdf')

const spec = loadScanSheetSpec(specPath)
const bytes = await buildScanSheetPdf(spec)
mkdirSync(dirname(outputPath), { recursive: true })
writeFileSync(outputPath, bytes)
console.log(`[scanSheet] wrote ${outputPath} (${bytes.byteLength} bytes)`)
