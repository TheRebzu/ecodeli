-- =============================================================================
-- SCRIPT D'INITIALISATION BASE DE DONNÉES ECODELI
-- =============================================================================

-- Création des utilisateurs
CREATE USER ecodeli_user WITH PASSWORD 'changeme_ecodeli_password';
CREATE USER monitoring WITH PASSWORD 'changeme_monitoring_password';
CREATE USER backup_user WITH PASSWORD 'changeme_backup_password';

-- Création des bases de données
CREATE DATABASE ecodeli WITH 
    OWNER = ecodeli_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'fr_FR.utf8'
    LC_CTYPE = 'fr_FR.utf8'
    TEMPLATE = template0;

CREATE DATABASE ecodeli_test WITH 
    OWNER = ecodeli_user
    ENCODING = 'UTF8'
    LC_COLLATE = 'fr_FR.utf8'
    LC_CTYPE = 'fr_FR.utf8'
    TEMPLATE = template0;

-- Configuration des privilèges pour la base principale
\c ecodeli;

-- Attribution des privilèges à l'utilisateur principal
GRANT ALL PRIVILEGES ON DATABASE ecodeli TO ecodeli_user;
GRANT ALL ON SCHEMA public TO ecodeli_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ecodeli_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ecodeli_user;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO ecodeli_user;

-- Privilèges par défaut pour les futurs objets
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ecodeli_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ecodeli_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ecodeli_user;

-- Configuration pour l'utilisateur de monitoring
GRANT CONNECT ON DATABASE ecodeli TO monitoring;
GRANT CONNECT ON DATABASE ecodeli_test TO monitoring;
GRANT USAGE ON SCHEMA public TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring;
GRANT SELECT ON pg_stat_database TO monitoring;
GRANT SELECT ON pg_stat_user_tables TO monitoring;
GRANT SELECT ON pg_stat_user_indexes TO monitoring;
GRANT SELECT ON pg_statio_user_tables TO monitoring;
GRANT SELECT ON pg_stat_activity TO monitoring;

-- Configuration pour l'utilisateur de backup
GRANT CONNECT ON DATABASE ecodeli TO backup_user;
GRANT CONNECT ON DATABASE ecodeli_test TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

-- Configuration des extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Configuration des paramètres de base
COMMENT ON DATABASE ecodeli IS 'Base de données principale EcoDeli - Plateforme de livraison collaborative';

-- Configuration des tâches cron pour maintenance
SELECT cron.schedule('vacuum-analyze', '0 2 * * *', 'VACUUM ANALYZE;');
SELECT cron.schedule('update-statistics', '0 3 * * 0', 'ANALYZE;');

-- Logging de l'initialisation
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0);

\echo 'Base de données EcoDeli initialisée avec succès'