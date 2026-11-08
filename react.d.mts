import type { HTMLAttributes, ReactElement } from 'react'

/** Props that switch skeleton mode on: `data-skeleton` and `inert`. Spread them onto any element. */
export function skeleton(loading?: boolean): { 'data-skeleton'?: string; inert?: boolean }

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Defaults to true. */
  loading?: boolean
  /** While loading, render the children this many times. */
  count?: number
}

/** A div in skeleton mode while `loading` is true. */
export function Skeleton(props: SkeletonProps): ReactElement
