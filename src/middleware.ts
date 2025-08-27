import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect /signals pages - allow home page without auth
  if (request.nextUrl.pathname.startsWith('/signals')) {
    // Check if user is authenticated by looking for OIDC tokens in localStorage
    // Note: We can't access localStorage in middleware, so we'll handle auth checks in components
    // For now, just allow all requests and handle auth in the components
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only protect /signals pages, allow home page to be accessed without auth
    "/signals/:path*",
  ]
}