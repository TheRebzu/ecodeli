import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

/**
 * Navigation utilities that are aware of internationalization
 * Provides locale-aware versions of Next.js navigation APIs
 */
export const {
  // For client components to navigate between pages
  Link,
  // For programmatic navigation in client components
  useRouter,
  // For getting the current pathname without locale prefix
  usePathname,
  // For server-side redirects
  redirect,
  // For generating pathnames with locale
  getPathname} = createNavigation(routing);
