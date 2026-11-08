import { createElement, Fragment, version } from 'react'

// React 19 treats inert as a boolean. React 18 drops `true` with a warning, so it gets ''.
const INERT = parseInt(version) >= 19 ? true : ''

export function skeleton(loading = true) {
  return loading
    ? { 'data-skeleton': '', inert: INERT }
    : { 'data-skeleton': undefined, inert: undefined }
}

export function Skeleton({ as = 'div', loading = true, count = 1, label, children, ...props }) {
  const content =
    loading && count > 1
      ? Array.from({ length: count }, (_, i) => createElement(Fragment, { key: i }, children))
      : children
  // The status sits outside the inert element. The null slot avoids a remount.
  return createElement(
    Fragment,
    null,
    loading && label ? createElement('span', { role: 'status', className: 'skeletone-status' }, label) : null,
    createElement(as, { ...skeleton(loading), ...props }, content),
  )
}
