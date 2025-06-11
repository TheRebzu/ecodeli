package com.ecodeli.desktop.controllers;

import com.ecodeli.desktop.api.models.Merchant;
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
import java.util.List;
import java.util.ResourceBundle;

/**
 * Contrôleur pour la vue Merchants
 */
public class MerchantsController implements Initializable {
    private static final Logger logger = LoggerFactory.getLogger(MerchantsController.class);
    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,##0.00 €");
    private static final DecimalFormat NUMBER_FORMAT = new DecimalFormat("#,##0");
    
    @FXML private VBox merchantsVBox;
    @FXML private TextField searchField;
    @FXML private ComboBox<String> businessTypeFilter;
    @FXML private ComboBox<String> cityFilter;
    @FXML private CheckBox activeOnlyCheckBox;
    @FXML private Button refreshButton;
    @FXML private Label totalMerchantsLabel;
    @FXML private Label activeMerchantsLabel;
    @FXML private Label totalRevenueLabel;
    @FXML private ProgressIndicator loadingIndicator;
    
    @FXML private TableView<Merchant> merchantsTable;
    @FXML private TableColumn<Merchant, String> companyNameColumn;
    @FXML private TableColumn<Merchant, String> contactNameColumn;
    @FXML private TableColumn<Merchant, String> emailColumn;
    @FXML private TableColumn<Merchant, String> cityColumn;
    @FXML private TableColumn<Merchant, String> businessTypeColumn;
    @FXML private TableColumn<Merchant, String> revenueColumn;
    @FXML private TableColumn<Merchant, String> ordersColumn;
    @FXML private TableColumn<Merchant, String> statusColumn;
    
    private final ApiService apiService;
    private FilteredList<Merchant> filteredMerchants;
    private List<Merchant> allMerchants;
    
    public MerchantsController() {
        this.apiService = ApiService.getInstance();
    }
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("🎮 Initialisation du contrôleur Merchants");
        
