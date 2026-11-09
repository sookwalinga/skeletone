import type { ComponentPropsWithRef, ElementType, ReactElement } from 'react'

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
  /** What the message is wrapped in, so it's valid next to the element: `'tbody'` beside a
   * table body, `'tr'` beside a row, `'li'` beside a list item. Follows `as` when that's a
   * tag name, so set it only when `as` is a component, such as MUI's `TableBody`. Defaults
   * to `'span'`. */
  labelAs?: 'span' | 'tbody' | 'tr' | 'li'
}

export type SkeletonProps<C extends ElementType = 'div'> = OwnProps<C> &
  Omit<ComponentPropsWithRef<C>, keyof OwnProps<C>>

/** An element (a div by default) in skeleton mode while `loading` is true. */
export function Skeleton<C extends ElementType = 'div'>(props: SkeletonProps<C>): ReactElement
