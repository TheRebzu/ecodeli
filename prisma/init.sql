-- Fichier d'initialisation PostgreSQL pour EcoDeli
-- Ce fichier est exécuté lors du premier démarrage du conteneur PostgreSQL

-- Créer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Créer la base de données si elle n'existe pas déjà
-- (elle est normalement créée via POSTGRES_DB mais par sécurité)
SELECT 'CREATE DATABASE ecodeli' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecodeli');

-- Message de confirmation
SELECT 'Base de données EcoDeli initialisée avec succès' AS message; 