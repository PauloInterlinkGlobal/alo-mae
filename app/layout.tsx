import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Alô mãe — Conexão que cuida | Sistema Biométrico Escolar',
  description:
    'Plataforma integrada de controlo de presenças por reconhecimento facial, notificações em tempo real para encarregados de educação e gestão escolar.',
  openGraph: {
    title: 'Alô mãe — Conexão que cuida',
    description: 'Tecnologia que aproxima. Segurança que tranquiliza.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-PT" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-['Inter',sans-serif] bg-[#F8F9FF] text-[#121C28] min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
