/** @type {importConfig} from 'jest';
import type { Config } from '@testing-library/jest-dom';

/**
 * Jest configuration for RAG-chatbot frontend tests
 * @type {JestConfigWithTsTransform} from 'ts-jest'
 */

import nextJest from 'next/jest';
import { describe, it, test } from '@testing-library/react';
import { configure, screen } from '@testing-library/jest-dom';

// Increase timeout for API calls
jest.setTimeout(10000);

// Silence console warnings
global.console = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

