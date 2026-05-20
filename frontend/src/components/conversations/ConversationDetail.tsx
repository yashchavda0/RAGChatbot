'use client';

import React, { useState } from 'react';
import {
  Mail,
  Globe,
  Key,
  Star,
  Clock,
  Monitor,
  MapPin,
  Download,
  Trash2,
  CheckCircle,
  Flag,
  MessageSquare,
  Tag,
  Edit3,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Conversation } from '@/types/conversation';
import { MessageThread } from './MessageThread';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ConversationDetailProps {
  conversation: Conversation | null;
  onUpdateStatus?: (id: string, status: Conversation['status']) => void;
  onDelete?: (id: string) => void;
  onExport?: (conversation: Conversation) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
}

// Format duration
const formatDuration = (startTime: Date, endTime?: Date): string => {
  const start = new Date(startTime).getTime();
  const end = endTime ? new Date(endTime).getTime() : Date.now();
  const durationMs = end - start;
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Format date
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Rating Stars Component
const RatingDisplay = ({ rating, feedback }: { rating?: number; feedback?: string }) => {
  const [showFeedback, setShowFeedback] = useState(false);

  if (!rating) {
    return (
      <span className="text-sm text-[#6E6E73]">No rating provided</span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'w-5 h-5',
                star <= rating ? 'text-[#FF9500] fill-[#FF9500]' : 'text-[#E5E5EA]'
              )}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-[#1D1D1F]">{rating}/5</span>
      </div>
      {feedback && (
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="flex items-center gap-1 text-sm text-[#5B5EFF] hover:underline"
        >
          {showFeedback ? 'Hide' : 'View'} feedback
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              showFeedback && 'rotate-180'
            )}
          />
        </button>
      )}
      {showFeedback && feedback && (
        <div className="p-3 bg-[#F5F5F7] rounded-xl text-sm text-[#1D1D1F] animate-fade-in">
          "{feedback}"
        </div>
      )}
    </div>
  );
};

// Empty State
const EmptyState = () => (
  <div className="h-full flex items-center justify-center p-8">
    <div className="text-center max-w-sm">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#5B5EFF]/10 to-[#5B5EFF]/5 flex items-center justify-center">
        <MessageSquare className="w-10 h-10 text-[#5B5EFF]" />
      </div>
      <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">Select a conversation</h3>
      <p className="text-sm text-[#6E6E73] leading-relaxed">
        Choose a conversation from the list to view the full message thread and details
      </p>
    </div>
  </div>
);

