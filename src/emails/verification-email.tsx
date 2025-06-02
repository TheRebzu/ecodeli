import * as React from 'react';

interface VerificationEmailProps {
  username: string;
  verificationUrl: string;
}

export const VerificationEmail = ({
  username,
  verificationUrl,
}: VerificationEmailProps) => {
  return (
    <div>
      <h1>Vérifiez votre adresse email</h1>
      <p>Bonjour {username},</p>
      <p>Merci de vous être inscrit sur EcoDeli. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p>
      <a href={verificationUrl}>Vérifier mon email</a>
      <p>Ce lien expirera dans 24 heures.</p>
      <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
    </div>
  );
};