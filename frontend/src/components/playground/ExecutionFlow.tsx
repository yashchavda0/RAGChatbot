'use client';

import React from 'react';
import {
  Target,
  FileSearch,
  Globe,
  Cpu,
  Link2,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Circle,
} from 'lucide-react';
import { AgentExecution } from '@/types';
import { cn } from '@/lib/utils';

interface ExecutionFlowProps {
  executions: AgentExecution[];
  currentIntent: string | null;
  isStreaming: boolean;
}

export function ExecutionFlow({ executions, currentIntent, isStreaming }: ExecutionFlowProps) {
  // Build the flow based on executions
  const flowSteps = React.useMemo(() => {
    const steps: FlowStep[] = [
      {
        id: 'intent',
        label: 'Intent Classification',
        icon: Target,
        status: currentIntent ? 'completed' : isStreaming ? 'running' : 'pending',
        description: currentIntent ? `Detected: ${currentIntent}` : 'Analyzing query...',
      },
    ];

    // Add execution steps
    executions.forEach((exec) => {
      steps.push({
        id: exec.agent_id,
        label: exec.agent_name,
        icon: getAgentIcon(exec.agent_id),
        status: exec.status,
        description: exec.error_message || getAgentDescription(exec.agent_id),
        executionTime: exec.execution_time_ms,
      });
    });

    // Add response synthesis if we have executions
    if (executions.length > 0) {
      const hasCompletedAgents = executions.some((e) => e.status === 'completed');
      const allCompleted = executions.every((e) => e.status === 'completed' || e.status === 'failed');

      steps.push({
        id: 'synthesis',
        label: 'Response Synthesis',
        icon: Sparkles,
        status: allCompleted ? 'completed' : hasCompletedAgents ? 'running' : 'pending',
        description: 'Generating final response',
      });
    }

    return steps;
  }, [executions, currentIntent, isStreaming]);

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-[#1D1D1F] mb-4">Execution Flow</h3>

      <div className="space-y-1">
        {flowSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            <FlowStepNode step={step} isLast={index === flowSteps.length - 1} />
            {index < flowSteps.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowRight className="w-4 h-4 text-[#6E6E73]/40 rotate-90" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {flowSteps.length === 0 && (
        <div className="text-center py-8 text-[#6E6E73]">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Send a message to see the execution flow</p>
        </div>
      )}
    </div>
  );
}

interface FlowStep {
  id: string;
  label: string;
  icon: React.ElementType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description: string;
  executionTime?: number;
}

function FlowStepNode({ step, isLast }: { step: FlowStep; isLast: boolean }) {
  const statusConfig = {
    pending: {
      icon: <Circle className="w-4 h-4" />,
      bg: 'bg-[#F5F5F7]',
      border: 'border-black/[0.08]',
      text: 'text-[#6E6E73]',
      iconColor: 'text-[#6E6E73]/40',
    },
    running: {
      icon: (
        <span className="flex gap-0.5">
          <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
        </span>
      ),
      bg: 'bg-[#5B5EFF]/10',
      border: 'border-[#5B5EFF]/30',
      text: 'text-[#5B5EFF]',
      iconColor: 'text-[#5B5EFF]',
    },
    completed: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      bg: 'bg-[#34C759]/10',
      border: 'border-[#34C759]/30',
      text: 'text-[#34C759]',
      iconColor: 'text-[#34C759]',
    },
    failed: {
      icon: <XCircle className="w-4 h-4" />,
      bg: 'bg-[#FF3B30]/10',
      border: 'border-[#FF3B30]/30',
      text: 'text-[#FF3B30]',
      iconColor: 'text-[#FF3B30]',
    },
  };

  const config = statusConfig[step.status];
  const IconComponent = step.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-all duration-300',
        config.bg,
        config.border
      )}
    >
      <div className={cn('flex-shrink-0', config.iconColor)}>
        <IconComponent className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm font-medium', config.text)}>{step.label}</span>
          {step.executionTime && (
            <span className="text-xs text-[#6E6E73] bg-black/[0.04] px-1.5 py-0.5 rounded">
              {step.executionTime}ms
            </span>
          )}
        </div>
        <p className="text-xs text-[#6E6E73] truncate mt-0.5">{step.description}</p>
      </div>

      <div className={cn('flex-shrink-0', config.iconColor)}>{config.icon}</div>
    </div>
  );
}

function getAgentIcon(agentId: string): React.ElementType {
  switch (agentId) {
    case 'intent_classifier':
      return Target;
    case 'document_search':
      return FileSearch;
    case 'web_search':
      return Globe;
    case 'ocr':
      return Cpu;
    case 'url_processing':
      return Link2;
    case 'plan_generator':
    case 'plan_validator':
      return Brain;
    case 'reranker':
      return Sparkles;
    case 'response_synthesis':
      return Sparkles;
    default:
      return Circle;
  }
}

function getAgentDescription(agentId: string): string {
  switch (agentId) {
    case 'intent_classifier':
      return 'Classifying query intent';
    case 'document_search':
      return 'Searching document knowledge base';
    case 'web_search':
      return 'Performing web search';
    case 'ocr':
      return 'Extracting text from images';
    case 'url_processing':
      return 'Processing URL content';
    case 'plan_generator':
      return 'Generating execution plan';
    case 'plan_validator':
      return 'Validating execution plan';
    case 'reranker':
      return 'Reranking results by relevance';
    case 'response_synthesis':
      return 'Synthesizing final response';
    default:
      return 'Processing...';
  }
}
