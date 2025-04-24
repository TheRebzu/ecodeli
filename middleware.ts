import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - API routes, static files, images, etc.
  matcher: ['/((?!api|_next|static|public|favicon.ico).*)']
}; 