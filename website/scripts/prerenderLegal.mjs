// Renders /privacy and /terms to static HTML after the Vite build. Google's
// OAuth brand review reads the public policy URL without running our SPA, so
// the deployed pages must contain the policy text in the initial response.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { build } from 'vite'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const websiteDir = resolve(scriptDir, '..')
const distDir = resolve(websiteDir, 'dist')
const ssrDir = resolve(websiteDir, 'dist-ssr')

const PAGES = [
  {
    fileName: 'privacy.html',
    title: 'Privacy Policy — PalaySigla',
    description:
      'How PalaySigla collects, uses, stores, and shares personal information, including its limited use of the Gmail API.',
    render: 'renderPrivacyPage',
  },
  {
    fileName: 'terms.html',
    title: 'Terms of Service — PalaySigla',
    description: 'The terms that govern use of the PalaySigla service.',
    render: 'renderTermsPage',
  },
]

await build({
  configFile: false,
  root: websiteDir,
  plugins: [react()],
  build: {
    ssr: resolve(websiteDir, 'src/legalEntry.tsx'),
    outDir: ssrDir,
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: 'legalEntry.mjs' },
    },
  },
})

const entry = await import(
  pathToFileURL(resolve(ssrDir, 'legalEntry.mjs')).href
)
const indexHtml = readFileSync(resolve(distDir, 'index.html'), 'utf8')
const stylesheetLinks = [...indexHtml.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
  .map((match) => match[0])
  .join('\n    ')

if (!stylesheetLinks) {
  throw new Error('No stylesheet link found in the built index.html')
}

function renderShell({ title, description, body }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${description}" />
    <title>${title}</title>
    ${stylesheetLinks}
  </head>
  <body>
    <div id="root">${body}</div>
  </body>
</html>
`
}

for (const page of PAGES) {
  const render = entry[page.render]
  if (typeof render !== 'function') {
    throw new Error(`Missing renderer for ${page.fileName}`)
  }
  const outputPath = resolve(distDir, page.fileName)
  writeFileSync(
    outputPath,
    renderShell({
      title: page.title,
      description: page.description,
      body: render(),
    })
  )
  console.log(`[prerenderLegal] wrote ${outputPath}`)
}
