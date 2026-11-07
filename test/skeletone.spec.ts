import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'

const CSS = path.join(__dirname, '..', 'skeletone.css')

async function mount(page: Page, html: string, css = '') {
  await page.setContent(`<style>body{font:16px/1.5 sans-serif;margin:0}${css}</style>${html}`)
  await page.addStyleTag({ path: CSS })
}

const style = (page: Page, sel: string, prop: string) =>
  page.locator(sel).evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)
const box = async (page: Page, sel: string) => (await page.locator(sel).boundingBox())!

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
    await mount(page, '<div data-skeleton><p id="p" data-skeleton-lines></p></div>')
    expect((await box(page, '#p')).height).toBe(72)
    expect(await style(page, '#p', 'background-size')).toMatch(/^60% /)
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

  test('draws text that is present as line bars that follow the real text', async ({ page }) => {
    await mount(page, '<div data-skeleton><p id="p" class="bio">Placeholder bio text</p></div>', '.bio{background:blue}')
    expect(await style(page, '#p', 'background-color')).toBe('rgba(0, 0, 0, 0)')
    expect(await style(page, '#p', 'text-decoration-line')).toBe('line-through')
    expect(await style(page, '#p', 'text-decoration-thickness')).toBe('14.4px')
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

  test('beats ordinary component class styles', async ({ page }) => {
    await mount(page, '<div data-skeleton><span id="t" class="tag"></span></div>', '.tag{background:blue}')
    expect(await style(page, '#t', 'background-image')).toContain('gradient')
  })

  test('blocks clicks while loading', async ({ page }) => {
    await mount(page, '<div data-skeleton><button id="b">Go</button></div>')
    expect(await style(page, '[data-skeleton]', 'pointer-events')).toBe('none')
  })

  test('waits before showing bars, so a fast load never flashes', async ({ page }) => {
    await mount(page, '<div data-skeleton><h3 id="t"></h3><p id="p">Placeholder</p></div>')
    const opacityAt = (sel: string, ms: number) =>
      page.locator(sel).evaluate((el, t) => {
        for (const a of el.getAnimations()) {
          a.pause()
          a.currentTime = (a as CSSAnimation).animationName === 'skeletone-in' ? t : 0
        }
        return getComputedStyle(el).opacity
      }, ms)
    for (const sel of ['#t', '#p']) {
      expect(await opacityAt(sel, 0)).toBe('0')
      expect(await opacityAt(sel, 100)).toBe('0')
      expect(await opacityAt(sel, 1000)).toBe('1')
    }
  })

  test('stops the pulse for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await mount(page, '<div data-skeleton><h3 id="t"></h3></div>')
    expect(await style(page, '#t', 'animation-name')).toBe('none')
  })
})
