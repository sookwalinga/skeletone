import { expect, test, type Page } from '@playwright/test'
import { build, type Plugin } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { compile } from 'svelte/compiler'

const ROOT = path.join(__dirname, '..')
const CSS = path.join(ROOT, 'skeletone.css')
// node_modules/skeletone here links to this repo, so fixtures import the package through
// its exports map, the way users do.
const FIXTURE = path.join(ROOT, 'test-results', 'helpers-fixture')

test.beforeAll(() => {
  fs.mkdirSync(path.join(FIXTURE, 'node_modules'), { recursive: true })
  try {
    fs.symlinkSync(ROOT, path.join(FIXTURE, 'node_modules', 'skeletone'), 'dir')
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
  }
  fs.writeFileSync(path.join(FIXTURE, 'App.svelte'), SVELTE_APP)
})

const svelte = (generate: 'client' | 'server'): Plugin => ({
  name: 'svelte',
  setup: (b) =>
    b.onLoad({ filter: /\.svelte$/ }, (args) => ({
      contents: compile(fs.readFileSync(args.path, 'utf8'), { generate, dev: true, filename: args.path }).js.code,
      loader: 'js',
      resolveDir: path.dirname(args.path),
    })),
})

let builds = 0
async function bundle(code: string, { node = false, alias = {} as Record<string, string> } = {}) {
  const result = await build({
    stdin: { contents: code, resolveDir: FIXTURE, loader: 'js' },
    bundle: true,
    write: false,
    metafile: true,
    logLevel: 'silent',
    platform: node ? 'node' : 'browser',
    format: node ? 'cjs' : 'iife',
    alias,
    // Dev builds, so frameworks report hydration mismatches and attribute warnings.
    conditions: ['development'],
    define: {
      'process.env.NODE_ENV': '"development"',
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    plugins: [svelte(node ? 'server' : 'client')],
  })
  return { code: result.outputFiles[0].text, inputs: Object.keys(result.metafile.inputs) }
}

// Renders on the server side (Node), the way a framework's SSR does.
async function serverRender(code: string, alias?: Record<string, string>): Promise<string> {
  const file = path.join(FIXTURE, `ssr-${process.pid}-${builds++}.cjs`)
  fs.writeFileSync(file, (await bundle(code, { node: true, alias })).code)
  return await require(file).html
}

// Mounts the server HTML, checks it, hydrates it in the browser, then switches loading off.
async function serverThenClient(page: Page, server: string, client: string, alias?: Record<string, string>) {
  const problems: string[] = []
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(m.text()))
  page.on('pageerror', (e) => problems.push(String(e)))

  await page.setContent(`<style>body{font:16px/1.5 sans-serif;margin:0}</style>
    <div id="root">${await serverRender(server, alias)}</div>`)
  await page.addStyleTag({ path: CSS })
  await expectSkeleton(page, true)

  await page.addScriptTag({ content: (await bundle(client, { alias })).code })
  await expectSkeleton(page, true)
  await page.evaluate(() => (window as any).setLoading(false))
  await expectSkeleton(page, false)
  expect(problems).toEqual([])
}

async function expectSkeleton(page: Page, on: boolean) {
  await expect
    .poll(() => page.locator('#s').evaluate((el) => [el.hasAttribute('data-skeleton'), el.inert]))
    .toEqual([on, on])
  expect((await page.locator('#h').boundingBox())!.height).toBe(on ? 24 : 0)
}

const REACT_APP = `
  import { createElement as h, useState } from 'react'
  import { skeleton } from 'skeletone/react'
  function App() {
    const [loading, setLoading] = useState(true)
    globalThis.setLoading = setLoading
    return h('div', { id: 's', ...skeleton(loading) }, h('p', { id: 'h' }))
  }`
const REACT_SERVER = `${REACT_APP}
  import { renderToString } from 'react-dom/server'
  export const html = renderToString(h(App))`
const REACT_CLIENT = `${REACT_APP}
  import { hydrateRoot } from 'react-dom/client'
  hydrateRoot(document.getElementById('root'), h(App))`
