"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = "/api";

export interface TaskStatus {
  task_id: string;
  state: string;
  status: string;
  progress: number;
  message: string;
  result?: any;
  error?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

interface UseTaskPollingOptions {
  taskId: string | null;
  interval?: number; // Polling interval in ms (default: 1000)
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for polling Celery task status
 *
 * @example
 * const { status, isLoading, isComplete, error } = useTaskPolling({
 *   taskId: taskId,
 *   onComplete: (result) => console.log('Task completed:', result),
 *   onError: (error) => console.error('Task failed:', error),
 * });
 */
export function useTaskPolling({
  taskId,
  interval = 1000,
  onComplete,
  onError,
}: UseTaskPollingOptions) {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isComplete = status?.state === "SUCCESS" || status?.state === "FAILURE";
  const isFailed = status?.state === "FAILURE";

  const fetchStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: TaskStatus = await response.json();
      setStatus(data);

      // Call callbacks
      if (data.state === "SUCCESS" && onComplete) {
        onComplete(data.result);
      } else if (data.state === "FAILURE" && onError) {
        onError(data.error || "Task failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch task status";
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [taskId, onComplete, onError]);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    fetchStatus();

    // Stop polling when task is complete
    if (isComplete) {
      return;
    }

    const intervalId = setInterval(fetchStatus, interval);

    return () => {
      clearInterval(intervalId);
    };
  }, [taskId, interval, isComplete, fetchStatus]);

  return {
    status,
    isLoading,
    isComplete,
    isFailed,
    error,
    progress: status?.progress || 0,
    message: status?.message || "",
  };
}

/**
 * Cancel a running Celery task
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: "DELETE",
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to cancel task:", error);
    return false;
  }
}

/**
 * Get all tasks for a chatbot
 */
export async function getChatbotTasks(
  chatbotId: string,
  options?: {
    task_type?: string;
    status?: string;
    limit?: number;
  },
): Promise<TaskStatus[]> {
  try {
    const params = new URLSearchParams();
    if (options?.task_type) params.append("task_type", options.task_type);
    if (options?.status) params.append("status", options.status);
    if (options?.limit) params.append("limit", options.limit.toString());

    const url = `${API_URL}/tasks/chatbot/${chatbotId}${params.toString() ? "?" + params.toString() : ""}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch chatbot tasks:", error);
    return [];
  }
}
