import createMiddleware from "next-intl/middleware";
import { routing } from "../i18n/routing";

// This function creates a middleware handler for internationalization
export default createMiddleware(routing);

// See "Matching Paths" below to learn more
export const config = {
  matcher: ["/((?!api|_next|static|public|favicon.ico).*)"],
};
