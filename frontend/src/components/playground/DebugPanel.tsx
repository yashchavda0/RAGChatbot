'use client';

import React from 'react';
import {
  Clock,
  Zap,
  Target,
  FileSearch,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Database,
  Cpu,
  Brain,
} from 'lucide-react';
import { AgentExecution, Source } from '@/types';
import { formatDuration, cn } from '@/lib/utils';

interface DebugPanelProps {
  intent: string | null;
  executions: AgentExecution[];
  sources: Source[];
  responseTime: number | null;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  } | null;
  isStreaming: boolean;
}

export function DebugPanel({
  intent,
  executions,
  sources,
  responseTime,
  tokenUsage,
  isStreaming,
}: DebugPanelProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    intent: true,
    execution: true,
    sources: true,
    metrics: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const getIntentConfig = (intentType: string | null) => {
    switch (intentType) {
      case 'DOCUMENT_SEARCH':
        return { label: 'Document Search', color: 'text-[#5B5EFF]', bg: 'bg-[#5B5EFF]/10', icon: FileSearch };
      case 'WEB_SEARCH':
        return { label: 'Web Search', color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/10', icon: Globe };
      case 'OCR':
        return { label: 'OCR Processing', color: 'text-[#F97316]', bg: 'bg-[#F97316]/10', icon: Cpu };
      case 'URL_PROCESS':
        return { label: 'URL Processing', color: 'text-[#06B6D4]', bg: 'bg-[#06B6D4]/10', icon: Globe };
      case 'COMPLEX':
        return { label: 'Complex Query', color: 'text-[#8B5CF6]', bg: 'bg-[#8B5CF6]/10', icon: Brain };
      default:
        return { label: 'Analyzing...', color: 'text-[#6E6E73]', bg: 'bg-[#6E6E73]/10', icon: Target };
    }
  };

  const intentConfig = getIntentConfig(intent);
  const IntentIcon = intentConfig.icon;

  return (
    <div className="h-full flex flex-col bg-white border-l border-black/[0.06]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/[0.06] bg-[#F5F5F7]/50">
        <h2 className="text-sm font-semibold text-[#1D1D1F]">Debug Inspector</h2>
        <p className="text-xs text-[#6E6E73] mt-0.5">Real-time execution details</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-apple">
        {/* Intent Section */}
        <div className="border-b border-black/[0.04]">
          <button
            onClick={() => toggleSection('intent')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.intent ? (
                <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
              )}
              <Target className="w-4 h-4 text-[#6E6E73]" />
              <span className="text-sm font-medium text-[#1D1D1F]">Detected Intent</span>
            </div>
          </button>
          {expandedSections.intent && (
            <div className="px-4 pb-3">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
                  intentConfig.bg,
                  intentConfig.color
                )}
              >
                <IntentIcon className="w-4 h-4" />
                {intentConfig.label}
              </div>
            </div>
          )}
        </div>

        {/* Execution Flow Section */}
        <div className="border-b border-black/[0.04]">
          <button
            onClick={() => toggleSection('execution')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.execution ? (
                <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
              )}
              <Zap className="w-4 h-4 text-[#6E6E73]" />
              <span className="text-sm font-medium text-[#1D1D1F]">Agent Execution</span>
            </div>
            <span className="text-xs text-[#6E6E73] bg-black/[0.04] px-2 py-0.5 rounded-full">
              {executions.length} steps
            </span>
          </button>
          {expandedSections.execution && (
            <div className="px-4 pb-3 space-y-2">
              {executions.length === 0 ? (
                <div className="text-sm text-[#6E6E73] py-2">
                  {isStreaming ? 'Waiting for agents...' : 'No executions yet'}
                </div>
              ) : (
                executions.map((execution, index) => (
                  <ExecutionStep key={execution.agent_id + index} execution={execution} index={index} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Sources Section */}
        <div className="border-b border-black/[0.04]">
          <button
            onClick={() => toggleSection('sources')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.sources ? (
                <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
              )}
              <Database className="w-4 h-4 text-[#6E6E73]" />
              <span className="text-sm font-medium text-[#1D1D1F]">Retrieved Sources</span>
            </div>
            <span className="text-xs text-[#6E6E73] bg-black/[0.04] px-2 py-0.5 rounded-full">
              {sources.length} found
            </span>
          </button>
          {expandedSections.sources && (
            <div className="px-4 pb-3 space-y-2">
              {sources.length === 0 ? (
                <div className="text-sm text-[#6E6E73] py-2">No sources retrieved</div>
              ) : (
                sources.map((source, index) => (
                  <SourceItem key={index} source={source} index={index} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Metrics Section */}
        <div className="border-b border-black/[0.04]">
          <button
            onClick={() => toggleSection('metrics')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.metrics ? (
                <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
              )}
              <Clock className="w-4 h-4 text-[#6E6E73]" />
              <span className="text-sm font-medium text-[#1D1D1F]">Performance</span>
            </div>
          </button>
          {expandedSections.metrics && (
            <div className="px-4 pb-3 grid grid-cols-2 gap-3">
              <MetricCard
                label="Response Time"
                value={responseTime ? formatDuration(responseTime) : '--'}
                icon={<Clock className="w-4 h-4" />}
              />
              <MetricCard
                label="Prompt Tokens"
                value={tokenUsage?.prompt?.toLocaleString() ?? '--'}
                icon={<Cpu className="w-4 h-4" />}
              />
              <MetricCard
                label="Completion Tokens"
                value={tokenUsage?.completion?.toLocaleString() ?? '--'}
                icon={<Brain className="w-4 h-4" />}
              />
              <MetricCard
                label="Total Tokens"
                value={tokenUsage?.total?.toLocaleString() ?? '--'}
                icon={<Zap className="w-4 h-4" />}
                highlight
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Execution Step Component
function ExecutionStep({ execution, index }: { execution: AgentExecution; index: number }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-[#34C759]" />,
          bg: 'bg-[#34C759]/10',
          text: 'text-[#34C759]',
        };
      case 'running':
        return {
          icon: <Loader2 className="w-4 h-4 text-[#5B5EFF] animate-spin" />,
          bg: 'bg-[#5B5EFF]/10',
          text: 'text-[#5B5EFF]',
        };
      case 'failed':
        return {
          icon: <XCircle className="w-4 h-4 text-[#FF3B30]" />,
          bg: 'bg-[#FF3B30]/10',
          text: 'text-[#FF3B30]',
        };
      default:
        return {
          icon: <div className="w-4 h-4 rounded-full border-2 border-[#6E6E73]" />,
          bg: 'bg-[#6E6E73]/10',
          text: 'text-[#6E6E73]',
        };
    }
  };

  const config = getStatusConfig(execution.status);

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg bg-[#F5F5F7]/50">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-xs font-medium text-[#6E6E73]">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="text-sm font-medium text-[#1D1D1F] truncate">{execution.agent_name}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-xs px-2 py-0.5 rounded-full', config.bg, config.text)}>
            {execution.status}
          </span>
          {execution.execution_time_ms && (
            <span className="text-xs text-[#6E6E73]">{formatDuration(execution.execution_time_ms)}</span>
          )}
        </div>
        {execution.error_message && (
          <p className="text-xs text-[#FF3B30] mt-1 truncate">{execution.error_message}</p>
        )}
      </div>
    </div>
  );
}

// Source Item Component
function SourceItem({ source, index }: { source: Source; index: number }) {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'document':
        return { icon: <FileSearch className="w-3.5 h-3.5" />, color: 'text-[#5B5EFF]' };
      case 'web':
        return { icon: <Globe className="w-3.5 h-3.5" />, color: 'text-[#A855F7]' };
      case 'ocr':
        return { icon: <Cpu className="w-3.5 h-3.5" />, color: 'text-[#F97316]' };
      default:
        return { icon: <Database className="w-3.5 h-3.5" />, color: 'text-[#6E6E73]' };
    }
  };

  const config = getTypeConfig(source.type);
  const label = source.filename || source.title || source.url || `Source ${index + 1}`;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] transition-colors">
      <div className={cn('flex-shrink-0', config.color)}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#1D1D1F] truncate">{label}</p>
        {source.snippet && (
          <p className="text-xs text-[#6E6E73] truncate mt-0.5">{source.snippet}</p>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-3 rounded-xl',
        highlight ? 'bg-[#5B5EFF]/10' : 'bg-[#F5F5F7]'
      )}
    >
      <div className={cn('flex items-center gap-1.5 mb-1', highlight ? 'text-[#5B5EFF]' : 'text-[#6E6E73]')}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn('text-lg font-semibold', highlight ? 'text-[#5B5EFF]' : 'text-[#1D1D1F]')}>
        {value}
      </p>
    </div>
  );
}
