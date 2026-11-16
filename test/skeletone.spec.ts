import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const CSS = path.join(__dirname, '..', 'skeletone.css')

async function mount(page: Page, html: string, css = '') {
  await page.setContent(`<style>body{font:16px/1.5 sans-serif;margin:0}${css}</style>${html}`)
  await page.addStyleTag({ path: CSS })
}

const style = (page: Page, sel: string, prop: string) =>
  page.locator(sel).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)
const box = async (page: Page, sel: string) => (await page.locator(sel).boundingBox())!

// Counts the pixels where two same-sized screenshots differ by more than antialiasing does
// (Chromium shades an image's rounded edge a level off a div's). A bar is a 13% tint, about
// 33 levels from the background, so a wrong shape still counts.
const differentPixels = (page: Page, a: Buffer, b: Buffer) =>
  page.evaluate(async (pngs) => {
    const [x, y] = await Promise.all(pngs.map(async (png) => {
      const img = new Image()
      img.src = `data:image/png;base64,${png}`
      await img.decode()
      const ctx = new OffscreenCanvas(img.width, img.height).getContext('2d')!
      ctx.drawImage(img, 0, 0)
      return ctx.getImageData(0, 0, img.width, img.height).data
    }))
    let count = 0
    for (let i = 0; i < x.length; i += 4) {
      if ([0, 1, 2, 3].some((c) => Math.abs(x[i + c] - y[i + c]) > 8)) count++
    }
    return x.length === y.length ? count : -1
  }, [a.toString('base64'), b.toString('base64')])

// Three line bars, the last one shorter, drawn without the library. At 20px/1.5 every bar
// edge falls on a whole pixel.
const LINES_REF = '<div id="ref" class="big"><i></i><i></i><i></i></div>'
const LINES_CSS =
  '.big{width:300px;margin:0;padding:0;font-size:20px}#ref{display:grid;gap:12px;box-sizing:border-box;height:90px;padding:6px 0}' +
  '#ref i{background:rgb(0 0 0/.13)}#ref i:last-child{width:60%}'

