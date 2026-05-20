'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { QAPair } from './QATable';

interface QAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<QAPair, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editData?: QAPair | null;
  isLoading?: boolean;
}

const categories = [
  'General',
  'Product',
  'Support',
  'Billing',
  'Technical',
  'Sales',
];

export function QAModal({ isOpen, onClose, onSave, editData, isLoading }: QAModalProps) {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'General',
    tags: [] as string[],
    status: 'active' as 'active' | 'inactive',
  });
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editData) {
      setFormData({
        question: editData.question,
        answer: editData.answer,
        category: editData.category,
        tags: editData.tags,
        status: editData.status,
      });
    } else {
      setFormData({
        question: '',
        answer: '',
        category: 'General',
        tags: [],
        status: 'active',
      });
    }
    setErrors({});
    setTagInput('');
  }, [editData, isOpen]);

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.question.trim()) {
      newErrors.question = 'Question is required';
    }
    if (!formData.answer.trim()) {
      newErrors.answer = 'Answer is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-apple-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-black/[0.04]">
          <h2 className="text-[17px] font-semibold text-[#1D1D1F]">
            {editData ? 'Edit Q&A Pair' : 'Add Q&A Pair'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Question */}
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">
              Question <span className="text-[#FF3B30]">*</span>
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => setFormData((prev) => ({ ...prev, question: e.target.value }))}
              placeholder="Enter the question..."
              rows={2}
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white text-[14px] text-[#1D1D1F] placeholder:text-[#6E6E73]/60 transition-all duration-200 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF]/30',
                errors.question ? 'border-[#FF3B30]' : 'border-black/[0.08]'
              )}
            />
            {errors.question && (
              <p className="mt-1 text-[12px] text-[#FF3B30]">{errors.question}</p>
            )}
          </div>

          {/* Answer */}
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">
              Answer <span className="text-[#FF3B30]">*</span>
              <span className="text-[11px] text-[#6E6E73] font-normal ml-1">(Markdown supported)</span>
            </label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData((prev) => ({ ...prev, answer: e.target.value }))}
              placeholder="Enter the answer..."
              rows={4}
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-white text-[14px] text-[#1D1D1F] placeholder:text-[#6E6E73]/60 transition-all duration-200 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF]/30',
                errors.answer ? 'border-[#FF3B30]' : 'border-black/[0.08]'
              )}
            />
            {errors.answer && (
              <p className="mt-1 text-[12px] text-[#FF3B30]">{errors.answer}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, category: cat }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200',
                    formData.category === cat
                      ? 'bg-[#5B5EFF] text-white'
                      : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#E5E5EA]'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] bg-[#5B5EFF]/10 text-[#5B5EFF]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="w-4 h-4 rounded-full hover:bg-[#5B5EFF]/20 flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-[13px] font-medium text-[#1D1D1F]">
                Status
              </label>
              <p className="text-[12px] text-[#6E6E73]">
                Inactive Q&A pairs won't be used in responses
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  status: prev.status === 'active' ? 'inactive' : 'active',
                }))
              }
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                formData.status === 'active' ? 'bg-[#34C759]' : 'bg-[#E5E5EA]'
              )}
            >
              <span
                className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
                  formData.status === 'active' ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-black/[0.04] bg-[#F5F5F7]/50">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              editData ? 'Save Changes' : 'Add Q&A'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
