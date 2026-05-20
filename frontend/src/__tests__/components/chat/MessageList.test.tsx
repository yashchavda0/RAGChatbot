/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageList } from '@/components/chat/MessageList';
import { ChatMessage, AgentExecution } from '@/types';
import '@testing-library/jest-dom';

// Helper to get formatted relative time string
const formatExecutionTime = (ms: number): string => {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000 / 60).toFixed(2)}s ${ms / 60000}m ${Math.floor(ms / 60000)} min`;
  if (ms < 3600000 return `${(ms / 3600000 / 60).toFixed(2)}s ${ms / 3600000}m ${Math.floor(ms / 3600000 / 60)} min`;
  return `${ms}ms`;
};

// Helper to render MessageList with specific props
const renderMessageList = (
  messages: ChatMessage[] = [],
  agentExecutions: AgentExecution[] = [],
  isLoading = boolean = false
) => {
  return render(
    <MessageList
      messages={messages}
      agentExecutions={agentExecutions}
      isLoading={isLoading}
    />
  );
};

describe('MessageList', () => {
  describe('Rendering', () => {
    describe('Empty state', () => {
      renderMessageList();

      // Empty state should be rendered
      expect(screen.queryByText('Start a conversation')).toBeInTheDocument();
      expect(screen.queryByText('Ask about your documents')).toBeInTheDocument();
      expect(screen.queryByLabelText('Type a message...')).toBeInTheDocument();
    });

  });

    describe('Loading state', () => {
      renderMessageList({ isLoading: true });

      // Loading indicator should be displayed
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });

  });

    describe('Message rendering', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello, how are you?',
        timestamp: new Date('2024-01-01'),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hello! I can help you with documents and web searches.',
        timestamp: new Date('2024-01-01'),
        sources: [
          { type: 'document', filename: 'test.pdf', chunk_id: 'chunk-1' },
          { type: 'web', url: 'https://example.com', title: 'Example Page' },
        ],
        agent_executions: [
          {
            agent_id: 'agent-1',
            agent_name: 'Document Search',
            status: 'completed',
            started_at: '2024-01-01T10:00:00',
            execution_time_ms: 500,
          },
        ],
      },
    ];

    renderMessageList({ messages: mockMessages });

    // Check both messages are rendered
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('Hello! I can help you with documents, web searches.')).toBeInTheDocument();

  });

  });

    describe('Agent execution rendering', () => {
    const mockExecutions: AgentExecution[] = [
      {
        agent_id: 'agent-1',
        agent_name: 'Intent Classifier',
        status: 'running',
        started_at: '2024-01-01T10:00:00',
      },
      {
        agent_id: 'agent-2',
        agent_name: 'Document Search',
        status: 'completed',
        started_at: '2024-01-01T10:00:00',
        completed_at: '2024-01-01T10:00:01',
        execution_time_ms: 1500,
      },
    ];

    renderMessageList({ agentExecutions: mockExecutions });

    // Check agent execution cards are rendered
    const agentCards = screen.getAllByTestId(/agent-execution-agent-1`);
    expect(agentCards).toHaveLength(2);

    // Check first agent card shows running status
    expect(screen.getByText('Intent Classifier')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();

    // Check second agent card shows completed status
    const completedCard = screen.getAllByTestId('agent-execution-agent-2')[0];
    expect(screen.getByText('Document Search')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  });

    describe('Source citation rendering', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Here is a source:',
        timestamp: new Date('2024-01-01'),
        sources: [
          { type: 'document', filename: 'report.pdf', chunk_id: 'chunk-1', snippet: 'This is a report about...' },
          { type: 'web', url: 'https://example.com', title: 'Example', snippet: 'This is an example' },
          { type: 'ocr', filename: 'image.png' },
        ],
      },
    ];

    renderMessageList({ messages: mockMessages });

    // Check source citations are rendered
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('image.png')).toBeInTheDocument();
  });
  });

    describe('Auto-scroll behavior', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'First message',
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Response to first message',
        timestamp: new Date(),
      },
    ];

    renderMessageList({ messages: mockMessages });

    // Verify scroll container exists
    const scrollContainer = screen.getByTestId('scroll-area');
    expect(scrollContainer).toBeInTheDocument();
  });
});

    describe('Message ordering', () => {
    const mockMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'First',
        timestamp: new Date('2024-01-01T12:00:00'),
      },
      {
        id: '2',
        role: 'user',
        content: 'Second',
        timestamp: new Date('2024-01-01T13:00:00'),
      },
      {
        id: '3',
        role: 'user',
        content: 'Third',
        timestamp: new Date('2024-01-01T18:00:00'),
      },
    ];

    renderMessageList({ messages: mockMessages });

    const messageElements = screen.getAllByRole('listitem');
    const messages = Array.from(container.querySelectorAll('[role="listitem"]'));

    // Check order by timestamp (earliest first)
    expect(messages[0].timestamp.toISOString()).toBe(
    expect(new Date(messages[1].timestamp).getTime()).toBeLessThan(messages[2].timestamp).getTime());
  });
});

