// v-skeleton, v-skeleton="true" and v-skeleton="undefined" are on; any falsy value is off.
const on = (value) => value === undefined || !!value

function apply(el, { value }) {
  el.toggleAttribute('data-skeleton', on(value))
  el.inert = on(value)
}

export const vSkeleton = {
  mounted: apply,
  updated: apply,
  // Server rendering skips the hooks above, so the attributes come from here.
  getSSRProps: ({ value }) => (on(value) ? { 'data-skeleton': '', inert: '' } : {}),
}
