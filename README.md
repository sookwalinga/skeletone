# skeletone

**CSS-only skeleton loaders from your real markup.** Add one attribute to a container and
everything inside it turns into a loading skeleton that matches the real layout. You don't
write separate skeleton components. The core is one stylesheet with no JavaScript, so it
works with any framework, and optional helpers for React, Vue and Svelte set the attributes
for you.

```html
<link rel="stylesheet" href="skeletone.css" />

<div data-skeleton inert>
  <article class="card">
    <img class="avatar" alt="" />
    <h3></h3>
    <p data-skeleton-lines></p>
  </article>
</div>
```

About 1.3 KB gzipped.

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

The framework helpers are optional, and each is a separate import. A React app bundles only
`skeletone/react`, never the Vue or Svelte code. Installing skeletone doesn't install any
framework. Each helper ships as an ES module and as CommonJS, each with its own type
definitions, so Jest loads it without any transform config.

## Usage

Switch skeleton mode on with `data-skeleton`. Remove it, or set it to `"false"`, to show
the content.

Skeleton mode needs two attributes: `data-skeleton` draws the bars, and `inert` keeps focus,
clicks and screen readers out of the placeholder content (see Accessibility). The helpers
set both from one loading flag, and they render on the server too.

**React**

```jsx
import { skeleton, Skeleton } from 'skeletone/react'

<section {...skeleton(isLoading)}>
  <OpportunityCard opportunity={data ?? {}} />
</section>
```

`skeleton(loading)` returns both attributes, in the form your React version needs. Spread it
onto any element, or onto a component that passes props to its element, such as an MUI
`Box` or `Grid`. It adds no element of its own. Called with no argument, it's on.

`<Skeleton>` renders an element in skeleton mode, for when there's no element to spread
onto. `count` repeats the children while loading, so a list needs one placeholder record
instead of an array of them (see Placeholder records), and `label` tells screen readers
what's loading. Each copy gets its own key, so the record needs no `id`:

```tsx
const LOADING_OPPORTUNITY = {} as Opportunity

<Skeleton label="Loading opportunities" count={6} loading={!data}>
  {data
    ? data.map((o) => <OpportunityCard key={o.id} opportunity={o} />)
    : <OpportunityCard opportunity={LOADING_OPPORTUNITY} />}
</Skeleton>
```

renders, while loading:

```html
<span role="status" class="skeletone-status">Loading opportunities</span>
<div data-skeleton inert>…6 cards…</div>
```

| Prop      | Default | What it does                                                               |
| --------- | ------- | -------------------------------------------------------------------------- |
| `loading` | `true`  | Skeleton mode on or off                                                    |
| `count`   | `1`     | Renders the children this many times while loading                         |
| `label`   | none    | While loading, a hidden `role="status"` message just before the element    |
| `as`      | `'div'` | The element or component to render                                         |
| `labelAs` | `as`    | What wraps the message: `'span'`, `'tbody'`, `'tr'` or `'li'`              |

Other props, `ref` included, pass through to the element. With `as`, a table or list can repeat its rows,
and a component such as MUI's `TableBody` or `Grid` takes the attributes without an extra
wrapper:

```jsx
<table>
  <thead>…</thead>
  <Skeleton as="tbody" count={5}>
    <RoleRow role={LOADING_ROLE} />
  </Skeleton>
</table>

<Skeleton as={TableBody} count={5} sx={{ minHeight: 200 }}>…</Skeleton>
```

`label` puts its message beside the element, wrapped so the markup stays valid: a table
body next to a `tbody`, a row next to a `tr`, a list item next to an `li`, otherwise a
`<span>`. The wrapper takes no space. When `as` is a component, `<Skeleton>` can't tell
what it renders, so name it with `labelAs`:

```jsx
<Skeleton as={TableBody} count={5} label="Loading roles" labelAs="tbody">…</Skeleton>
```

**Vue**

```html
<script setup>
import { vSkeleton } from 'skeletone/vue'
</script>

<template>
  <section v-skeleton="loading">…</section>
</template>
```

Outside `<script setup>`, register it with `app.directive('skeleton', vSkeleton)`.
`v-skeleton` with no value is on. For a loading message, add a `.skeletone-status` span
(see Accessibility).

**Svelte**

```svelte
<script>
  import { skeleton } from 'skeletone/svelte'
</script>

{#if loading}<span role="status" class="skeletone-status">Loading articles</span>{/if}
<section {...skeleton(loading)}>…</section>
```

**HTML and other frameworks**

```html
<section data-skeleton inert>…</section>
```

Remove both attributes to show the content. skeletone also treats `data-skeleton="false"`
as off. `inert` is a boolean attribute, so `inert="false"` still makes the element inert:
remove it, which most frameworks do when you pass `undefined`. In React 18 without the
helper, write `inert={isLoading ? '' : undefined}`.

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
wrap like real text. `text(length)` from `skeletone/text` makes it: words of x's, about
`length` characters long. It works with any framework.

