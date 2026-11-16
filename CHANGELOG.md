# Changelog

## Unreleased

- `--skeleton-color` set on a section inside a skeleton now tints that section's bars, so a
  dark or inverted panel can show its skeleton.
- `--skeleton-animation: skeletone-shimmer` sweeps a shimmer across the bars instead of the
  pulse. The pulse stays the default.

## Unreleased

- A `<div>` that holds only text gets a bar per line, as long as the text, instead of a
  block across its whole width. An empty `<div>` is still drawn as a block, but a
  whitespace-only one now counts as text and gets no bar.

## 0.1.0

First release.

- `skeletone.css`: `data-skeleton` turns a container's real markup into a skeleton, with
  `data-skeleton-lines`, `data-skeleton-block` and `data-skeleton-ignore` for the cases it
  can't work out alone, and `--skeleton-*` custom properties for colour, radius and widths.
- `skeletone/react`, `skeletone/vue` and `skeletone/svelte`: optional helpers that set
  `data-skeleton` and `inert` from one loading flag, on the server too.
- `skeletone/text`: placeholder text for placeholder records.
