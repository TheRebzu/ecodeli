import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureKeyVaultConfig {
  keyVaultUrl: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}

class AzureKeyVaultService {
  private client: SecretClient | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const keyVaultUrl = process.env.AZURE_KEYVAULT_URL;
    
    if (!keyVaultUrl) {
      console.warn("[Azure KeyVault] URL non configurée - mode fallback activé");
      return;
    }

    try {
      const credential = new DefaultAzureCredential({
        managedIdentityClientId: process.env.AZURE_CLIENT_ID,
        workloadIdentityClientId: process.env.AZURE_CLIENT_ID,
      });

      this.client = new SecretClient(keyVaultUrl, credential);
      this.isConfigured = true;
      console.log("[Azure KeyVault] Service initialisé avec succès");
    } catch (error) {
      console.error("[Azure KeyVault] Erreur d'initialisation:", error);
      this.isConfigured = false;
    }
  }

  async getSecret(secretName: string): Promise<string | null> {
    if (!this.isConfigured || !this.client) {
      console.warn(`[Azure KeyVault] Service non configuré - utilisation de process.env.${secretName.toUpperCase()}`);
      return process.env[secretName.toUpperCase()] || null;
    }

    try {
      const secret = await this.client.getSecret(secretName);
      return secret.value || null;
    } catch (error) {
      console.error(`[Azure KeyVault] Erreur lors de la récupération du secret ${secretName}:`, error);
      // Fallback vers variables d'environnement
      return process.env[secretName.toUpperCase()] || null;
    }
  }

  async setSecret(secretName: string, secretValue: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.warn("[Azure KeyVault] Service non configuré - impossible de définir le secret");
      return false;
    }

    try {
      await this.client.setSecret(secretName, secretValue);
      console.log(`[Azure KeyVault] Secret ${secretName} défini avec succès`);
      return true;
    } catch (error) {
      console.error(`[Azure KeyVault] Erreur lors de la définition du secret ${secretName}:`, error);
      return false;
    }
  }

  async deleteSecret(secretName: string): Promise<boolean> {
    if (!this.isConfigured || !this.client) {
      console.warn("[Azure KeyVault] Service non configuré - impossible de supprimer le secret");
      return false;
    }

    try {
      await this.client.beginDeleteSecret(secretName);
      console.log(`[Azure KeyVault] Secret ${secretName} supprimé avec succès`);
      return true;
    } catch (error) {
      console.error(`[Azure KeyVault] Erreur lors de la suppression du secret ${secretName}:`, error);
      return false;
    }
  }

  async listSecrets(): Promise<string[]> {
    if (!this.isConfigured || !this.client) {
      console.warn("[Azure KeyVault] Service non configuré");
      return [];
    }

    try {
      const secrets: string[] = [];
      for await (const secretProperties of this.client.listPropertiesOfSecrets()) {
        if (secretProperties.name) {
          secrets.push(secretProperties.name);
        }
      }
      return secrets;
    } catch (error) {
      console.error("[Azure KeyVault] Erreur lors de la liste des secrets:", error);
      return [];
    }
  }

  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  async getSecretSafely(secretName: string, fallbackValue?: string): Promise<string> {
    const secret = await this.getSecret(secretName);
    if (secret) return secret;
    
    if (fallbackValue) {
      console.warn(`[Azure KeyVault] Utilisation de la valeur de fallback pour ${secretName}`);
      return fallbackValue;
    }
    
    throw new Error(`Secret ${secretName} introuvable et aucune valeur de fallback fournie`);
  }
}

// Instance singleton
export const azureKeyVaultService = new AzureKeyVaultService();

// Helper functions pour faciliter l'utilisation
export const getSecretFromKeyVault = (secretName: string) => 
  azureKeyVaultService.getSecret(secretName);

export const getSecretSafely = (secretName: string, fallbackValue?: string) => 
  azureKeyVaultService.getSecretSafely(secretName, fallbackValue);

export const setSecretInKeyVault = (secretName: string, secretValue: string) => 
  azureKeyVaultService.setSecret(secretName, secretValue);

export default azureKeyVaultService;