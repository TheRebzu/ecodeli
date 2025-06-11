package com.ecodeli.desktop.controllers;

import com.ecodeli.desktop.api.models.DashboardData;
import com.ecodeli.desktop.api.models.Delivery;
import com.ecodeli.desktop.api.models.Merchant;
import com.ecodeli.desktop.api.models.Service;
import javafx.application.Platform;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.chart.*;
import javafx.scene.control.Label;
import javafx.scene.control.TableColumn;
import javafx.scene.control.TableView;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.VBox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * Contrôleur pour la vue Dashboard
 */
public class DashboardController implements Initializable {
    private static final Logger logger = LoggerFactory.getLogger(DashboardController.class);
    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,##0.00 €");
    private static final DecimalFormat NUMBER_FORMAT = new DecimalFormat("#,##0");
    
    @FXML private VBox dashboardVBox;
    
    // Métriques principales
    @FXML private Label totalMerchantsLabel;
    @FXML private Label totalDeliveriesLabel;
    @FXML private Label totalServicesLabel;
    @FXML private Label totalRevenueLabel;
    @FXML private Label avgDeliveryRatingLabel;
    @FXML private Label avgServiceRatingLabel;
    @FXML private Label completedDeliveriesLabel;
    @FXML private Label completedServicesLabel;
    
    // Graphiques
    @FXML private LineChart<String, Number> revenueChart;
    @FXML private PieChart deliveriesTypeChart;
    @FXML private BarChart<String, Number> servicesChart;
    @FXML private PieChart regionsChart;
    
    // Tableaux
    @FXML private TableView<DashboardData.TopMerchant> topMerchantsTable;
    @FXML private TableColumn<DashboardData.TopMerchant, String> merchantNameColumn;
    @FXML private TableColumn<DashboardData.TopMerchant, String> merchantRevenueColumn;
    @FXML private TableColumn<DashboardData.TopMerchant, String> merchantOrdersColumn;
    
    @FXML private TableView<DashboardData.TopService> topServicesTable;
    @FXML private TableColumn<DashboardData.TopService, String> serviceNameColumn;
    @FXML private TableColumn<DashboardData.TopService, String> serviceBookingsColumn;
    @FXML private TableColumn<DashboardData.TopService, String> serviceRatingColumn;
    
    private DashboardData currentData;
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("🎮 Initialisation du contrôleur Dashboard");
        
