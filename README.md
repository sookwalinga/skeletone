# skeletone

**CSS-only skeleton loaders from your real markup.** Add one attribute to a container and
everything inside it turns into a loading skeleton that matches the real layout. You don't
write separate skeleton components, and there's no JavaScript or build step. It works with
any framework.

```html
<link rel="stylesheet" href="skeletone.css" />

<div data-skeleton aria-busy="true">
  <article class="card">
    <img class="avatar" alt="" />
    <h3></h3>
    <p data-skeleton-lines></p>
  </article>
</div>
```

About 1.5 KB gzipped.

## Why

Most skeleton loaders are a second, hand-written copy of each screen. When the real
component changes, the copy goes stale. skeletone has no copy to keep in step. While data
loads, your component renders as usual with empty values. The CSS then:

- turns each innermost element (images, icons, inputs, buttons) into a grey block,
- draws text as one bar per line, as long as the line,
- gives empty text a text-height bar so it doesn't collapse,
- leaves every container, card, border, gap and grid untouched.

The skeleton is your layout, so it can't drift.

## Install

```sh
npm install skeletone
```

```js
import 'skeletone/skeletone.css' // bundlers that handle CSS imports
```

Or use a `<link>` to `node_modules/skeletone/skeletone.css`, or to a CDN copy.

## Usage

Switch skeleton mode on with `data-skeleton`. Remove it, or set it to `"false"`, to show
the content.

**HTML**

```html
<section data-skeleton aria-busy="true">…</section>
```

**React**

```jsx
<section data-skeleton={isLoading} aria-busy={isLoading}>
  <OpportunityCard opportunity={data ?? {}} />
</section>
```

`data-skeleton={false}` renders `data-skeleton="false"`, and skeletone treats that as off.

**Vue / Svelte**

```html
<section :data-skeleton="loading" :aria-busy="loading">…</section>
<section data-skeleton={loading} aria-busy={loading}>…</section>
```

### Paragraphs

An empty element has no way to say how much text it will hold, so you tell it. Mark it with
`data-skeleton-lines` (three lines), and set `--skeleton-lines` for another count:

```html
<p data-skeleton-lines></p>                              <!-- 3 lines -->
<p data-skeleton-lines class="bio"></p>                  <!-- .bio { --skeleton-lines: 6 } -->
```

The last line is drawn shorter so the block reads as a paragraph.

### Lists

A list mapped from no data renders as an empty `<ul>` or `<ol>`. skeletone draws it as three
rows, and `--skeleton-lines` sets another count. Nothing to configure, as long as the list
element itself renders without data:

```jsx
<ul className="steps">{steps?.map((s) => <li key={s.id}>{s.name}</li>)}</ul>  {/* 3 rows */}
```

The rows are drawn as lines of text, which suits a vertical list. A horizontal list of chips
looks better with a placeholder record (see the next section).

### Detail pages

On a detail page, the structure comes from the data. skeletone can only draw elements that
are in the page, so keep wrappers outside your conditions where you can:

```jsx
<ul className="tags">{data.tags?.map(…)}</ul>   // drawn while loading
{data.tags && <ul className="tags">…</ul>}      // not in the page, so nothing to draw
```

When a section can't render without data, render the page with a placeholder record
instead. The text is never shown, only its shape, so placeholder text becomes bars that
wrap like real text:

```jsx
const placeholder = {
  title: 'x'.repeat(24),
  about: 'xxxxxxxx '.repeat(30), // about three lines
  tags: ['xxxxx', 'xxxxx', 'xxxxx'],
}

<main data-skeleton={isLoading} aria-busy={isLoading}>
  <Opportunity opportunity={data ?? placeholder} />
</main>
```

With React Query, pass the same object as `placeholderData`.

The record only has to say how many items there are. It doesn't need text. Empty values get
the default bars, and you set lengths where the defaults are wrong:

