"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useTranslations } from "next-intl";

export default function TestLoginPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(
          t("auth.testLogin.errors.loginError") ||
            "Erreur de connexion: " + result.error,
        );
      } else if (result?.ok) {
        window.location.href = "/fr/client/announcements";
      }
    } catch (err) {
      setError(t("auth.testLogin.errors.loginError") || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const testAccounts = [
    { email: "client1@test.com", role: "CLIENT" },
    { email: "livreur1@test.com", role: "DELIVERER" },
    { email: "commercant1@test.com", role: "MERCHANT" },
    { email: "prestataire1@test.com", role: "PROVIDER" },
    { email: "admin1@test.com", role: "ADMIN" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {t("auth.testLogin.title") || "Test Login EcoDeli"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder={t("auth.login.emailPlaceholder") || "Email"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder={
                    t("auth.login.passwordPlaceholder") || "Mot de passe"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? t("auth.login.signingIn") || "Connexion..."
                  : t("auth.login.loginButton") || "Se connecter"}
              </Button>
            </form>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {t("auth.testLogin.testAccountsTitle") ||
                  "Comptes de test (mot de passe: Test123!):"}
              </h3>
              <div className="space-y-2">
                {testAccounts.map((account) => (
                  <Button
                    key={account.email}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword("Test123!");
                    }}
                  >
                    {account.role}: {account.email}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
