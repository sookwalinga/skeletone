// Spread, not an action: actions don't run during server rendering, when skeletons show.
export function skeleton(loading = true) {
  return loading
    ? { 'data-skeleton': '', inert: true }
    : { 'data-skeleton': undefined, inert: undefined }
}
