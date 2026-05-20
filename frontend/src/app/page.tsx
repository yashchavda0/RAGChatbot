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
  Workflow,
  ChevronRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <HeroSection />

        {/* Features Grid */}
        <FeaturesSection />

        {/* How It Works */}
        <HowItWorksSection />

        {/* Tech Stack */}
        <TechStackSection />

        {/* CTA Section */}
        <CTASection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Header Component
function Header() {
  return (
    <header className="sticky top-0 z-50 glass-heavy border-b">
      <div className="container-responsive h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
            <Network className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            RAG Chatbot
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <NavLink href="/chat" icon={<MessageSquare className="w-4 h-4" />}>
            Chat
          </NavLink>
          <NavLink href="/agents" icon={<Workflow className="w-4 h-4" />}>
            Agents
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-full hover:bg-accent transition-all duration-200"
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
}

// Hero Section
function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative Elements */}
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-40" />

      <div className="container-responsive relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>Multi-Agent AI System</span>
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6 animate-slide-up">
            Ask anything.
            <br />
            <span className="gradient-text">Get intelligent answers.</span>
          </h1>

          {/* Description */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up stagger-1">
            A powerful RAG chatbot powered by LangGraph agent orchestration.
            Search documents, browse the web, process images, and get
            synthesized answers in real-time.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up stagger-2">
            <Link
              href="/chat"
              className="btn-primary btn-lg group"
            >
              <MessageSquare className="w-5 h-5" />
              Start Chatting
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/agents"
              className="btn-outline btn-lg group"
            >
              <Network className="w-5 h-5" />
              View Agent Workflow
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t animate-fade-in stagger-3">
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

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Smart Chat',
      description:
        'Natural conversations with intent-based routing and intelligent plan generation for complex queries.',
      color: 'primary',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'Document Search',
      description:
        'Multi-model embeddings with BAAI reranker for precise retrieval from your knowledge base.',
      color: 'info',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Web Search',
      description:
        'Real-time web search with Tavily API integration and intelligent content extraction.',
      color: 'success',
    },
    {
      icon: <ImageIcon className="w-6 h-6" />,
      title: 'OCR Support',
      description:
        'Extract and analyze text from images using PaddleOCR vision processing.',
      color: 'warning',
    },
    {
      icon: <Network className="w-6 h-6" />,
      title: 'Agent Workflow',
      description:
        'Visualize agent orchestration with real-time execution tracking and status updates.',
      color: 'primary',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Streaming Response',
      description:
        'WebSocket streaming for instant feedback and progressive response rendering.',
      color: 'info',
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-muted/30">
      <div className="container-responsive">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Powerful Features
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built with cutting-edge AI technologies to deliver accurate and
            contextually relevant responses.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid-auto-fit">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              index={index}
            />
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
  color,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  index: number;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div
      className={`card card-hover p-6 animate-slide-up`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// How It Works Section
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
    <section className="py-20 sm:py-24">
      <div className="container-responsive">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A seamless flow from question to answer, powered by intelligent
            agent orchestration.
          </p>
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div
              key={step.step}
              className="relative animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Connector Line (not on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/30 to-primary/10" />
              )}

              <div className="flex flex-col items-center text-center">
                {/* Step Number */}
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <div className="text-primary">{step.icon}</div>
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </div>
                </div>

                {/* Content */}
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

// Tech Stack Section
function TechStackSection() {
  const technologies = [
    { name: 'Next.js 14', category: 'Frontend' },
    { name: 'LangGraph', category: 'AI' },
    { name: 'Gemini', category: 'LLM' },
    { name: 'Milvus', category: 'Vector DB' },
    { name: 'Tavily', category: 'Search' },
    { name: 'PaddleOCR', category: 'Vision' },
    { name: 'PostgreSQL', category: 'Database' },
    { name: 'WebSocket', category: 'Real-time' },
  ];

  return (
    <section className="py-20 sm:py-24 bg-muted/30">
      <div className="container-responsive">
        <div className="text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
            Powered by Modern Technologies
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {technologies.map((tech) => (
              <div
                key={tech.name}
                className="card-flat px-4 py-2 hover:border-primary/30 transition-colors cursor-default"
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

// CTA Section
function CTASection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="container-responsive">
        <div className="relative overflow-hidden rounded-3xl bg-primary p-8 sm:p-12 lg:p-16 text-center">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8">
              Experience the power of multi-agent AI with intelligent document
              search and real-time web capabilities.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-full bg-primary-foreground text-primary font-semibold hover:bg-white/90 transition-colors shadow-lg"
            >
              <MessageSquare className="w-5 h-5" />
              Start Chatting Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  return (
    <footer className="border-t py-8">
      <div className="container-responsive">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              RAG Chatbot — Multi-Agent AI System
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/chat"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Chat
            </Link>
            <Link
              href="/agents"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Agents
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
