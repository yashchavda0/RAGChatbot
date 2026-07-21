'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPicker } from '@/components/customization/ColorPicker';
import { WidgetChatSurface, ScrollArea, ScrollBar } from '@ragchatbot/shared-ui';
import {
  SettingRow,
  Toggle,
  Slider,
  Select,
} from '@/components/settings/SettingsSection';
import { customizationApi } from '@/lib/api';

interface CustomizationSettings {
  // Appearance
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  size: 'compact' | 'default' | 'large';
  borderRadius: number;
  fontFamily: string;
  // Welcome Message
  greeting: string;
  welcomeMessage: string;
  placeholder: string;
  // Avatar
  botName: string;
  avatarUrl: string;
  // Behavior
  autoOpen: boolean;
  showTypingIndicator: boolean;
  collectUserInfo: boolean;
  inputMaxChars: number;
  buttonText: string;
  showBranding: boolean;
}

const defaultSettings: CustomizationSettings = {
  primaryColor: '#5B5EFF',
  position: 'bottom-right',
  size: 'default',
  borderRadius: 18,
  fontFamily: 'Inter',
  greeting: 'Hello!',
  welcomeMessage: 'How can I help you today? Feel free to ask any questions.',
  placeholder: 'Type your message...',
  botName: 'AI Assistant',
  avatarUrl: '',
  autoOpen: false,
  showTypingIndicator: true,
  collectUserInfo: false,
  inputMaxChars: 2000,
  buttonText: 'Chat with us',
  showBranding: true,
};

function toBackendFormat(settings: CustomizationSettings) {
  return {
    primary_color: settings.primaryColor,
    position: settings.position,
    size: settings.size,
    border_radius: settings.borderRadius,
    font_family: settings.fontFamily,
    greeting: settings.greeting,
    welcome_message: settings.welcomeMessage,
    placeholder: settings.placeholder,
    bot_name: settings.botName,
    avatar_url: settings.avatarUrl || null,
    auto_open: settings.autoOpen,
    show_typing_indicator: settings.showTypingIndicator,
    collect_user_info: settings.collectUserInfo,
    input_max_chars: settings.inputMaxChars,
    button_text: settings.buttonText,
    show_branding: settings.showBranding,
  };
}

function toFrontendFormat(data: Record<string, any>): CustomizationSettings {
  return {
    primaryColor: data.primary_color || defaultSettings.primaryColor,
    position: data.position || defaultSettings.position,
    size: data.size || defaultSettings.size,
    borderRadius: data.border_radius ?? defaultSettings.borderRadius,
    fontFamily: data.font_family || defaultSettings.fontFamily,
    greeting: data.greeting || defaultSettings.greeting,
    welcomeMessage: data.welcome_message || defaultSettings.welcomeMessage,
    placeholder: data.placeholder || defaultSettings.placeholder,
    botName: data.bot_name || defaultSettings.botName,
    avatarUrl: data.avatar_url || defaultSettings.avatarUrl,
    autoOpen: data.auto_open ?? defaultSettings.autoOpen,
    showTypingIndicator: data.show_typing_indicator ?? defaultSettings.showTypingIndicator,
    collectUserInfo: data.collect_user_info ?? defaultSettings.collectUserInfo,
    inputMaxChars: data.input_max_chars ?? defaultSettings.inputMaxChars,
    buttonText: data.button_text || defaultSettings.buttonText,
    showBranding: data.show_branding ?? defaultSettings.showBranding,
  };
}

interface CustomizationPageProps {
  params: { chatbotId: string };
}