        setupTableColumns();
        setupCharts();
    }
    
    /**
     * Configure les colonnes des tableaux
     */
    private void setupTableColumns() {
        // Table des top merchants
        merchantNameColumn.setCellValueFactory(new PropertyValueFactory<>("companyName"));
        merchantRevenueColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                CURRENCY_FORMAT.format(cellData.getValue().getTotalRevenue())));
        merchantOrdersColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                NUMBER_FORMAT.format(cellData.getValue().getTotalOrders())));
        
        // Table des top services
        serviceNameColumn.setCellValueFactory(new PropertyValueFactory<>("serviceName"));
        serviceBookingsColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                NUMBER_FORMAT.format(cellData.getValue().getTotalBookings())));
        serviceRatingColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                String.format("%.1f ⭐", cellData.getValue().getAverageRating())));
    }
    
    /**
     * Configure les graphiques
     */
    private void setupCharts() {
        // Configuration du graphique des revenus
        revenueChart.setTitle("Évolution des revenus (12 derniers mois)");
        revenueChart.setCreateSymbols(false);
        revenueChart.setLegendVisible(false);
        
        // Configuration du graphique des livraisons
        deliveriesTypeChart.setTitle("Répartition des livraisons par type");
        
        // Configuration du graphique des services
        servicesChart.setTitle("Services par catégorie");
        servicesChart.setLegendVisible(false);
        
        // Configuration du graphique des régions
        regionsChart.setTitle("Clients par région");
    }
    
    /**
     * Met à jour les données du dashboard
     */
    public void updateData(DashboardData data) {
        if (data == null) {
            logger.warn("⚠️ Données du dashboard null");
            return;
        }
        
        this.currentData = data;
        
        Platform.runLater(() -> {
            updateMetrics(data);
            updateCharts(data);
            updateTables(data);
        });
        
        logger.info("✅ Dashboard mis à jour avec {} commerçants, {} livraisons, {} services",
            data.getTotalMerchants(), data.getTotalDeliveries(), data.getTotalServices());
    }
    
    /**
     * Met à jour les métriques principales
     */
    private void updateMetrics(DashboardData data) {
        totalMerchantsLabel.setText(NUMBER_FORMAT.format(data.getTotalMerchants()));
        totalDeliveriesLabel.setText(NUMBER_FORMAT.format(data.getTotalDeliveries()));
        totalServicesLabel.setText(NUMBER_FORMAT.format(data.getTotalServices()));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(data.getTotalRevenue()));
        
        // Métriques de qualité
        avgDeliveryRatingLabel.setText(String.format("%.1f ⭐", data.getAverageDeliveryRating()));
        avgServiceRatingLabel.setText(String.format("%.1f ⭐", data.getAverageServiceRating()));
        
        // Métriques de completion
        completedDeliveriesLabel.setText(NUMBER_FORMAT.format(data.getCompletedDeliveries()));
        completedServicesLabel.setText(NUMBER_FORMAT.format(data.getCompletedServices()));
    }
    
    /**
     * Met à jour les graphiques
     */
    private void updateCharts(DashboardData data) {
        if (data.getAnalytics() == null) {
            logger.warn("⚠️ Analytics null dans les données");
            return;
        }
        
        updateRevenueChart(data.getAnalytics().getRevenueByMonth());
        updateDeliveriesChart(data.getAnalytics().getDeliveriesByType());
        updateServicesChart(data.getAnalytics().getServicesByCategory());
        updateRegionsChart(data.getAnalytics().getClientsByRegion());
    }
    
    /**
     * Met à jour le graphique des revenus
     */
    private void updateRevenueChart(Map<String, Double> revenueByMonth) {
        if (revenueByMonth == null) return;
        
        revenueChart.getData().clear();
        XYChart.Series<String, Number> series = new XYChart.Series<>();
        
        revenueByMonth.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .forEach(entry -> {
                String monthLabel = formatMonth(entry.getKey());
                series.getData().add(new XYChart.Data<>(monthLabel, entry.getValue()));
            });
        
        revenueChart.getData().add(series);
    }
    
    /**
     * Met à jour le graphique des types de livraison
     */
    private void updateDeliveriesChart(Map<String, Integer> deliveriesByType) {
        if (deliveriesByType == null) return;
        
        deliveriesTypeChart.getData().clear();
        deliveriesByType.forEach((type, count) -> {
            String displayName = formatDeliveryType(type);
            PieChart.Data slice = new PieChart.Data(displayName + " (" + count + ")", count);
            deliveriesTypeChart.getData().add(slice);
        });
    }
    
    /**
     * Met à jour le graphique des services
     */
    private void updateServicesChart(Map<String, Integer> servicesByCategory) {
        if (servicesByCategory == null) return;
        
        servicesChart.getData().clear();
        XYChart.Series<String, Number> series = new XYChart.Series<>();
        
        servicesByCategory.forEach((category, count) -> {
            String displayName = formatServiceCategory(category);
            series.getData().add(new XYChart.Data<>(displayName, count));
        });
        
        servicesChart.getData().add(series);
    }
    
    /**
     * Met à jour le graphique des régions
     */
    private void updateRegionsChart(Map<String, Integer> clientsByRegion) {
        if (clientsByRegion == null) return;
        
        regionsChart.getData().clear();
        clientsByRegion.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(8) // Limiter aux 8 principales régions
            .forEach(entry -> {
                PieChart.Data slice = new PieChart.Data(
                    entry.getKey() + " (" + entry.getValue() + ")", 
                    entry.getValue());
                regionsChart.getData().add(slice);
            });
    }
    
    /**
     * Met à jour les tableaux
     */
    private void updateTables(DashboardData data) {
        if (data.getAnalytics() == null) return;
        
        // Top merchants
        if (data.getAnalytics().getTopMerchants() != null) {
            topMerchantsTable.getItems().clear();
            topMerchantsTable.getItems().addAll(data.getAnalytics().getTopMerchants());
        }
        
        // Top services
        if (data.getAnalytics().getTopServices() != null) {
            topServicesTable.getItems().clear();
            topServicesTable.getItems().addAll(data.getAnalytics().getTopServices());
        }
    }
    
    /**
     * Formate un mois pour l'affichage
     */
    private String formatMonth(String yearMonth) {
        try {
            String[] parts = yearMonth.split("-");
            int month = Integer.parseInt(parts[1]);
            String[] monthNames = {
                "", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
                "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"
            };
            return monthNames[month];
        } catch (Exception e) {
            return yearMonth;
        }
    }
    
    /**
     * Formate un type de livraison pour l'affichage
     */
    private String formatDeliveryType(String type) {
        return switch (type) {
            case "STANDARD" -> "Standard";
            case "EXPRESS" -> "Express";
            case "SAME_DAY" -> "Jour même";
            case "SCHEDULED" -> "Programmée";
            case "INTERNATIONAL" -> "International";
            default -> type;
        };
    }
    
    /**
     * Formate une catégorie de service pour l'affichage
     */
    private String formatServiceCategory(String category) {
        return switch (category) {
            case "PROFESSIONAL" -> "Professionnel";
            case "DOMESTIC" -> "Domestique";
            case "TECHNICAL" -> "Technique";
            case "CREATIVE" -> "Créatif";
            case "EDUCATIONAL" -> "Éducatif";
            case "HEALTH" -> "Santé";
            case "TRANSPORT" -> "Transport";
            case "EVENT" -> "Événement";
            default -> category;
        };
    }
    
    /**
     * Retourne la vue du dashboard
     */
    public Node getView() {
        return dashboardVBox;
    }
    
    /**
     * Retourne les données actuelles
     */
    public DashboardData getCurrentData() {
        return currentData;
    }
}