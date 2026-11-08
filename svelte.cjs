'use strict'
// CommonJS copy of svelte.mjs, for require() and Jest. Keep the two in step.

// Spread, not an action: actions don't run during server rendering, when skeletons show.
exports.skeleton = function skeleton(loading = true) {
  return loading
    ? { 'data-skeleton': '', inert: true }
    : { 'data-skeleton': undefined, inert: undefined }
}
