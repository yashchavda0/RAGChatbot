/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, RenderOptions } from '@testing-library/react';
import { within } from '@testing-library/jest-dom';

export type MockRenderOptions = {
  container?: HTMLElement;
}

