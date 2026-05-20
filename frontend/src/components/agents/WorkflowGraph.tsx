'use client';

import React from 'react';
import { AgentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface WorkflowGraphProps {
  agents: AgentStatus[];
}

export function WorkflowGraph({ agents }: WorkflowGraphProps) {
  const agentMap = new Map(agents.map(a => [a.agent_id, a]));

  const nodes = [
    { id: 'intent_classifier', label: 'Intent Classifier', type: 'orchestration' },
    { id: 'plan_generator', label: 'Plan Generator', type: 'orchestration' },
    { id: 'plan_validator', label: 'Plan Validator', type: 'orchestration' },
    { id: 'document_search', label: 'Document Search', type: 'execution' },
    { id: 'web_search', label: 'Web Search', type: 'execution' },
    { id: 'ocr', label: 'OCR', type: 'execution' },
    { id: 'url_process', label: 'URL Process', type: 'execution' },
    { id: 'reranker', label: 'Reranker', type: 'execution' },
    { id: 'response_synthesis', label: 'Response Synthesis', type: 'execution' },
  ];

  const edges = [
    { from: 'intent_classifier', to: 'plan_generator', label: 'Complex' },
    { from: 'intent_classifier', to: 'document_search', label: 'Document' },
    { from: 'intent_classifier', to: 'web_search', label: 'Web' },
    { from: 'intent_classifier', to: 'ocr', label: 'Image' },
    { from: 'intent_classifier', to: 'url_process', label: 'URL' },
    { from: 'plan_generator', to: 'plan_validator', label: '' },
    { from: 'plan_validator', to: 'document_search', label: 'Valid' },
    { from: 'plan_validator', to: 'plan_generator', label: 'Invalid' },
    { from: 'document_search', to: 'reranker', label: '' },
    { from: 'web_search', to: 'reranker', label: '' },
    { from: 'ocr', to: 'reranker', label: '' },
    { from: 'url_process', to: 'reranker', label: '' },
    { from: 'reranker', to: 'response_synthesis', label: '' },
  ];

  const getNodeColor = (type: string) => {
    return type === 'orchestration'
      ? { bg: 'bg-[#5B5EFF]/[0.08]', text: 'text-[#5B5EFF]', border: 'border-[#5B5EFF]/30' }
      : { bg: 'bg-[#34C759]/[0.08]', text: 'text-[#34C759]', border: 'border-[#34C759]/30' };
  };

  return (
    <div className="relative w-full h-[480px] bg-[#F5F5F7]/50 rounded-2xl overflow-auto p-6 border border-black/[0.04] scrollbar-apple">
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }}>
        {/* Draw edges */}
        {edges.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const positions: Record<string, { x: number; y: number }> = {
            intent_classifier: { x: 280, y: 30 },
            plan_generator: { x: 160, y: 120 },
            plan_validator: { x: 400, y: 120 },
            document_search: { x: 100, y: 220 },
            web_search: { x: 260, y: 220 },
            ocr: { x: 420, y: 220 },
            url_process: { x: 580, y: 220 },
            reranker: { x: 280, y: 320 },
            response_synthesis: { x: 280, y: 420 },
          };

          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;

          const path = edge.to === 'plan_generator' && edge.from === 'plan_validator'
            ? `M ${from.x} ${from.y + 24} Q ${from.x - 60} ${midY(from, to)} ${to.x} ${to.y - 24}`
            : `M ${from.x} ${from.y + 24} L ${to.x} ${to.y - 24}`;

          return (
            <g key={idx}>
              <path
                d={path}
                stroke="#5B5EFF"
                strokeWidth="2"
                fill="none"
                className="opacity-40"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 8}
                  className="text-[10px] fill-[#6E6E73] font-medium"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              className="fill-[#5B5EFF]"
              style={{ fillOpacity: 0.4 }}
            />
          </marker>
        </defs>
      </svg>

      {/* Draw nodes */}
      {nodes.map((node) => {
        const positions: Record<string, { x: number; y: number }> = {
          intent_classifier: { x: 280, y: 30 },
          plan_generator: { x: 160, y: 120 },
          plan_validator: { x: 400, y: 120 },
          document_search: { x: 100, y: 220 },
          web_search: { x: 260, y: 220 },
          ocr: { x: 420, y: 220 },
          url_process: { x: 580, y: 220 },
          reranker: { x: 280, y: 320 },
          response_synthesis: { x: 280, y: 420 },
        };

        const pos = positions[node.id];
        if (!pos) return null;

        const colors = getNodeColor(node.type);

        return (
          <div
            key={node.id}
            className={cn(
              'absolute px-3 py-2 rounded-2xl border-2 text-center text-[11px] font-semibold shadow-sm',
              colors.bg,
              colors.text,
              colors.border,
              'transition-transform duration-200 hover:scale-105'
            )}
            style={{
              left: `${pos.x - 50}px`,
              top: `${pos.y}px`,
              width: '100px',
            }}
          >
            {node.label}
          </div>
        );
      })}
    </div>
  );
}

function midY(from: { x: number; y: number }, to: { x: number; y: number }) {
  return (from.y + to.y) / 2;
}
