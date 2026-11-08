// Compiled by `yarn typecheck`, never run: checks the helpers' type definitions as users see them.
import { skeleton, Skeleton } from 'skeletone/react'
import { skeleton as svelteSkeleton } from 'skeletone/svelte'
import { vSkeleton } from 'skeletone/vue'
import type { ObjectDirective } from 'vue'

export const spread = <section {...skeleton(true)} className='card' />
export const defaultOn = <div {...skeleton()} />
export const wrapper = (
  <Skeleton loading={false} count={3} id='list'>
    <p />
  </Skeleton>
)
export const directive: ObjectDirective<HTMLElement, boolean | undefined | null> = vSkeleton
export const attrs: { 'data-skeleton'?: string; inert?: boolean } = svelteSkeleton(false)

// @ts-expect-error count is a number
export const badCount = <Skeleton count='3' />
