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
  ArrowRight,
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
  queryStatus?: 'analyzing' | 'intent' | 'retrieving' | 'processing' | 'generating' | 'completed';
  currentExecutingAgent?: AgentExecution | null;
}

const TIMELINE_STAGES = [
  { id: 'analyzing', label: 'Query Received', icon: Target, color: 'text-[#6E6E73]' },
  { id: 'intent', label: 'Intent Detection', icon: Brain, color: 'text-[#8B5CF6]' },
  { id: 'retrieving', label: 'Retrieving Data', icon: Database, color: 'text-[#5B5EFF]' },
  { id: 'processing', label: 'Processing', icon: Cpu, color: 'text-[#F97316]' },
  { id: 'generating', label: 'Generating', icon: Zap, color: 'text-[#34C759]' },
  { id: 'completed', label: 'Done', icon: CheckCircle2, color: 'text-[#34C759]' },
];

export function DebugPanel({
  intent,
  executions,
  sources,
  responseTime,
  tokenUsage,
  isStreaming,
  queryStatus = 'analyzing',
  currentExecutingAgent,
}: DebugPanelProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    timeline: true,
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

  // Separate running and completed agents
  const runningAgents = executions.filter((e) => e.status === 'running');
  const completedAgents = executions.filter((e) => e.status !== 'running');

  return (
    <div className="h-full flex flex-col bg-white border-l border-black/[0.06]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-black/[0.06] bg-[#F5F5F7]/50">
        <h2 className="text-sm font-semibold text-[#1D1D1F]">Debug Inspector</h2>
        <p className="text-xs text-[#6E6E73] mt-0.5">Real-time execution details</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-apple">
        {/* Timeline Section */}
        <div className="border-b border-black/[0.04]">
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.timeline ? (
                <ChevronDown className="w-4 h-4 text-[#6E6E73]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#6E6E73]" />
              )}
              <Zap className="w-4 h-4 text-[#6E6E73]" />
              <span className="text-sm font-medium text-[#1D1D1F]">Execution Timeline</span>
            </div>
          </button>
          {expandedSections.timeline && (
            <div className="px-4 pb-3">
              <ExecutionTimeline status={queryStatus} isStreaming={isStreaming} />
            </div>
          )}
        </div>

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
            <div className="px-4 pb-3 space-y-3">
              {/* Currently Running */}
              {runningAgents.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-[#6E6E73] mb-2">NOW EXECUTING</div>
                  <div className="space-y-2">
                    {runningAgents.map((execution, index) => (
                      <ExecutionStep key={execution.agent_id + index} execution={execution} index={index} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedAgents.length > 0 && (
                <div>
                  {runningAgents.length > 0 && <div className="border-t border-black/[0.04] my-2" />}
                  <div className="text-xs font-semibold text-[#6E6E73] mb-2">COMPLETED</div>
                  <div className="space-y-2">
                    {completedAgents.map((execution, index) => (
                      <ExecutionStep key={execution.agent_id + index} execution={execution} index={index} />
                    ))}
                  </div>
                </div>
              )}

              {executions.length === 0 && (
                <div className="text-sm text-[#6E6E73] py-2">
                  {isStreaming ? 'Waiting for agents...' : 'No executions yet'}
                </div>
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
                value={responseTime ? formatDuration(responseTime) : (isStreaming ? '...' : '--')}
                icon={<Clock className="w-4 h-4" />}
              />
              <MetricCard
                label="Prompt Tokens"
                value={tokenUsage?.prompt?.toLocaleString() ?? (isStreaming ? '...' : '--')}
                icon={<Cpu className="w-4 h-4" />}
              />
              <MetricCard
                label="Completion Tokens"
                value={tokenUsage?.completion?.toLocaleString() ?? (isStreaming ? '...' : '--')}
                icon={<Brain className="w-4 h-4" />}
              />
              <MetricCard
                label="Total Tokens"
                value={tokenUsage?.total?.toLocaleString() ?? (isStreaming ? '...' : '--')}
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

// Execution Timeline Component
function ExecutionTimeline({ status, isStreaming }: { status: string; isStreaming: boolean }) {
  const getStageIndex = (status: string) => {
    const mapping: Record<string, number> = {
      analyzing: 0,
      intent: 1,
      retrieving: 2,
      processing: 3,
      generating: 4,
      completed: 5,
    };
    return mapping[status] || 0;
  };

  const currentIndex = getStageIndex(status);

  return (
    <div className="space-y-2">
      {TIMELINE_STAGES.map((stage, index) => {
        const StageIcon = stage.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={stage.id} className="flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0',
                isCompleted
                  ? 'bg-[#34C759] text-white'
                  : isCurrent
                    ? 'bg-[#5B5EFF] text-white'
                    : 'bg-[#F5F5F7] text-[#6E6E73]'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isCurrent && isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StageIcon className="w-4 h-4" />
              )}
            </div>
            <span
              className={cn(
                'text-sm',
                isCompleted || isCurrent ? 'font-medium text-[#1D1D1F]' : 'text-[#6E6E73]'
              )}
            >
              {stage.label}
            </span>
          </div>
        );
      })}
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
  const [expanded, setExpanded] = React.useState(false);
  
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'document':
        return { icon: <FileSearch className="w-3.5 h-3.5" />, color: 'text-[#5B5EFF]', bg: 'bg-[#5B5EFF]/10' };
      case 'web':
        return { icon: <Globe className="w-3.5 h-3.5" />, color: 'text-[#A855F7]', bg: 'bg-[#A855F7]/10' };
      case 'ocr':
        return { icon: <Cpu className="w-3.5 h-3.5" />, color: 'text-[#F97316]', bg: 'bg-[#F97316]/10' };
      default:
        return { icon: <Database className="w-3.5 h-3.5" />, color: 'text-[#6E6E73]', bg: 'bg-[#6E6E73]/10' };
    }
  };

  const config = getTypeConfig(source.type);
  const label = source.document_name || source.filename || source.title || source.url || `Source ${index + 1}`;
  const scorePercent = source.similarity_score ? Math.round(source.similarity_score * 100) : null;

  return (
    <div className="rounded-lg bg-[#F5F5F7]/50 hover:bg-[#F5F5F7] transition-colors">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 p-2"
      >
        <div className={cn('flex-shrink-0', config.color)}>{config.icon}</div>
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#1D1D1F] truncate font-medium">{label}</p>
            {scorePercent !== null && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', config.bg, config.color)}>
                {scorePercent}%
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#6E6E73] flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#6E6E73] flex-shrink-0" />
        )}
      </button>
      
      {expanded && (
        <div className="px-3 pb-2 space-y-1.5 text-xs">
          {source.type === 'document' && (
            <>
              {source.page_number && (
                <div className="flex gap-2">
                  <span className="text-[#6E6E73] font-medium min-w-[60px]">Page:</span>
                  <span className="text-[#1D1D1F]">{source.page_number}</span>
                </div>
              )}
              {source.chunk_number !== undefined && (
                <div className="flex gap-2">
                  <span className="text-[#6E6E73] font-medium min-w-[60px]">Chunk:</span>
                  <span className="text-[#1D1D1F]">{source.chunk_number}</span>
                </div>
              )}
              {source.chunk_id && (
                <div className="flex gap-2">
                  <span className="text-[#6E6E73] font-medium min-w-[60px]">Chunk ID:</span>
                  <span className="text-[#1D1D1F] font-mono text-[10px]">{source.chunk_id.slice(0, 16)}...</span>
                </div>
              )}
            </>
          )}
          {source.type === 'web' && source.url && (
            <div className="flex gap-2">
              <span className="text-[#6E6E73] font-medium min-w-[60px]">URL:</span>
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#5B5EFF] hover:underline truncate flex-1"
                onClick={(e) => e.stopPropagation()}
              >
                {source.url}
              </a>
            </div>
          )}
          {(source.content_preview || source.snippet) && (
            <div>
              <span className="text-[#6E6E73] font-medium">Preview:</span>
              <p className="text-[#1D1D1F] mt-1 p-2 bg-white/50 rounded text-[11px] leading-relaxed line-clamp-3">
                {source.content_preview || source.snippet}
              </p>
            </div>
          )}
        </div>
      )}
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