        setupTable();
        setupFilters();
        setupActions();
        loadMerchants();
    }
    
    /**
     * Configure le tableau des commerçants
     */
    private void setupTable() {
        companyNameColumn.setCellValueFactory(new PropertyValueFactory<>("companyName"));
        contactNameColumn.setCellValueFactory(new PropertyValueFactory<>("contactName"));
        emailColumn.setCellValueFactory(new PropertyValueFactory<>("email"));
        cityColumn.setCellValueFactory(new PropertyValueFactory<>("city"));
        businessTypeColumn.setCellValueFactory(new PropertyValueFactory<>("businessType"));
        
        revenueColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                CURRENCY_FORMAT.format(cellData.getValue().getTotalRevenue())));
        
        ordersColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                NUMBER_FORMAT.format(cellData.getValue().getTotalOrders())));
        
        statusColumn.setCellValueFactory(cellData -> 
            new javafx.beans.property.SimpleStringProperty(
                cellData.getValue().isActive() ? "✅ Actif" : "❌ Inactif"));
        
        // Style conditionnel pour le statut
        statusColumn.setCellFactory(column -> new TableCell<Merchant, String>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setStyle("");
                } else {
                    setText(item);
                    if (item.contains("Actif")) {
                        setStyle("-fx-text-fill: green; -fx-font-weight: bold;");
                    } else {
                        setStyle("-fx-text-fill: red; -fx-font-weight: bold;");
                    }
                }
            }
        });
        
        // Double-clic pour voir les détails
        merchantsTable.setRowFactory(tv -> {
            TableRow<Merchant> row = new TableRow<>();
            row.setOnMouseClicked(event -> {
                if (event.getClickCount() == 2 && !row.isEmpty()) {
                    showMerchantDetails(row.getItem());
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
        
        // Filtre par type d'entreprise
        businessTypeFilter.valueProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
        
        // Filtre par ville
        cityFilter.valueProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
        
        // Filtre par statut actif
        activeOnlyCheckBox.selectedProperty().addListener((observable, oldValue, newValue) -> {
            applyFilters();
        });
    }
    
    /**
     * Configure les actions
     */
    private void setupActions() {
        refreshButton.setOnAction(e -> loadMerchants());
    }
    
    /**
     * Charge la liste des commerçants
     */
    private void loadMerchants() {
        showLoading(true);
        
        Task<List<Merchant>> loadTask = new Task<List<Merchant>>() {
            @Override
            protected List<Merchant> call() throws Exception {
                return apiService.getMerchantsAsync().get();
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    allMerchants = getValue();
                    updateMerchantsTable(allMerchants);
                    updateFiltersOptions(allMerchants);
                    updateStatistics(allMerchants);
                    showLoading(false);
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false);
                    showError("Erreur", "Impossible de charger les commerçants: " + getException().getMessage());
                });
            }
        };
        
        Thread loadThread = new Thread(loadTask);
        loadThread.setDaemon(true);
        loadThread.start();
    }
    
    /**
     * Met à jour le tableau des commerçants
     */
    private void updateMerchantsTable(List<Merchant> merchants) {
        filteredMerchants = new FilteredList<>(FXCollections.observableArrayList(merchants));
        merchantsTable.setItems(filteredMerchants);
        
        logger.info("✅ {} commerçants chargés dans le tableau", merchants.size());
    }
    
    /**
     * Met à jour les options des filtres
     */
    private void updateFiltersOptions(List<Merchant> merchants) {
        // Types d'entreprise
        businessTypeFilter.getItems().clear();
        businessTypeFilter.getItems().add("Tous les types");
        merchants.stream()
            .map(Merchant::getBusinessType)
            .filter(type -> type != null && !type.isEmpty())
            .distinct()
            .sorted()
            .forEach(businessTypeFilter.getItems()::add);
        businessTypeFilter.setValue("Tous les types");
        
        // Villes
        cityFilter.getItems().clear();
        cityFilter.getItems().add("Toutes les villes");
        merchants.stream()
            .map(Merchant::getCity)
            .filter(city -> city != null && !city.isEmpty())
            .distinct()
            .sorted()
            .forEach(cityFilter.getItems()::add);
        cityFilter.setValue("Toutes les villes");
    }
    
    /**
     * Met à jour les statistiques
     */
    private void updateStatistics(List<Merchant> merchants) {
        int totalMerchants = merchants.size();
        int activeMerchants = (int) merchants.stream().filter(Merchant::isActive).count();
        double totalRevenue = merchants.stream().mapToDouble(Merchant::getTotalRevenue).sum();
        
        totalMerchantsLabel.setText(NUMBER_FORMAT.format(totalMerchants));
        activeMerchantsLabel.setText(NUMBER_FORMAT.format(activeMerchants));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(totalRevenue));
    }
    
    /**
     * Applique les filtres
     */
    private void applyFilters() {
        if (filteredMerchants == null) return;
        
        filteredMerchants.setPredicate(merchant -> {
            // Filtre de recherche textuelle
            String searchText = searchField.getText();
            if (searchText != null && !searchText.isEmpty()) {
                String lowerCaseFilter = searchText.toLowerCase();
                if (!merchant.getCompanyName().toLowerCase().contains(lowerCaseFilter) &&
                    !merchant.getContactName().toLowerCase().contains(lowerCaseFilter) &&
                    !merchant.getEmail().toLowerCase().contains(lowerCaseFilter) &&
                    !merchant.getCity().toLowerCase().contains(lowerCaseFilter)) {
                    return false;
                }
            }
            
            // Filtre par type d'entreprise
            String businessType = businessTypeFilter.getValue();
            if (businessType != null && !businessType.equals("Tous les types")) {
                if (!businessType.equals(merchant.getBusinessType())) {
                    return false;
                }
            }
            
            // Filtre par ville
            String city = cityFilter.getValue();
            if (city != null && !city.equals("Toutes les villes")) {
                if (!city.equals(merchant.getCity())) {
                    return false;
                }
            }
            
            // Filtre par statut actif
            if (activeOnlyCheckBox.isSelected() && !merchant.isActive()) {
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
        if (filteredMerchants == null) return;
        
        List<Merchant> visibleMerchants = filteredMerchants.stream().toList();
        int totalVisible = visibleMerchants.size();
        int activeVisible = (int) visibleMerchants.stream().filter(Merchant::isActive).count();
        double revenueVisible = visibleMerchants.stream().mapToDouble(Merchant::getTotalRevenue).sum();
        
        totalMerchantsLabel.setText(NUMBER_FORMAT.format(totalVisible) + 
            (allMerchants != null && totalVisible != allMerchants.size() ? 
                " / " + NUMBER_FORMAT.format(allMerchants.size()) : ""));
        activeMerchantsLabel.setText(NUMBER_FORMAT.format(activeVisible));
        totalRevenueLabel.setText(CURRENCY_FORMAT.format(revenueVisible));
    }
    
    /**
     * Affiche les détails d'un commerçant
     */
    private void showMerchantDetails(Merchant merchant) {
        StringBuilder details = new StringBuilder();
        details.append("Entreprise: ").append(merchant.getCompanyName()).append("\n");
        details.append("Contact: ").append(merchant.getContactName()).append("\n");
        details.append("Email: ").append(merchant.getEmail()).append("\n");
        details.append("Téléphone: ").append(merchant.getPhone()).append("\n");
        details.append("Adresse: ").append(merchant.getAddress()).append(", ")
               .append(merchant.getCity()).append(" ").append(merchant.getPostalCode()).append("\n");
        details.append("Type: ").append(merchant.getBusinessType()).append("\n");
        details.append("Statut: ").append(merchant.isActive() ? "Actif" : "Inactif").append("\n\n");
        details.append("Revenus totaux: ").append(CURRENCY_FORMAT.format(merchant.getTotalRevenue())).append("\n");
        details.append("Commandes totales: ").append(NUMBER_FORMAT.format(merchant.getTotalOrders())).append("\n");
        details.append("Valeur moyenne: ").append(CURRENCY_FORMAT.format(merchant.getAverageOrderValue())).append("\n");
        details.append("Score de fidélité: ").append(String.format("%.1f", merchant.getLoyaltyScore())).append("\n");
        
        if (merchant.getRegistrationDate() != null) {
            details.append("Inscription: ").append(merchant.getRegistrationDate().format(
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        }
        
        if (merchant.getLastLoginDate() != null) {
            details.append("Dernière connexion: ").append(merchant.getLastLoginDate().format(
                java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append("\n");
        }
        
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Détails du commerçant");
        alert.setHeaderText(merchant.getCompanyName());
        alert.setContentText(details.toString());
        alert.showAndWait();
    }
    
    /**
     * Affiche/masque l'indicateur de chargement
     */
    private void showLoading(boolean show) {
        loadingIndicator.setVisible(show);
        refreshButton.setDisable(show);
        merchantsTable.setDisable(show);
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
     * Retourne la vue des commerçants
     */
    public Node getView() {
        return merchantsVBox;
    }
}