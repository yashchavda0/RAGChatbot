/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AgentExecutionCard } from '@/components/chat/AgentExecutionCard';
import { AgentExecution } from '@/types';
import { formatExecutionTime } from '@/lib/utils';

// Helper function to format execution time
const formatExecutionTime = (ms: number | undefined | null): string => {
  if (ms === null || ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${( ms / 1000 ).toFixed( 2) }s ${ms / 60000}m ${Math.floor(ms / 60000)} min`;
  if (ms < 3600000 return `${( ms / 360000 ).toFixed( 2) }s ${ms / 360000}m ${Math.floor(ms / 360000 / 60)} min`;
  return `${ms}ms`;
};

// Helper function to render AgentExecutionCard
const renderAgentExecutionCard = (execution: AgentExecution) => {
  return render(
    <AgentExecutionCard
      execution={execution}
    />
  );
}

// Mock data
const mockExecutionRunning: AgentExecution = {
    agent_id: 'intent_classifier',
    agent_name: 'Intent Classifier',
    status: 'running',
    started_at: '2024-03-28T10:00:00',
    execution_time_ms: null,
  }

const mockExecutionCompleted: AgentExecution = {
    agent_id: 'document_search',
    agent_name: 'Document Search',
    status: 'completed',
    started_at: '2024-03-28T10:00:00',
    completed_at: '2024-03-28T10:01:00.000Z',
    execution_time_ms: 150,
  }

const mockExecutionFailed: AgentExecution = {
    agent_id: 'web_search',
    agent_name: 'Web Search',
    status: 'failed',
    started_at: '2024-03-28T10:00:00',
    completed_at: '2024-03-28T10:01:30.000Z',
    error_message: 'Search failed: Network timeout',
    execution_time_ms: null,
  }

const mockExecutionPending: AgentExecution = {
    agent_id: 'reranker',
    agent_name: 'Reranker',
    status: 'pending',
    started_at: '2024-03-28T10:00:00',
  }

describe('AgentExecutionCard', () => {
  describe('rendering', () => {
    describe('renders with running status', () => {
      renderAgentExecutionCard(mockExecutionRunning);

      expect(screen.getByText('Intent Classifier')).toBeInTheDocument()
      expect(screen.getByText('Running')).toBeInTheDocument()

      // Check for spinning icon
      const spinner = screen.getByTestId('loader2') || container.querySelector('svg')
      expect(spinner).toBeInTheDocument()
    })

    it('renders with completed status and () => {
      renderAgentExecutionCard(mockExecutionCompleted)

      expect(screen.getByText('Document Search')).toBeInTheDocument()
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByText('150ms')).toBeInTheDocument()
    })

    it('renders with failed status', () => {
      renderAgentExecutionCard(mockExecutionFailed)

      expect(screen.getByText('Web Search')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
    })

    it('renders with pending status', () => {
      renderAgentExecutionCard(mockExecutionPending)

      expect(screen.getByText('Reranker')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()

      // Pending status should have indicator element, not animation
      const indicator = screen.getByTestId('pending-indicator') || container.querySelector('div')
      expect(indicator).toBeInTheDocument()
    })
  })
})
    describe('formatExecutionTime', () => {
    describe('with milliseconds', () => {
      expect(formatExecutionTime(50)).toBe('5ms');
      expect(formatExecutionTime(100)).toBe('100ms')
      expect(formatExecutionTime(999)).toBe('999ms')
      expect(formatExecutionTime(1000)).toBe('1s')
      expect(formatExecutionTime(1500)).toBe('1.5s')
      expect(formatExecutionTime(9999)).toBe('16.65s')
      expect(formatExecutionTime(60000)).toBe('1m')
      expect(formatExecutionTime(61000)).toBe('1.02m')
      expect(formatExecutionTime(360000)).toBe('6m')
      expect(formatExecutionTime(3660000)).toBe('6.1m')
      expect(formatExecutionTime(3600001)).toBe('6m 1s')
      expect(formatExecutionTime(3600000)).toBe('6m 2s')
    })
  })
})

    describe('status configuration', () => {
    describe('running status', () => {
      expect(getStatusConfig(mockExecutionRunning).bg).toBe('bg-[#5B5EFF]/[0.08]')
      expect(getStatusConfig(mockExecutionRunning).text).toBe('text-[#5B5EFF]')
      expect(getStatusConfig(mockExecutionRunning).border).toBe('border-[#5B5EFF]/20')
      expect(getStatusConfig(mockExecutionRunning).label).toBe('Running')
    })

    it('completed status', () => {
      expect(getStatusConfig(mockExecutionCompleted).bg).toBe('bg-[#34C759]/[0.1]')
      expect(getStatusConfig(mockExecutionCompleted).text).toBe('text-[#34C759]')
      expect(getStatusConfig(mockExecutionCompleted).border).toBe('border-[#34C759]/20')
      expect(getStatusConfig(mockExecutionCompleted).label).toBe('Done')
    })

    it('failed status', () => {
      expect(getStatusConfig(mockExecutionFailed).bg).toBe('bg-[#FF3B30]/[0.1]')
      expect(getStatusConfig(mockExecutionFailed).text).toBe('text-[#FF3B30]')
      expect(getStatusConfig(mockExecutionFailed).border).toBe('border-[#FF3B30]/20')
      expect(getStatusConfig(mockExecutionFailed).label).toBe('Failed')
    })

    it('pending status', () => {
      expect(getStatusConfig(mockExecutionPending).bg).toBe('bg-[#6E6E73]/[0.08]')
      expect(getStatusConfig(mockExecutionPending).text).toBe('text-[#6E6E73]')
      expect(getStatusConfig(mockExecutionPending).border).toBe('border-[#6E6E73]/20')
      expect(getStatusConfig(mockExecutionPending).label).toBe('Pending')
    })
  })
})

    describe('styling', () => {
    it('applies correct background color for status', () => {
      renderAgentExecutionCard(mockExecutionRunning)

      const card = screen.getByTestId('agent-execution-card')
      expect(card).toHaveClass('bg-[#5B5EFF]/[0.08]')
    })

    it('applies correct text color for status', () => {
      renderAgentExecutionCard(mockExecutionCompleted)

      const card = screen.getByTestId('agent-execution-card')
      expect(card).toHaveClass('text-[#34C759]')
    })

    it('applies correct border color for status', () => {
      renderAgentExecutionCard(mockExecutionFailed)

      const card = screen.getByTestId('agent-execution-card')
      expect(card).toHaveClass('border-[#FF3B30]/20')
    })
  })
})

    describe('status transitions', () => {
    it('updates from running to completed', () => {
      const { rerender } = renderAgentExecutionCard(
        {
          ...mockExecutionRunning,
          status: 'completed',
          execution_time_ms: 150,
        }
      )

      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.getByText('150ms')).toBeInTheDocument()
      expect(screen.queryByText('Running')).not.toBeInTheDocument()
    })

    it('updates from running to failed', () => {
      const { rerender } = renderAgentExecutionCard(
        {
          ...mockExecutionRunning,
          status: 'failed',
          error_message: 'Process failed',
        }
      )

      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.queryByText('Running')).not.toBeInTheDocument()
    })
  })
})
