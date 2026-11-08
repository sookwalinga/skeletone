import { createElement, Fragment, version } from 'react'

// React 19 treats inert as a boolean. React 18 drops `true` with a warning, so it gets ''.
const INERT = parseInt(version) >= 19 ? true : ''

export function skeleton(loading = true) {
  return loading
    ? { 'data-skeleton': '', inert: INERT }
    : { 'data-skeleton': undefined, inert: undefined }
}

export function Skeleton({ loading = true, count = 1, children, ...props }) {
  const content =
    loading && count > 1
      ? Array.from({ length: count }, (_, i) => createElement(Fragment, { key: i }, children))
      : children
  return createElement('div', { ...skeleton(loading), ...props }, content)
}
