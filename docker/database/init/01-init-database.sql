-- =============================================================================
-- SCRIPT D'INITIALISATION DE LA BASE DE DONNÉES ECODELI
-- =============================================================================

-- Création de la base de données si elle n'existe pas
SELECT 'CREATE DATABASE ecodeli'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecodeli')\gexec

-- Connexion à la base de données
\c ecodeli;

-- Création des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Création d'un utilisateur pour l'application avec privilèges limités
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ecodeli_app') THEN
        CREATE ROLE ecodeli_app WITH LOGIN PASSWORD 'ecodeli_app_password';
    END IF;
END
$$;

-- Attribution des privilèges
GRANT CONNECT ON DATABASE ecodeli TO ecodeli_app;
GRANT USAGE ON SCHEMA public TO ecodeli_app;
GRANT CREATE ON SCHEMA public TO ecodeli_app;

-- Création de schémas pour l'organisation
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS deliveries;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS audit;

-- Attribution des privilèges sur les schémas
GRANT USAGE ON SCHEMA auth TO ecodeli_app;
GRANT USAGE ON SCHEMA deliveries TO ecodeli_app;
GRANT USAGE ON SCHEMA payments TO ecodeli_app;
GRANT USAGE ON SCHEMA messaging TO ecodeli_app;
GRANT USAGE ON SCHEMA audit TO ecodeli_app;

-- Configuration de la recherche de schémas
ALTER ROLE ecodeli_app SET search_path = public, auth, deliveries, payments, messaging, audit;

-- Fonction pour mise à jour automatique des timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Configuration des paramètres de performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Index pour les recherches fréquentes (sera complété par Prisma)
-- Les index spécifiques seront créés automatiquement par les migrations Prisma

COMMENT ON DATABASE ecodeli IS 'Base de données principale de l''application EcoDeli';
COMMENT ON SCHEMA auth IS 'Schéma pour l''authentification et autorisation';
COMMENT ON SCHEMA deliveries IS 'Schéma pour la gestion des livraisons';
COMMENT ON SCHEMA payments IS 'Schéma pour la gestion des paiements';
COMMENT ON SCHEMA messaging IS 'Schéma pour la messagerie et notifications';
COMMENT ON SCHEMA audit IS 'Schéma pour l''audit et logs';