export default function CustomizationPage({ params }: CustomizationPageProps) {
  const { chatbotId } = params;
  const widgetApiBaseUrl = '/api';
  const [settings, setSettings] = useState<CustomizationSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<CustomizationSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inputMaxCharsError, setInputMaxCharsError] = useState<string>("");
  useEffect(() => {
    async function fetchCustomization() {
      try {
        setIsLoading(true);
        const data = await customizationApi.get(chatbotId);
        const loaded = toFrontendFormat(data as unknown as Record<string, any>);
        setSettings(loaded);
        setOriginalSettings(loaded);
      } catch (err) {
        console.error('Failed to load customization:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomization();
  }, [chatbotId]);

  const updateSetting = useCallback(<K extends keyof CustomizationSettings>(
    key: K,
    value: CustomizationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await customizationApi.update(chatbotId, toBackendFormat(settings));
      setOriginalSettings(settings);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      setSaveError(message);
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setSaveError(null);
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="h-8 bg-[#E5E5EA] rounded w-40 mb-2" />
            <div className="h-4 bg-[#E5E5EA] rounded w-72" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-20 bg-[#E5E5EA] rounded" />
            <div className="h-9 w-28 bg-[#E5E5EA] rounded" />
          </div>
        </div>
        <div className="flex-1 flex gap-6">
          <div className="flex-1 space-y-6">
            <div className="h-64 bg-[#E5E5EA] rounded-2xl" />
            <div className="h-48 bg-[#E5E5EA] rounded-2xl" />
            <div className="h-48 bg-[#E5E5EA] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Customization</h1>
          <p className="text-[#6E6E73] mt-1">
            Personalize your chatbot widget appearance and behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && (
            <span className="text-xs text-[#FF3B30]">{saveError}</span>
          )}
          {hasChanges && !saveError && (
            <span className="text-xs text-[#6E6E73]">Unsaved changes</span>
          )}
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-5 min-h-0">
        {/* Settings Panel */}
        <div className="flex-1 min-w-0">
          <ScrollArea className="h-full pr-3">
            <div className="space-y-4 pb-5">
              {/* Appearance Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5EFF] to-[#7B7EFF] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Appearance</CardTitle>
                      <CardDescription>Customize the visual style of your chatbot widget</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow label="Primary Color" description="Main brand color for the widget">
                    <ColorPicker
                      value={settings.primaryColor}
                      onChange={(color) => updateSetting('primaryColor', color)}
                    />
                  </SettingRow>

                  <SettingRow label="Widget Position" description="Where the chat bubble appears">
                    <Select
                      value={settings.position}
                      onChange={(value) => updateSetting('position', value as 'bottom-right' | 'bottom-left')}
                      options={[
                        { value: 'bottom-right', label: 'Bottom Right' },
                        { value: 'bottom-left', label: 'Bottom Left' },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow label="Widget Size" description="Size of the chat widget">
                    <Select
                      value={settings.size}
                      onChange={(value) => updateSetting('size', value as 'compact' | 'default' | 'large')}
                      options={[
                        { value: 'compact', label: 'Compact' },
                        { value: 'default', label: 'Default' },
                        { value: 'large', label: 'Large' },
                      ]}
                    />
                  </SettingRow>

                  <SettingRow label="Border Radius" description="Roundness of widget corners">
                    <div className="w-full">
                      <Slider
                        value={settings.borderRadius}
                        onChange={(value) => updateSetting('borderRadius', value)}
                        min={0}
                        max={36}
                        formatValue={(v) => `${v}px`}
                      />
                    </div>
                  </SettingRow>

                  <SettingRow label="Font Family" description="Text font for the widget">
                    <Select
                      value={settings.fontFamily}
                      onChange={(value) => updateSetting('fontFamily', value)}
                      options={[
                        { value: 'Inter', label: 'Inter' },
                        { value: 'SF Pro', label: 'SF Pro' },
                        { value: 'Roboto', label: 'Roboto' },
                        { value: 'Open Sans', label: 'Open Sans' },
                        { value: 'Lato', label: 'Lato' },
                      ]}
                    />
                  </SettingRow>
                </CardContent>
              </Card>

              {/* Welcome Message Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#34C759] to-[#30D158] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Welcome Message</CardTitle>
                      <CardDescription>First message users see when opening the chat</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow label="Greeting" description="Short greeting text">
                    <Input
                      value={settings.greeting}
                      onChange={(e) => updateSetting('greeting', e.target.value)}
                      placeholder="Hello!"
                      maxLength={50}
                    />
                  </SettingRow>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#1D1D1F]">Welcome Message</label>
                    <p className="text-[13px] text-[#6E6E73]">Longer message explaining what the bot can help with</p>
                    <textarea
                      value={settings.welcomeMessage}
                      onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                      placeholder="How can I help you today?"
                      maxLength={500}
                      className={cn(
                        'w-full min-h-[100px] px-4 py-3 rounded-xl border border-black/[0.08] bg-white',
                        'text-[14px] text-[#1D1D1F] placeholder:text-[#6E6E73]/60',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/20',
                        'resize-y scrollbar-apple'
                      )}
                    />
                    <p className="text-xs text-[#6E6E73] text-right">{settings.welcomeMessage.length}/500</p>
                  </div>

                  <SettingRow label="Input Placeholder" description="Text shown in the message input">
                    <Input
                      value={settings.placeholder}
                      onChange={(e) => updateSetting('placeholder', e.target.value)}
                      placeholder="Type your message..."
                      maxLength={100}
                    />
                  </SettingRow>
                </CardContent>
              </Card>

              {/* Avatar Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9500] to-[#FF9F0A] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Avatar</CardTitle>
                      <CardDescription>Customize your chatbot avatar and name</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow label="Bot Name" description="Name displayed in the chat header">
                    <Input
                      value={settings.botName}
                      onChange={(e) => updateSetting('botName', e.target.value)}
                      placeholder="AI Assistant"
                      maxLength={30}
                    />
                  </SettingRow>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[#1D1D1F]">Avatar Image</label>
                    <p className="text-[13px] text-[#6E6E73]">Upload a custom avatar or use default</p>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: settings.avatarUrl ? 'transparent' : `${settings.primaryColor}15` }}
                      >
                        {settings.avatarUrl ? (
                          <img src={settings.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-8 h-8" fill={settings.primaryColor} viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="url"
                          value={settings.avatarUrl}
                          onChange={(e) => updateSetting('avatarUrl', e.target.value)}
                          placeholder="https://example.com/avatar.png"
                        />
                        <p className="text-xs text-[#6E6E73] mt-1">Enter a URL or leave empty for default</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-[#1D1D1F]">Default Avatars</label>
                    <div className="flex flex-wrap gap-2">
                      {['', 'https://api.dicebear.com/7.x/bottts/svg?seed=1', 'https://api.dicebear.com/7.x/bottts/svg?seed=2', 'https://api.dicebear.com/7.x/bottts/svg?seed=3', 'https://api.dicebear.com/7.x/bottts/svg?seed=4'].map((url, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => updateSetting('avatarUrl', url)}
                          className={cn(
                            'w-12 h-12 rounded-xl border-2 transition-all duration-200 overflow-hidden',
                            settings.avatarUrl === url ? 'border-[#5B5EFF] shadow-md' : 'border-transparent hover:border-[#E5E5EA]'
                          )}
                        >
                          {url ? (
                            <img src={url} alt="" className="w-full h-full object-cover bg-[#F5F5F7]" />
                          ) : (
                            <div className="w-full h-full bg-[#F5F5F7] flex items-center justify-center">
                              <svg className="w-6 h-6 text-[#6E6E73]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Behavior Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5856D6] to-[#AF52DE] flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Behavior</CardTitle>
                      <CardDescription>Configure how the chatbot interacts with users</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SettingRow label="Auto-Open Widget" description="Automatically open chat when page loads" controlClassName="sm:w-fit">
                    <Toggle
                      checked={settings.autoOpen}
                      onChange={(checked) => updateSetting('autoOpen', checked)}
                    />
                  </SettingRow>

                  <SettingRow label="Show Typing Indicator" description="Display typing animation while bot is thinking" controlClassName="sm:w-fit">
                    <Toggle
                      checked={settings.showTypingIndicator}
                      onChange={(checked) => updateSetting('showTypingIndicator', checked)}
                    />
                  </SettingRow>

                  <SettingRow label="Collect User Info" description="Ask for name and email before starting chat" controlClassName="sm:w-fit">
                    <Toggle
                      checked={settings.collectUserInfo}
                      onChange={(checked) => updateSetting('collectUserInfo', checked)}
                    />
                  </SettingRow>

                  <SettingRow label="Launcher Button Text" description="Label shown on the floating chat button">
                    <Input
                      value={settings.buttonText}
                      onChange={(e) => updateSetting('buttonText', e.target.value)}
                      placeholder="Chat with us"
                      maxLength={50}
                    />
                  </SettingRow>

                  <SettingRow
  label="Max Input Characters"
  description="Maximum characters users can type in a single message"
>
  <div className="flex flex-col w-full">
    <Input
      type="number"
      value={String(settings.inputMaxChars)}
      onChange={(e) => {
        const raw = Number(e.target.value);
        updateSetting("inputMaxChars", raw);

        setInputMaxCharsError(
          raw >= 50 && raw <= 10000
            ? ""
            : "Input size must be between 50 and 10000 characters."
        );
      }}
      min={50}
      max={10000}
    />

    {inputMaxCharsError && (
      <p className="mt-1 text-xs text-red-500">
        {inputMaxCharsError}
      </p>
    )}
  </div>
</SettingRow>

                  <SettingRow label="Show Branding" description='Display "Powered by" text in the widget' controlClassName="sm:w-fit">
                    <Toggle
                      checked={settings.showBranding}
                      onChange={(checked) => updateSetting('showBranding', checked)}
                    />
                  </SettingRow>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        {/* Preview Panel */}
        <div className="w-[480px] flex-shrink-0 hidden lg:block">
          <div className="h-full flex flex-col justify-center">
            <WidgetChatSurface
              chatbotId={chatbotId}
              sessionId={`customization-preview-${chatbotId}`}
              settings={settings}
              apiBaseUrl={widgetApiBaseUrl}
              preview
            />
          </div>
        </div>
      </div>
    </div>
  );
}
