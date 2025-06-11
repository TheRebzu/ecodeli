package com.ecodeli.config;

import com.typesafe.config.Config;
import com.typesafe.config.ConfigFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.util.List;

/**
 * Configuration de l'application EcoDeli Desktop
 * Singleton pour gérer tous les paramètres de configuration
 */
public class AppConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(AppConfig.class);
    private static AppConfig instance;
    
    private Config config;
    
    // Configuration tRPC/Backend
    private String backendUrl;
    private String backendApiKey;
    private int connectionTimeout;
    private int readTimeout;
    
    // Configuration PDF
    private String pdfOutputPath;
    private String pdfTemplatePath;
    private boolean pdfAutoOpen;
    
    // Configuration Rapports
    private int minTestRecords;
    private int graphsPerPage;
    private int minPages;
    
    // Configuration Data Mining
    private boolean dataMiningEnabled;
    private String dataMiningModelsPath;
    private List<String> enabledAlgorithms;
    
    // Configuration Interface
    private String theme;
    private String language;
    private boolean autoRefresh;
    private int refreshInterval;
    
    private AppConfig() {
        loadConfiguration();
    }
    
    public static synchronized AppConfig getInstance() {
        if (instance == null) {
            instance = new AppConfig();
        }
        return instance;
    }
    
    /**
     * Charge la configuration depuis les fichiers de configuration
     */
    private void loadConfiguration() {
        try {
            logger.info("Chargement de la configuration...");
            
            // Ordre de priorité des fichiers de configuration
            Config defaultConfig = ConfigFactory.load("application.conf");
            Config envConfig = ConfigFactory.load("application-" + getEnvironment() + ".conf");
            Config systemConfig = ConfigFactory.systemProperties();
            
            // Fusion des configurations (priorité: système > environnement > défaut)
            config = systemConfig
                .withFallback(envConfig)
                .withFallback(defaultConfig)
                .resolve();
            
            loadBackendConfig();
            loadPdfConfig();
            loadReportConfig();
            loadDataMiningConfig();
            loadInterfaceConfig();
            
            logger.info("Configuration chargée avec succès");
            logConfiguration();
            
        } catch (Exception e) {
            logger.error("Erreur lors du chargement de la configuration", e);
            throw new RuntimeException("Impossible de charger la configuration", e);
        }
    }
    
    /**
     * Charge la configuration backend/tRPC
     */
    private void loadBackendConfig() {
        backendUrl = config.getString("backend.url");
        backendApiKey = config.getString("backend.apiKey");
        connectionTimeout = config.getInt("backend.connectionTimeout");
        readTimeout = config.getInt("backend.readTimeout");
        
        logger.debug("Configuration backend: url={}, timeout={}ms", backendUrl, connectionTimeout);
    }
    
    /**
     * Charge la configuration PDF
     */
    private void loadPdfConfig() {
        pdfOutputPath = config.getString("pdf.outputPath");
        pdfTemplatePath = config.getString("pdf.templatePath");
        pdfAutoOpen = config.getBoolean("pdf.autoOpen");
        
        // Créer le répertoire de sortie s'il n'existe pas
        File outputDir = new File(pdfOutputPath);
        if (!outputDir.exists()) {
            outputDir.mkdirs();
            logger.info("Répertoire de sortie PDF créé: {}", pdfOutputPath);
        }
    }
    
    /**
     * Charge la configuration des rapports
     */
    private void loadReportConfig() {
        minTestRecords = config.getInt("reports.minTestRecords");
        graphsPerPage = config.getInt("reports.graphsPerPage");
        minPages = config.getInt("reports.minPages");
        
        // Validation des paramètres
        if (minTestRecords < 30) {
            logger.warn("minTestRecords ({}) est inférieur à 30, valeur forcée à 30", minTestRecords);
            minTestRecords = 30;
        }
        
        if (graphsPerPage < 4) {
            logger.warn("graphsPerPage ({}) est inférieur à 4, valeur forcée à 4", graphsPerPage);
            graphsPerPage = 4;
        }
        
        if (minPages < 2) {
            logger.warn("minPages ({}) est inférieur à 2, valeur forcée à 2", minPages);
            minPages = 2;
        }
    }
    
    /**
     * Charge la configuration Data Mining
     */
    private void loadDataMiningConfig() {
        dataMiningEnabled = config.getBoolean("dataMining.enabled");
        dataMiningModelsPath = config.getString("dataMining.modelsPath");
        enabledAlgorithms = config.getStringList("dataMining.enabledAlgorithms");
        
        if (dataMiningEnabled) {
            File modelsDir = new File(dataMiningModelsPath);
            if (!modelsDir.exists()) {
                modelsDir.mkdirs();
                logger.info("Répertoire des modèles Data Mining créé: {}", dataMiningModelsPath);
            }
        }
    }
    
    /**
     * Charge la configuration de l'interface
     */
    private void loadInterfaceConfig() {
        theme = config.getString("interface.theme");
        language = config.getString("interface.language");
        autoRefresh = config.getBoolean("interface.autoRefresh");
        refreshInterval = config.getInt("interface.refreshInterval");
    }
    
    /**
     * Détermine l'environnement d'exécution
     */
    private String getEnvironment() {
        String env = System.getProperty("app.environment");
        if (env == null) {
            env = System.getenv("APP_ENVIRONMENT");
        }
        return env != null ? env : "development";
    }
    
    /**
     * Log de la configuration (sans les informations sensibles)
     */
    private void logConfiguration() {
        logger.info("=== Configuration EcoDeli Desktop ===");
        logger.info("Environnement: {}", getEnvironment());
        logger.info("Backend URL: {}", backendUrl);
        logger.info("PDF Output: {}", pdfOutputPath);
        logger.info("Min Test Records: {}", minTestRecords);
        logger.info("Graphs per Page: {}", graphsPerPage);
        logger.info("Min Pages: {}", minPages);
        logger.info("Data Mining: {}", dataMiningEnabled ? "Activé" : "Désactivé");
        logger.info("Thème: {}", theme);
        logger.info("Langue: {}", language);
        logger.info("====================================");
    }
    
    /**
     * Recharge la configuration
     */
    public void reload() {
        logger.info("Rechargement de la configuration...");
        loadConfiguration();
    }
    
    /**
     * Sauvegarde les modifications de configuration
     */
    public void save() {
        // TODO: Implémenter la sauvegarde des paramètres utilisateur
        logger.info("Sauvegarde de la configuration...");
    }
    
    // Getters pour la configuration backend
    public String getBackendUrl() { return backendUrl; }
    public String getBackendApiKey() { return backendApiKey; }
    public int getConnectionTimeout() { return connectionTimeout; }
    public int getReadTimeout() { return readTimeout; }
    
    // Getters pour la configuration PDF
    public String getPdfOutputPath() { return pdfOutputPath; }
    public String getPdfTemplatePath() { return pdfTemplatePath; }
    public boolean isPdfAutoOpen() { return pdfAutoOpen; }
    
    // Getters pour la configuration des rapports
    public int getMinTestRecords() { return minTestRecords; }
    public int getGraphsPerPage() { return graphsPerPage; }
    public int getMinPages() { return minPages; }
    
    // Getters pour la configuration Data Mining
    public boolean isDataMiningEnabled() { return dataMiningEnabled; }
    public String getDataMiningModelsPath() { return dataMiningModelsPath; }
    public List<String> getEnabledAlgorithms() { return enabledAlgorithms; }
    
    // Getters pour la configuration interface
    public String getTheme() { return theme; }
    public String getLanguage() { return language; }
    public boolean isAutoRefresh() { return autoRefresh; }
    public int getRefreshInterval() { return refreshInterval; }
    
    // Setters pour les paramètres modifiables
    public void setTheme(String theme) { 
        this.theme = theme; 
        logger.info("Thème changé: {}", theme);
    }
    
    public void setLanguage(String language) { 
        this.language = language; 
        logger.info("Langue changée: {}", language);
    }
    
    public void setAutoRefresh(boolean autoRefresh) { 
        this.autoRefresh = autoRefresh; 
        logger.info("Auto-refresh: {}", autoRefresh);
    }
    
    public void setRefreshInterval(int refreshInterval) { 
        this.refreshInterval = refreshInterval; 
        logger.info("Intervalle de rafraîchissement: {}s", refreshInterval);
    }
}