import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare, FileText, Globe, Image as ImageIcon, Network, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">RAG Chatbot</h1>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost">Chat</Button>
            </Link>
            <Link href="/agents">
              <Button variant="ghost">Agents</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                Multi-Agent AI System
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                An intelligent RAG chatbot powered by LangGraph orchestration, featuring
                document search, web search, OCR, and real-time agent visualization.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <FeatureCard
                icon={<MessageSquare className="h-8 w-8" />}
                title="Smart Chat"
                description="Natural conversations with intent-based routing and plan generation"
              />
              <FeatureCard
                icon={<FileText className="h-8 w-8" />}
                title="Document Search"
                description="Multi-model embeddings with BAAI reranker for precise results"
              />
              <FeatureCard
                icon={<Globe className="h-8 w-8" />}
                title="Web Search"
                description="Real-time web search with Tavily API integration"
              />
              <FeatureCard
                icon={<ImageIcon className="h-8 w-8" />}
                title="OCR Support"
                description="Extract text from images using PaddleOCRVL"
              />
              <FeatureCard
                icon={<Network className="h-8 w-8" />}
                title="Agent Workflow"
                description="Visualize agent execution with real-time updates"
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8" />}
                title="Fast Response"
                description="WebSocket streaming for instant feedback"
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <Link href="/chat">
                <Button size="lg" className="text-lg px-8">
                  Start Chatting
                </Button>
              </Link>
              <Link href="/agents">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View Agents
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tech Stack Section */}
        <div className="bg-muted/50 py-12">
          <div className="container mx-auto px-4">
            <h3 className="text-center text-sm font-semibold text-muted-foreground mb-6">
              POWERED BY
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-muted-foreground">
              <TechBadge name="Next.js 14" />
              <TechBadge name="LangGraph" />
              <TechBadge name="Gemini" />
              <TechBadge name="Milvus" />
              <TechBadge name="Tavily" />
              <TechBadge name="PaddleOCR" />
              <TechBadge name="PostgreSQL" />
              <TechBadge name="WebSocket" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>RAG Chatbot - Multi-Agent AI System</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border rounded-lg p-6 text-left space-y-3 hover:shadow-md transition-shadow">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TechBadge({ name }: { name: string }) {
  return (
    <div className="px-3 py-1 bg-background border rounded-full text-sm font-medium">
      {name}
    </div>
  );
}
