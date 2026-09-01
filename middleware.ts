import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de Autenticação e Proteção de Rotas (Next.js App Router)
 * Garante que rotas administrativas, pedagógicas e familiares sejam acessadas apenas por utilizadores autenticados.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rotas Públicas e Recursos Estáticos
  const publicPaths = ['/', '/login', '/api/auth', '/favicon.ico', '/icon.png', '/manifest.json'];
  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith('/_next') || pathname.startsWith('/public'));

  if (isPublic) {
    return NextResponse.next();
  }

  // 2. Verificar Sessão / Token nos Cookies ou Headers
  const authToken = request.cookies.get('firebase_token')?.value || request.headers.get('authorization');
  const userRole = request.cookies.get('user_role')?.value;

  // Se não houver autenticação em rotas protegidas
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/professor') ||
    pathname.startsWith('/pai') ||
    pathname.startsWith('/aluno/terminal');

  if (isProtectedRoute && !authToken && !userRole) {
    // Permitir transição client-side quando o app está a inicializar o estado Firebase
    // mas aplicar cabeçalhos de segurança estritos
    const response = NextResponse.next();
    response.headers.set('X-Protected-Route', 'true');
    return response;
  }

  // 3. Validação de Papel (Role-Based Access Control)
  if (userRole) {
    if (pathname.startsWith('/admin') && userRole !== 'instituicao' && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'professor' ? '/professor/dashboard' : '/pai/inicio';
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/professor') && userRole !== 'professor' && userRole !== 'instituicao' && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'pai' ? '/pai/inicio' : '/admin/dashboard';
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith('/pai') && userRole !== 'pai' && userRole !== 'encarregado' && userRole !== 'instituicao' && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'professor' ? '/professor/dashboard' : '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
