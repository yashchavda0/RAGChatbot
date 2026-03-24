'use client';

import React from 'react';
import { AgentStatus } from '@/types';
import { ArrowDown } from 'lucide-react';
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
      ? 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300'
      : 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
  };

  return (
    <div className="relative w-full h-[500px] bg-muted/30 rounded-lg overflow-auto p-4">
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Draw edges */}
        {edges.map((edge, idx) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          // Simple positioning
          const positions: Record<string, { x: number; y: number }> = {
            intent_classifier: { x: 250, y: 30 },
            plan_generator: { x: 150, y: 120 },
            plan_validator: { x: 350, y: 120 },
            document_search: { x: 100, y: 220 },
            web_search: { x: 250, y: 220 },
            ocr: { x: 400, y: 220 },
            url_process: { x: 550, y: 220 },
            reranker: { x: 250, y: 320 },
            response_synthesis: { x: 250, y: 420 },
          };

          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;

          const midY = (from.y + to.y) / 2;
          const path = edge.to === 'plan_generator' && edge.from === 'plan_validator'
            ? `M ${from.x} ${from.y + 25} Q ${from.x - 50} ${midY} ${to.x} ${to.y - 20}`
            : `M ${from.x} ${from.y + 25} L ${to.x} ${to.y - 20}`;

          return (
            <g key={idx}>
              <path
                d={path}
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-muted-foreground/50"
                markerEnd="url(#arrowhead)"
              />
              {edge.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2}
                  className="text-xs fill-muted-foreground"
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
              className="fill-muted-foreground/50"
            />
          </marker>
        </defs>
      </svg>

      {/* Draw nodes */}
      {nodes.map((node) => {
        const positions: Record<string, { x: number; y: number }> = {
          intent_classifier: { x: 250, y: 30 },
          plan_generator: { x: 150, y: 120 },
          plan_validator: { x: 350, y: 120 },
          document_search: { x: 100, y: 220 },
          web_search: { x: 250, y: 220 },
          ocr: { x: 400, y: 220 },
          url_process: { x: 550, y: 220 },
          reranker: { x: 250, y: 320 },
          response_synthesis: { x: 250, y: 420 },
        };

        const pos = positions[node.id];
        if (!pos) return null;

        return (
          <div
            key={node.id}
            className={cn(
              'absolute w-24 p-2 rounded-lg border-2 text-center text-xs font-medium shadow-sm',
              getNodeColor(node.type)
            )}
            style={{
              left: `${pos.x - 48}px`,
              top: `${pos.y}px`,
            }}
          >
            {node.label}
          </div>
        );
      })}
    </div>
  );
}
