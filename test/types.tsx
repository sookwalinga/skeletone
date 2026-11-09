// Compiled by `yarn typecheck`, never run: checks the helpers' type definitions as users see them.
import { createRef, type ReactNode } from 'react'
import { skeleton, Skeleton } from 'skeletone/react'
import { skeleton as svelteSkeleton } from 'skeletone/svelte'
import { text } from 'skeletone/text'
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

export const labelled = <Skeleton label='Loading articles' count={6}><p /></Skeleton>
export const tbody = (
  <Skeleton as='tbody' count={5} className='rows'>
    <tr />
  </Skeleton>
)
const TableBody = (props: { sx?: { color: string }; className?: string; children?: ReactNode }) => <tbody {...props} />
export const component = <Skeleton as={TableBody} sx={{ color: 'red' }} className='rows' />
// @ts-expect-error sx takes the component's own type
export const badSx = <Skeleton as={TableBody} sx={1} />
// @ts-expect-error a div has no href
export const badHref = <Skeleton href='/' />
export const anchor = <Skeleton as='a' href='/' />
export const placeholder: string = text(40)
export const tableLabel = <Skeleton as={TableBody} label='Loading roles' labelAs='tbody' />
// @ts-expect-error labelAs is one of span, tbody, tr or li
export const badLabelAs = <Skeleton label='Loading' labelAs='div' />
export const divRef = <Skeleton ref={createRef<HTMLDivElement>()} />
export const tbodyRef = <Skeleton as='tbody' ref={createRef<HTMLTableSectionElement>()} />
// @ts-expect-error the ref takes the element's type
export const badRef = <Skeleton as='tbody' ref={createRef<HTMLAnchorElement>()} />