test.describe('skeletone', () => {
  test('gives an empty heading a visible bar 40% of the container wide', async ({ page }) => {
    await mount(page, '<div data-skeleton style="width:400px"><h3 id="t"></h3></div>')
    expect((await box(page, '#t')).height).toBeGreaterThan(20)
    expect(await style(page, '#t', 'background-image')).toContain('gradient')
    expect(await style(page, '#t', 'background-size')).toMatch(/^40% /)
  })

  test('draws empty-text bars 0.6 of a line thick', async ({ page }) => {
    await mount(page, '<div data-skeleton><p id="p"></p></div>')
    expect(await style(page, '#p', 'background-size')).toBe('100% 14.4px')
  })

  test('does nothing without the attribute or with data-skeleton="false"', async ({ page }) => {
    await mount(page, '<div><h3 id="a"></h3></div><div data-skeleton="false"><h3 id="b"></h3></div>')
    expect((await box(page, '#a')).height).toBe(0)
    expect((await box(page, '#b')).height).toBe(0)
  })

  test('hides existing text but keeps its layout', async ({ page }) => {
    const html = '<div data-skeleton><p id="p" style="color:red">Hello there</p></div>'
    await mount(page, html)
    expect(await style(page, '#p', '-webkit-text-fill-color')).toBe('rgba(0, 0, 0, 0)')
    expect((await box(page, '#p')).height).toBe(24)
  })

  test('gives empty inline text a width so it shows up', async ({ page }) => {
    await mount(page, '<div data-skeleton><span id="s"></span></div>')
    expect((await box(page, '#s')).width).toBe(64)
  })

  test('draws three line bars for a bare data-skeleton-lines, the last one shorter', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mount(
      page,
      `<div data-skeleton><p id="p" data-skeleton-lines></p><p id="big" class="big" data-skeleton-lines></p></div>${LINES_REF}`,
      LINES_CSS,
    )
    expect((await box(page, '#p')).height).toBe(72)
    expect(await differentPixels(page, await page.locator('#big').screenshot(), await page.locator('#ref').screenshot())).toBe(0)
  })

  test('takes the line count from --skeleton-lines on a data-skeleton-lines element', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton><p id="a" class="long" data-skeleton-lines></p><p id="b" class="long"></p></div>',
      '.long{--skeleton-lines: 11}',
    )
    expect((await box(page, '#a')).height).toBe(264)
    expect((await box(page, '#b')).height).toBe(24)
  })

  test('draws an empty list as rows, so a list mapped from no data still shows', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mount(
      page,
      `<div data-skeleton><ul id="u" class="list"></ul><ol id="o" class="list long"></ol><ul id="big" class="big"></ul></div>${LINES_REF}`,
      `.list{margin:0;padding:0}.long{--skeleton-lines: 5}${LINES_CSS}`,
    )
    expect((await box(page, '#u')).height).toBe(72)
    expect(await differentPixels(page, await page.locator('#big').screenshot(), await page.locator('#ref').screenshot())).toBe(0)
    expect((await box(page, '#o')).height).toBe(120)
  })

  test('draws text that is present as line bars that follow the real text', async ({ page }) => {
    await mount(page, '<div data-skeleton><p id="p" class="bio">Placeholder bio text</p></div>', '.bio{background:blue}')
    expect(await style(page, '#p', 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#p', 'text-decoration-line')).toBe('line-through')
    expect(await style(page, '#p', 'text-decoration-thickness')).toBe('14.4px')
  })

  test('draws text in a div as line bars, but an empty div as a block', async ({ page }) => {
    await mount(
      page,
      `<div data-skeleton class="list"><div id="t" class="name">Plain text</div><div id="a" class="avatar"></div>
         <div id="b" class="chip" data-skeleton-block>New</div></div>
       <div id="r" data-skeleton class="name">Root text</div>`,
      '.list{width:600px}.name{background:blue}.avatar{width:40px;height:40px;border-radius:50%}.chip{display:inline-block}',
    )
    for (const id of ['#t', '#r']) {
      expect(await style(page, id, 'background-color')).toBe('rgba(0, 0, 0, 0)')
      expect(await style(page, id, 'text-decoration-line')).toBe('line-through')
    }
    for (const id of ['#a', '#b']) expect(await style(page, id, 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
    expect(await box(page, '#a')).toMatchObject({ width: 40, height: 40 })
  })

  test("keeps a text block's own border, such as a table row's, but not a badge's", async ({ page }) => {
    await mount(
      page,
      `<table data-skeleton class="t"><tr><td id="a" class="cell">Admin</td><td id="b" class="cell"></td>
         <td class="cell"><span id="c" class="badge">Org</span></td></tr></table>`,
      '.t{border-collapse:collapse}.cell{border-bottom:1px solid rgb(221, 221, 221)}.badge{border:1px solid rgb(0, 0, 255)}',
    )
    for (const id of ['#a', '#b']) expect(await style(page, id, 'border-bottom-color')).toBe('rgb(221, 221, 221)')
    expect(await style(page, '#c', 'border-top-color')).toBe('rgba(0, 0, 0, 0)')
  })

  test('draws empty-text bars inside the padding, so bars in neighbouring cells stay apart', async ({ page }) => {
    await mount(
      page,
      `<table data-skeleton class="t"><tr><td id="a" class="cell"></td><td class="cell"></td></tr></table>
       <div data-skeleton><p id="p" class="pad"></p></div>`,
      '.t{width:400px;border-collapse:collapse}.cell{width:50%;padding:8px 12px}*{box-sizing:border-box}.pad{padding:8px}',
    )
    expect(await style(page, '#a', 'background-origin')).toBe('content-box')
    // A border-box reset can leave a padded element less than a line of content height.
    // The bar isn't clipped to it.
    expect(await style(page, '#p', 'background-clip')).toBe('border-box')
    expect((await box(page, '#p')).height).toBe(24)
  })

  test('sets the bar width of empty text with --skeleton-width', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton style="width:400px"><h3 id="h" class="w"></h3><p id="p" class="w"></p><span id="s" class="w"></span></div>',
      '.w{--skeleton-width: 30%}',
    )
    expect(await style(page, '#h', 'background-size')).toMatch(/^30% /)
    expect(await style(page, '#p', 'background-size')).toMatch(/^30% /)
    expect((await box(page, '#s')).width).toBe(120)
  })

  test('leaves a data-skeleton-ignore section as it is', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton><header class="bar" data-skeleton-ignore><a id="a" class="back" href="#">Back</a><h3 id="h"></h3></header></div>',
      '.back{color:rgb(255, 0, 0)}',
    )
    expect(await style(page, '#a', 'color')).toBe('rgb(255, 0, 0)')
    expect(await style(page, '#a', '-webkit-text-fill-color')).toBe('rgb(255, 0, 0)')
    expect(await style(page, '#a', 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#a', 'text-decoration-line')).toBe('underline')
    expect(await style(page, '#a', 'pointer-events')).toBe('auto')
    expect(await style(page, '#h', 'background-image')).toBe('none')
  })

  test("lets an ignored link or button keep its own cursor and selection", async ({ page }) => {
    await mount(
      page,
      `<div data-skeleton><a id="a" href="#" data-skeleton-ignore>Back</a>
        <button id="b" class="btn" data-skeleton-ignore>Retry</button><p id="p" data-skeleton-ignore>Note</p></div>`,
      '.btn{cursor:pointer;user-select:none}',
    )
    expect(await style(page, '#a', 'cursor')).toBe('pointer')
    expect(await style(page, '#b', 'cursor')).toBe('pointer')
    expect(await style(page, '#b', 'user-select')).toBe('none')
    expect(await style(page, '#p', 'cursor')).toBe('auto')
    expect(await style(page, '#p', 'user-select')).toBe('text')
    expect(await style(page, '#p', 'pointer-events')).toBe('auto')
  })

  test('fills sized shapes such as an avatar without changing their size', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton><img id="i" class="avatar" alt=""></div>',
      '.avatar{width:40px;height:40px;border-radius:50%}',
    )
    expect(await box(page, '#i')).toMatchObject({ width: 40, height: 40 })
    expect(await style(page, '#i', 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#i', 'border-radius')).toBe('50%')
  })

  test("keeps a component's own min-height, such as a touch-target button", async ({ page }) => {
    await mount(page, '<div data-skeleton><button id="b" class="btn">Save</button></div>', '.btn{min-height:44px}')
    expect((await box(page, '#b')).height).toBe(44)
  })

  test("doesn't stretch icons, images or controls to their line height", async ({ page }) => {
    const sized = ['svg', 'img', 'video', 'canvas', 'iframe', 'input', 'select', 'textarea']
    await mount(
      page,
      `<div data-skeleton class="row">${sized.map((t) => `<${t} class="icon" id="${t}"></${t}>`).join('')}
        <div id="b" class="icon" data-skeleton-block><svg></svg></div><span id="e"></span></div>`,
      '.row{line-height:46px}.icon{display:inline-block;box-sizing:border-box;width:24px;height:24px}',
    )
    for (const t of [...sized, 'b']) expect((await box(page, `#${t}`)).height, t).toBe(24)
    expect((await box(page, '#e')).height).toBe(46)
  })

  test('leaves a rule line its own height', async ({ page }) => {
    await mount(page, '<div data-skeleton><hr id="r" class="rule"></div>', '.rule{height:0;border:0;border-top:1px solid}')
    expect((await box(page, '#r')).height).toBe(1)
  })

  test('greys an icon as one block and hides its paths', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton><svg id="s" width="24" height="24"><path id="p" d="M0 0h24v24z"/></svg></div>',
    )
    expect(await style(page, '#s', 'background-color')).not.toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#p', 'visibility')).toBe('hidden')
  })

  test('takes the bar colour from the container text colour', async ({ page }) => {
    await mount(page, '<div data-skeleton style="color:rgb(255,255,255)"><img id="a" alt="" style="color:blue;width:10px;height:10px"></div>')
    expect(await style(page, '#a', 'background-color')).toMatch(/255, 255, 255|^color\(srgb 1 1 1/)
  })

  test('lets --skeleton-color override the tint', async ({ page }) => {
    await mount(page, '<div data-skeleton style="--skeleton-color: rgb(1, 2, 3)"><img id="i" alt=""></div>')
    expect(await style(page, '#i', 'background-color')).toBe('rgb(1, 2, 3)')
  })

  test('lets --skeleton-color on a dark section inside the skeleton tint only its bars', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton><div class="panel"><img id="in" alt=""><span id="t">Hi</span></div><img id="out" alt=""></div>',
      '.panel{background:#111;color:#fff;--skeleton-color:rgb(1, 2, 3)}',
    )
    expect(await style(page, '#in', 'background-color')).toBe('rgb(1, 2, 3)')
    expect(await style(page, '#t', 'text-decoration-color')).toBe('rgb(1, 2, 3)')
    expect(await style(page, '#out', 'background-color')).not.toBe('rgb(1, 2, 3)')
  })

  test('beats ordinary component class styles', async ({ page }) => {
    await mount(page, '<div data-skeleton><span id="t" class="tag"></span></div>', '.tag{background:blue}')
    expect(await style(page, '#t', 'background-image')).toContain('gradient')
  })

  test('blocks clicks while loading', async ({ page }) => {
    await mount(page, '<div data-skeleton><button id="b">Go</button></div>')
    expect(await style(page, '[data-skeleton]', 'pointer-events')).toBe('none')
  })

  test('shows bars at once, with only the pulse, so nested loaders never blink', async ({ page }) => {
    await mount(page, '<div data-skeleton><h3 id="t"></h3><p id="p">Placeholder</p></div>')
    for (const sel of ['#t', '#p']) {
      expect(await style(page, sel, 'animation-name')).toBe('skeletone-pulse')
      const opacity = await page.locator(sel).evaluate((el) => {
        for (const a of el.getAnimations()) {
          a.pause()
          a.currentTime = 0
        }
        return getComputedStyle(el).opacity
      })
      expect(opacity).toBe('1')
    }
  })

  test('.skeletone-status hides a loading message on screen but not from screen readers', async ({ page }) => {
    await mount(
      page,
      `<span role="status" class="skeletone-status">Loading articles</span>
       <div data-skeleton inert><h3 id="t" class="title">Placeholder title</h3></div>`,
      '.title{margin:0}',
    )
    const status = await box(page, '.skeletone-status')
    expect([status.width, status.height]).toEqual([1, 1])
    expect((await box(page, '#t')).y).toBe(0)
    expect(await page.locator('body').ariaSnapshot()).toContain('- status: Loading articles')
  })

  test('draws the data-skeleton element itself when it holds no elements', async ({ page }) => {
    await mount(
      page,
      `<p id="p" data-skeleton class="c">12 of 40 users</p><h3 id="h" data-skeleton></h3>
       <p id="off" data-skeleton="false">Shown</p>`,
      '.c{color:rgb(0, 0, 255)}',
    )
    expect(await style(page, '#p', '-webkit-text-fill-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#p', 'text-decoration-line')).toBe('line-through')
    // The bar is a tint of the element's own colour, which it keeps.
    expect(await style(page, '#p', 'color')).toBe('rgb(0, 0, 255)')
    expect(await style(page, '#p', 'text-decoration-color')).toBe('color(srgb 0 0 1 / 0.13)')
    expect(await style(page, '#h', 'background-image')).toContain('gradient')
    expect((await box(page, '#h')).height).toBeGreaterThan(20)
    expect(await style(page, '#off', '-webkit-text-fill-color')).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('keeps the colour of an element that holds others, and draws its contents as bars', async ({ page }) => {
    await mount(
      page,
      `<div data-skeleton>
         <button id="b" class="btn"><svg id="i" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2"/></svg><span id="l">Save</span></button>
       </div>`,
      `.btn{display:inline-flex;gap:8px;padding:6px 12px;border:0;background:rgb(0, 102, 204);color:rgb(255, 255, 255)}
       svg{width:16px;height:16px}`,
    )
    expect(await style(page, '#b', 'background-color')).toBe('rgb(0, 102, 204)')
    const bar = await style(page, '#i', 'background-color')
    expect(bar).not.toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#l', '-webkit-text-fill-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#l', 'text-decoration-line')).toBe('line-through')
    expect(await style(page, '#l', 'text-decoration-color')).toBe(bar)
  })

  test('draws a data-skeleton-block element as one bar, whatever it holds', async ({ page }) => {
    await mount(
      page,
      `<div data-skeleton>
         <div id="a" class="avatar" data-skeleton-block><svg id="i" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2"/></svg></div>
         <div id="chip" class="chip" data-skeleton-block><span id="l">12 permissions</span></div>
       </div>`,
      `.avatar{width:36px;height:36px;border-radius:50%;background:rgb(0, 128, 255);border:3px solid rgb(0, 0, 255)}
       .chip{display:inline-flex;height:24px;padding:0 8px;border-radius:16px;background:rgb(200, 230, 255)}
       svg{width:20px;height:20px}`,
    )
    const bar = await style(page, '#a', 'background-color')
    expect(bar).not.toBe('rgb(0, 128, 255)')
    expect(await style(page, '#chip', 'background-color')).toBe(bar)
    expect(await style(page, '#a', 'border-top-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await box(page, '#a')).toMatchObject({ width: 42, height: 42 })
    expect(await style(page, '#a', 'border-radius')).toBe('50%')
    expect(await style(page, '#chip', 'border-radius')).toBe('16px')
    for (const inner of ['#i', '#l']) expect(await style(page, inner, 'visibility')).toBe('hidden')
  })

  test('leaves data-skeleton-block alone outside skeleton mode', async ({ page }) => {
    await mount(page, '<div><div id="a" class="avatar" data-skeleton-block><svg></svg></div></div>', '.avatar{background:rgb(0, 128, 255)}')
    expect(await style(page, '#a', 'background-color')).toBe('rgb(0, 128, 255)')
  })

  test('stops the pulse for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mount(page, '<div data-skeleton><h3 id="t"></h3></div>')
    expect(await style(page, '#t', 'animation-name')).toBe('none')
  })

  test('sweeps a shimmer mask over every kind of bar with --skeleton-animation', async ({ page }) => {
    await mount(
      page,
      `<div data-skeleton class="feed"><h3 id="t"></h3><p id="p">Placeholder</p><div id="a" class="avatar"></div></div>
       <div data-skeleton><p id="plain">Placeholder</p></div>`,
      '.feed{--skeleton-animation: skeletone-shimmer}.avatar{width:40px;height:40px}',
    )
    const mask = (sel: string) =>
      page.locator(sel).evaluate((el) => {
        for (const a of el.getAnimations()) {
          a.pause()
          a.currentTime = 0
        }
        return getComputedStyle(el).webkitMaskImage
      })
    for (const sel of ['#t', '#p', '#a']) {
      expect(await style(page, sel, 'animation-name')).toBe('skeletone-shimmer')
      expect(await mask(sel)).toContain('linear-gradient')
    }
    expect(await style(page, '#plain', 'animation-name')).toBe('skeletone-pulse')
    expect(await mask('#plain')).toBe('none')
  })

  test('draws a select as a bar, though its options make it more than a leaf', async ({ page }) => {
    await mount(
      page,
      '<div data-skeleton><select id="s" class="field"><option>Choose a role</option></select></div>',
      '.field{border:1px solid rgb(0, 0, 255)}',
    )
    expect(await style(page, '#s', 'background-color')).toBe('color(srgb 0 0 0 / 0.13)')
    expect(await style(page, '#s', 'border-top-color')).toBe('rgba(0, 0, 0, 0)')
  })

  test('draws a video as a bar and moves its poster out of sight', async ({ page }) => {
    const poster = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='9'%3E%3Crect width='16' height='9' fill='red'/%3E%3C/svg%3E"
    await mount(
      page,
      `<div data-skeleton><video id="v" class="clip" poster="${poster}"><source src="clip.mp4"></video></div>`,
      '.clip{width:160px;height:90px}',
    )
    expect(await style(page, '#v', 'background-color')).toBe('color(srgb 0 0 0 / 0.13)')
    expect(parseFloat(await style(page, '#v', 'object-position'))).toBeLessThan(-160)
    expect(await box(page, '#v')).toMatchObject({ width: 160, height: 90 })
  })

  test('greys out native controls that paint over a background, without resizing them', async ({ page }) => {
    const controls = `<input type="checkbox" checked><input type="radio" checked><input type="range">
      <input type="color"><progress value="40" max="100"></progress><meter value="0.3"></meter>`
    await mount(page, `<div id="real">${controls}</div><div id="skel" data-skeleton>${controls}</div>`)
    const filters = page.locator('#skel > *').evaluateAll((els) => els.map((el) => getComputedStyle(el).filter))
    expect(await filters).toEqual(Array(6).fill('grayscale(1) opacity(0.4)'))
    const widths = (id: string) => page.locator(`#${id} > *`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width))
    expect(await widths('skel')).toEqual(await widths('real'))
  })

  test("hides a control's own buttons and icons, so it is drawn as a plain bar", async ({ page, browserName }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const controls = ['<input type="file">', '<input type="date" value="2026-01-01">', '<input type="time" value="10:00">',
      '<input type="datetime-local" value="2026-01-01T10:00">', '<input type="search" value="abc">', '<input type="number" value="3">', '<select><option>abc</option></select>']
    await mount(
      page,
      `<div data-skeleton>${controls.map((c) => c.replace('>', ' class="field">')).join('')}<input id="plain" class="field"></div>`,
      '.field{display:block;box-sizing:border-box;width:240px;height:28px;margin:8px;padding:0 8px;border:0;border-radius:5px}', // WebKit draws a select with this radius, whatever its class says
    )
    const plain = await page.locator('#plain').screenshot()
    for (const type of ['file', 'date', 'time', 'datetime-local', 'search', 'number']) {
      expect.soft((await page.locator(`[type=${type}]`).screenshot()).equals(plain), type).toBe(true)
    }
    // WebKit's Linux port draws a select in the system theme, whatever its styles say. Safari
    // doesn't, so the select is checked in WebKit on macOS only.
    if (browserName !== 'webkit' || process.platform === 'darwin') {
      expect.soft((await page.locator('select').screenshot()).equals(plain), 'select').toBe(true)
    }
  })

  test('keeps text hidden and bars drawn in forced-colors (high contrast) mode', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' })
    const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches && CSS.supports('forced-color-adjust', 'none'))
    test.skip(!forced, 'this browser has no forced-colors mode')
    await mount(
      page,
      `<div data-skeleton><button id="b" class="btn">Save</button><h3 id="h"></h3>
         <div class="panel"><img id="i" alt=""></div>
         <a id="a" href="#" data-skeleton-ignore>Back</a></div><span id="g" class="gray"></span>`,
      '.gray{color:GrayText;forced-color-adjust:none}.panel{--skeleton-color:rgb(1, 2, 3)}',
    )
    expect(await style(page, '#b', 'forced-color-adjust')).toBe('none')
    expect(await style(page, '#b', 'background-color')).toBe(await style(page, '#g', 'color'))
    expect(await style(page, '#i', 'background-color')).toBe(await style(page, '#g', 'color'))
    expect(await style(page, '#h', 'background-image')).toContain('gradient')
    expect(await style(page, '#a', 'forced-color-adjust')).toBe('auto')
  })

  // A pixel check against a shape drawn without the library. Computed styles missed a
  // broken-image icon and a squared avatar that both showed on screen.
  test('draws images, a video and an icon as a plain bar in their own shape', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const red = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='red'/%3E%3C/svg%3E"
    const media = {
      empty: '<img class="avatar" alt="">',
      broken: '<img class="avatar" alt="" src="missing.png">',
      loaded: `<img class="avatar" alt="" src="${red}">`,
      video: `<video class="avatar" poster="${red}"></video>`,
      icon: '<svg class="avatar" viewBox="0 0 4 4"><circle cx="2" cy="2" r="2" fill="red"/></svg>',
    }
    await mount(
      page,
      `<div class="cell"><div class="avatar ref"></div></div>
       <div data-skeleton>${Object.entries(media).map(([id, el]) => `<div id="${id}" class="cell">${el}</div>`).join('')}</div>`,
      `.cell{width:56px;height:56px;padding:8px;box-sizing:border-box}.avatar{display:block;width:40px;height:40px;border-radius:50%}
       .ref{background:color-mix(in srgb, currentColor 13%, transparent)}`,
    )
    await page.waitForFunction(() => [...document.images].every((i) => i.complete))
    const shape = await page.locator('.cell:has(.ref)').screenshot()
    for (const id of Object.keys(media)) {
      expect(await differentPixels(page, await page.locator(`#${id}`).screenshot(), shape), id).toBe(0)
    }
  })

  test('ships within the 2 KB gzipped budget', () => {
    expect(gzipSync(fs.readFileSync(CSS)).length).toBeLessThanOrEqual(2048)
  })
})
