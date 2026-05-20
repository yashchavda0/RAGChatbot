'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AuthInput } from '@/components/auth/AuthInput';

// Icons
const MailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const SuccessIcon = () => (
  <div className="w-16 h-16 rounded-full bg-[#34C759]/10 flex items-center justify-center mx-auto mb-4">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={32}
      height={32}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#34C759"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  </div>
);

interface FormData {
  email: string;
}

interface FormErrors {
  email?: string;
}

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState('');
  const [formData, setFormData] = React.useState<FormData>({
    email: '',
  });
  const [errors, setErrors] = React.useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      // In production, replace with actual password reset logic
      console.log('Password reset request for:', formData.email);
      setSubmittedEmail(formData.email);
      setIsSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#5B5EFF]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#5B5EFF]/5 rounded-full blur-3xl" />
        </div>

        <div className="relative w-full max-w-md animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#5B5EFF] flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#1D1D1F]">RAG Chatbot</span>
            </Link>
          </div>

          {/* Success card */}
          <div className="glass-heavy rounded-2xl p-8 shadow-apple text-center">
            <SuccessIcon />
            <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">
              Check your email
            </h1>
            <p className="mt-3 text-[15px] text-[#6E6E73] leading-relaxed">
              We&apos;ve sent a password reset link to{' '}
              <span className="font-medium text-[#1D1D1F]">{submittedEmail}</span>
            </p>
            <p className="mt-4 text-[14px] text-[#6E6E73]">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setIsSuccess(false)}
                className="text-[#5B5EFF] hover:text-[#4040DD] transition-colors font-medium"
              >
                try again
              </button>
            </p>

            <div className="mt-8 pt-6 border-t border-black/[0.06]">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-[14px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
              >
                <ArrowLeftIcon />
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#5B5EFF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#5B5EFF]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#5B5EFF] flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#1D1D1F]">RAG Chatbot</span>
          </Link>
          <h1 className="text-2xl font-semibold text-[#1D1D1F] tracking-tight">
            Forgot your password?
          </h1>
          <p className="mt-2 text-[15px] text-[#6E6E73]">
            No worries, we&apos;ll send you reset instructions
          </p>
        </div>

        {/* Forgot password form card */}
        <div className="glass-heavy rounded-2xl p-8 shadow-apple">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              label="Email"
              type="email"
              placeholder="Enter your email"
              icon={<MailIcon />}
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={errors.email}
              disabled={isLoading}
              helperText="Enter the email address associated with your account"
            />

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-[15px] font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send reset link'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-black/[0.06] text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-[14px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
            >
              <ArrowLeftIcon />
              Back to sign in
            </Link>
          </div>
        </div>

        {/* Additional help */}
        <p className="mt-6 text-center text-[14px] text-[#6E6E73]">
          Need help?{' '}
          <Link
            href="/support"
            className="text-[#5B5EFF] hover:text-[#4040DD] transition-colors font-medium"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
