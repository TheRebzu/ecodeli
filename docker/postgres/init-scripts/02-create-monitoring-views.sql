-- =============================================================================
-- VUES DE MONITORING POUR POSTGRESQL
-- =============================================================================

\c ecodeli;

-- Vue pour les statistiques des tables
CREATE OR REPLACE VIEW monitoring.table_stats AS
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    vacuum_count,
    autovacuum_count,
    analyze_count,
    autoanalyze_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Vue pour les statistiques des index
CREATE OR REPLACE VIEW monitoring.index_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Vue pour les requêtes lentes
CREATE OR REPLACE VIEW monitoring.slow_queries AS
SELECT 
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    min_exec_time,
    stddev_exec_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_exec_time > 1000 -- Plus de 1 seconde en moyenne
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Vue pour les connexions actives
CREATE OR REPLACE VIEW monitoring.active_connections AS
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    backend_start,
    query_start,
    state,
    wait_event_type,
    wait_event,
    substring(query, 1, 100) as query_preview
FROM pg_stat_activity
WHERE state = 'active'
AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- Vue pour l'utilisation de l'espace disque
CREATE OR REPLACE VIEW monitoring.database_size AS
SELECT 
    d.datname as database_name,
    pg_size_pretty(pg_database_size(d.datname)) as size,
    pg_database_size(d.datname) as size_bytes
FROM pg_database d
WHERE d.datistemplate = false
ORDER BY pg_database_size(d.datname) DESC;

-- Vue pour les statistiques de cache
CREATE OR REPLACE VIEW monitoring.cache_hit_ratio AS
SELECT 
    'database' as type,
    round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) as hit_ratio
FROM pg_stat_database
WHERE datname = current_database()
UNION ALL
SELECT 
    'tables' as type,
    round(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as hit_ratio
FROM pg_statio_user_tables
UNION ALL
SELECT 
    'indexes' as type,
    round(100.0 * sum(idx_blks_hit) / nullif(sum(idx_blks_hit) + sum(idx_blks_read), 0), 2) as hit_ratio
FROM pg_statio_user_indexes;

-- Vue pour les locks
CREATE OR REPLACE VIEW monitoring.locks AS
SELECT 
    pg_class.relname,
    pg_locks.locktype,
    pg_locks.mode,
    pg_locks.granted,
    pg_stat_activity.pid,
    pg_stat_activity.usename,
    pg_stat_activity.query_start,
    substring(pg_stat_activity.query, 1, 100) as query_preview
FROM pg_locks
JOIN pg_class ON pg_locks.relation = pg_class.oid
JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
WHERE NOT pg_locks.granted
ORDER BY pg_stat_activity.query_start;

-- Vue pour les statistiques WAL
CREATE OR REPLACE VIEW monitoring.wal_stats AS
SELECT 
    'wal_files' as metric,
    count(*) as value
FROM pg_ls_waldir()
UNION ALL
SELECT 
    'wal_size' as metric,
    sum(size) as value
FROM pg_ls_waldir()
UNION ALL
SELECT 
    'archive_files' as metric,
    count(*) as value
FROM pg_ls_archive_statusdir()
WHERE name LIKE '%.ready';

-- Création du schéma de monitoring s'il n'existe pas
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Attribution des privilèges sur les vues de monitoring
GRANT USAGE ON SCHEMA monitoring TO monitoring;
GRANT SELECT ON ALL TABLES IN SCHEMA monitoring TO monitoring;

\echo 'Vues de monitoring créées avec succès'