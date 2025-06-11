package com.ecodeli.desktop.controllers;

import com.ecodeli.desktop.api.models.Delivery;
import com.ecodeli.desktop.services.ApiService;
import javafx.application.Platform;
import javafx.collections.FXCollections;
import javafx.collections.transformation.FilteredList;
import javafx.concurrent.Task;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.VBox;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.net.URL;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.ResourceBundle;

/**
 * Contrôleur pour la vue Deliveries
 */
public class DeliveriesController implements Initializable {
    private static final Logger logger = LoggerFactory.getLogger(DeliveriesController.class);
    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,##0.00 €");
    private static final DecimalFormat NUMBER_FORMAT = new DecimalFormat("#,##0");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    
    @FXML private VBox deliveriesVBox;
    @FXML private TextField searchField;
    @FXML private ComboBox<String> statusFilter;
    @FXML private ComboBox<String> typeFilter;
    @FXML private ComboBox<String> cityFilter;
    @FXML private CheckBox completedOnlyCheckBox;
    @FXML private Button refreshButton;
    @FXML private Label totalDeliveriesLabel;
    @FXML private Label completedDeliveriesLabel;
    @FXML private Label totalRevenueLabel;
    @FXML private Label avgRatingLabel;
    @FXML private ProgressIndicator loadingIndicator;
    
    @FXML private TableView<Delivery> deliveriesTable;
    @FXML private TableColumn<Delivery, String> trackingColumn;
    @FXML private TableColumn<Delivery, String> routeColumn;
    @FXML private TableColumn<Delivery, String> typeColumn;
    @FXML private TableColumn<Delivery, String> statusColumn;
    @FXML private TableColumn<Delivery, String> contentColumn;
    @FXML private TableColumn<Delivery, String> distanceColumn;
    @FXML private TableColumn<Delivery, String> priceColumn;
    @FXML private TableColumn<Delivery, String> createdDateColumn;
    @FXML private TableColumn<Delivery, String> ratingColumn;
    
    private final ApiService apiService;
    private FilteredList<Delivery> filteredDeliveries;
    private List<Delivery> allDeliveries;
    
    public DeliveriesController() {
        this.apiService = ApiService.getInstance();
    }
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("🎮 Initialisation du contrôleur Deliveries");
        
