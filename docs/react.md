# React

`skeletone/react` exports `skeleton()`, which returns the two attributes to spread onto an
element, and `<Skeleton>`, which renders the element for you. Both are introduced in the
[README](../README.md#usage). This page covers `<Skeleton>` in full.

```tsx
const LOADING_OPPORTUNITY = {} as Opportunity

<Skeleton label="Loading opportunities" count={6} loading={!data}>
  {data
    ? data.map((o) => <OpportunityCard key={o.id} opportunity={o} />)
    : <OpportunityCard opportunity={LOADING_OPPORTUNITY} />}
</Skeleton>
```

Each copy gets its own key, so the record needs no `id`. This renders, while loading:

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

Keep `count` to what fits on screen (10–20 rows): every bar is animated, so a skeleton over
thousands of rows is slow to start. While a table reloads, show the skeleton in place of the
old rows, not on top of them.

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
