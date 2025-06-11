package com.ecodeli;

import com.ecodeli.config.AppConfig;
import com.ecodeli.controllers.MainController;
import com.ecodeli.services.TrpcService;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.image.Image;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Objects;

/**
 * Application principale EcoDeli Desktop
 * Interface JavaFX pour génération de rapports et analyses
 */
public class EcoDeliApp extends Application {
    
    private static final Logger logger = LoggerFactory.getLogger(EcoDeliApp.class);
    
    private Stage primaryStage;
    private TrpcService trpcService;
    private AppConfig appConfig;
    
    @Override
    public void init() throws Exception {
        super.init();
        
        logger.info("Initialisation de l'application EcoDeli Desktop...");
        
        // Chargement de la configuration
        appConfig = AppConfig.getInstance();
        
        // Initialisation du service tRPC
        trpcService = new TrpcService(appConfig);
        
        // Test de connexion au backend
        try {
            if (!trpcService.testConnection()) {
                logger.warn("Impossible de se connecter au backend tRPC");
                showConnectionWarning();
            }
        } catch (Exception e) {
            logger.error("Erreur lors du test de connexion", e);
        }
        
        logger.info("Initialisation terminée");
    }
    
    @Override
    public void start(Stage stage) throws IOException {
        this.primaryStage = stage;
        
        logger.info("Démarrage de l'interface utilisateur...");
        
        // Configuration de la fenêtre principale
        primaryStage.setTitle("EcoDeli - Plateforme d'Administration et Rapports");
        primaryStage.setMinWidth(1024);
        primaryStage.setMinHeight(768);
        
        // Chargement de l'icône
        try {
            Image icon = new Image(Objects.requireNonNull(
                getClass().getResourceAsStream("/icons/ecodeli-icon.png")));
            primaryStage.getIcons().add(icon);
        } catch (Exception e) {
            logger.warn("Impossible de charger l'icône de l'application", e);
        }
        
        // Chargement de l'interface principale
        loadMainInterface();
        
        // Configuration de l'événement de fermeture
        primaryStage.setOnCloseRequest(event -> {
            logger.info("Fermeture de l'application...");
            shutdown();
        });
        
        primaryStage.show();
        logger.info("Interface utilisateur démarrée");
    }
    
    /**
     * Charge l'interface principale de l'application
     */
    private void loadMainInterface() throws IOException {
        FXMLLoader fxmlLoader = new FXMLLoader(
            EcoDeliApp.class.getResource("/fxml/main-view.fxml"));
        
        Scene scene = new Scene(fxmlLoader.load(), 1200, 800);
        
        // Configuration du contrôleur principal
        MainController controller = fxmlLoader.getController();
        controller.setTrpcService(trpcService);
        controller.setAppConfig(appConfig);
        controller.setMainApp(this);
        
        // Chargement du thème CSS
        scene.getStylesheets().add(
            Objects.requireNonNull(getClass().getResource("/css/application.css"))
                .toExternalForm());
        
        primaryStage.setScene(scene);
    }
    
    /**
     * Affiche un avertissement de connexion
     */
    private void showConnectionWarning() {
        Platform.runLater(() -> {
            Alert alert = new Alert(Alert.AlertType.WARNING);
            alert.setTitle("Avertissement de Connexion");
            alert.setHeaderText("Connexion au backend impossible");
            alert.setContentText(
                "L'application ne peut pas se connecter au serveur backend. " +
                "Certaines fonctionnalités peuvent être limitées. " +
                "Vérifiez la configuration réseau et les paramètres de connexion."
            );
            alert.showAndWait();
        });
    }
    
    /**
     * Arrêt propre de l'application
     */
    private void shutdown() {
        try {
            if (trpcService != null) {
                trpcService.close();
            }
            logger.info("Application fermée proprement");
        } catch (Exception e) {
            logger.error("Erreur lors de la fermeture", e);
        }
    }
    
    @Override
    public void stop() throws Exception {
        super.stop();
        shutdown();
    }
    
    /**
     * Point d'entrée principal
     */
    public static void main(String[] args) {
        // Configuration des propriétés système pour JavaFX
        System.setProperty("javafx.preloader", "com.ecodeli.preloader.SplashScreenPreloader");
        System.setProperty("file.encoding", "UTF-8");
        
        // Configuration du logging
        System.setProperty("logback.configurationFile", "logback.xml");
        
        logger.info("Démarrage de l'application EcoDeli Desktop v1.0.0");
        logger.info("Java Version: {}", System.getProperty("java.version"));
        logger.info("JavaFX Version: {}", System.getProperty("javafx.version"));
        
        try {
            launch(args);
        } catch (Exception e) {
            logger.error("Erreur fatale lors du démarrage de l'application", e);
            
            // Affichage d'une erreur système si JavaFX n'est pas disponible
            Platform.runLater(() -> {
                Alert alert = new Alert(Alert.AlertType.ERROR);
                alert.setTitle("Erreur Fatale");
                alert.setHeaderText("Impossible de démarrer l'application");
                alert.setContentText("Une erreur critique s'est produite: " + e.getMessage());
                alert.showAndWait();
                System.exit(1);
            });
        }
    }
    
    // Getters pour accès depuis les contrôleurs
    public Stage getPrimaryStage() { return primaryStage; }
    public TrpcService getTrpcService() { return trpcService; }
    public AppConfig getAppConfig() { return appConfig; }
}