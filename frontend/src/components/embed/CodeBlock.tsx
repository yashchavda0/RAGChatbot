'use client';

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn, copyToClipboard } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'javascript',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const lines = code.split('\n');
  const lineCount = lines.length;
  const lineNumberWidth = String(lineCount).length * 0.6 + 1;

  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden border border-black/[0.08] bg-[#1D1D1F]',
        className
      )}
    >
      {/* Header */}
      {(filename || language) && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#2C2C2E] border-b border-white/10">
          <div className="flex items-center gap-2">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
              <div className="w-3 h-3 rounded-full bg-[#28C840]" />
            </div>
            {filename && (
              <span className="ml-3 text-xs text-[#A1A1A6] font-mono">{filename}</span>
            )}
          </div>
          {language && (
            <span className="text-xs text-[#6E6E73] uppercase tracking-wide">{language}</span>
          )}
        </div>
      )}

      {/* Code Content */}
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-sm">
          <code className="font-mono text-[#F5F5F7]">
            {showLineNumbers ? (
              <table className="w-full border-collapse">
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="hover:bg-white/[0.02]">
                      <td
                        className="pr-4 text-right text-[#6E6E73] select-none border-r border-white/10"
                        style={{ width: `${lineNumberWidth}rem` }}
                      >
                        {index + 1}
                      </td>
                      <td className="pl-4">
                        <span className={getSyntaxHighlight(line, language)}>{line || ' '}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              code
            )}
          </code>
        </pre>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-lg transition-all duration-200',
            copied
              ? 'bg-[#34C759]/20 text-[#34C759]'
              : 'bg-white/10 text-[#A1A1A6] hover:bg-white/20 hover:text-white'
          )}
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// Simple syntax highlighting helper
function getSyntaxHighlight(line: string, language: string): string {
  // Basic highlighting for common patterns
  if (language === 'html' || language === 'jsx' || language === 'tsx') {
    // Highlight tags
    if (line.includes('<') || line.includes('>')) {
      return 'text-[#FF79C6]';
    }
  }

  if (language === 'javascript' || language === 'typescript') {
    // Highlight keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'from', 'async', 'await'];
    if (keywords.some((k) => line.includes(k))) {
      return 'text-[#FF79C6]';
    }
    // Highlight strings
    if (line.includes('"') || line.includes("'") || line.includes('`')) {
      return 'text-[#F1FA8C]';
    }
    // Highlight comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return 'text-[#6272A4]';
    }
  }

  return '';
}

// Inline code component for small snippets
interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'px-1.5 py-0.5 rounded-md bg-[#5B5EFF]/10 text-[#5B5EFF] text-sm font-mono',
        className
      )}
    >
      {children}
    </code>
  );
}
