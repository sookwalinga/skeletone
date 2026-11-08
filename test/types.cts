// Compiled by `yarn typecheck`, never run: checks the types a CommonJS project, such as a
// Jest setup, sees through require().
import { createElement } from 'react'
import { skeleton, Skeleton } from 'skeletone/react'
import { skeleton as svelteSkeleton } from 'skeletone/svelte'
import { text } from 'skeletone/text'
import { vSkeleton } from 'skeletone/vue'
import type { ObjectDirective } from 'vue'

export const spread: { 'data-skeleton'?: string; inert?: boolean } = skeleton(true)
export const wrapper = createElement(Skeleton, { as: 'ul', count: 3, label: 'Loading' })
export const directive: ObjectDirective<HTMLElement, boolean | undefined | null> = vSkeleton
export const attrs: { 'data-skeleton'?: string; inert?: boolean } = svelteSkeleton(false)
export const placeholder: string = text(40)
// @ts-expect-error length is a number
export const badText = text('40')
