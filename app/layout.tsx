import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0D1B3D',
};

export const metadata: Metadata = {
  title: 'Alô mãe — Conexão que cuida | Sistema Biométrico Escolar',
  applicationName: 'Alô mãe',
  description:
    'Plataforma integrada de controlo de presenças por reconhecimento facial, notificações em tempo real para encarregados de educação e gestão escolar.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Alô mãe',
  },
  icons: {
    icon: '/logo2.jpeg',
    apple: '/logo2.jpeg',
  },
  openGraph: {
    title: 'Alô mãe — Conexão que cuida',
    description: 'Tecnologia que aproxima. Segurança que tranquiliza.',
    type: 'website',
    images: ['/logo2.jpeg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-AO" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-['Inter',sans-serif] bg-[#F8F9FF] text-[#121C28] min-h-screen select-none overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

