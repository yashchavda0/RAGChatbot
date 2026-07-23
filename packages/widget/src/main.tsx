import { createRoot } from 'react-dom/client';
// Plain relative import for consistency with frontend/src/app/layout.tsx (see
// that file for why the package's "./styles.css" export isn't used here).
import '../../shared-ui/src/styles.css';
import {
  WidgetChatSurface,
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
} from '@ragchatbot/shared-ui';

interface WidgetConfig {
  chatbotId: string;
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    RAGChatbot?: WidgetConfig;
  }
}

function resolveDefaultApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api`;
  }
  return '/api';
}

async function initWidget() {
  const config = window.RAGChatbot;

  if (!config?.chatbotId) {
    console.error('[RAG Chatbot Widget] Missing chatbotId in window.RAGChatbot');
    return;
  }

  const apiBaseUrl = (config.apiBaseUrl || resolveDefaultApiBaseUrl()).replace(/\/$/, '');

  let settings = DEFAULT_WIDGET_SETTINGS;
  try {
    const response = await fetch(`${apiBaseUrl}/chatbots/${config.chatbotId}/customization`);
    if (response.ok) {
      settings = normalizeWidgetSettings((await response.json()) as Record<string, any>);
    }
  } catch (error) {
    console.warn('[RAG Chatbot Widget] Failed to load customization, using defaults:', error);
  }

  const mount = document.createElement('div');
  mount.id = 'rag-chatbot-widget-root';
  mount.className = 'rag-widget-root';
  document.body.appendChild(mount);

  const root = createRoot(mount);
  root.render(
    <WidgetChatSurface
      chatbotId={config.chatbotId}
      settings={settings}
      apiBaseUrl={apiBaseUrl}
      preview={false}
    />,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void initWidget();
  });
} else {
  void initWidget();
}
