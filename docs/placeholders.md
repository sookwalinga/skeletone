# Placeholder records

skeletone draws the elements that are in the page. When a component can't render without
data, give it a placeholder record while it loads, so its real markup is there to draw.

## Detail pages

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

## What a record has to hold

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
