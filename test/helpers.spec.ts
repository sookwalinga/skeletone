import { expect, test, type Page } from '@playwright/test'
import { build, type Plugin } from 'esbuild'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
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

// Server-renders a React app that defines App, hydrates it, and returns any warnings or errors.
async function reactServerThenClient(page: Page, app: string) {
  const problems: string[] = []
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(m.text()))
  page.on('pageerror', (e) => problems.push(String(e)))
  const html = await serverRender(`${app}
    import { renderToString } from 'react-dom/server'
    export const html = renderToString(h(App))`)
  await page.setContent(`<!doctype html><style>body{font:16px/1.5 sans-serif;margin:0}</style><div id="root">${html}</div>`)
  await page.addStyleTag({ path: CSS })
  await page.addScriptTag({
    content: (await bundle(`${app}
      import { hydrateRoot } from 'react-dom/client'
      hydrateRoot(document.getElementById('root'), h(App))`)).code,
  })
  return problems
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

  test('react: <Skeleton label> announces loading from outside the inert element, only while loading', async ({ page }) => {
    const problems = await reactServerThenClient(
      page,
      `import { createElement as h, useState } from 'react'
       import { Skeleton } from 'skeletone/react'
       function App() {
         const [loading, setLoading] = useState(true)
         globalThis.setLoading = setLoading
         return h('main', null,
           h(Skeleton, { id: 's', loading, label: 'Loading articles', count: 2 }, h('p', { className: 'row' }, 'Placeholder')),
           h(Skeleton, { id: 'u', loading }, h('p', { className: 'row' })))
       }`,
    )
    const status = page.getByRole('status')
    await expect(status).toHaveCount(1)
    await expect(status).toHaveText('Loading articles')
    expect(await status.evaluate((el) => [el.className, el.closest('[inert]'), el.nextElementSibling!.id])).toEqual([
      'skeletone-status',
      null,
      's',
    ])
    expect(await page.locator('#root').ariaSnapshot()).toContain('- status: Loading articles')
    expect((await page.locator('#s .row').first().boundingBox())!.y).toBe(16)

    await page.evaluate(() => (window as any).setLoading(false))
    await expect(status).toHaveCount(0)
    await expect(page.locator('#s .row')).toHaveCount(1)
    expect(problems).toEqual([])
  })

  test('react: <Skeleton as> renders a table body, or a component with its own props', async ({ page }) => {
    const problems = await reactServerThenClient(
      page,
      `import { createElement as h, useState } from 'react'
       import { Skeleton } from 'skeletone/react'
       const TableBody = ({ sx, ...props }) => h('tbody', { ...props, 'data-sx': sx.color })
       function App() {
         const [loading, setLoading] = useState(true)
         globalThis.setLoading = setLoading
         const row = h('tr', null, h('td', null, h('span', { className: 'cell' })))
         return h('table', null,
           h(Skeleton, { as: 'tbody', id: 's', loading, count: 3 }, row),
           h(Skeleton, { as: TableBody, id: 'c', className: 'rows', sx: { color: 'red' }, loading, count: 2 }, row))
       }`,
    )
    await expect(page.locator('tbody')).toHaveCount(2)
    await expect(page.locator('tbody#s[data-skeleton][inert] > tr')).toHaveCount(3)
    await expect(page.locator('tbody#c.rows[data-sx="red"][data-skeleton][inert] > tr')).toHaveCount(2)
    const cell = (await page.locator('#c .cell').first().boundingBox())!
    expect([cell.width, cell.height]).toEqual([64, 24])

    await page.evaluate(() => (window as any).setLoading(false))
    await expect(page.locator('tbody > tr')).toHaveCount(2)
    expect(await page.locator('[data-skeleton], [inert]').count()).toBe(0)
    expect(problems).toEqual([])
  })

  test('react: <Skeleton label> next to a table body, row or list item is valid markup', async ({ page }) => {
    const problems = await reactServerThenClient(
      page,
      `import { createElement as h, useState } from 'react'
       import { Skeleton } from 'skeletone/react'
       const TableBody = (props) => h('tbody', props)
       function App() {
         const [loading, setLoading] = useState(true)
         globalThis.setLoading = setLoading
         const row = h('tr', { className: 'row' }, h('td', null, h('span', { className: 'cell' })))
         const head = h('thead', null, h('tr', null, h('th', null, 'Role')))
         return h('div', null,
           // Collapsed borders, as styled tables use: with the default 2px border-spacing,
           // the extra body adds one more 2px gap.
           h('table', { id: 'a', style: { borderCollapse: 'collapse' } }, head, h(Skeleton, { as: 'tbody', id: 's', loading, label: 'Loading roles', count: 3 }, row)),
           h('table', { id: 'n', style: { borderCollapse: 'collapse' } }, head, h(Skeleton, { as: 'tbody', id: 'ns', loading, count: 3 }, row)),
           h('table', { id: 'b' }, h(Skeleton, { as: TableBody, id: 'c', loading, label: 'Loading users', labelAs: 'tbody' }, row)),
           h('table', { id: 'r' }, h('tbody', null, h(Skeleton, { as: 'tr', id: 't', loading, label: 'Loading row' }, h('td')))),
           h('ul', { id: 'l' }, h(Skeleton, { as: 'li', loading, label: 'Loading item' }, 'Item')))
       }`,
    )
    const statuses = page.getByRole('status')
    await expect(statuses).toHaveText(['Loading roles', 'Loading users', 'Loading row', 'Loading item'])
    for (const id of ['#a', '#b']) {
      expect(await page.locator(id).evaluate((t) => [...t.children].map((c) => `${c.tagName} ${c.className}`.trim()))).toEqual(
        id === '#a' ? ['THEAD', 'TBODY skeletone-status-group', 'TBODY'] : ['TBODY skeletone-status-group', 'TBODY'],
      )
    }
    expect(await statuses.evaluateAll((els) => els.map((el) => [el.className, el.closest('[inert]')]))).toEqual(
      Array(4).fill(['skeletone-status', null]),
    )
    // The message takes no room: the rows sit as they do in the same table without one.
    const gap = async (table: string) => {
      const [head, row] = [await page.locator(`${table} thead`).boundingBox(), await page.locator(`${table} .row`).first().boundingBox()]
      return row!.y - head!.y
    }
    expect(await gap('#a')).toBe(await gap('#n'))
    expect(await page.locator('#l').evaluate((ul) => [...ul.children].map((c) => `${c.tagName} ${c.className}`.trim()))).toEqual([
      'LI skeletone-status-group',
      'LI',
    ])

    await page.evaluate(() => (window as any).setLoading(false))
    await expect(statuses).toHaveCount(0)
    expect(problems).toEqual([])
  })

  test('the CommonJS builds, for require() and Jest, match the ES modules', async () => {
    const req = createRequire(path.join(FIXTURE, 'index.js'))
    const { createElement: h } = req('react')
    const { renderToStaticMarkup } = req('react-dom/server')
    const load = async (entry: string) => {
      expect(req.resolve(`skeletone/${entry}`)).toBe(path.join(ROOT, `${entry}.cjs`))
      const [cjs, esm] = [req(`skeletone/${entry}`), await import(path.join(ROOT, `${entry}.mjs`))]
      expect(Object.keys(cjs).sort()).toEqual(Object.keys(esm).filter((k) => k !== 'default').sort())
      return [cjs, esm]
    }

    for (const m of await load('react')) {
      const all = [true, false].map((loading) => [
        m.skeleton(loading),
        renderToStaticMarkup(h(m.Skeleton, { as: 'ul', label: 'Loading', count: 2, loading, className: 'c' }, h('li'))),
      ])
      expect(all).toEqual([
        [{ 'data-skeleton': '', inert: true }, '<span role="status" class="skeletone-status">Loading</span><ul data-skeleton="" inert="" class="c"><li></li><li></li></ul>'],
        [{ 'data-skeleton': undefined, inert: undefined }, '<ul class="c"><li></li></ul>'],
      ])
    }
    const [vueCjs, vueEsm] = await load('vue')
    for (const value of [undefined, true, false, null]) {
      expect(vueCjs.vSkeleton.getSSRProps({ value })).toEqual(vueEsm.vSkeleton.getSSRProps({ value }))
      const [a, b] = [vueCjs, vueEsm].map((m) => {
        const el = { attrs: new Set<string>(), inert: false, toggleAttribute(n: string, on: boolean) { on ? this.attrs.add(n) : this.attrs.delete(n) } }
        m.vSkeleton.mounted(el, { value })
        return [[...el.attrs], el.inert]
      })
      expect(a).toEqual(b)
    }
    const [svelteCjs, svelteEsm] = await load('svelte')
    for (const loading of [undefined, true, false]) expect(svelteCjs.skeleton(loading)).toEqual(svelteEsm.skeleton(loading))
    const [textCjs, textEsm] = await load('text')
    for (const n of [0, 5, 40, 320]) expect(textCjs.text(n)).toBe(textEsm.text(n))
  })

  test('the CommonJS type definitions match the ES module ones', async () => {
    for (const entry of ['react', 'vue', 'svelte', 'text']) {
      const read = (ext: string) => fs.readFileSync(path.join(ROOT, `${entry}.${ext}`), 'utf8')
      expect(read('d.cts')).toBe(read('d.mts'))
    }
  })

  test('text() makes placeholder words that wrap like real text', async ({ page }) => {
    const { text } = await import(path.join(ROOT, 'text.mjs'))
    expect(text(40)).toMatch(/^x+( x+)+$/)
    expect(text(40).length).toBeGreaterThanOrEqual(38)
    expect(text(40).length).toBeLessThanOrEqual(40)
    expect(text(0)).toBe('')

    await page.setContent(`<style>body{font:16px/1.5 sans-serif;margin:0}.card{width:200px}.title,.about{margin:0}</style>
      <div class="card" data-skeleton inert><h3 class="title">${text(40)}</h3><p class="about">${text(320)}</p></div>`)
    await page.addStyleTag({ path: CSS })
    for (const [sel, lines] of [['.title', 2], ['.about', 8]] as const) {
      const [height, lineHeight, overflow] = await page
        .locator(sel)
        .evaluate((el) => [el.getBoundingClientRect().height, parseFloat(getComputedStyle(el).lineHeight), el.scrollWidth - el.clientWidth])
      expect(overflow).toBe(0)
      expect(height / lineHeight).toBeGreaterThanOrEqual(lines)
    }
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
    for (const [entry, name] of [['react', 'skeleton'], ['vue', 'vSkeleton'], ['svelte', 'skeleton'], ['text', 'text']]) {
      const { inputs } = await bundle(`import { ${name} } from 'skeletone/${entry}'; console.log(${name})`)
      expect(inputs.filter((f) => !f.includes('node_modules') && f !== '<stdin>')).toEqual([`${entry}.mjs`])
      const others = ['react', 'vue', 'svelte'].filter((f) => f !== entry)
      expect(inputs.filter((f) => others.some((o) => f.includes(`node_modules/${o}/`)))).toEqual([])
    }
  })

  for (const [name, alias] of [['react', undefined], ['react 18', REACT_18]] as const) {
    test(`${name}: <Skeleton> passes a ref on to its element`, async ({ page }) => {
      const problems: string[] = []
      page.on('console', (m) => ['error', 'warning'].includes(m.type()) && problems.push(m.text()))
      await page.setContent('<div id="root"></div>')
      const client = `
        import { createElement as h, createRef } from 'react'
        import { flushSync } from 'react-dom'
        import { createRoot } from 'react-dom/client'
        import { Skeleton } from 'skeletone/react'
        const ref = createRef()
        flushSync(() => createRoot(document.getElementById('root')).render(h(Skeleton, { as: 'ul', id: 's', ref })))
        globalThis.refId = ref.current && ref.current.id`
      await page.addScriptTag({ content: (await bundle(client, { alias })).code })
      expect(await page.evaluate(() => (window as any).refId)).toBe('s')
      expect(problems).toEqual([])
    })
  }

  test('text() gives no text for a negative length', async () => {
    const { text } = await import(path.join(ROOT, 'text.mjs'))
    expect(text(-7)).toBe('')
  })

  test('each helper ships within the 500 B gzipped budget, in both builds', () => {
    for (const entry of ['react', 'vue', 'svelte', 'text']) {
      for (const ext of ['mjs', 'cjs']) {
        expect(gzipSync(fs.readFileSync(path.join(ROOT, `${entry}.${ext}`))).length, `${entry}.${ext}`).toBeLessThanOrEqual(500)
      }
    }
  })
})
