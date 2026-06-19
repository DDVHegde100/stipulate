import Link from 'next/link';
import { Container, Logo } from '@stipulate/ui';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950">
      <header className="border-b border-glass-border">
        <Container className="flex h-16 items-center gap-8">
          <Link href="/admin">
            <Logo variant="full" />
          </Link>
          <nav className="flex gap-6 text-sm">
            <Link href="/admin/ingestion" className="text-[var(--color-text-secondary)] hover:text-white">
              Ingestion
            </Link>
            <Link href="/admin/corrections" className="text-[var(--color-text-secondary)] hover:text-white">
              Corrections
            </Link>
          </nav>
        </Container>
      </header>
      <main>{children}</main>
    </div>
  );
}
