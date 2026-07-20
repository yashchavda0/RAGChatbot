import Link from 'next/link';

interface AuthShellProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-300/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-400 flex items-center justify-center shadow-lg shadow-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">RAG Chatbot</span>
          </Link>
          {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
          {subtitle && <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="glass-heavy rounded-2xl p-8 shadow-2xl">{children}</div>

        {footer && <div className="mt-6 text-center text-[14px] text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
