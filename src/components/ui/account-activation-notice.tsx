"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export function AccountActivationNotice() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.isActive) return null;

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Erreur lors de l'envoi de l'email");
      }
    } catch (e) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-yellow-800 font-semibold mb-1">
          Votre compte n'est pas encore activé.
        </p>
        <p className="text-yellow-700 text-sm">
          Veuillez vérifier votre boîte mail pour activer votre compte. Si vous n'avez rien reçu, cliquez sur le bouton ci-dessous pour renvoyer l'email de vérification.
        </p>
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        {sent && <p className="text-green-700 text-sm mt-2">Email de vérification renvoyé !</p>}
      </div>
      <button
        onClick={handleResend}
        disabled={loading || sent}
        className="bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-60"
      >
        {loading ? "Envoi..." : sent ? "Envoyé !" : "Renvoyer l'email"}
      </button>
    </div>
  );
} 