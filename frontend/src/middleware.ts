import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (next internal resources)
     * 3. /_static (static files)
     * 4. all static files (e.g. favicon.ico, images)
     */
    '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)',
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Exclude local dev files or hot reloads
  if (hostname.includes('localhost:3000') && url.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Determine the tenant slug from subdomain or custom domain
  let tenant = '';

  // Local development host check
  // e.g. company.localhost:3000 -> company
  if (hostname.includes('.localhost:3000')) {
    tenant = hostname.replace('.localhost:3000', '');
  } else if (hostname.includes('.tenantkit.app')) {
    tenant = hostname.replace('.tenantkit.app', '');
  } else {
    // If it's localhost:3000 or tenantkit.app or www.tenantkit.app, we treat it as root
    if (
      hostname === 'localhost:3000' ||
      hostname === 'tenantkit.app' ||
      hostname === 'www.tenantkit.app'
    ) {
      tenant = '';
    } else {
      // It's a custom domain, e.g. client.com
      // We pass the full custom domain as the tenant slug identifier
      tenant = hostname;
    }
  }

  // Rewrite tenant-specific routes
  if (tenant && tenant !== 'www') {
    // If the path is public authentication routes, we can either keep them global or scope them.
    // Usually, login and register can be tenant-scoped (e.g. company.tenantkit.app/login)
    // We rewrite the request to the dynamic tenant folder path
    return NextResponse.rewrite(
      new URL(`/_tenants/${tenant}${url.pathname}${url.search}`, req.url)
    );
  }

  // If no tenant is resolved, serve root pages normally (e.g. global landing, global login)
  return NextResponse.next();
}
