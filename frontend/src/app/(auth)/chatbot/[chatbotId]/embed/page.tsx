'use client';

import React, { useState, useMemo } from 'react';
import { use } from 'react';
import {
  Code2,
  Package,
  Settings2,
  Eye,
  Webhook,
  Bell,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  Palette,
  MonitorSmartphone,
  Sparkles,
} from 'lucide-react';
import { CodeBlock, InlineCode } from '@/components/embed/CodeBlock';
import { WidgetPreview, WidgetConfig, defaultConfig } from '@/components/embed/WidgetPreview';
import { cn, copyToClipboard } from '@/lib/utils';

type TabId = 'script' | 'npm' | 'react';

export default function EmbedPage({ params }: { params: Promise<{ chatbotId: string }> }) {
  const { chatbotId } = use(params);
  const [activeTab, setActiveTab] = useState<TabId>('script');
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopySection = async (section: string, text: string) => {
    await copyToClipboard(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Generate code snippets based on config
  const codeSnippets = useMemo(
    () => ({
      script: `<!-- Add this script before the closing </body> tag -->
<script>
  window.RAGChatbot = {
    chatbotId: '${chatbotId}',
    primaryColor: '${config.primaryColor}',
    position: '${config.position}',
    buttonText: '${config.buttonText}',
    welcomeMessage: '${config.welcomeMessage}',
    placeholder: '${config.placeholder}',
    showBranding: ${config.showBranding}
  };
</script>
<script src="https://cdn.ragchatbot.io/widget.js" async></script>`,
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

      <RAGChatbotWidget
        chatbotId="${chatbotId}"
        primaryColor="${config.primaryColor}"
        position="${config.position}"
        buttonText="${config.buttonText}"
        welcomeMessage="${config.welcomeMessage}"
        placeholder="${config.placeholder}"
        showBranding={${config.showBranding}}
        onMessage={(message) => {
          console.log('New message:', message);
        }}
        onOpen={() => {
          console.log('Widget opened');
        }}
        onClose={() => {
          console.log('Widget closed');
        }}
      />
    </div>
  );
}

export default App;`,
    }),
    [chatbotId, config]
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

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#F5F5F7] rounded-xl mb-6 w-fit">
          {[
            { id: 'script' as const, label: 'Script Tag', icon: Code2 },
            { id: 'npm' as const, label: 'NPM Package', icon: Package },
            { id: 'react' as const, label: 'React Component', icon: Sparkles },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white text-[#1D1D1F] shadow-sm'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
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
      </section>

      {/* Configuration & Preview Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <section className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-[#5B5EFF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Configuration</h2>
              <p className="text-sm text-[#6E6E73]">Customize your widget appearance</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                <Palette className="w-4 h-4 inline mr-2" />
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="w-12 h-12 rounded-xl cursor-pointer border border-black/[0.08] overflow-hidden"
                />
                <input
                  type="text"
                  value={config.primaryColor}
                  onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:border-[#5B5EFF]/30 focus:ring-2 focus:ring-[#5B5EFF]/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                <MonitorSmartphone className="w-4 h-4 inline mr-2" />
                Widget Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['bottom-right', 'bottom-left'].map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setConfig({ ...config, position: pos as 'bottom-right' | 'bottom-left' })}
                    className={cn(
                      'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                      config.position === pos
                        ? 'bg-[#5B5EFF] text-white'
                        : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#5B5EFF]/10'
                    )}
                  >
                    {pos === 'bottom-right' ? 'Bottom Right' : 'Bottom Left'}
                  </button>
                ))}
              </div>
            </div>

            {/* Button Text */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Button Text</label>
              <input
                type="text"
                value={config.buttonText}
                onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:border-[#5B5EFF]/30 focus:ring-2 focus:ring-[#5B5EFF]/10 outline-none transition-all"
              />
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Welcome Message</label>
              <input
                type="text"
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:border-[#5B5EFF]/30 focus:ring-2 focus:ring-[#5B5EFF]/10 outline-none transition-all"
              />
            </div>

            {/* Placeholder */}
            <div>
              <label className="block text-sm font-medium text-[#1D1D1F] mb-2">Input Placeholder</label>
              <input
                type="text"
                value={config.placeholder}
                onChange={(e) => setConfig({ ...config, placeholder: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-[#F5F5F7] rounded-xl border border-black/[0.08] focus:border-[#5B5EFF]/30 focus:ring-2 focus:ring-[#5B5EFF]/10 outline-none transition-all"
              />
            </div>

            {/* Show Branding */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-[#1D1D1F]">Show Branding</label>
                <p className="text-xs text-[#6E6E73]">Display "Powered by" text</p>
              </div>
              <button
                onClick={() => setConfig({ ...config, showBranding: !config.showBranding })}
                className={cn(
                  'relative w-12 h-7 rounded-full transition-colors',
                  config.showBranding ? 'bg-[#5B5EFF]' : 'bg-[#E5E5EA]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform',
                    config.showBranding ? 'translate-x-5.5' : 'translate-x-0.5'
                  )}
                  style={{
                    transform: config.showBranding ? 'translateX(22px)' : 'translateX(2px)',
                  }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Widget Preview */}
        <section className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#5B5EFF]/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#5B5EFF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1D1D1F]">Widget Preview</h2>
              <p className="text-sm text-[#6E6E73]">See how your widget will look</p>
            </div>
          </div>

          <WidgetPreview config={config} />
        </section>
      </div>

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
