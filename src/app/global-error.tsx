"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loguer l'erreur sur la console
    console.error("Erreur globale:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            padding: "2rem",
            maxWidth: "600px",
            margin: "0 auto",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ color: "#e11d48" }}>Une erreur est survenue</h1>
          <p>Nous sommes désolés, quelque chose s&apos;est mal passé.</p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "0.25rem",
              cursor: "pointer",
              marginTop: "1rem",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
