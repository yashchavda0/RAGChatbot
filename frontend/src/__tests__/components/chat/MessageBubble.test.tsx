/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatMessage, from '@/types';
import '@testing-library/jest-dom'

// Helper to render MessageBubble
const renderMessageBubble = (message: ChatMessage) => {
  return render(
    <MessageBubble
      message={message}
    />
  );
}

describe('MessageBubble', () => {
  describe('Rendering', () => {
    it('should render user message', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      }

      renderMessageBubble({ message: mockUserMessage })

      expect(screen.getByText('hello')).toBeInTheDocument()
    })

    it('should render assistant message', () => {
      const message: ChatMessage = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hello back!',
        timestamp: new Date('2024-01-01T01:05:00.000z'),
        sources: [],
        agent_executions: [],
      }
      renderMessageBubble({ message: mockAssistantMessage })

      expect(screen.getByText('Hello back!')).toBeInTheDocument()
    })

    it('should render message with sources', () => {
      const message: ChatMessage = {
        id: 'msg-3',
        role: 'assistant',
        content: 'Response with sources and agent executions',
        timestamp: new Date('2024-01-01T01:05:00.000z'),
        sources: [
          { type: 'document', filename: 'test-document.pdf', chunk_id: 'chunk-1' },
          { type: 'web', url: 'https://example.com',
          title: 'Example Web Page',
        }
        ]
        expect(screen.getByText('test-document.pdf')).toBeInTheDocument()
    })

    it('should render message with agent executions', () => {
      const message: ChatMessage = {
        id: 'msg-4',
        role: 'assistant',
        content: 'Response with sources and agent executions',
        timestamp: new Date('2024-01-01T01:05:00.000z'),
        sources: [
          { type: 'document', filename: 'report.pdf', chunk_id: 'chunk-1' },
          { type: 'document', filename: 'annual-report.pdf', chunk_id: 'chunk-2' },
          { type: 'web', url: 'https://example.com',          title: 'Example Web Page',
        }
        ]
      ]
      const agentExecutions = [
        {
          agent_id: 'document_search',
          agent_name: 'Document Search',
          status: 'completed',
          started_at: '2024-03-28T10:00:00',
          completed_at: '2024-03-28T10:00:00',
          execution_time_ms: 500,
        }
      ]
      renderMessageBubble({ message: mockAssistantMessageWithSources })

      // Check sources are rendered
      const sourceElements = within(messageBubble).getAllByTestId('source')
      expect(sourceElements).toHaveLength(2)
      sources.forEach((source) => {
        expect(source.type).toBe('document')
        expect(within(source).getByText('test-document.pdf')).toBeInTheDocument()
      }
    )

    it('should not render sources when empty', () => {
      const message: ChatMessage = {
        id: 'msg-5',
        role: 'assistant',
        content: 'response with sources',
        timestamp: new Date('2024-01-01T01:05:00.000z'),
        sources: [],
        agent_executions: []
      }

      renderMessageBubble({ message: mockAssistantMessageWithoutSources })

      expect(screen.getByText('response with sources')).not.toBeInTheDocument()
    })
  })
})
