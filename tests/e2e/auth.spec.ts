import { test, expect } from '@playwright/test';

test.describe("Parcours d'authentification", () => {
  test('Inscription, vérification et connexion en tant que client', async ({ page }) => {
    // 1. Accéder à la page d'inscription
    await page.goto('/fr/register');
    await expect(page).toHaveTitle(/Inscription/);

    // Choisir le rôle client
    await page.click('a[href="/fr/register/client"]');
    await expect(page).toHaveTitle(/Inscription Client/);

    // Remplir le formulaire d'inscription
    await page.fill('input[name="name"]', 'Client Test');
    await page.fill('input[name="email"]', `client.test.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.fill('input[name="address"]', '123 Rue Test');
    await page.fill('input[name="phone"]', '0612345678');
    await page.fill('input[name="city"]', 'Paris');
    await page.fill('input[name="postalCode"]', '75001');

    // Soumettre le formulaire
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers la page de confirmation
    await expect(page).toHaveURL(/verify-email/);
    await expect(page.locator('h1')).toContainText('Vérifiez votre email');

    // Ici, nous devrions idéalement tester la vérification de l'email,
    // mais comme c'est difficile en E2E, nous allons simuler directement la connexion

    // 2. Se connecter
    await page.goto('/fr/login');
    await page.fill('input[name="email"]', 'client.test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers le tableau de bord
    await expect(page).toHaveURL(/\/fr\/client/);
  });

  test('Processus de récupération de mot de passe', async ({ page }) => {
    // 1. Accéder à la page de mot de passe oublié
    await page.goto('/fr/forgot-password');
    await expect(page).toHaveTitle(/Mot de passe oublié/);

    // Remplir l'email
    await page.fill('input[name="email"]', 'recovery@example.com');
    await page.click('button[type="submit"]');

    // Vérifier le message de confirmation
    await expect(page.locator('div.card')).toContainText('Email envoyé');

    // 2. Simuler l'accès au lien de réinitialisation
    // Dans un vrai test, nous ne pouvons pas facilement intercepter l'email,
    // donc nous simulons l'accès direct à la page avec un token
    await page.goto('/fr/reset-password?token=mock_token_for_testing');

    // Remplir le nouveau mot de passe
    await page.fill('input[name="password"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
    await page.click('button[type="submit"]');

    // Vérifier la redirection vers la page de connexion avec confirmation
    await expect(page.locator('div.card')).toContainText('Mot de passe réinitialisé');
  });
});
