// Builds the published files from src/: minified, so the comments cost no bytes, with each
// helper's CommonJS copy generated from its ES module. Playwright runs it before the tests,
// however they're started, so they always test what ships.
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')
const src = (file) => path.join(ROOT, 'src', file)

export default async function buildPackage() {
  await build({ entryPoints: [src('skeletone.css')], outdir: ROOT, minify: true, logLevel: 'warning' })

  for (const name of ['react', 'vue', 'svelte', 'text']) {
    const esm = (await build({ entryPoints: [src(`${name}.mjs`)], format: 'esm', minify: true, write: false, logLevel: 'warning' }))
      .outputFiles[0].text
    fs.writeFileSync(path.join(ROOT, `${name}.mjs`), esm)
    fs.writeFileSync(path.join(ROOT, `${name}.cjs`), commonJS(esm))
  }
}

if (import.meta.main) await buildPackage()

// A helper only imports named bindings from its framework and exports named bindings, so two
// rewrites make it CommonJS. esbuild's own CommonJS output adds about 250 B of interop code.
function commonJS(esm) {
  const cjs = esm
    .replace(/import\{([^}]*)\}from"([^"]+)";/g, (_, names, from) => `const{${names.replaceAll(' as ', ':')}}=require("${from}");`)
    .replace(/export\{([^}]*)\};\s*$/, (_, names) =>
      names.split(',').map((name) => {
        const [local, exported = local] = name.split(' as ')
        return `exports.${exported}=${local};`
      }).join('') + '\n')
  if (/\b(import|export)\b/.test(cjs)) throw new Error(`Can't convert to CommonJS:\n${esm}`)
  return `"use strict";${cjs}`
}
