package com.ecodeli.desktop.controllers;

import com.ecodeli.desktop.api.models.DashboardData;
import com.ecodeli.desktop.services.ApiService;
import javafx.application.Platform;
import javafx.concurrent.Task;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.VBox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URL;
import java.util.ResourceBundle;

/**
 * Contrôleur principal de l'application
 */
public class MainController implements Initializable {
    private static final Logger logger = LoggerFactory.getLogger(MainController.class);
    
    @FXML private BorderPane mainBorderPane;
    @FXML private VBox sidebarVBox;
    @FXML private MenuItem dashboardMenuItem;
    @FXML private MenuItem merchantsMenuItem;
    @FXML private MenuItem deliveriesMenuItem;
    @FXML private MenuItem servicesMenuItem;
    @FXML private MenuItem reportsMenuItem;
    @FXML private MenuItem settingsMenuItem;
    @FXML private Button refreshButton;
    @FXML private Label statusLabel;
    @FXML private ProgressIndicator loadingIndicator;
    @FXML private Button demoModeButton;
    
    private final ApiService apiService;
    private DashboardController dashboardController;
    private MerchantsController merchantsController;
    private DeliveriesController deliveriesController;
    private ServicesController servicesController;
    private ReportsController reportsController;
    
    public MainController() {
        this.apiService = ApiService.getInstance();
    }
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("🎮 Initialisation du contrôleur principal");
        
        setupMenuActions();
        setupStatusBar();
        
        // Test de connexion au démarrage
        testConnection();
        
