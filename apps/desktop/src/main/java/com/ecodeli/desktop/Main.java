package com.ecodeli.desktop;

import javafx.application.Application;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Point d'entrée principal de l'application EcoDeli Desktop
 */
public class Main {
    private static final Logger logger = LoggerFactory.getLogger(Main.class);
    
    public static void main(String[] args) {
        try {
            logger.info("🌟 === Démarrage EcoDeli Desktop Analytics ===");
            logger.info("📋 Arguments: {}", java.util.Arrays.toString(args));
            
            // Configuration système
            configureSystemProperties();
            
            // Démarrage de l'application JavaFX
            Application.launch(EcoDeliApp.class, args);
            
        } catch (Exception e) {
            logger.error("💥 Erreur fatale lors du démarrage de l'application", e);
            System.err.println("Erreur fatale: " + e.getMessage());
            System.exit(1);
        }
    }
    
    /**
     * Configure les propriétés système nécessaires
     */
    private static void configureSystemProperties() {
        // Configuration JavaFX
        System.setProperty("javafx.preloader", "com.ecodeli.desktop.Preloader");
        
        // Configuration des fonts pour un meilleur rendu
        System.setProperty("prism.lcdtext", "false");
        System.setProperty("prism.text", "t2k");
        
        // Configuration du logging
        if (System.getProperty("logback.configurationFile") == null) {
            System.setProperty("logback.configurationFile", "logback.xml");
        }
        
        // Configuration de l'API base URL si fournie en argument
        String apiUrl = System.getProperty("api.base.url");
        if (apiUrl == null) {
            System.setProperty("api.base.url", "http://localhost:3000");
            logger.info("🔗 URL API par défaut: http://localhost:3000");
        } else {
            logger.info("🔗 URL API configurée: {}", apiUrl);
        }
        
        // Configuration du mode debug
        String debugMode = System.getProperty("debug");
        if ("true".equals(debugMode)) {
            System.setProperty("org.slf4j.simpleLogger.defaultLogLevel", "DEBUG");
            logger.info("🐛 Mode debug activé");
        }
        
        logger.info("⚙️ Propriétés système configurées");
    }
}