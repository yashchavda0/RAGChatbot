'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Code2,
  Package,
  Settings2,
  Eye,
  Webhook,
  Bell,
  ChevronDown,
  ExternalLink,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { CodeBlock, InlineCode } from '@/components/embed/CodeBlock';
import {
  WidgetChatSurface,
  WidgetSurfaceSettings,
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
} from '@ragchatbot/shared-ui';
import { cn } from '@/lib/utils';

type TabId = 'script' | 'npm' | 'react';

export default function EmbedPage({ params }: { params: { chatbotId: string } }) {
  const { chatbotId } = params;
  const [activeTab, setActiveTab] = useState<TabId>('script');
  const [previewSettings, setPreviewSettings] = useState<WidgetSurfaceSettings>(DEFAULT_WIDGET_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // widget.js is served from the frontend's own origin (frontend/public/widget.js).
  // Start with a relative path (matches on server + first client render to avoid a
  // hydration mismatch), then resolve to an absolute same-origin URL after mount so
  // the copy-paste snippet works on external customer sites.
  const [widgetScriptUrl, setWidgetScriptUrl] = useState(
    process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL || '/widget.js'
  );
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL && typeof window !== 'undefined') {
      setWidgetScriptUrl(`${window.location.origin}/widget.js`);
    }
  }, []);
  const [widgetApiBaseUrl, setWidgetApiBaseUrl] = useState(
    process.env.NEXT_PUBLIC_WIDGET_API_BASE_URL || '/api'
  );

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WIDGET_API_BASE_URL && typeof window !== 'undefined') {
      setWidgetApiBaseUrl(`${window.location.origin}/api`);
    }
  }, []);

  // The Embed tab no longer owns any settings. Load the single saved
  // configuration (read-only) so the preview reflects the real widget.
  useEffect(() => {
    async function loadConfig() {
      try {
        setIsLoading(true);
        setLoadError(null);
        const response = await fetch(
          `${widgetApiBaseUrl.replace(/\/$/, '')}/chatbots/${chatbotId}/customization`
        );
        if (!response.ok) {
          throw new Error(`Customization request failed: HTTP ${response.status}`);
        }
        const data = await response.json();
        setPreviewSettings(normalizeWidgetSettings(data as Record<string, any>));
      } catch (err) {
        console.error('Failed to load customization for embed preview:', err);
        setLoadError('Could not load your saved widget settings — showing defaults.');
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, [chatbotId, widgetApiBaseUrl]);

  // Runtime-fetch snippet: only the chatbotId is baked in. The widget loads the
  // saved configuration at runtime via GET /chatbots/{id}/customization, so
  // updating the Customization tab propagates to every embedded instance
  // automatically (copy once, stays in sync).
  const codeSnippets = useMemo(
    () => ({
      script: `<!-- Add this script before the closing </body> tag -->
<script>
  window.RAGChatbot = {
    chatbotId: '${chatbotId}',
    apiBaseUrl: '${widgetApiBaseUrl}'
  };
</script>
<script src="${widgetScriptUrl}" async></script>`,
      npm: `# Install the RAG Chatbot package
npm install @ragchatbot/widget

# or with yarn
yarn add @ragchatbot/widget

# or with pnpm
pnpm add @ragchatbot/widget`,
      react: `import { RAGChatbotWidget } from '@ragchatbot/widget';
import '@ragchatbot/widget/styles.css';

function App() {
  return (
    <div>
      {/* Your app content */}

      <RAGChatbotWidget chatbotId="${chatbotId}" />
    </div>
  );
}

export default App;`,
    }),
    [chatbotId, widgetApiBaseUrl, widgetScriptUrl]
  );

  const apiEndpointCode = `// API Endpoint: POST https://api.ragchatbot.io/v1/chat
const response = await fetch('https://api.ragchatbot.io/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY',
  },
  body: JSON.stringify({
    chatbot_id: '${chatbotId}',
    message: 'Hello, how can I help you?',
    session_id: 'optional-session-id',
  }),
});

const data = await response.json();
console.log(data.response);`;

  const webhookCode = `// Webhook Configuration
// URL: https://your-domain.com/webhook/chatbot

// Events sent to your webhook:
{
  "event": "message.received",
  "timestamp": "2026-03-27T10:30:00Z",
  "data": {
    "chatbot_id": "${chatbotId}",
    "session_id": "session-123",
    "message": {
      "role": "user",
      "content": "Hello!"
    }
  }
}`;

  const eventCallbacksCode = `// Available event callbacks

interface WidgetEvents {
  // Called when a new message is received
  onMessage: (data: { role: 'user' | 'assistant'; content: string }) => void;

  // Called when the widget is opened
  onOpen: () => void;

  // Called when the widget is closed
  onClose: () => void;

  // Called when an error occurs
  onError: (error: Error) => void;

  // Called when the chat session starts
  onSessionStart: (sessionId: string) => void;

  // Called when typing indicator appears/disappears
  onTypingChange: (isTyping: boolean) => void;
}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#1D1D1F]">Embed Widget</h1>
        <p className="text-[#6E6E73] mt-1">Add your chatbot to any website with our embed options.</p>
      </div>

      {/* Single-source banner: settings live in the Customization tab */}
      <section className="dashboard-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center flex-shrink-0">
          <Settings2 className="w-5 h-5 text-[#5B5EFF]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-[#1D1D1F]">Widget settings are managed in the Customization tab</h2>
          <p className="text-sm text-[#6E6E73] mt-0.5">
            One chatbot, one configuration. Edit appearance, messages, and behavior there — every embedded instance picks up the latest automatically.
          </p>
        </div>
        <Link
          href={`/chatbot/${chatbotId}/customization`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF] hover:from-[#3D3DD9] hover:to-[#5B5EFF] transition-all flex-shrink-0"
        >
          <Settings2 className="w-4 h-4" />
          Open Customization
        </Link>
      </section>

      {/* Installation Section */}
      <section className="dashboard-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-[#5B5EFF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Installation</h2>
            <p className="text-sm text-[#6E6E73]">Choose your preferred installation method</p>
          </div>
        </div>

        {/* Tabs. Only the Script Tag path is supported today; the NPM package
            (@ragchatbot/widget) is not published yet, so those tabs are disabled. */}
        <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-xl mb-6 w-fit">
          {[
            { id: 'script' as const, label: 'Script Tag', icon: Code2, disabled: false },
            { id: 'npm' as const, label: 'NPM Package', icon: Package, disabled: true },
            { id: 'react' as const, label: 'React Component', icon: Sparkles, disabled: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              title={tab.disabled ? 'Coming soon' : undefined}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab.disabled
                  ? 'text-[#B0B0B5] cursor-not-allowed'
                  : activeTab === tab.id
                  ? 'bg-white text-[#1D1D1F] shadow-sm'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.disabled && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-[#E8E8ED] text-[#6E6E73]">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <CodeBlock
          code={codeSnippets[activeTab]}
          language={activeTab === 'npm' ? 'bash' : activeTab === 'script' ? 'html' : 'typescript'}
          filename={activeTab === 'npm' ? 'terminal' : activeTab === 'script' ? 'index.html' : 'App.tsx'}
          showLineNumbers={activeTab === 'react'}
        />

        {activeTab === 'script' && (
          <div className="mt-4 p-4 bg-[#5B5EFF]/5 rounded-xl border border-[#5B5EFF]/10">
            <p className="text-sm text-[#1D1D1F] font-medium mb-1">Script runtime targets</p>
            <p className="text-xs text-[#6E6E73]">
              Widget script URL: <InlineCode>{widgetScriptUrl}</InlineCode>
            </p>
            <p className="text-xs text-[#6E6E73] mt-1">
              API base URL: <InlineCode>{widgetApiBaseUrl}</InlineCode>
            </p>
          </div>
        )}
      </section>

      {/* Widget Preview (read-only, driven by saved config) */}
      <section className="dashboard-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-[#5B5EFF]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Widget Preview</h2>
            <p className="text-sm text-[#6E6E73]">
              {isLoading ? 'Loading your saved settings…' : 'Preview reflects your saved Customization settings'}
            </p>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10">
            <AlertCircle className="w-4 h-4 text-[#FF3B30] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#FF3B30]">{loadError}</p>
          </div>
        )}

        <WidgetChatSurface
          chatbotId={chatbotId}
          sessionId={`embed-preview-${chatbotId}`}
          settings={previewSettings}
          apiBaseUrl={widgetApiBaseUrl}
          preview
        />
      </section>

      {/* Advanced Section */}
      <section className="dashboard-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <Webhook className="w-5 h-5 text-[#5B5EFF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1D1D1F]">Advanced Options</h2>
            <p className="text-sm text-[#6E6E73]">API endpoints, webhooks, and event callbacks</p>
          </div>
        </div>

        {/* Accordion sections */}
        <div className="space-y-4">
          {/* API Endpoint */}
          <details className="group" open>
            <summary className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <Code2 className="w-5 h-5 text-[#5B5EFF]" />
                <span className="font-medium text-[#1D1D1F]">API Endpoint</span>
              </div>
              <ChevronDown className="w-5 h-5 text-[#6E6E73] transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <p className="text-sm text-[#6E6E73] mb-4">
                Use our REST API to send messages programmatically. Replace <InlineCode>YOUR_API_KEY</InlineCode> with your
                actual API key from the settings.
              </p>
              <CodeBlock code={apiEndpointCode} language="javascript" filename="api-client.js" />
            </div>
          </details>

          {/* Webhook Configuration */}
          <details className="group">
            <summary className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-[#5B5EFF]" />
                <span className="font-medium text-[#1D1D1F]">Webhook Configuration</span>
              </div>
              <ChevronDown className="w-5 h-5 text-[#6E6E73] transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <p className="text-sm text-[#6E6E73] mb-4">
                Receive real-time notifications when events occur in your chatbot. Configure your webhook URL in the
                settings to start receiving events.
              </p>
              <CodeBlock code={webhookCode} language="json" filename="webhook-payload.json" />

              <div className="mt-4 p-4 bg-[#5B5EFF]/5 rounded-xl border border-[#5B5EFF]/10">
                <p className="text-sm text-[#1D1D1F] font-medium mb-2">Available Events</p>
                <ul className="text-sm text-[#6E6E73] space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B5EFF]" />
                    <InlineCode>message.received</InlineCode> - When a user sends a message
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B5EFF]" />
                    <InlineCode>message.sent</InlineCode> - When the bot sends a response
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B5EFF]" />
                    <InlineCode>session.started</InlineCode> - When a new chat session begins
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5B5EFF]" />
                    <InlineCode>session.ended</InlineCode> - When a chat session ends
                  </li>
                </ul>
              </div>
            </div>
          </details>

          {/* Event Callbacks */}
          <details className="group">
            <summary className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl cursor-pointer list-none">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-[#5B5EFF]" />
                <span className="font-medium text-[#1D1D1F]">Event Callbacks</span>
              </div>
              <ChevronDown className="w-5 h-5 text-[#6E6E73] transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4">
              <p className="text-sm text-[#6E6E73] mb-4">
                React to user interactions with event callbacks. These are available when using the React component.
              </p>
              <CodeBlock code={eventCallbacksCode} language="typescript" filename="events.d.ts" showLineNumbers />
            </div>
          </details>
        </div>
      </section>

      {/* Quick Reference */}
      <section className="dashboard-card p-6 bg-gradient-to-br from-[#5B5EFF]/5 to-transparent">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">Need Help?</h3>
            <p className="text-sm text-[#6E6E73] mb-4">
              Check out our documentation for detailed guides and troubleshooting tips.
            </p>
            <a
              href="https://docs.ragchatbot.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#5B5EFF] hover:text-[#4040DD] transition-colors"
            >
              View Documentation
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-[#5B5EFF]" />
          </div>
        </div>
      </section>
    </div>
  );
}
