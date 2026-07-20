'use client';

import Link from 'next/link';
import {
  MessageSquare,
  FileText,
  Globe,
  Image as ImageIcon,
  Network,
  Zap,
  Search,
  Sparkles,
  ArrowRight,
  Bot,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main id="main-content" className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TechStackSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}

// Header
function Header() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 glass-heavy border-b border-border">
      <div className="container-responsive h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
            <Network className="h-5 w-5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            RAG Chatbot
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <AnchorLink href="#features">Features</AnchorLink>
          <AnchorLink href="#how-it-works">How it works</AnchorLink>
          <AnchorLink href="#pricing">Pricing</AnchorLink>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary btn-md">
              Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-all duration-200"
              >
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary btn-md">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function AnchorLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-all duration-200"
    >
      {children}
    </a>
  );
}

// Hero
function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary-300/25 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container-responsive relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Multi-Agent AI System</span>
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 animate-slide-up">
            Ask anything.
            <br />
            <span className="gradient-text-animated">Get intelligent answers.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up stagger-1">
            Build a RAG chatbot powered by LangGraph agent orchestration.
            Search your documents, browse the web, process images, and get
            synthesized answers in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up stagger-2">
            <Link href="/signup" className="btn-primary btn-xl group">
              <Sparkles className="w-5 h-5" />
              Get Started Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/chat" className="btn-outline btn-xl group">
              <MessageSquare className="w-5 h-5" />
              Live Demo
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border animate-fade-in stagger-3">
            <StatItem value="6" label="AI Agents" />
            <StatItem value="3" label="Embedding Models" />
            <StatItem value="Real-time" label="Streaming" />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-bold text-foreground">
        {value}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// Features
function FeaturesSection() {
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Smart Chat',
      description:
        'Natural conversations with intent-based routing and intelligent plan generation for complex queries.',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Document Search',
      description:
        'Multi-model embeddings with BAAI reranker for precise retrieval from your knowledge base.',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Web Search',
      description:
        'Real-time web search with Tavily API integration and intelligent content extraction.',
    },
    {
      icon: <ImageIcon className="w-6 h-6" />,
      title: 'OCR Support',
      description:
        'Extract and analyze text from images using PaddleOCR vision processing.',
    },
    {
      icon: <Network className="w-6 h-6" />,
      title: 'Agent Workflow',
      description:
        'Visualize agent orchestration with real-time execution tracking and status updates.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Streaming Response',
      description:
        'WebSocket streaming for instant feedback and progressive response rendering.',
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-24 border-t border-border">
      <div className="container-responsive">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Powerful Features
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built with cutting-edge AI technologies to deliver accurate and
            contextually relevant responses.
          </p>
        </div>

        <div className="grid-auto-fit">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div
      className="glass rounded-2xl p-6 border border-border hover:border-primary/40 transition-colors animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// How It Works
function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Ask a Question',
      description:
        'Type your query in natural language. The system understands context and intent.',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      step: '02',
      title: 'Agent Classification',
      description:
        'Our intent classifier routes your query to the appropriate agents.',
      icon: <Search className="w-5 h-5" />,
    },
    {
      step: '03',
      title: 'Multi-Source Search',
      description:
        'Agents search documents, web, and process images in parallel.',
      icon: <Bot className="w-5 h-5" />,
    },
    {
      step: '04',
      title: 'Smart Synthesis',
      description:
        'Results are reranked and synthesized into a comprehensive response.',
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-24 border-t border-border">
      <div className="container-responsive">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A seamless flow from question to answer, powered by intelligent
            agent orchestration.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/40 to-primary/5" />
              )}

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <div className="text-primary">{step.icon}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-600 text-white text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                </div>

                <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing
function PricingSection() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Try out the platform with a single chatbot.',
      features: ['1 chatbot', '100 messages / month', 'Document search', 'Web search fallback'],
      cta: 'Get Started Free',
      href: '/signup',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For teams running multiple chatbots in production.',
      features: [
        '10 chatbots',
        '10,000 messages / month',
        'Document search + reranking',
        'Web search, OCR & URL processing',
        'Priority support',
      ],
      cta: 'Start Pro Trial',
      href: '/signup?plan=pro',
      highlighted: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-24 border-t border-border">
      <div className="container-responsive">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you need more chatbots and headroom.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlighted
                  ? 'relative rounded-2xl p-8 bg-primary/5 border-2 border-primary shadow-2xl shadow-primary/10'
                  : 'relative rounded-2xl p-8 glass border border-border'
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-primary-600 text-white text-xs font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/ {plan.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={plan.highlighted ? 'btn-primary btn-lg w-full mt-8' : 'btn-outline btn-lg w-full mt-8'}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Tech Stack
function TechStackSection() {
  const technologies = [
    { name: 'Next.js 14' },
    { name: 'LangGraph' },
    { name: 'Gemini' },
    { name: 'Milvus' },
    { name: 'Tavily' },
    { name: 'PaddleOCR' },
    { name: 'PostgreSQL' },
    { name: 'WebSocket' },
  ];

  return (
    <section className="py-20 sm:py-24 border-t border-border">
      <div className="container-responsive">
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            Powered by Modern Technologies
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {technologies.map((tech) => (
              <div
                key={tech.name}
                className="card-flat px-4 py-2 hover:border-primary/40 transition-colors cursor-default"
              >
                <span className="text-sm font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// CTA
function CTASection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-responsive">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 sm:p-12 lg:p-16 text-center">
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
              Ready to get started?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">
              Experience the power of multi-agent AI with intelligent document
              search and real-time web capabilities.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-white text-primary font-semibold hover:bg-white/90 transition-colors shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Get Started Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="container-responsive">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              RAG Chatbot — Multi-Agent AI System
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Chat
            </Link>
            <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Agents
            </Link>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
