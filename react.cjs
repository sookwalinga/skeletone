'use strict'
// CommonJS copy of react.mjs, for Jest. Keep the two in step; the comments are there.
const { createElement, Fragment, version } = require('react')

const INERT = parseInt(version) >= 19 ? true : ''

function skeleton(loading = true) {
  return loading
    ? { 'data-skeleton': '', inert: INERT }
    : { 'data-skeleton': undefined, inert: undefined }
}

function Skeleton({ as = 'div', loading = true, count = 1, label, children, ...props }) {
  const content =
    loading && count > 1
      ? Array.from({ length: count }, (_, i) => createElement(Fragment, { key: i }, children))
      : children
  return createElement(
    Fragment,
    null,
    loading && label ? createElement('span', { role: 'status', className: 'skeletone-status' }, label) : null,
    createElement(as, { ...skeleton(loading), ...props }, content),
  )
}

exports.skeleton = skeleton
exports.Skeleton = Skeleton
