package com.ecodeli.desktop.controllers;

import com.ecodeli.desktop.api.models.Service;
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
 * Contrôleur pour la vue Services
 */
public class ServicesController implements Initializable {
    private static final Logger logger = LoggerFactory.getLogger(ServicesController.class);
    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,##0.00 €");
    private static final DecimalFormat NUMBER_FORMAT = new DecimalFormat("#,##0");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    
    @FXML private VBox servicesVBox;
    @FXML private TextField searchField;
    @FXML private ComboBox<String> statusFilter;
    @FXML private ComboBox<String> typeFilter;
    @FXML private ComboBox<String> categoryFilter;
    @FXML private ComboBox<String> cityFilter;
    @FXML private CheckBox completedOnlyCheckBox;
    @FXML private Button refreshButton;
    @FXML private Label totalServicesLabel;
    @FXML private Label completedServicesLabel;
    @FXML private Label totalRevenueLabel;
    @FXML private Label avgRatingLabel;
    @FXML private ProgressIndicator loadingIndicator;
    
    @FXML private TableView<Service> servicesTable;
    @FXML private TableColumn<Service, String> nameColumn;
    @FXML private TableColumn<Service, String> typeColumn;
    @FXML private TableColumn<Service, String> categoryColumn;
    @FXML private TableColumn<Service, String> providerColumn;
    @FXML private TableColumn<Service, String> clientColumn;
    @FXML private TableColumn<Service, String> statusColumn;
    @FXML private TableColumn<Service, String> cityColumn;
    @FXML private TableColumn<Service, String> scheduledDateColumn;
    @FXML private TableColumn<Service, String> durationColumn;
    @FXML private TableColumn<Service, String> priceColumn;
    @FXML private TableColumn<Service, String> ratingColumn;
    
    private final ApiService apiService;
    private FilteredList<Service> filteredServices;
    private List<Service> allServices;
    
    public ServicesController() {
        this.apiService = ApiService.getInstance();
    }
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("🎮 Initialisation du contrôleur Services");
        
