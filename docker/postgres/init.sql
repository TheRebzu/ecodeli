-- Script d'initialisation pour PostgreSQL
-- Ce script est exécuté à la première initialisation du conteneur PostgreSQL

-- Configuration de l'encodage et du fuseau horaire
SET client_encoding = 'UTF8';
SET timezone = 'UTC';

-- Création de l'extension uuid-ossp si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Création de l'extension pgcrypto si elle n'existe pas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Création de l'extension pour la recherche plein texte
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Création de l'extension pour les opérations géographiques
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Commentaire de bienvenue
DO $$
BEGIN
    RAISE NOTICE '
    ===============================================
    Base de données EcoDeli initialisée avec succès
    ===============================================
    ';
END $$; 