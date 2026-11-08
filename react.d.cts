import type { ComponentPropsWithoutRef, ElementType, ReactElement } from 'react'

/** Props that switch skeleton mode on: `data-skeleton` and `inert`. Spread them onto any element. */
export function skeleton(loading?: boolean): { 'data-skeleton'?: string; inert?: boolean }

interface OwnProps<C extends ElementType> {
  /** The element or component to render, such as `'tbody'` or MUI's `TableBody`. Defaults to `'div'`. */
  as?: C
  /** Defaults to true. */
  loading?: boolean
  /** While loading, render the children this many times. */
  count?: number
  /** While loading, a message for screen readers, such as "Loading articles", rendered as a
   * visually hidden `role="status"` span just before the element. */
  label?: string
}

export type SkeletonProps<C extends ElementType = 'div'> = OwnProps<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof OwnProps<C>>

/** An element (a div by default) in skeleton mode while `loading` is true. */
export function Skeleton<C extends ElementType = 'div'>(props: SkeletonProps<C>): ReactElement
