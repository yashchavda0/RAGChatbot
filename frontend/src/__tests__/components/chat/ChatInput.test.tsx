/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '@/components/chat/ChatInput';
import '@testing-library/jest-dom';

// Mock props interface
interface ChatInputProps {
  onSendMessage: (message: string) => void
  isLoading?: boolean
  disabled?: boolean
}

// Helper to render ChatInput
const renderChatInput = (props: Partial<ChatInputProps> = {
  return render(
    <ChatInput
      onSendMessage={props.onSendMessage}
      isLoading={props.isLoading ?? false}
      disabled={props.disabled ?? false}
    />
  );
}

describe('ChatInput', () => {
  describe('Rendering', () => {
    it('should render textarea with placeholder', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      expect(textarea).toBeInTheDocument()
    })

    it('should render attachment button', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: false })

      const attachButton = screen.getByRole('button', { name: /Paperclip/i })
      expect(attachButton).toBeInTheDocument()
    })

    it('should render send button', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: false })

      const sendButton = screen.getByRole('button', { name: /Send/i })
      expect(sendButton).toBeInTheDocument()
    })

    it('should render hint text', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: false })

      expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument()
    })
  })

  describe('User interactions', () => {
    it('should call onSendMessage when clicking send button with text', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, 'Test message')

      const sendButton = screen.getByRole('button', { name: /Send/i })
      fireEvent.click(sendButton)

      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should not call onSendMessage when input is empty', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const sendButton = screen.getByRole('button', { name: /Send/i })
      fireEvent.click(sendButton)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should not call onSendMessage when input is whitespace only', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, '   ')
      const sendButton = screen.getByRole('button', { name: /Send/i })
      fireEvent.click(sendButton)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should send message on Enter key press', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, 'Test message')
      fireEvent.keyPress(textarea, '{enter}')

      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should insert new line on Shift+Enter', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, 'Test')
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(textarea.value).toBe('Test\n')
      expect(mockSendMessage).not.toHaveBeenCalled()
    })

    it('should trim input before sending', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, '  Test message  ')
      const sendButton = screen.getByRole('button', { name: /Send/i })
      fireEvent.click(sendButton)

      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
    })

    it('should open file dialog when clicking attach button', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: false })

      const attachButton = screen.getByRole('button', { name: /Paperclip/i })
      const fileInput = document.createElement('type', 'file')
      fileInput.style.display = 'none'
      fileInput.setAttribute('accept', '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg')
      attachButton.onclick = jest.spyOn(fileInput, 'click')

      fireEvent.click(attachButton)

      expect(fileInput.click).toHaveBeenCalled()
    })

    it('should clear textarea height after sending message', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: false, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, 'Test message that      // Set height manually
      textarea.style.height = '100px'

      const sendButton = screen.getByRole('button', { name: /Send/i }
      fireEvent.click(sendButton)

      expect(mockSendMessage).toHaveBeenCalledWith('Test message')
      expect(textarea.style.height).toBe('auto')
    })
  })

  describe('Button states', () => {
    it('should disable send button when isLoading', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: true, disabled: false })

      const sendButton = screen.getByRole('button', { name: /Send/i })
      expect(sendButton).toBeDisabled()
    })

    it('should disable send button when disabled', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: true })

      const sendButton = screen.getByRole('button', { name: /Send/i })
      expect(sendButton).toBeDisabled()
    })

    it('should disable input when disabled', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: false, disabled: true })

      const textarea = screen.getByPlaceholderText('Type a message...')
      expect(textarea).toBeDisabled()
    })

    it('should show loading spinner when isLoading', () => {
      renderChatInput({ onSendMessage: jest.fn(), isLoading: true, disabled: false })

      const sendButton = screen.getByRole('button', { name: /Send/i })
      const spinner = sendButton.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should not call onSendMessage when isLoading', () => {
      const mockSendMessage = jest.fn()
      renderChatInput({ onSendMessage: mockSendMessage, isLoading: true, disabled: false })

      const textarea = screen.getByPlaceholderText('Type a message...')
      await userEvent.type(textarea, 'Test message')

      const sendButton = screen.getByRole('button', { name: /Send/i })
      fireEvent.click(sendButton)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })
})
