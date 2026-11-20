# Changelog

## 0.3.0

- Buttons and links that hold only a label (text, an icon) keep their own background and
  border, greyed and faded, and their label gets a bar. A text button such as "Read more"
  was drawn as a solid block the size of the button, a button's label beside an icon got no
  bar, a link styled as a button lost its shape, and tabs merged into one strip. A link
  around block content, such as a whole card, is drawn as before.

## 0.2.1

- Text with line breaks, such as `<p>12 Main Street<br>Kampala</p>`, gets a bar per line. It
  was hidden with no bars.

## 0.2.0

- `--skeleton-color` set on a section inside a skeleton now tints that section's bars, so a
  dark or inverted panel can show its skeleton.
- `--skeleton-animation: skeletone-shimmer` sweeps a shimmer across the bars instead of the
  pulse. The pulse stays the default.
- A `<div>` that holds only text gets a bar per line, as long as the text, instead of a
  block across its whole width. An empty `<div>` is still drawn as a block, but a
  whitespace-only one now counts as text and gets no bar.
- A select's arrow is hidden.
- Firefox: a date or time picker's icon and a number field's arrows are hidden, and the
  first lines of a `data-skeleton-lines` paragraph or an empty list are as thick as the last
  one. They were drawn thin.

## 0.1.0

First release.

- `skeletone.css`: `data-skeleton` turns a container's real markup into a skeleton, with
  `data-skeleton-lines`, `data-skeleton-block` and `data-skeleton-ignore` for the cases it
  can't work out alone, and `--skeleton-*` custom properties for colour, radius and widths.
- `skeletone/react`, `skeletone/vue` and `skeletone/svelte`: optional helpers that set
  `data-skeleton` and `inert` from one loading flag, on the server too.
- `skeletone/text`: placeholder text for placeholder records.
