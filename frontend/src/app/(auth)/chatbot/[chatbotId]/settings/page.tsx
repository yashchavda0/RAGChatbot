'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@ragchatbot/shared-ui';
import {
  SettingsSection,
  SettingRow,
  Toggle,
  Slider,
  Select,
  TextArea,
} from '@/components/settings/SettingsSection';
import { ModelSelector } from '@/components/settings/ModelSelector';
import { chatbotApi } from '@/lib/api';

interface GeneralSettings {
  name: string;
  description: string;
  websiteUrl: string;
  industry: string;
}

interface AIModelSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  clarificationEnabled: boolean;
}

interface RateLimitSettings {
  maxMessagesPerConversation: number;
  rateLimitPerHour: number;
}

interface SecuritySettings {
  allowedDomains: string[];
  apiKey: string;
}

interface DangerZoneSettings {
  isActive: boolean;
}

interface AllSettings {
  general: GeneralSettings;
  aiModel: AIModelSettings;
  rateLimit: RateLimitSettings;
  security: SecuritySettings;
  dangerZone: DangerZoneSettings;
}

const getDefaultSettings = (): AllSettings => ({
  general: {
    name: '',
    description: '',
    websiteUrl: '',
    industry: 'technology',
  },
  aiModel: {
    model: 'gemini-pro',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '',
    clarificationEnabled: false,
  },
  rateLimit: {
    maxMessagesPerConversation: 100,
    rateLimitPerHour: 50,
  },
  security: {
    allowedDomains: [],
    apiKey: '',
  },
  dangerZone: {
    isActive: true,
  },
});

const industryOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'hospitality', label: 'Hospitality & Travel' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'other', label: 'Other' },
];