```jsx
const placeholder = { title: '', about: '', tags: ['', '', ''] }

<h1 className="title"></h1>              {/* .title { --skeleton-width: 70% } */}
<p data-skeleton-lines className="about"></p> {/* .about { --skeleton-lines: 5 } */}
```

Use placeholder text for zero configuration, or empty values to control lengths exactly.

### Keeping a section as it is

`data-skeleton-ignore` leaves an element and everything inside it untouched and clickable.
Use it for parts that don't depend on the data, such as a back link or a page header:

```html
<main data-skeleton aria-busy="true">
  <header data-skeleton-ignore><a href="/">← All opportunities</a></header>
  …
</main>
```

## Customise

All settings are CSS custom properties. Set them on the container or anywhere above it.

| Property                   | Default                                  | What it does                       |
| -------------------------- | ---------------------------------------- | ---------------------------------- |
| `--skeleton-color`         | 13% of the container's text colour       | Bar colour                         |
| `--skeleton-radius`        | `0.25em`                                 | Bar corners (an element's own radius wins) |
| `--skeleton-width`         | see the next two rows, else `100%`       | Bar width of empty text, on any element |
| `--skeleton-heading-width` | `40%`                                    | Bar width of an empty heading      |
| `--skeleton-inline-width`  | `4em`                                    | Width of empty inline text         |
| `--skeleton-last-line`     | `60%`                                    | Width of a paragraph's last line   |
| `--skeleton-lines`         | `3`                                      | Line count of a `data-skeleton-lines` element or an empty list |

Bars take their colour from the container's text colour, so dark mode works without any
configuration.

## How it works

The whole library is one stylesheet. Inside `[data-skeleton]`:

1. Text is hidden with `-webkit-text-fill-color: transparent`, so it keeps its layout.
2. Leaf elements, meaning elements with no element children (`:not(:has(*))`), plus whole
   SVG icons, get a background in the bar colour and a gentle pulse. The bars fade in after
   150ms, so a load that finishes sooner never flashes them.
3. Text elements that hold text get a strike-through 0.6 of a line thick instead, so each
   wrapped line gets its own bar.
4. Empty text elements get a `1lh` minimum height and a bar drawn as a gradient, so they
   look like a line of text rather than a solid block. An element's own `min-height` wins,
   so a 44px button stays 44px.
5. `data-skeleton-lines` elements and empty lists get a height of `--skeleton-lines` lines,
   with the lines drawn as gradients.
6. The container ignores clicks and text selection, except inside `data-skeleton-ignore`.

## Accessibility

- Put `aria-busy="true"` on the container while it loads, so screen readers wait for the
  real content.
- Add `inert` too if the skeleton holds focusable elements. CSS can't remove them from the
  tab order.
- The pulse and the fade-in stop when the user asks for reduced motion. The bars then show
  at once.

## Browser support

Any browser with `:has()`, the `lh` unit and `color-mix()`: Chrome / Edge 111+, Safari
16.4+, Firefox 121+. Older browsers show the empty layout without bars.

## Limitations

- **Elements that render only when data exists** (`{data.tags && <Tags />}`) aren't in the
  page while loading, so they get no bars. Move the wrapper outside the condition, or render
  with a placeholder record (see Detail pages). Adding elements takes JavaScript, so a
  stylesheet can't create them.
- **Text mixed with child elements** (`<p>By <a>Sam</a></p>`) is hidden, but only the child
  gets a bar.
- **Whitespace-only elements** (`<p> </p>`) aren't `:empty`, so they get no bar. Render
  them truly empty.
- **Empty decorative elements** (a 1px divider `<div>`, an icon-font `<i>`) are leaves too,
  so they become bars at least a line tall. Mark them `data-skeleton-ignore`.
- **Real images** inside a skeleton are painted over. That's intended, but it includes logos.

## Development

```sh
yarn install
yarn test          # Playwright: Chromium, Firefox, WebKit
open demo/index.html
```

## License

MIT
