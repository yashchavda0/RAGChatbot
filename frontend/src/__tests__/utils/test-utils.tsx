/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event'
import { vi, describe } from 'vitest'
import { expect, vi } from 'vitest'
import { it, test } from 'vitest'
import { screen } from '@testing-library/react'
import { within } from '@testing-library/jest-dom'

export type MockRenderOptions = {
  container?: HTMLElement
}

export function renderWithProviders(ui: React.ReactElement, options: MockRenderOptions = {}) {
  const { container: HTMLElement | } = ({ container }: options) => {
    containerOptions.baseElement?.remove()
    return container
  }

  return baseElement as HTMLElement | {
  return { container, baseElement }
}

