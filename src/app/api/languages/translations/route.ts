import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  lang: z.string().min(2).max(5),
  namespace: z.string().optional(),
});

// GET: Retrieve translations for a specific language
export async function GET(req: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      lang: searchParams.get("lang") || "fr", // Default to French
      namespace: searchParams.get("namespace"), // Optional namespace parameter
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { lang, namespace } = validatedParams.data;

    // In a real application, these would be fetched from a database or files
    const translations = {
      fr: {
        common: {
          welcome: "Bienvenue sur EcoDeli",
          login: "Connexion",
          register: "S'inscrire",
          logout: "Déconnexion",
          search: "Rechercher",
          profile: "Profil",
          settings: "Paramètres",
          help: "Aide",
          language: "Langue",
          darkMode: "Mode sombre",
          lightMode: "Mode clair",
        },
        dashboard: {
          title: "Tableau de bord",
          summary: "Résumé",
          activities: "Activités récentes",
          deliveries: "Livraisons",
          orders: "Commandes",
          statistics: "Statistiques",
        },
        auth: {
          emailLabel: "Email",
          passwordLabel: "Mot de passe",
          loginButton: "Se connecter",
          registerButton: "S'inscrire",
          forgotPassword: "Mot de passe oublié?",
          resetPassword: "Réinitialiser le mot de passe",
          confirmPassword: "Confirmer le mot de passe",
        },
      },
      en: {
        common: {
          welcome: "Welcome to EcoDeli",
          login: "Login",
          register: "Register",
          logout: "Logout",
          search: "Search",
          profile: "Profile",
          settings: "Settings",
          help: "Help",
          language: "Language",
          darkMode: "Dark Mode",
          lightMode: "Light Mode",
        },
        dashboard: {
          title: "Dashboard",
          summary: "Summary",
          activities: "Recent Activities",
          deliveries: "Deliveries",
          orders: "Orders",
          statistics: "Statistics",
        },
        auth: {
          emailLabel: "Email",
          passwordLabel: "Password",
          loginButton: "Login",
          registerButton: "Register",
          forgotPassword: "Forgot Password?",
          resetPassword: "Reset Password",
          confirmPassword: "Confirm Password",
        },
      },
    };

    // If language is not supported, fallback to French
    if (!translations[lang as keyof typeof translations]) {
      return NextResponse.json({
        data: translations.fr,
        meta: {
          lang: "fr",
          fallback: true,
          original: lang,
        },
      });
    }

    // If namespace is specified, return only that namespace
    if (namespace && translations[lang as keyof typeof translations][namespace]) {
      return NextResponse.json({
        data: {
          [namespace]: translations[lang as keyof typeof translations][namespace],
        },
        meta: {
          lang,
          namespace,
        },
      });
    }

    // Return all translations for the language
    return NextResponse.json({
      data: translations[lang as keyof typeof translations],
      meta: {
        lang,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching translations:", error);
    return NextResponse.json(
      { error: "Failed to fetch translations" },
      { status: 500 }
    );
  }
} 