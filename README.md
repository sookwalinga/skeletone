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
    <p data-skeleton-lines="3"></p>
  </article>
</div>
```

About 1.3 KB gzipped.

## Why

Most skeleton loaders are a second, hand-written copy of each screen. When the real
component changes, the copy goes stale. skeletone has no copy to keep in step. While data
loads, your component renders as usual with empty values. The CSS then:

- turns each innermost element (text, images, icons, inputs) into a grey bar,
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

An empty element has no way to say how much text it will hold, so you tell it:

```html
<p data-skeleton-lines="3"></p>              <!-- 1–8 -->
<p style="--skeleton-lines: 12"></p>         <!-- any number -->
```

The last line is drawn shorter so the block reads as a paragraph.

## Customise

All settings are CSS custom properties. Set them on the container or anywhere above it.

| Property                   | Default                                  | What it does                       |
| -------------------------- | ---------------------------------------- | ---------------------------------- |
| `--skeleton-color`         | 13% of the container's text colour       | Bar colour                         |
| `--skeleton-radius`        | `0.25em`                                 | Bar corners (an element's own radius wins) |
| `--skeleton-heading-width` | `50%`                                    | Maximum width of an empty heading  |
| `--skeleton-inline-width`  | `5em`                                    | Width of empty inline text         |
| `--skeleton-last-line`     | `60%`                                    | Width of a paragraph's last line   |
| `--skeleton-lines`         | `1`                                      | Line count (see Paragraphs)        |

Bars take their colour from the container's text colour, so dark mode works without any
configuration.

## How it works

The whole library is one stylesheet. Inside `[data-skeleton]`:

1. Text is hidden with `-webkit-text-fill-color: transparent`, so it keeps its layout.
2. Leaf elements, meaning elements with no element children (`:not(:has(*))`), plus whole
   SVG icons, get a background in the bar colour and a gentle pulse.
3. Empty text elements get a `1lh` minimum height and a bar drawn as a gradient, so they
   look like a line of text rather than a solid block.
4. The container ignores clicks and text selection.

## Accessibility

- Put `aria-busy="true"` on the container while it loads, so screen readers wait for the
  real content.
- Add `inert` too if the skeleton holds focusable elements. CSS can't remove them from the
  tab order.
- The pulse stops when the user asks for reduced motion.

## Browser support

Any browser with `:has()`, the `lh` unit and `color-mix()`: Chrome / Edge 111+, Safari
16.4+, Firefox 121+. Older browsers show the empty layout without bars.

## Limitations

- **Elements that render only when data exists** (`{data.tags && <Tags />}`) aren't in the
  page while loading, so they get no bars. Render them unconditionally, or with empty
  values, if they should appear in the skeleton.
- **Text mixed with child elements** (`<p>By <a>Sam</a></p>`) is hidden, but only the child
  gets a bar.
- **Real images** inside a skeleton are painted over. That's intended, but it includes logos.

## Development

```sh
yarn install
yarn test          # Playwright: Chromium, Firefox, WebKit
open demo/index.html
```

## License

MIT
