import { createElement, Fragment, version } from 'react'

// React 19 treats inert as a boolean. React 18 drops `true` with a warning, so it gets ''.
const INERT = parseInt(version) >= 19 ? true : ''

export function skeleton(loading = true) {
  return loading
    ? { 'data-skeleton': '', inert: INERT }
    : { 'data-skeleton': undefined, inert: undefined }
}

// The loading message sits beside the skeleton, outside its inert element, and has to be
// valid there. A <span> isn't, inside a table or a list, so next to a table body it gets a
// body of its own, next to a row a row, and next to a list item an item.
function status(labelAs, label) {
  const message = createElement('span', { role: 'status', className: 'skeletone-status' }, label)
  const group = { className: 'skeletone-status-group' }
  const row = (props) => createElement('tr', props, createElement('td', null, message))
  if (labelAs === 'tbody') return createElement('tbody', group, row())
  if (labelAs === 'tr') return row(group)
  if (labelAs === 'li') return createElement('li', group, message)
  return message
}

export function Skeleton({ as = 'div', loading = true, count = 1, label, labelAs = typeof as === 'string' ? as : 'span', children, ...props }) {
  const content =
    loading && count > 1
      ? Array.from({ length: count }, (_, i) => createElement(Fragment, { key: i }, children))
      : children
  // The status sits outside the inert element. The null slot avoids a remount.
  return createElement(
    Fragment,
    null,
    loading && label ? status(labelAs, label) : null,
    createElement(as, { ...skeleton(loading), ...props }, content),
  )
}
