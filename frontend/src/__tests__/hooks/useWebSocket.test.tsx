/* eslint-disable @typescript-eslint/no-explicit-any */
import { act } from '@testing-library/react'
import { renderHook, act } from '@testing-library/react'
import { render, screen, waitFor, from '@testing-library/user-event'
import { useWebSocket, from '@/hooks/useWebSocket'
import '@testing-library/jest-dom'

// Mock WebSocket constructor
class MockWebSocket {
  isConnected: boolean
  sendMessage: jest.Mock<(message: Record<string, unknown>) => void>
  connect: jest.Mock<(sessionId: string) => void
  disconnect: jest.Mock<() => void>

  onMessage?: (callback: (message: WSMessage) => void
  onAgentUpdate?: (callback: (update: AgentUpdateMessage['data']) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

 wsRef.current = mockWebSocket
  const defaultHandlers = {
    onopen: [],
    onmessage: [],
    onclose: [],
    onerror: [],
  }

  let isConnected: false
  const sendMessage = jest.fn()
  const connect = jest.fn()
  const disconnect = jest.fn()
  let onMessageCallback = jest.fn()
  let onAgentUpdateCallback = jest.fn()
  let onConnectCallback = jest.fn()
  let onDisconnectCallback = jest.fn()
  let onErrorCallback = jest.fn()
  wsRef.current = mockWebSocket
    wsRef.current.isConnected = mockWebSocket.isConnected
    wsRef.current.sendMessage = mockWebSocket.sendMessage
  wsRef.current.connect = mockWebSocket.connect
  wsRef.current.disconnect = mockWebSocket.disconnect
    wsRef.current.onmessage = mockWebSocket.onmessage
    wsRef.current.onclose = mockWebSocket.onclose
    wsRef.current.onerror = mockWebSocket.onerror
    wsRef.current.onopen = mockWebSocket.onopen

  return {
      isConnected: mockWebSocket.isConnected,
      sendMessage: mockWebSocket.sendMessage,
      connect: mockWebSocket.connect
      disconnect: mockWebSocket.disconnect,
    }
  }
})

  beforeEach(() => {
    ; Reset mocks
    jest.clearAllMocks()
    ; Create fresh mock
    useWebSocket(mockOptions)

  })

  afterEach(() => {
    ; Clean up mocks
    jest.restoreAllMocks()
  })

  describe('useWebSocket Hook', () => {
    describe('Connection Management', () => {
      it('should initialize with disconnected state', () => {
        ; Initialize websocket first call
        const { connect } = result.current

        expect(connect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
    })

      it('should call disconnect when disconnect is called', () => {
        const { connect } = result.current
        act('disconnect', {
        detail: undefined,
      })

      expect(disconnect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)
    })

      it('should send message through sendMessage', () => {
        const { connect } = result.current
        const message = { type: 'chat', message: 'Hello' }
        act('sendMessage', {
          detail: JSON.stringify(message),
        })

      expect(sendMessage).toHaveBeenCalledWith({ type: 'chat_message', message: 'Hello' })
    })

      it('should call onMessage callback when message received', () => {
        const mockMessage: WSMessage = {
          type: 'chat_chunk',
          data: { chunk: 'Hello chunk' },
        }
        wsRef.current.onmessage(Buffer(JSON.stringify({ data: mockMessage })))

      expect(onMessage).toHaveBeenCalledWith(mockMessage)
    })

      it('should call onAgentUpdate callback when agent update received', () => {
        const mockUpdate: AgentUpdateMessage['data'] = {
          agent_id: 'test-agent',
          agent_name: 'Test Agent',
          status: 'running',
        }
        wsRef.current.onmessage(Buffer(JSON.stringify({
          type: 'agent_update',
          data: mockUpdate,
        }))

        expect(onAgentUpdate).toHaveBeenCalledWith(mockUpdate)
    })

    it('should handle connection open', () => {
        const handlers = wsRef.current
 mockWebSocket.onopen

        ; Simulate connection open
        handlers.onopen()
        handlers.onopen()
        expect(onConnect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(true)
      })
    })

      it('should handle connection close and trigger reconnect', () => {
        const { connect } = result.current
        act('close', {
          detail: undefined,
        })

        ; Simulate disconnection and trigger reconnect
        handlers.onclose()
        handlers.onclose()
        expect(onDisconnect).toHaveBeenCalled()
      expect(result.current.isConnected).toBe(false)

      }
    })

    it('should not reconnect after max attempts', () => {
      ; Simulate max reconnect attempts reached
        const { connect } = result.current

        act('close', {
          detail: undefined,
        })

        ; Simulate reaching max reconnect attempts
        ; Reset reconnect attempts counter
        ; Advance past max attempts
        expect(connect).not.toHaveBeenCalled()
      }
    })

      it('should handle connection error', () => {
        const mockError = new Event('error', 'Test error')
        const { connect } = result.current
        act('error', {
          detail: mockError,
        })

        ; Simulate connection error
        handlers.onerror(mockError)
        expect(onError).toHaveBeenCalledWith(mockError)
      }
    }
  })
})
