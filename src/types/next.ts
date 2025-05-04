/**
 * Types pour les pages Next.js (App Router)
 */

// Type pour les props de page dans App Router
export type PageProps = {
  params: Promise<{
    locale: string;
    [key: string]: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Type pour les props de layout dans App Router
export type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
    [key: string]: string;
  }>;
};

// Type pour les paramètres de métadonnées
export type MetadataProps = {
  params: Promise<{
    locale: string;
    [key: string]: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}; 