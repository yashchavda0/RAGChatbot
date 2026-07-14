'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

interface TaskProgressProps {
  progress: number;
  message: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  className?: string;
}

/**
 * Component to display Celery task progress
 * 
 * @example
 * <TaskProgress 
 *   progress={taskStatus.progress} 
 *   message={taskStatus.message}
 *   status={taskStatus.status}
 * />
 */
export function TaskProgress({ progress, message, status = 'processing', className }: TaskProgressProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="w-4 h-4 text-[#6E6E73]" />,
          color: 'text-[#6E6E73]',
          bgColor: 'bg-[#6E6E73]',
        };
      case 'processing':
      case 'retrying':
        return {
          icon: <Loader2 className="w-4 h-4 text-[#5B5EFF] animate-spin" />,
          color: 'text-[#5B5EFF]',
          bgColor: 'bg-[#5B5EFF]',
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-[#34C759]" />,
          color: 'text-[#34C759]',
          bgColor: 'bg-[#34C759]',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-[#FF3B30]" />,
          color: 'text-[#FF3B30]',
          bgColor: 'bg-[#FF3B30]',
        };
      default:
        return {
          icon: <Loader2 className="w-4 h-4 text-[#5B5EFF] animate-spin" />,
          color: 'text-[#5B5EFF]',
          bgColor: 'bg-[#5B5EFF]',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn('w-full space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className={cn('font-medium', config.color)}>
            {status === 'pending' && 'Queued'}
            {status === 'processing' && 'Processing'}
            {status === 'retrying' && 'Retrying'}
            {status === 'completed' && 'Completed'}
            {status === 'failed' && 'Failed'}
          </span>
        </div>
        <span className="text-[#6E6E73] font-mono text-xs">{progress}%</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            config.bgColor,
            status === 'failed' && 'bg-[#FF3B30]',
            status === 'completed' && 'bg-[#34C759]'
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Message */}
      {message && (
        <p className="text-xs text-[#6E6E73] truncate" title={message}>
          {message}
        </p>
      )}
    </div>
  );
}


/**
 * Full-featured task progress card with cancel option
 */
interface TaskProgressCardProps extends TaskProgressProps {
  taskId?: string;
  onCancel?: () => void;
  showCancel?: boolean;
}

export function TaskProgressCard({
  progress,
  message,
  status,
  taskId,
  onCancel,
  showCancel = false,
  className,
}: TaskProgressCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border border-black/[0.06] bg-white shadow-sm', className)}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-[#1D1D1F]">Processing Document</h4>
          {taskId && (
            <p className="text-xs text-[#6E6E73] font-mono mt-1">Task ID: {taskId.slice(0, 8)}...</p>
          )}
        </div>
        {showCancel && status === 'processing' && onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-[#FF3B30] hover:underline"
          >
            Cancel
          </button>
        )}
      </div>

      <TaskProgress progress={progress} message={message} status={status} />
    </div>
  );
}
