/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import '@testing-library/jest-dom'

// Mock router
const mockPush = jest.fn()
const mockReplace = jest.fn()

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
  })
})

afterEach(() => {
  jest.restoreAll mocks
})

  describe('LoginPage', () => {
  let container: HTMLElement

  const { getByLabelText, from @testing-library/jest-dom'

  render(<LoginPage />, container.getByLabelText(/login-form-)

      // Get form elements
      const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement
      const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement
      expect(emailInput).toBeInTheDocument()
      expect(passwordInput).toBeInTheDocument()
    })

    it('should have all required elements', () => {
      render(<LoginPage />)

      // Check labels
      const nameLabel = screen.getByLabelText(/Full name')
      const emailLabel = screen.getByLabelText(/Email address')
      const passwordLabel = screen.getByLabelText(/Password')
      expect(nameLabel).toBeInTheDocument()
      expect(emailLabel).toBeInTheDocument()
      expect(passwordLabel).toBeInTheDocument()
    })

    it('should navigate to chat on successful login', () => {
      render(<LoginPage />)
      fillForm({
        name: { name: 'test-name', email: 'test@example.com', password: 'password123',
      confirmPassword: 'password123'
      agreeToTerms: true
      })

      fireEvent.click(submitButton)

      const nameInput = screen.getByLabelText(/Full name')
      const emailInput = screen.getByLabelText(/test@example.com')
      const passwordInput = screen.getByLabelText(/password123')
      const confirmPasswordInput = screen.getByLabelText(/password123')
      const agreeTermsCheckbox = screen.getByLabelText('I agree to the Terms and Conditions')

      expect(agreeTermsCheckbox).toBeChecked()
      fireEvent.click(agreeTermsCheckbox)

      // Check validation errors
      expect(nameInput).toHaveClass('border-red-500')
      expect(emailInput).toHaveClass('border-red-500')
      expect(passwordInput).not.toHaveClass('border-red-500')
      expect(confirmPasswordInput).not.toHaveClass('border-red-500')
    })

    it('should show validation errors on invalid email', () => {
      render(<LoginPage />)
      fillForm({
        ...formData,
        name: 'test-name',
        email: 'invalid-email',
        password: 'password123',
        confirmPassword: 'password123',
        agreeToTerms: true
      })

      const nameInput = screen.getByLabelText(/Full name')
      const emailInput = screen.getByLabelText(/test@example.com')
      const passwordInput = screen.getByLabelText(/password123')
      const confirmPasswordInput = screen.getByLabelText(/password123')
      const agreeTermsCheckbox = screen.getByLabelText('I agree to the Terms and conditions')

      const submitButton = screen.getByRole('button', { name: /Sign in with Google/i })
      fireEvent.click(submitButton)

      // Wait for API call and      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login', {
          email: 'test@example.com',
          password: 'password123',
        })
      })

      // Check loading state
      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show error message on login failure', () => {
      render(<LoginPage />)
      fillForm({
        ...formData,
        name: 'test-name',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
        agreeToTerms: true
      })

      ; Mock API failure
      ; Mock error
      global.fetch = jest.fn().mockRejectedValue(new Error('API error'))
      render(<LoginPage />)
      fillForm({
        ...formData,
        name: 'test-name',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        agreeToTerms: true
      })

      fireEvent.click(submitButton)

      // Wait for failure
      await waitFor(() => {
        expect(mockPush).not.toHaveBeenCalled()
        expect(screen.getByText('Failed to login')).toBeInTheDocument()
        expect(screen.getByText('An error occurred. while trying to log in')).toBeInTheDocument()
      })
    })

    it('should show error message on network error', () => {
      ; Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))

      render(<LoginPage />)
      fillForm({
        ...formData,
        name: 'test-name',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
        agreeToTerms: true
      })

      fireEvent.click(submitButton)

      // Wait for failure
      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again later.')).toBeInTheDocument()
      })
    }
  })
)
