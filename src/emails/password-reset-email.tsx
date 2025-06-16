import * as React from "react";

interface PasswordResetEmailProps {
  username: string;
  resetUrl: string;
}

export const PasswordResetEmail = ({
  username,
  resetUrl}: PasswordResetEmailProps) => {
  return (
    <div>
      <h1>Réinitialisation de mot de passe</h1>
      <p>Bonjour {username},</p>
      <p>
        Vous avez demandé la réinitialisation de votre mot de passe. Veuillez
        cliquer sur le lien ci-dessous pour le réinitialiser :
      </p>
      <a href={resetUrl}>Réinitialiser mon mot de passe</a>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>
        Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer
        cet email.
      </p>
    </div>
  );
};
