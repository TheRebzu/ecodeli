package com.ecodeli.desktop;

import com.ecodeli.desktop.services.ApiService;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.fxml.FXMLLoader;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * Application principale EcoDeli Desktop Analytics
 */
public class EcoDeliApp extends Application {
    private static final Logger logger = LoggerFactory.getLogger(EcoDeliApp.class);
    
    private ApiService apiService;
    
    @Override
    public void init() throws Exception {
        logger.info("🔧 Initialisation de l'application EcoDeli Desktop");
        
        // Initialiser les services
        apiService = ApiService.getInstance();
        
        logger.info("✅ Services initialisés");
    }
    
    @Override
    public void start(Stage primaryStage) throws Exception {
        logger.info("🚀 Démarrage de l'application EcoDeli Desktop");
        
        try {
            // Configuration de la fenêtre principale
            primaryStage.setTitle("EcoDeli Desktop Analytics");
            primaryStage.setMinWidth(1024);
            primaryStage.setMinHeight(768);
            primaryStage.setMaximized(true);
            
            // Chargement de l'interface principale
            Scene scene = createMainScene();
            primaryStage.setScene(scene);
            
            // Affichage
            primaryStage.show();
            
            logger.info("✅ Application démarrée avec succès");
            
        } catch (Exception e) {
            logger.error("❌ Erreur lors du démarrage de l'application", e);
            showErrorDialog("Erreur de démarrage", 
                "Impossible de démarrer l'application: " + e.getMessage());
            Platform.exit();
        }
    }
    
    @Override
    public void stop() throws Exception {
        logger.info("🔌 Arrêt de l'application EcoDeli Desktop");
        
        // Nettoyage des ressources
        if (apiService != null) {
            apiService.shutdown();
        }
        
        logger.info("✅ Application fermée proprement");
    }
    
    /**
     * Crée la scène principale de l'application
     */
    private Scene createMainScene() {
        try {
            // Chargement du FXML principal
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/main.fxml"));
            VBox root = loader.load();
            
            // Création de la scène
            Scene scene = new Scene(root, 1200, 800);
            
            // Chargement du CSS
            String cssPath = getClass().getResource("/css/application.css").toExternalForm();
            scene.getStylesheets().add(cssPath);
            
            logger.info("✅ Interface principale chargée");
            return scene;
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors du chargement de l'interface", e);
            
            // Interface de secours en cas d'erreur
            return createFallbackScene(e);
        }
    }
    
    /**
     * Crée une interface de secours en cas d'erreur de chargement
     */
    private Scene createFallbackScene(Exception error) {
        logger.warn("⚠️ Chargement de l'interface de secours");
        
        VBox root = new VBox(20);
        root.setStyle("-fx-padding: 50; -fx-alignment: center;");
        
        Label titleLabel = new Label("EcoDeli Desktop Analytics");
        titleLabel.setStyle("-fx-font-size: 24; -fx-font-weight: bold;");
        
        Label errorLabel = new Label("Erreur lors du chargement de l'interface:");
        errorLabel.setStyle("-fx-font-size: 14;");
        
        Label detailLabel = new Label(error.getMessage());
        detailLabel.setStyle("-fx-font-size: 12; -fx-text-fill: red;");
        detailLabel.setWrapText(true);
        
        Label instructionLabel = new Label("Veuillez vérifier les fichiers FXML et redémarrer l'application.");
        instructionLabel.setStyle("-fx-font-size: 12;");
        instructionLabel.setWrapText(true);
        
        root.getChildren().addAll(titleLabel, errorLabel, detailLabel, instructionLabel);
        
        return new Scene(root, 600, 400);
    }
    
    /**
     * Affiche une boîte de dialogue d'erreur
     */
    private void showErrorDialog(String title, String message) {
        try {
            Alert alert = new Alert(Alert.AlertType.ERROR);
            alert.setTitle(title);
            alert.setHeaderText(null);
            alert.setContentText(message);
            alert.showAndWait();
        } catch (Exception e) {
            // En cas d'erreur lors de l'affichage de l'alerte, 
            // au moins logger l'erreur
            logger.error("Impossible d'afficher la boîte de dialogue d'erreur: {}", message, e);
        }
    }
}