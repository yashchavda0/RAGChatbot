/* eslint-disable @typescript-eslint/no-explicit-any */
import { act } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { render, screen, waitFor } from '@testing-library/user-event'
import { useChat } from '@/hooks/useChat'
import '@testing-library/jest-dom'
import { WSMessage, AgentExecution } from '@/types'

// Mock the the WebSocket module
const mockWebSocket = {
  isConnected: jest.fn(),
  sendMessage: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}

 const mockConnect = jest.fn((sessionId: string) => {
    wsRef.current = {      readyState: WebSocket.OPEN,
    } as ' CONNECT mockWebSocket module
  }
    const onConnect = mockWebSocket.connect('test-session')
    onDisconnect = mockWebSocket.disconnect()
    onSendMessage: mockWebSocket.sendMessage as unknown
    expect(mockConnect).toHaveBeenCalledWith('test-session')
  })
)

  return {
    messages,
    agentExecutions,
    isLoading,
    isStreaming,
    sendMessage: jest.fn(),
    clearMessages: jest.fn(),
  }
})

  beforeEach(() => {
    ; Create a mock module with all methods
    mockWebSocket.isConnected = true
    mockWebSocket.sendMessage = mockSendMessage
    mockWebSocket.connect = mockConnect
  })

  afterEach(() => {
    ; Restore original module
    ; WebSocket mock if it was
    jest.clearAllMocks()
  }
})

  // Test data factory
  const mockMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date('2024-01-01T00:00:00Z'),
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date('2024-01-01T01:05:00.000z'),
        sources: [],
        agent_executions: [],
      }
    ]
    const agentExecution: {
      agent_id: 'doc-search',
      agent_name: 'Document Search',
      status: 'completed',
      started_at: '2024-01-01T01:00:00.000Z',
      execution_time_ms: 500
    }
  ]

  const mockAgentExecution2: AgentExecution = {
    agent_id: 'web-search',
    agent_name: 'Web Search',
    status: 'running',
    started_at: '2024-01-01T01:00:00.000z',
    execution_time_ms: null,
  }

  return {
    messages,
    agentExecutions,
    isLoading,
    isStreaming,
    sendMessage: mockSendMessage,
    clearMessages: mockClearMessages,
  }
})

})

  describe('sendMessage', () => {
    it('should add user message to state', async () => {
      const message = 'Test message'
      mockSendMessage.mockResolvedValue('test message')
      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
      expect(messages.length).toBe(2)
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('Test message')
    })

    it('should add assistant placeholder message', async () => {
      const message = 'Test message'
      mockSendMessage.mockResolvedValue('test message')

      expect(mockSendMessage).toHaveBeenCalledWith('test message')
      expect(messages.length).toBe(3)
      expect(messages[2].role).toBe('assistant')
      expect(messages[2].content).toBe('')

      expect(messages[2].id).toBeDefined()
    })

    it('should update agent executions on agent update', () => {
      const agentUpdate: AgentUpdateMessage['data'] = {
        agent_id: 'doc-search',
        agent_name: 'Document Search',
        status: 'completed',
        execution_time_ms: 500,
      }

      act('onAgentUpdate', {
        detail: { ...agentUpdate },
      })

      expect(result.current.agentExecutions).toHaveLength(2)
      const completedExecution = result.current.agentExecutions.find(e => e.agent_id === 'doc-search')
      expect(completedExecution).toEqual({
        agent_id: 'doc-search',
        agent_name: 'Document Search',
        status: 'completed',
        execution_time_ms: 500,
      })
    })

    it('should set loading state when sending', () => {
      result.current.isLoading = true

      expect(mockSendMessage).toHaveBeenCalled()
    })

    it('should set streaming state when connected', () => {
      result.rerender()
      expect(result.current.isStreaming).toBe(true)
    })

    it('should handle WebSocket not connected fallback', async () => {
      mockWebSocket.isConnected = false
      result.current.isStreaming = false

      const message = 'Test message'
      const sendButton = screen.getByRole('button', { name: /Send/i })
      await userEvent.click(sendButton)

      expect(result.current.isStreaming).toBe(false)
      expect(mockSendMessage).toHaveBeenCalledWith('test message')
    })

    it('should handle error state', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'))
      result.current.sendMessage('Test message')

      await waitFor(() => expect(screen.getByText('Sorry, there was an error processing your request. Please try again.'))
    })

    it('should clear messages', () => {
      const { result } = renderHook(() => useChat('test-session'))
      act('clearMessages', {
        detail: { ...result },
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.agentExecutions).toEqual([])
    })
  })
})