const REACT_18 = { react: 'react-18', 'react-dom': 'react-dom-18' }

// v-skeleton with no value is on, so loading starts out undefined.
const VUE_APP = `
  import { createSSRApp, h, ref, withDirectives } from 'vue'
  import { vSkeleton } from 'skeletone/vue'
  const loading = ref(undefined)
  globalThis.setLoading = (v) => { loading.value = v }
  const app = createSSRApp({
    render: () => withDirectives(h('div', { id: 's' }, [h('p', { id: 'h' })]), [[vSkeleton, loading.value]]),
  })`

const SVELTE_APP = `<script>
  import { skeleton } from 'skeletone/svelte'
  let loading = $state(true)
  export function setLoading(v) { loading = v }
</script>
<div id="s" {...skeleton(loading)}><p id="h"></p></div>
`

test.describe('framework helpers', () => {
  test('react: skeleton() renders on the server, hydrates cleanly and switches off', async ({ page }) => {
    await serverThenClient(page, REACT_SERVER, REACT_CLIENT)
  })

  test('react 18: skeleton() renders inert without warnings', async ({ page }) => {
    await serverThenClient(page, REACT_SERVER, REACT_CLIENT, REACT_18)
  })

  test('react: <Skeleton count> repeats its children only while loading', async ({ page }) => {
    await page.setContent('<style>body{font:16px/1.5 sans-serif;margin:0}</style><div id="root"></div>')
    await page.addStyleTag({ path: CSS })
    const client = `
      import { createElement as h, useState } from 'react'
      import { createRoot } from 'react-dom/client'
      import { Skeleton } from 'skeletone/react'
      function App() {
        const [loading, setLoading] = useState(true)
        globalThis.setLoading = setLoading
        return h(Skeleton, { id: 's', loading, count: 3 }, h('p', { className: 'row' }))
      }
      createRoot(document.getElementById('root')).render(h(App))`
    await page.addScriptTag({ content: (await bundle(client)).code })
    await expect(page.locator('#s .row')).toHaveCount(3)
    expect((await page.locator('#s .row').first().boundingBox())!.height).toBe(24)
    expect(await page.locator('#s').evaluate((el) => el.inert)).toBe(true)

    await page.evaluate(() => (window as any).setLoading(false))
    await expect(page.locator('#s .row')).toHaveCount(1)
    expect(await page.locator('#s').evaluate((el) => [el.hasAttribute('data-skeleton'), el.inert])).toEqual([false, false])
  })

  test('vue: v-skeleton renders on the server, hydrates cleanly and switches off', async ({ page }) => {
    await serverThenClient(
      page,
      `${VUE_APP}\nimport { renderToString } from 'vue/server-renderer'\nexport const html = renderToString(app)`,
      `${VUE_APP}\napp.mount('#root')`,
    )
  })

  test('svelte: skeleton() renders on the server, hydrates cleanly and switches off', async ({ page }) => {
    await serverThenClient(
      page,
      `import { render } from 'svelte/server'\nimport App from './App.svelte'\nexport const html = render(App).body`,
      `import { hydrate, flushSync } from 'svelte'
       import App from './App.svelte'
       const app = hydrate(App, { target: document.getElementById('root') })
       globalThis.setLoading = (v) => { app.setLoading(v); flushSync() }`,
    )
  })

  test('each helper bundles alone, without the other helpers or the CSS', async () => {
    for (const [entry, name] of [['react', 'skeleton'], ['vue', 'vSkeleton'], ['svelte', 'skeleton']]) {
      const { inputs } = await bundle(`import { ${name} } from 'skeletone/${entry}'; console.log(${name})`)
      expect(inputs.filter((f) => !f.includes('node_modules') && f !== '<stdin>')).toEqual([`${entry}.mjs`])
      const others = ['react', 'vue', 'svelte'].filter((f) => f !== entry)
      expect(inputs.filter((f) => others.some((o) => f.includes(`node_modules/${o}/`)))).toEqual([])
    }
  })
})