        setupTable();
        setupFilters();
        setupActions();
        loadServices();
    }
    
    /**
     * Configure le tableau des services
     */
    private void setupTable() {
        nameColumn.setCellValueFactory(new PropertyValueFactory<>("name"));
        
        typeColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getType() != null ? 
                    cellData.getValue().getType().getDisplayName() : ""));
        
        categoryColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getCategory() != null ? 
                    cellData.getValue().getCategory().getDisplayName() : ""));
        
        providerColumn.setCellValueFactory(new PropertyValueFactory<>("providerName"));
        clientColumn.setCellValueFactory(new PropertyValueFactory<>("clientName"));
        
        statusColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getStatus() != null ? 
                    cellData.getValue().getStatus().getDisplayName() : ""));
        
        cityColumn.setCellValueFactory(new PropertyValueFactory<>("city"));
        
        scheduledDateColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getScheduledDate() != null ? 
                    cellData.getValue().getScheduledDate().format(DATE_FORMAT) : ""));
        
        durationColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                formatDuration(cellData.getValue().getDuration())));
        
        priceColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                CURRENCY_FORMAT.format(cellData.getValue().getPrice())));
        
        ratingColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().getRating() != null ? 
                    cellData.getValue().getRating() + " ⭐" : "-"));
        
        // Style conditionnel pour le statut
        statusColumn.setCellFactory(column -> new TableCell<Service, String>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setStyle("");
                } else {
                    setText(item);
                    if (item.contains("Terminé")) {
                        setStyle("-fx-text-fill: green; -fx-font-weight: bold;");
                    } else if (item.contains("cours")) {
                        setStyle("-fx-text-fill: orange; -fx-font-weight: bold;");
                    } else if (item.contains("Annulé")) {
                        setStyle("-fx-text-fill: red; -fx-font-weight: bold;");
                    } else {
                        setStyle("-fx-text-fill: blue; -fx-font-weight: bold;");
                    }
                }
            }
        });
        
        // Double-clic pour voir les détails
        servicesTable.setRowFactory(tv -> {
            TableRow<Service> row = new TableRow<>();
            row.setOnMouseClicked(event -> {
                if (event.getClickCount() == 2 && !row.isEmpty()) {
                    showServiceDetails(row.getItem());
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
        
        // Filtre par catégorie
        categoryFilter.valueProperty().addListener((observable, oldValue, newValue) -> {
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
        refreshButton.setOnAction(e -> loadServices());
    }
    
    /**
     * Charge la liste des services
     */
    private void loadServices() {
        showLoading(true);
        
        Task<List<Service>> loadTask = new Task<List<Service>>() {
            @Override
            protected List<Service> call() throws Exception {
                return apiService.getServicesAsync().get();
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    allServices = getValue();
                    updateServicesTable(allServices);
                    updateFiltersOptions(allServices);
                    updateStatistics(allServices);
                    showLoading(false);
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false);
                    showError("Erreur", "Impossible de charger les services: " + getException().getMessage());
                });
            }
        };
        
        Thread loadThread = new Thread(loadTask);
        loadThread.setDaemon(true);
        loadThread.start();
    }
    
    /**
     * Met à jour le tableau des services
     */
    private void updateServicesTable(List<Service> services) {
        filteredServices = new FilteredList<>(FXCollections.observableArrayList(services));
        servicesTable.setItems(filteredServices);
        
        logger.info("✅ {} services chargés dans le tableau", services.size());
    }
    
    /**
     * Met à jour les options des filtres
     */
    private void updateFiltersOptions(List<Service> services) {
        // Statuts
        statusFilter.getItems().clear();
        statusFilter.getItems().add("Tous les statuts");
        services.stream()
            .map(s -> s.getStatus() != null ? s.getStatus().getDisplayName() : null)
            .filter(status -> status != null && !status.isEmpty())
            .distinct()
            .sorted()
            .forEach(statusFilter.getItems()::add);
        statusFilter.setValue("Tous les statuts");
        
        // Types
        typeFilter.getItems().clear();
        typeFilter.getItems().add("Tous les types");
        services.stream()
            .map(s -> s.getType() != null ? s.getType().getDisplayName() : null)
            .filter(type -> type != null && !type.isEmpty())
            .distinct()
            .sorted()
            .forEach(typeFilter.getItems()::add);
        typeFilter.setValue("Tous les types");
        
        // Catégories
        categoryFilter.getItems().clear();
        categoryFilter.getItems().add("Toutes les catégories");
        services.stream()
            .map(s -> s.getCategory() != null ? s.getCategory().getDisplayName() : null)
            .filter(category -> category != null && !category.isEmpty())
            .distinct()
            .sorted()
            .forEach(categoryFilter.getItems()::add);
        categoryFilter.setValue("Toutes les catégories");
        
        // Villes
        cityFilter.getItems().clear();
        cityFilter.getItems().add("Toutes les villes");
        services.stream()
            .map(Service::getCity)
            .filter(city -> city != null && !city.isEmpty())
            .distinct()
            .sorted()
            .forEach(cityFilter.getItems()::add);
        cityFilter.setValue("Toutes les villes");
    }
    
    /**
     * Met à jour les statistiques
     */
    private void updateStatistics(List<Service> services) {
        int totalServices = services.size();
        long completedServices = services.stream().filter(Service::isCompleted).count();
        double totalRevenue = services.stream().mapToDouble(Service::getPrice).sum();
        double avgRating = services.stream()
            .filter(s -> s.getRating() != null)
            .mapToInt(Service::getRating)
            .average()
            .orElse(0.0);
        
        totalServicesLabel.setText(NUMBER_FORMAT.format(totalServices));
        completedServicesLabel.setText(NUMBER_FORMAT.format(completedServices));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(totalRevenue));
        avgRatingLabel.setText(String.format("%.1f ⭐", avgRating));
    }
    
    /**
     * Applique les filtres
     */
    private void applyFilters() {
        if (filteredServices == null) return;
        
        filteredServices.setPredicate(service -> {
            // Filtre de recherche textuelle
            String searchText = searchField.getText();
            if (searchText != null && !searchText.isEmpty()) {
                String lowerCaseFilter = searchText.toLowerCase();
                if (!service.getName().toLowerCase().contains(lowerCaseFilter) &&
                    (service.getProviderName() == null || !service.getProviderName().toLowerCase().contains(lowerCaseFilter)) &&
                    (service.getClientName() == null || !service.getClientName().toLowerCase().contains(lowerCaseFilter)) &&
                    (service.getCity() == null || !service.getCity().toLowerCase().contains(lowerCaseFilter)) &&
                    (service.getDescription() == null || !service.getDescription().toLowerCase().contains(lowerCaseFilter))) {
                    return false;
                }
            }
            
            // Filtre par statut
            String status = statusFilter.getValue();
            if (status != null && !status.equals("Tous les statuts")) {
                if (service.getStatus() == null || !service.getStatus().getDisplayName().equals(status)) {
                    return false;
                }
            }
            
            // Filtre par type
            String type = typeFilter.getValue();
            if (type != null && !type.equals("Tous les types")) {
                if (service.getType() == null || !service.getType().getDisplayName().equals(type)) {
                    return false;
                }
            }
            
            // Filtre par catégorie
            String category = categoryFilter.getValue();
            if (category != null && !category.equals("Toutes les catégories")) {
                if (service.getCategory() == null || !service.getCategory().getDisplayName().equals(category)) {
                    return false;
                }
            }
            
            // Filtre par ville
            String city = cityFilter.getValue();
            if (city != null && !city.equals("Toutes les villes")) {
                if (!city.equals(service.getCity())) {
                    return false;
                }
            }
            
            // Filtre par statut terminé
            if (completedOnlyCheckBox.isSelected() && !service.isCompleted()) {
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
        if (filteredServices == null) return;
        
        List<Service> visibleServices = filteredServices.stream().toList();
        int totalVisible = visibleServices.size();
        long completedVisible = visibleServices.stream().filter(Service::isCompleted).count();
        double revenueVisible = visibleServices.stream().mapToDouble(Service::getPrice).sum();
        double avgRatingVisible = visibleServices.stream()
            .filter(s -> s.getRating() != null)
            .mapToInt(Service::getRating)
            .average()
            .orElse(0.0);
        
        totalServicesLabel.setText(NUMBER_FORMAT.format(totalVisible) + 
            (allServices != null && totalVisible != allServices.size() ? 
                " / " + NUMBER_FORMAT.format(allServices.size()) : ""));
        completedServicesLabel.setText(NUMBER_FORMAT.format(completedVisible));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(revenueVisible));
        avgRatingLabel.setText(String.format("%.1f ⭐", avgRatingVisible));
    }
    
    /**
     * Formate la durée en heures et minutes
     */
    private String formatDuration(int minutes) {
        if (minutes < 60) {
            return minutes + "min";
        } else {
            int hours = minutes / 60;
            int remainingMinutes = minutes % 60;
            if (remainingMinutes == 0) {
                return hours + "h";
            } else {
                return hours + "h" + remainingMinutes + "min";
            }
        }
    }
    
    /**
     * Affiche les détails d'un service
     */
    private void showServiceDetails(Service service) {
        StringBuilder details = new StringBuilder();
        details.append("Service: ").append(service.getName()).append("\n");
        details.append("Description: ").append(service.getDescription() != null ? service.getDescription() : "").append("\n");
        details.append("Type: ").append(service.getType() != null ? service.getType().getDisplayName() : "").append("\n");
        details.append("Catégorie: ").append(service.getCategory() != null ? service.getCategory().getDisplayName() : "").append("\n");
        details.append("Statut: ").append(service.getStatus() != null ? service.getStatus().getDisplayName() : "").append("\n\n");
        
        details.append("Prestataire: ").append(service.getProviderName() != null ? service.getProviderName() : "").append("\n");
        details.append("Client: ").append(service.getClientName() != null ? service.getClientName() : "").append("\n");
        details.append("Lieu: ").append(service.getLocation() != null ? service.getLocation() : "").append(", ")
               .append(service.getCity() != null ? service.getCity() : "").append("\n\n");
        
        if (service.getScheduledDate() != null) {
            details.append("Date prévue: ").append(service.getScheduledDate().format(DATE_FORMAT)).append("\n");
        }
        if (service.getStartTime() != null) {
            details.append("Début: ").append(service.getStartTime().format(DATE_FORMAT)).append("\n");
        }
        if (service.getEndTime() != null) {
            details.append("Fin: ").append(service.getEndTime().format(DATE_FORMAT)).append("\n");
        }
        
        details.append("Durée: ").append(formatDuration(service.getDuration())).append("\n");
        details.append("Tarif horaire: ").append(CURRENCY_FORMAT.format(service.getHourlyRate())).append("\n");
        details.append("Prix total: ").append(CURRENCY_FORMAT.format(service.getPrice())).append("\n\n");
        
        details.append("Équipement fourni: ").append(service.isEquipmentProvided() ? "Oui" : "Non").append("\n");
        if (service.isEquipmentProvided() && service.getEquipmentList() != null) {
            details.append("Liste équipement: ").append(service.getEquipmentList()).append("\n");
        }
        details.append("Certification requise: ").append(service.isCertificationRequired() ? "Oui" : "Non").append("\n");
        details.append("Service récurrent: ").append(service.isRepeatService() ? "Oui" : "Non").append("\n");
        if (service.isRepeatService() && service.getRepeatFrequency() != null) {
            details.append("Fréquence: ").append(service.getRepeatFrequency()).append("\n");
        }
        
        if (service.getRating() != null) {
            details.append("Note: ").append(service.getRating()).append(" ⭐\n");
        }
        if (service.getClientFeedback() != null && !service.getClientFeedback().isEmpty()) {
            details.append("Commentaire client: ").append(service.getClientFeedback()).append("\n");
        }
        
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Détails du service");
        alert.setHeaderText(service.getName());
        alert.setContentText(details.toString());
        alert.showAndWait();
    }
    
    /**
     * Affiche/masque l'indicateur de chargement
     */
    private void showLoading(boolean show) {
        loadingIndicator.setVisible(show);
        refreshButton.setDisable(show);
        servicesTable.setDisable(show);
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
     * Retourne la vue des services
     */
    public Node getView() {
        return servicesVBox;
    }
}