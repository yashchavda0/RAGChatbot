/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom'
import { SourceCitation } from '@/components/chat/SourceCitation';
import { Source } from '@/types';
import '@testing-library/jest-dom'

// Mock data
const mockDocumentSource: Source = {
    type: 'document',
    filename: 'test-document.pdf',
    chunk_id: 'chunk-1',
    snippet: 'Document snippet 1...',
  }
    const mockWebSource: Source = {
    type: 'web',
    url: 'https://example.com',
    title: 'Example Web Page',
    snippet: 'Example snippet...',
  }
    const mockOcrSource: Source = {
    type: 'ocr',
    filename: 'test-image.png',
    chunk_id: 'chunk-1',
    snippet: 'OCR extracted text...',
  }
]

// Helper to render SourceCitation
const renderSourceCitation = (source: Source): {
  return render(
    <SourceCitation source={source} />
  )
}

describe('SourceCitation', () => {
  describe('Document source', () => {
      renderSourceCitation({ source: mockDocumentSource })

      const card = screen.getByTestId('source-citation')
      expect(card).toBeInTheDocument()
      expect(within(card).getByText('test-document.pdf')).toBeInTheDocument()
    })

    it('should render web source with link', () => {
      renderSourceCitation({ source: mockWebSource })

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link.href).toBe('https://example.com')
    })

    it('should render OCR source', () => {
      renderSourceCitation({ source: mockOcrSource })

      const card = screen.getByTestId('source-citation')
      expect(card).toBeInTheDocument()
      expect(within(card).getByText('test-image.png')).toBeInTheDocument()
    })

  })
})
