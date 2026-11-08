import type { ObjectDirective } from 'vue'

/** `v-skeleton="loading"`: sets `data-skeleton` and `inert` while the value is true. */
export const vSkeleton: ObjectDirective<HTMLElement, boolean | undefined | null>
