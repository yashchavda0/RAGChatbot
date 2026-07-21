'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  WidgetChatSurface,
  WidgetSurfaceSettings,
  DEFAULT_WIDGET_SETTINGS,
  normalizeWidgetSettings,
} from '@ragchatbot/shared-ui';

export default function PublicWidgetPage({ params }: { params: { chatbotId: string } }) {
  const searchParams = useSearchParams();
  const apiBaseUrl = useMemo(() => {
    const fromQuery = searchParams.get('apiBaseUrl');
    return (fromQuery || '/api').replace(/\/$/, '');
  }, [searchParams]);

  const [settings, setSettings] = useState<WidgetSurfaceSettings>(DEFAULT_WIDGET_SETTINGS);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomization() {
      try {
        const response = await fetch(`${apiBaseUrl}/chatbots/${params.chatbotId}/customization`);
        if (!response.ok) {
          throw new Error(`Customization request failed: HTTP ${response.status}`);
        }
        const data = await response.json();
        if (isMounted) {
          setSettings(normalizeWidgetSettings(data as Record<string, any>));
        }
      } catch (error) {
        console.error('Failed to load widget customization:', error);
      }
    }

    loadCustomization();
    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl, params.chatbotId]);

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      <WidgetChatSurface
        chatbotId={params.chatbotId}
        sessionId={`widget-${params.chatbotId}`}
        settings={settings}
        apiBaseUrl={apiBaseUrl}
      />
    </main>
  );
}