        // Charger la vue dashboard par défaut
        Platform.runLater(() -> showDashboard());
    }
    
    /**
     * Configure les actions des menus
     */
    private void setupMenuActions() {
        dashboardMenuItem.setOnAction(e -> showDashboard());
        merchantsMenuItem.setOnAction(e -> showMerchants());
        deliveriesMenuItem.setOnAction(e -> showDeliveries());
        servicesMenuItem.setOnAction(e -> showServices());
        reportsMenuItem.setOnAction(e -> showReports());
        settingsMenuItem.setOnAction(e -> showSettings());
        
        refreshButton.setOnAction(e -> refreshData());
        demoModeButton.setOnAction(e -> toggleDemoMode());
    }
    
    /**
     * Configure la barre de statut
     */
    private void setupStatusBar() {
        updateStatusLabel("Prêt");
        loadingIndicator.setVisible(false);
        updateDemoModeButton();
    }
    
    /**
     * Test la connexion à l'API
     */
    private void testConnection() {
        Task<Boolean> connectionTask = new Task<Boolean>() {
            @Override
            protected Boolean call() throws Exception {
                return apiService.testConnection();
            }
            
            @Override
            protected void succeeded() {
                boolean connected = getValue();
                Platform.runLater(() -> {
                    if (connected) {
                        updateStatusLabel("✅ Connecté à l'API");
                    } else {
                        updateStatusLabel("⚠️ Mode démo activé");
                    }
                    updateDemoModeButton();
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    updateStatusLabel("❌ Erreur de connexion");
                    showError("Erreur de connexion", "Impossible de se connecter à l'API. Mode démo activé.");
                    updateDemoModeButton();
                });
            }
        };
        
        Thread connectionThread = new Thread(connectionTask);
        connectionThread.setDaemon(true);
        connectionThread.start();
    }
    
    /**
     * Affiche la vue Dashboard
     */
    @FXML
    private void showDashboard() {
        try {
            if (dashboardController == null) {
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/dashboard.fxml"));
                Node dashboardView = loader.load();
                dashboardController = loader.getController();
            }
            
            mainBorderPane.setCenter(dashboardController.getView());
            updateStatusLabel("Dashboard");
            
            // Charger les données du dashboard
            loadDashboardData();
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors du chargement de la vue Dashboard", e);
            showError("Erreur", "Impossible de charger la vue Dashboard: " + e.getMessage());
        }
    }
    
    /**
     * Affiche la vue Merchants
     */
    @FXML
    private void showMerchants() {
        try {
            if (merchantsController == null) {
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/merchants.fxml"));
                Node merchantsView = loader.load();
                merchantsController = loader.getController();
            }
            
            mainBorderPane.setCenter(merchantsController.getView());
            updateStatusLabel("Commerçants");
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors du chargement de la vue Merchants", e);
            showError("Erreur", "Impossible de charger la vue Commerçants: " + e.getMessage());
        }
    }
    
    /**
     * Affiche la vue Deliveries
     */
    @FXML
    private void showDeliveries() {
        try {
            if (deliveriesController == null) {
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/deliveries.fxml"));
                Node deliveriesView = loader.load();
                deliveriesController = loader.getController();
            }
            
            mainBorderPane.setCenter(deliveriesController.getView());
            updateStatusLabel("Livraisons");
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors du chargement de la vue Deliveries", e);
            showError("Erreur", "Impossible de charger la vue Livraisons: " + e.getMessage());
        }
    }
    
    /**
     * Affiche la vue Services
     */
    @FXML
    private void showServices() {
        try {
            if (servicesController == null) {
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/services.fxml"));
                Node servicesView = loader.load();
                servicesController = loader.getController();
            }
            
            mainBorderPane.setCenter(servicesController.getView());
            updateStatusLabel("Services");
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors du chargement de la vue Services", e);
            showError("Erreur", "Impossible de charger la vue Services: " + e.getMessage());
        }
    }
    
    /**
     * Affiche la vue Reports
     */
    @FXML
    private void showReports() {
        try {
            if (reportsController == null) {
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/reports.fxml"));
                Node reportsView = loader.load();
                reportsController = loader.getController();
            }
            
            mainBorderPane.setCenter(reportsController.getView());
            updateStatusLabel("Rapports");
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors du chargement de la vue Reports", e);
            showError("Erreur", "Impossible de charger la vue Rapports: " + e.getMessage());
        }
    }
    
    /**
     * Affiche la vue Settings
     */
    @FXML
    private void showSettings() {
        showInfo("Paramètres", "Configuration de l'application (à implémenter)");
    }
    
    /**
     * Rafraîchit toutes les données
     */
    @FXML
    private void refreshData() {
        logger.info("🔄 Actualisation des données...");
        showLoading(true);
        updateStatusLabel("Actualisation en cours...");
        
        Task<DashboardData> refreshTask = new Task<DashboardData>() {
            @Override
            protected DashboardData call() throws Exception {
                return apiService.refreshData().get();
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    showLoading(false);
                    updateStatusLabel("✅ Données actualisées");
                    
                    // Actualiser la vue courante
                    if (dashboardController != null && mainBorderPane.getCenter() == dashboardController.getView()) {
                        dashboardController.updateData(getValue());
                    }
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false);
                    updateStatusLabel("❌ Erreur lors de l'actualisation");
                    showError("Erreur", "Impossible d'actualiser les données: " + getException().getMessage());
                });
            }
        };
        
        Thread refreshThread = new Thread(refreshTask);
        refreshThread.setDaemon(true);
        refreshThread.start();
    }
    
    /**
     * Bascule entre mode API et mode démo
     */
    @FXML
    private void toggleDemoMode() {
        boolean newDemoMode = !apiService.isDemoMode();
        apiService.setDemoMode(newDemoMode);
        updateDemoModeButton();
        
        String message = newDemoMode ? 
            "Mode démo activé. Les données affichées sont générées localement." :
            "Mode API activé. Tentative de connexion à l'API...";
        
        updateStatusLabel(message);
        showInfo("Mode de fonctionnement", message);
        
        // Actualiser les données
        refreshData();
    }
    
    /**
     * Charge les données du dashboard
     */
    private void loadDashboardData() {
        if (dashboardController == null) return;
        
        showLoading(true);
        updateStatusLabel("Chargement des données...");
        
        Task<DashboardData> loadTask = new Task<DashboardData>() {
            @Override
            protected DashboardData call() throws Exception {
                return apiService.getDashboardData().get();
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    showLoading(false);
                    updateStatusLabel("Données chargées");
                    dashboardController.updateData(getValue());
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false);
                    updateStatusLabel("❌ Erreur de chargement");
                    showError("Erreur", "Impossible de charger les données: " + getException().getMessage());
                });
            }
        };
        
        Thread loadThread = new Thread(loadTask);
        loadThread.setDaemon(true);
        loadThread.start();
    }
    
    /**
     * Met à jour le bouton mode démo
     */
    private void updateDemoModeButton() {
        if (apiService.isDemoMode()) {
            demoModeButton.setText("🌐 Mode API");
            demoModeButton.getStyleClass().removeAll("success");
            demoModeButton.getStyleClass().add("warning");
        } else {
            demoModeButton.setText("🎭 Mode Démo");
            demoModeButton.getStyleClass().removeAll("warning");
            demoModeButton.getStyleClass().add("success");
        }
    }
    
    /**
     * Met à jour le label de statut
     */
    private void updateStatusLabel(String status) {
        statusLabel.setText(status);
    }
    
    /**
     * Affiche/masque l'indicateur de chargement
     */
    private void showLoading(boolean show) {
        loadingIndicator.setVisible(show);
        refreshButton.setDisable(show);
    }
    
    /**
     * Affiche une boîte de dialogue d'erreur
     */
    private void showError(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }
    
    /**
     * Affiche une boîte de dialogue d'information
     */
    private void showInfo(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }
}