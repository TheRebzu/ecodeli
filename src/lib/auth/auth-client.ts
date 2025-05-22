export async function registerUser(userData: any) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      // Pour le débogage, afficher le contenu réel de la réponse
      const errorText = await response.text();
      console.log("Réponse d'erreur:", errorText);
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Erreur d'enregistrement:", error);
    throw error;
  }
}