interface SettingsPageProps {
  params: { chatbotId: string };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { chatbotId } = params;
  const router = useRouter();
  const [settings, setSettings] = useState<AllSettings>(getDefaultSettings);
  const [originalSettings, setOriginalSettings] = useState<AllSettings>(getDefaultSettings);
  const [modifiedSections, setModifiedSections] = useState<Set<string>>(new Set());
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchChatbot() {
      try {
        setIsLoading(true);
        const chatbot = await chatbotApi.get(chatbotId);
        const s = chatbot.settings || {};
        const loadedSettings: AllSettings = {
          ...getDefaultSettings(),
          general: {
            name: chatbot.name || '',
            description: chatbot.description || '',
            websiteUrl: s.website_url || '',
            industry: s.industry || 'technology',
          },
          aiModel: {
            model: s.model || 'gemini-pro',
            temperature: s.temperature ?? 0.7,
            maxTokens: s.max_tokens ?? 2048,
            systemPrompt: chatbot.system_prompt || '',
            clarificationEnabled: s.clarification_enabled ?? false,
          },
          rateLimit: {
            maxMessagesPerConversation: s.max_messages_per_conversation ?? 100,
            rateLimitPerHour: s.rate_limit_per_hour ?? 50,
          },
          security: {
            allowedDomains: s.allowed_domains || [],
            apiKey: s.api_key || '',
          },
          dangerZone: {
            isActive: chatbot.status === 'active',
          },
        };
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      } catch (err) {
        console.error('Failed to load chatbot settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchChatbot();
  }, [chatbotId]);

  const updateSection = useCallback(<K extends keyof AllSettings>(
    section: K,
    updates: Partial<AllSettings[K]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
    setModifiedSections((prev) => new Set(prev).add(section));
  }, []);

  const hasSectionChanges = (section: keyof AllSettings) =>
    JSON.stringify(settings[section]) !== JSON.stringify(originalSettings[section]);

  const sectionLabels: Record<keyof AllSettings, string> = {
    general: 'General settings',
    aiModel: 'AI model settings',
    rateLimit: 'Rate limit settings',
    security: 'Security settings',
    dangerZone: 'Danger zone settings',
  };

  const handleSaveSection = async (section: keyof AllSettings) => {
    setSavingSections((prev) => new Set(prev).add(section));
    try {
      if (section === 'general') {
        await chatbotApi.update(chatbotId, {
          name: settings.general.name,
          description: settings.general.description,
          settings: {
            website_url: settings.general.websiteUrl,
            industry: settings.general.industry,
          },
        });
      } else if (section === 'aiModel') {
        await chatbotApi.update(chatbotId, {
          system_prompt: settings.aiModel.systemPrompt,
          settings: {
            model: settings.aiModel.model,
            temperature: settings.aiModel.temperature,
            max_tokens: settings.aiModel.maxTokens,
            clarification_enabled: settings.aiModel.clarificationEnabled,
          },
        });
      } else if (section === 'rateLimit') {
        await chatbotApi.update(chatbotId, {
          settings: {
            max_messages_per_conversation: settings.rateLimit.maxMessagesPerConversation,
            rate_limit_per_hour: settings.rateLimit.rateLimitPerHour,
          },
        });
      } else if (section === 'security') {
        await chatbotApi.update(chatbotId, {
          settings: {
            allowed_domains: settings.security.allowedDomains,
            api_key: settings.security.apiKey,
          },
        });
      }
      setOriginalSettings((prev) => ({
        ...prev,
        [section]: settings[section],
      }));
      setModifiedSections((prev) => {
        const next = new Set(prev);
        next.delete(section);
        return next;
      });
      toast.success(`${sectionLabels[section]} saved`);
    } catch (error) {
      console.error(`Failed to save ${section} settings:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to save ${sectionLabels[section].toLowerCase()}`);
    } finally {
      setSavingSections((prev) => {
        const next = new Set(prev);
        next.delete(section);
        return next;
      });
    }
  };

  const handleResetSection = (section: keyof AllSettings) => {
    setSettings((prev) => ({
      ...prev,
      [section]: originalSettings[section],
    }));
    setModifiedSections((prev) => {
      const next = new Set(prev);
      next.delete(section);
      return next;
    });
  };

  const handleRegenerateApiKey = async () => {
    const newKey = `sk-bot-${Math.random().toString(36).substring(2, 18)}`;
    updateSection('security', { apiKey: newKey });
  };

  const handleToggleActive = async () => {
    const action = settings.dangerZone.isActive ? 'Deactivate' : 'Activate';
    if (confirm(`Are you sure you want to ${action.toLowerCase()} this chatbot?`)) {
      try {
        if (!settings.dangerZone.isActive) {
          await chatbotApi.activate(chatbotId);
        }
        updateSection('dangerZone', { isActive: !settings.dangerZone.isActive });
        setOriginalSettings((prev) => ({
          ...prev,
          dangerZone: { isActive: !settings.dangerZone.isActive },
        }));
        toast.success(settings.dangerZone.isActive ? 'Chatbot deactivated' : 'Chatbot activated');
      } catch (error) {
        console.error('Failed to toggle chatbot status:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to update chatbot status');
      }
    }
  };

  const handleDeleteChatbot = async () => {
    if (deleteConfirmation !== settings.general.name) {
      alert('Please type the chatbot name exactly to confirm deletion.');
      return;
    }
    setIsDeleting(true);
    try {
      await chatbotApi.delete(chatbotId);
      toast.success('Chatbot deleted');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete chatbot');
      setIsDeleting(false);
    }
  };

  const handleAddDomain = () => {
    const domain = prompt('Enter a domain (e.g., example.com):');
    if (domain && !settings.security.allowedDomains.includes(domain)) {
      updateSection('security', {
        allowedDomains: [...settings.security.allowedDomains, domain],
      });
    }
  };

  const handleRemoveDomain = (domain: string) => {
    updateSection('security', {
      allowedDomains: settings.security.allowedDomains.filter((d) => d !== domain),
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col animate-pulse">
        <div className="mb-6">
          <div className="h-8 bg-[#E5E5EA] rounded w-32 mb-2" />
          <div className="h-4 bg-[#E5E5EA] rounded w-64" />
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/[0.08] p-6">
            <div className="h-6 bg-[#E5E5EA] rounded w-24 mb-4" />
            <div className="space-y-4">
              <div className="h-10 bg-[#E5E5EA] rounded" />
              <div className="h-10 bg-[#E5E5EA] rounded" />
            </div>
          </div>
          <div className="rounded-2xl border border-black/[0.08] p-6">
            <div className="h-6 bg-[#E5E5EA] rounded w-24 mb-4" />
            <div className="space-y-4">
              <div className="h-10 bg-[#E5E5EA] rounded" />
              <div className="h-32 bg-[#E5E5EA] rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1D1D1F]">Settings</h1>
        <p className="text-[#6E6E73] mt-1">
          Configure your chatbot's behavior, AI model, and security settings
        </p>
      </div>

      {/* Settings Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6 pb-6">
            {/* General Settings */}
            <SettingsSection
              title="General"
              description="Basic information about your chatbot"
              isModified={hasSectionChanges('general')}
              onSave={() => handleSaveSection('general')}
              onReset={() => handleResetSection('general')}
              isLoading={savingSections.has('general')}
            >
              <SettingRow label="Chatbot Name" description="Display name for your chatbot">
                <Input
                  value={settings.general.name}
                  onChange={(e) => updateSection('general', { name: e.target.value })}
                  placeholder="My Chatbot"
                />
              </SettingRow>

              <SettingRow label="Description" description="Brief description of what the chatbot does">
                <Input
                  value={settings.general.description}
                  onChange={(e) => updateSection('general', { description: e.target.value })}
                  placeholder="AI assistant for customer support"
                />
              </SettingRow>

              <SettingRow label="Website URL" description="Primary website where the chatbot is embedded">
                <Input
                  type="url"
                  value={settings.general.websiteUrl}
                  onChange={(e) => updateSection('general', { websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </SettingRow>

              <SettingRow label="Industry / Category" description="Business category for analytics">
                <Select
                  value={settings.general.industry}
                  onChange={(value) => updateSection('general', { industry: value })}
                  options={industryOptions}
                  placeholder="Select industry"
                />
              </SettingRow>
            </SettingsSection>

            {/* AI Model Settings */}
            <SettingsSection
              title="AI Model"
              description="Configure the AI model powering your chatbot"
              isModified={hasSectionChanges('aiModel')}
              onSave={() => handleSaveSection('aiModel')}
              onReset={() => handleResetSection('aiModel')}
              isLoading={savingSections.has('aiModel')}
            >
              <SettingRow label="Model" description="The AI model to use for generating responses">
                <div className="w-full">
                  <ModelSelector
                    value={settings.aiModel.model}
                    onChange={(value) => updateSection('aiModel', { model: value })}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Temperature" description="Controls response creativity (0 = focused, 1 = creative)">
                <div className="w-full">
                  <Slider
                    value={settings.aiModel.temperature}
                    onChange={(value) => updateSection('aiModel', { temperature: value })}
                    min={0}
                    max={1}
                    step={0.1}
                    formatValue={(v) => v.toFixed(1)}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Max Tokens" description="Maximum length of generated responses">
                <Input
                  type="number"
                  value={settings.aiModel.maxTokens}
                  onChange={(e) => updateSection('aiModel', { maxTokens: parseInt(e.target.value) || 0 })}
                  min={100}
                  max={8192}
                />
              </SettingRow>

              <SettingRow
                label="Ask Clarifying Questions"
                description="When the chatbot can't clearly answer from context, ask the user to clarify instead of guessing"
              >
                <Toggle
                  checked={settings.aiModel.clarificationEnabled}
                  onChange={(checked) => updateSection('aiModel', { clarificationEnabled: checked })}
                />
              </SettingRow>

              <div className="space-y-2 pt-2">
                <label className="block text-sm font-medium text-[#1D1D1F]">System Prompt</label>
                <p className="text-[13px] text-[#6E6E73]">Instructions that define the chatbot's behavior and personality</p>
                <TextArea
                  value={settings.aiModel.systemPrompt}
                  onChange={(e) => updateSection('aiModel', { systemPrompt: e.target.value })}
                  placeholder="You are a helpful assistant..."
                  className="min-h-[150px]"
                />
                <p className="text-xs text-[#6E6E73] text-right">{settings.aiModel.systemPrompt.length} characters</p>
              </div>
            </SettingsSection>

            {/* Rate Limiting Settings */}
            <SettingsSection
              title="Rate Limiting"
              description="Control usage limits to prevent abuse"
              isModified={hasSectionChanges('rateLimit')}
              onSave={() => handleSaveSection('rateLimit')}
              onReset={() => handleResetSection('rateLimit')}
              isLoading={savingSections.has('rateLimit')}
            >
              <SettingRow label="Max Messages per Conversation" description="Maximum messages in a single conversation session">
                <Input
                  type="number"
                  value={settings.rateLimit.maxMessagesPerConversation}
                  onChange={(e) => updateSection('rateLimit', { maxMessagesPerConversation: parseInt(e.target.value) || 0 })}
                  min={10}
                  max={1000}
                />
              </SettingRow>

              <SettingRow label="Rate Limit per User" description="Maximum messages a user can send per hour">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={settings.rateLimit.rateLimitPerHour}
                    onChange={(e) => updateSection('rateLimit', { rateLimitPerHour: parseInt(e.target.value) || 0 })}
                    min={5}
                    max={500}
                  />
                  <span className="text-sm text-[#6E6E73] flex-shrink-0">per hour</span>
                </div>
              </SettingRow>
            </SettingsSection>

            {/* Security Settings */}
            <SettingsSection
              title="Security"
              description="Configure access control and API settings"
              isModified={hasSectionChanges('security')}
              onSave={() => handleSaveSection('security')}
              onReset={() => handleResetSection('security')}
              isLoading={savingSections.has('security')}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-[#1D1D1F]">Allowed Domains</label>
                    <p className="text-[13px] text-[#6E6E73]">Only these domains can embed your chatbot</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddDomain}>
                    Add Domain
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settings.security.allowedDomains.map((domain) => (
                    <div
                      key={domain}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F7] rounded-lg"
                    >
                      <span className="text-sm text-[#1D1D1F]">{domain}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDomain(domain)}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#E5E5EA] transition-colors"
                      >
                        <svg className="w-3 h-3 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {settings.security.allowedDomains.length === 0 && (
                    <p className="text-sm text-[#6E6E73]">No domains added yet</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="block text-sm font-medium text-[#1D1D1F]">API Key</label>
                <p className="text-[13px] text-[#6E6E73]">Use this key to authenticate API requests</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center h-10 px-4 bg-[#F5F5F7] rounded-xl border border-black/[0.08]">
                    <code className="flex-1 text-sm text-[#1D1D1F] font-mono truncate">
                      {settings.security.apiKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(settings.security.apiKey)}
                      className="ml-2 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRegenerateApiKey}>
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-[#FF9500]">
                  Warning: Regenerating the API key will invalidate the existing key
                </p>
              </div>
            </SettingsSection>

            {/* Danger Zone */}
            <div className="rounded-2xl border-2 border-[#FF3B30]/20 bg-[#FF3B30]/5 overflow-hidden">
              <div className="p-6 space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-semibold text-[#1D1D1F]">Danger Zone</h3>
                    <p className="text-[13px] text-[#6E6E73]">Irreversible actions for this chatbot</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-black/[0.08]">
                  <div>
                    <h4 className="text-sm font-medium text-[#1D1D1F]">
                      {settings.dangerZone.isActive ? 'Deactivate Chatbot' : 'Activate Chatbot'}
                    </h4>
                    <p className="text-[13px] text-[#6E6E73]">
                      {settings.dangerZone.isActive
                        ? 'Temporarily disable the chatbot from responding'
                        : 'Enable the chatbot to start responding again'}
                    </p>
                  </div>
                  <Button
                    variant={settings.dangerZone.isActive ? 'outline' : 'default'}
                    onClick={handleToggleActive}
                    className={cn(
                      settings.dangerZone.isActive && 'text-[#FF3B30] hover:bg-[#FF3B30]/10'
                    )}
                  >
                    {settings.dangerZone.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[#FF3B30]/20">
                  <div>
                    <h4 className="text-sm font-medium text-[#1D1D1F]">Delete Chatbot</h4>
                    <p className="text-[13px] text-[#6E6E73]">
                      Permanently delete this chatbot and all its data
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete Chatbot
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-apple-lg max-w-md w-full p-6 animate-scale-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#FF3B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">Delete Chatbot</h3>
              <p className="text-[#6E6E73]">
                This action cannot be undone. This will permanently delete your chatbot,
                all conversations, knowledge base entries, and analytics data.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                  Type <span className="font-mono text-[#5B5EFF]">{settings.general.name}</span> to confirm
                </label>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={settings.general.name}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteChatbot}
                  disabled={deleteConfirmation !== settings.general.name || isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Forever'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