```jsx
import { text } from 'skeletone/text'

const placeholder = {
  title: text(40),  // about one line
  about: text(320), // wraps over several lines
  tags: [text(5), text(5), text(5)],
}

<main {...skeleton(isLoading)}>
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

### Placeholder records

A placeholder record holds only what the component can't render without. A field it only
displays can be left out: it renders empty and gets the default bar. Keep the fields it
reads into, such as an array it maps, an object whose fields it reads or a date it formats,
because `undefined` throws there. In TypeScript, cast the record to the full type. Types
don't exist at runtime, so skeletone can't fill the record in from them. Type an empty array
as well, because a bare `[]` is `never[]` and TypeScript rejects the cast:

```ts
// RoleRow maps permissions
const LOADING_ROLE = { permissions: [] as RBACRole['permissions'] } as RBACRole

<Skeleton as="tbody" count={5} loading={!roles}>
  {roles
    ? roles.map((r) => <RoleRow key={r.id} role={r} />)
    : <RoleRow role={LOADING_ROLE} />}
</Skeleton>
```

The cast tells TypeScript the record is complete, so a field you left out that the
component reads into fails when it renders, not when it compiles. Empty table cells get
full-width bars inside their padding; set `--skeleton-width` on a column's class where a
shorter bar suits it.

### Keeping a section as it is

`data-skeleton-ignore` leaves an element and everything inside it untouched and clickable.
Use it for parts that don't depend on the data, such as a back link or a page header:

```html
<main data-skeleton>
  <header data-skeleton-ignore><a href="/">← All opportunities</a></header>
  <article inert>…</article>
</main>
```

Put `inert`, or the helper, on the loading part, not on the container. Everything inside an
inert element is inert, ignored sections included.

### Drawing an element as one bar

A coloured element that holds other elements keeps its colour, because only leaves become
bars: an avatar showing a fallback icon stays blue, a chip stays tinted around its label
bar. `data-skeleton-block` draws the element as one bar in the skeleton colour and hides
what's inside. It keeps its own size and corners, and does nothing outside skeleton mode:

```jsx
<Avatar data-skeleton-block src={user.photo} />
<Chip data-skeleton-block label={`${count} permissions`} />
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
   SVG icons, selects, videos and `data-skeleton-block` elements, get a background in the
   bar colour and a gentle pulse. Checkboxes, radios, sliders, colour pickers, progress bars
   and meters draw their own look over any background, so they're greyed out instead, at
   their own size. The bars show from the first frame, with the outlines around them, so a
   loader replaced by another one doesn't blink. The `[data-skeleton]` element counts too: one with no element children, such as
   `<p data-skeleton>12 users</p>`, is drawn like a leaf.
3. Text elements that hold text get a strike-through 0.6 of a line thick instead, so each
   wrapped line gets its own bar. Text blocks such as paragraphs, list items and table
   cells keep their borders, so table rows keep their lines.
4. Empty elements get a `1lh` minimum height, and empty text elements a bar drawn as a
   gradient inside their padding, so they look like a line of text rather than a solid
   block. An element's own `min-height` wins, so a 44px button stays 44px. Icons, images,
   videos, canvases, iframes and form controls keep their own size.
5. `data-skeleton-lines` elements and empty lists get a height of `--skeleton-lines` lines,
   with the lines drawn as gradients.
6. The container ignores clicks and text selection, except inside `data-skeleton-ignore`.

## Accessibility

- Put `inert` on the container while it loads (the helpers do this for you). It removes
  the skeleton from the tab order and hides it from screen readers, so they don't read out
  placeholder text. CSS can do neither. `aria-busy` isn't needed on the same element: an
  inert element isn't announced.
- To announce loading, put a `role="status"` message outside the inert part. In React,
  `<Skeleton label="Loading articles">` renders one. Elsewhere, write it yourself and give
  it the `skeletone-status` class, which hides it on screen but not from screen readers.
  Render it only while loading:

  ```html
  <span role="status" class="skeletone-status">Loading articles</span>
  <section data-skeleton inert>…</section>
  ```

  Inside a table or a list, where a `<span>` isn't allowed, wrap it in a body, row or item
  with the `skeletone-status-group` class, which takes no space:

  ```html
  <tbody class="skeletone-status-group"><tr><td>
    <span role="status" class="skeletone-status">Loading roles</span>
  </td></tr></tbody>
  <tbody data-skeleton inert>…</tbody>
  ```
- The pulse stops when the user asks for reduced motion.
- In forced-colors mode (Windows high contrast), the skeleton keeps its own colours, so its
  text stays hidden, and draws its bars in the system's `GrayText`. `--skeleton-color`
  doesn't apply there.

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
- **Real images and video posters** inside a skeleton are painted over. That's intended, but
  it includes logos.
- **Embedded frames** (`<iframe>`) show their content, which CSS outside the frame can't
  hide. Render them once the data has loaded.
- **A table message adds one `border-spacing` gap** to a table with separate borders (the
  browser default, 2px). Tables with `border-collapse: collapse`, as most styled tables
  have, don't move.

## Development

The sources are in `src/`. `yarn build` minifies them into the published files at the
root, and generates each helper's CommonJS copy from its ES module. The tests build first.

```sh
yarn install
yarn test          # Playwright: Chromium, Firefox, WebKit
yarn typecheck     # the helpers' type definitions
yarn build && open demo/index.html
```

## License

MIT