        setupTable();
        setupFilters();
        setupActions();
        loadDeliveries();
    }
    
    /**
     * Configure le tableau des livraisons
     */
    private void setupTable() {
        trackingColumn.setCellValueFactory(new PropertyValueFactory<>("trackingNumber"));
        
        routeColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(cellData.getValue().getRoute()));
        
        typeColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getType() != null ? 
                    cellData.getValue().getType().getDisplayName() : ""));
        
        statusColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getStatus() != null ? 
                    cellData.getValue().getStatus().getDisplayName() : ""));
        
        contentColumn.setCellValueFactory(new PropertyValueFactory<>("packageContent"));
        
        distanceColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                String.format("%.1f km", cellData.getValue().getDistance())));
        
        priceColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                CURRENCY_FORMAT.format(cellData.getValue().getPrice())));
        
        createdDateColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getCreatedDate() != null ? 
                    cellData.getValue().getCreatedDate().format(DATE_FORMAT) : ""));
        
        ratingColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getRating() != null ? 
                    cellData.getValue().getRating() + " ⭐" : "-"));
        
        // Style conditionnel pour le statut
        statusColumn.setCellFactory(column -> new TableCell<Delivery, String>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setStyle("");
                } else {
                    setText(item);
                    if (item.contains("Livrée")) {
                        setStyle("-fx-text-fill: green; -fx-font-weight: bold;");
                    } else if (item.contains("transit") || item.contains("cours")) {
                        setStyle("-fx-text-fill: orange; -fx-font-weight: bold;");
                    } else if (item.contains("Échec") || item.contains("Annulée")) {
                        setStyle("-fx-text-fill: red; -fx-font-weight: bold;");
                    } else {
                        setStyle("-fx-text-fill: blue; -fx-font-weight: bold;");
                    }
                }
            }
        });
        
        // Double-clic pour voir les détails
        deliveriesTable.setRowFactory(tv -> {
            TableRow<Delivery> row = new TableRow<>();
            row.setOnMouseClicked(event -> {
                if (event.getClickCount() == 2 && !row.isEmpty()) {
                    showDeliveryDetails(row.getItem());
                }
            });
            return row;
        });
    }
    
    /**
     * Configure les filtres
     */
    private void setupFilters() {
        // Filtre de recherche textuelle
        searchField.textProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
        
        // Filtre par statut
        statusFilter.valueProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
        
        // Filtre par type
        typeFilter.valueProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
        
        // Filtre par ville
        cityFilter.valueProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
        
        // Filtre par statut terminé
        completedOnlyCheckBox.selectedProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
    }
    
    /**
     * Configure les actions
     */
    private void setupActions() {
        refreshButton.setOnAction(e -> loadDeliveries());
    }
    
    /**
     * Charge la liste des livraisons
     */
    private void loadDeliveries() {
        showLoading(true);
        
        Task<List<Delivery>> loadTask = new Task<List<Delivery>>() {
            @Override
            protected List<Delivery> call() throws Exception {
                return apiService.getDeliveriesAsync().get();
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    allDeliveries = getValue();
                    updateDeliveriesTable(allDeliveries);
                    updateFiltersOptions(allDeliveries);
                    updateStatistics(allDeliveries);
                    showLoading(false);
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false);
                    showError("Erreur", "Impossible de charger les livraisons: " + getException().getMessage());
                });
            }
        };
        
        Thread loadThread = new Thread(loadTask);
        loadThread.setDaemon(true);
        loadThread.start();
    }
    
    /**
     * Met à jour le tableau des livraisons
     */
    private void updateDeliveriesTable(List<Delivery> deliveries) {
        filteredDeliveries = new FilteredList<>(FXCollections.observableArrayList(deliveries));
        deliveriesTable.setItems(filteredDeliveries);
        
        logger.info("✅ {} livraisons chargées dans le tableau", deliveries.size());
    }
    
    /**
     * Met à jour les options des filtres
     */
    private void updateFiltersOptions(List<Delivery> deliveries) {
        // Statuts
        statusFilter.getItems().clear();
        statusFilter.getItems().add("Tous les statuts");
        deliveries.stream()
            .map(d -> d.getStatus() != null ? d.getStatus().getDisplayName() : null)
            .filter(status -> status != null && !status.isEmpty())
            .distinct()
            .sorted()
            .forEach(statusFilter.getItems()::add);
        statusFilter.setValue("Tous les statuts");
        
        // Types
        typeFilter.getItems().clear();
        typeFilter.getItems().add("Tous les types");
        deliveries.stream()
            .map(d -> d.getType() != null ? d.getType().getDisplayName() : null)
            .filter(type -> type != null && !type.isEmpty())
            .distinct()
            .sorted()
            .forEach(typeFilter.getItems()::add);
        typeFilter.setValue("Tous les types");
        
        // Villes (pickup et delivery)
        cityFilter.getItems().clear();
        cityFilter.getItems().add("Toutes les villes");
        deliveries.stream()
            .flatMap(d -> java.util.Stream.of(d.getPickupCity(), d.getDeliveryCity()))
            .filter(city -> city != null && !city.isEmpty())
            .distinct()
            .sorted()
            .forEach(cityFilter.getItems()::add);
        cityFilter.setValue("Toutes les villes");
    }
    
    /**
     * Met à jour les statistiques
     */
    private void updateStatistics(List<Delivery> deliveries) {
        int totalDeliveries = deliveries.size();
        long completedDeliveries = deliveries.stream().filter(Delivery::isCompleted).count();
        double totalRevenue = deliveries.stream().mapToDouble(Delivery::getPrice).sum();
        double avgRating = deliveries.stream()
            .filter(d -> d.getRating() != null)
            .mapToInt(Delivery::getRating)
            .average()
            .orElse(0.0);
        
        totalDeliveriesLabel.setText(NUMBER_FORMAT.format(totalDeliveries));
        completedDeliveriesLabel.setText(NUMBER_FORMAT.format(completedDeliveries));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(totalRevenue));
        avgRatingLabel.setText(String.format("%.1f ⭐", avgRating));
    }
    
    /**
     * Applique les filtres
     */
    private void applyFilters() {
        if (filteredDeliveries == null) return;
        
        filteredDeliveries.setPredicate(delivery -> {
            // Filtre de recherche textuelle
            String searchText = searchField.getText();
            if (searchText != null && !searchText.isEmpty()) {
                String lowerCaseFilter = searchText.toLowerCase();
                if (!delivery.getTrackingNumber().toLowerCase().contains(lowerCaseFilter) &&
                    !delivery.getPickupCity().toLowerCase().contains(lowerCaseFilter) &&
                    !delivery.getDeliveryCity().toLowerCase().contains(lowerCaseFilter) &&
                    (delivery.getPackageContent() == null || 
                     !delivery.getPackageContent().toLowerCase().contains(lowerCaseFilter))) {
                    return false;
                }
            }
            
            // Filtre par statut
            String status = statusFilter.getValue();
            if (status != null && !status.equals("Tous les statuts")) {
                if (delivery.getStatus() == null || !delivery.getStatus().getDisplayName().equals(status)) {
                    return false;
                }
            }
            
            // Filtre par type
            String type = typeFilter.getValue();
            if (type != null && !type.equals("Tous les types")) {
                if (delivery.getType() == null || !delivery.getType().getDisplayName().equals(type)) {
                    return false;
                }
            }
            
            // Filtre par ville
            String city = cityFilter.getValue();
            if (city != null && !city.equals("Toutes les villes")) {
                if (!city.equals(delivery.getPickupCity()) && !city.equals(delivery.getDeliveryCity())) {
                    return false;
                }
            }
            
            // Filtre par statut terminé
            if (completedOnlyCheckBox.isSelected() && !delivery.isCompleted()) {
                return false;
            }
            
            return true;
        });
        
        // Mettre à jour les statistiques filtrées
        updateFilteredStatistics();
    }
    
    /**
     * Met à jour les statistiques filtrées
     */
    private void updateFilteredStatistics() {
        if (filteredDeliveries == null) return;
        
        List<Delivery> visibleDeliveries = filteredDeliveries.stream().toList();
        int totalVisible = visibleDeliveries.size();
        long completedVisible = visibleDeliveries.stream().filter(Delivery::isCompleted).count();
        double revenueVisible = visibleDeliveries.stream().mapToDouble(Delivery::getPrice).sum();
        double avgRatingVisible = visibleDeliveries.stream()
            .filter(d -> d.getRating() != null)
            .mapToInt(Delivery::getRating)
            .average()
            .orElse(0.0);
        
        totalDeliveriesLabel.setText(NUMBER_FORMAT.format(totalVisible) + 
            (allDeliveries != null && totalVisible != allDeliveries.size() ? 
                " / " + NUMBER_FORMAT.format(allDeliveries.size()) : ""));
        completedDeliveriesLabel.setText(NUMBER_FORMAT.format(completedVisible));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(revenueVisible));
        avgRatingLabel.setText(String.format("%.1f ⭐", avgRatingVisible));
    }
    
    /**
     * Affiche les détails d'une livraison
     */
    private void showDeliveryDetails(Delivery delivery) {
        StringBuilder details = new StringBuilder();
        details.append("Numéro de suivi: ").append(delivery.getTrackingNumber()).append("\n");
        details.append("Route: ").append(delivery.getRoute()).append("\n");
        details.append("Type: ").append(delivery.getType() != null ? delivery.getType().getDisplayName() : "").append("\n");
        details.append("Statut: ").append(delivery.getStatus() != null ? delivery.getStatus().getDisplayName() : "").append("\n\n");
        
        details.append("Contenu: ").append(delivery.getPackageContent()).append("\n");
        details.append("Taille: ").append(delivery.getPackageSize() != null ? delivery.getPackageSize().getDisplayName() : "").append("\n");
        details.append("Poids: ").append(String.format("%.1f kg", delivery.getWeight())).append("\n");
        details.append("Fragile: ").append(delivery.isFragile() ? "Oui" : "Non").append("\n");
        details.append("Priorité: ").append(delivery.getPriority() != null ? delivery.getPriority().getDisplayName() : "").append("\n\n");
        
        details.append("Distance: ").append(String.format("%.1f km", delivery.getDistance())).append("\n");
        details.append("Prix: ").append(CURRENCY_FORMAT.format(delivery.getPrice())).append("\n\n");
        
        if (delivery.getCreatedDate() != null) {
            details.append("Créée le: ").append(delivery.getCreatedDate().format(DATE_FORMAT)).append("\n");
        }
        if (delivery.getPickupDate() != null) {
            details.append("Enlevée le: ").append(delivery.getPickupDate().format(DATE_FORMAT)).append("\n");
        }
        if (delivery.getActualDeliveryTime() != null) {
            details.append("Livrée le: ").append(delivery.getActualDeliveryTime().format(DATE_FORMAT)).append("\n");
        }
        
        if (delivery.getRating() != null) {
            details.append("Note: ").append(delivery.getRating()).append(" ⭐\n");
        }
        if (delivery.getClientComment() != null && !delivery.getClientComment().isEmpty()) {
            details.append("Commentaire: ").append(delivery.getClientComment()).append("\n");
        }
        
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Détails de la livraison");
        alert.setHeaderText("Livraison " + delivery.getTrackingNumber());
        alert.setContentText(details.toString());
        alert.showAndWait();
    }
    
    /**
     * Affiche/masque l'indicateur de chargement
     */
    private void showLoading(boolean show) {
        loadingIndicator.setVisible(show);
        refreshButton.setDisable(show);
        deliveriesTable.setDisable(show);
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
     * Retourne la vue des livraisons
     */
    public Node getView() {
        return deliveriesVBox;
    }
}