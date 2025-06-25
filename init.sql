-- Script d'initialisation pour la base de données EcoDeli
-- Ce script sera exécuté automatiquement lors de la création du conteneur

-- Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Créer le schéma public s'il n'existe pas (normalement déjà créé)
CREATE SCHEMA IF NOT EXISTS public;

-- Accorder tous les privilèges sur le schéma public à l'utilisateur postgres
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Créer un utilisateur de développement (optionnel)
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ecodeli_dev') THEN
      CREATE ROLE ecodeli_dev LOGIN PASSWORD 'dev_password';
   END IF;
END
$$;

-- Accorder les privilèges à l'utilisateur de développement
GRANT ALL PRIVILEGES ON DATABASE ecodeli TO ecodeli_dev;
GRANT ALL ON SCHEMA public TO ecodeli_dev;

-- Message de confirmation
SELECT 'Base de données EcoDeli initialisée avec succès!' AS status; 