export function ConversationDetail({
  conversation,
  onUpdateStatus,
  onDelete,
  onExport,
  onUpdateNotes,
}: ConversationDetailProps) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(conversation?.notes || '');
  const [showMetadata, setShowMetadata] = useState(true);

  // Update notes when conversation changes
  React.useEffect(() => {
    setNotesValue(conversation?.notes || '');
  }, [conversation?.notes]);

  if (!conversation) {
    return <EmptyState />;
  }

  const handleSaveNotes = () => {
    if (onUpdateNotes) {
      onUpdateNotes(conversation.id, notesValue);
    }
    setIsEditingNotes(false);
  };

  return (
    <div className="h-full flex">
      {/* Main Content - Message Thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-black/[0.06] bg-white/80 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            {/* User Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold',
                  conversation.user.type === 'email'
                    ? 'bg-[#5B5EFF]'
                    : conversation.user.type === 'ip'
                    ? 'bg-[#34C759]'
                    : 'bg-[#FF9500]'
                )}
              >
                {conversation.user.identifier.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-[#1D1D1F] truncate">
                  {conversation.user.identifier}
                </h2>
                <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(conversation.startedAt, conversation.endedAt)}
                  </span>
                  <span className="text-[#E5E5EA]">|</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {conversation.messageCount} messages
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {conversation.status !== 'resolved' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus?.(conversation.id, 'resolved')}
                  className="gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Mark Resolved</span>
                </Button>
              )}
              {conversation.status !== 'flagged' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onUpdateStatus?.(conversation.id, 'flagged')}
                  className="gap-1.5"
                >
                  <Flag className="w-4 h-4" />
                  <span className="hidden sm:inline">Flag</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport?.(conversation)}
                className="gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete?.(conversation.id)}
                className="text-[#FF3B30] hover:bg-[#FF3B30]/5 gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Rating */}
          <div className="mt-4 pt-4 border-t border-black/[0.04]">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <span className="text-sm font-medium text-[#6E6E73]">Satisfaction</span>
              </div>
              <RatingDisplay rating={conversation.rating} feedback={conversation.feedback} />
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <MessageThread messages={conversation.messages} />
      </div>

      {/* Sidebar - Metadata */}
      <div className="hidden lg:block w-80 flex-shrink-0 border-l border-black/[0.06] bg-white/50 overflow-y-auto scrollbar-apple">
        <div className="p-4">
          {/* Toggle */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-sm font-semibold text-[#1D1D1F]">Conversation Details</span>
            <ChevronRight
              className={cn(
                'w-4 h-4 text-[#6E6E73] transition-transform',
                showMetadata && 'rotate-90'
              )}
            />
          </button>

          {showMetadata && (
            <div className="mt-4 space-y-6 animate-fade-in">
              {/* Timestamps */}
              <div>
                <h4 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">
                  Timeline
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#6E6E73] mt-0.5" />
                    <div>
                      <p className="text-sm text-[#1D1D1F]">Started</p>
                      <p className="text-xs text-[#6E6E73]">{formatDate(conversation.startedAt)}</p>
                    </div>
                  </div>
                  {conversation.endedAt && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#34C759] mt-0.5" />
                      <div>
                        <p className="text-sm text-[#1D1D1F]">Ended</p>
                        <p className="text-xs text-[#6E6E73]">{formatDate(conversation.endedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div>
                <h4 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">
                  User Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {conversation.user.type === 'email' ? (
                      <Mail className="w-4 h-4 text-[#6E6E73]" />
                    ) : conversation.user.type === 'ip' ? (
                      <Globe className="w-4 h-4 text-[#6E6E73]" />
                    ) : (
                      <Key className="w-4 h-4 text-[#6E6E73]" />
                    )}
                    <span className="text-sm text-[#1D1D1F]">{conversation.user.identifier}</span>
                  </div>
                  {conversation.user.device && (
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-[#6E6E73]" />
                      <span className="text-sm text-[#1D1D1F]">{conversation.user.device}</span>
                    </div>
                  )}
                  {conversation.user.browser && (
                    <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                      <span className="w-4 text-center">-</span>
                      <span>{conversation.user.browser}</span>
                    </div>
                  )}
                  {conversation.user.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#6E6E73]" />
                      <span className="text-sm text-[#1D1D1F]">
                        {conversation.user.location.city}, {conversation.user.location.country}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <h4 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {conversation.tags.length > 0 ? (
                    conversation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-[#5B5EFF]/10 text-[#5B5EFF]"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[#6E6E73]">No tags</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-xs font-semibold text-[#6E6E73] uppercase tracking-wider mb-3">
                  Notes
                </h4>
                {isEditingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add notes about this conversation..."
                      className="w-full h-24 px-3 py-2 text-sm rounded-xl border border-black/[0.08] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/20 focus-visible:border-[#5B5EFF]/30 resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleSaveNotes}>
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNotesValue(conversation.notes || '');
                          setIsEditingNotes(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingNotes(true)}
                    className="p-3 rounded-xl bg-[#F5F5F7] cursor-pointer hover:bg-[#ECECEF] transition-colors group"
                  >
                    {conversation.notes ? (
                      <p className="text-sm text-[#1D1D1F]">{conversation.notes}</p>
                    ) : (
                      <p className="text-sm text-[#6E6E73] group-hover:text-[#1D1D1F]">
                        Click to add notes...
                      </p>
                    )}
                    <Edit3 className="w-3.5 h-3.5 text-[#6E6E73] mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
