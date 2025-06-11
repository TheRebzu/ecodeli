package com.ecodeli.desktop.controllers;

import com.ecodeli.desktop.api.models.DashboardData;
import com.ecodeli.desktop.services.ApiService;
import com.ecodeli.desktop.utils.PdfReportGenerator;
import javafx.application.Platform;
import javafx.concurrent.Task;
import javafx.fxml.FXML;
import javafx.fxml.Initializable;
import javafx.scene.Node;
import javafx.scene.control.*;
import javafx.scene.layout.VBox;
import javafx.stage.FileChooser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.net.URL;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ResourceBundle;

/**
 * Contrôleur pour la vue Reports
 */
public class ReportsController implements Initializable {
    private static final Logger logger = LoggerFactory.getLogger(ReportsController.class);
    
    @FXML private VBox reportsVBox;
    @FXML private ComboBox<String> reportTypeComboBox;
    @FXML private DatePicker startDatePicker;
    @FXML private DatePicker endDatePicker;
    @FXML private CheckBox includeMerchantsCheckBox;
    @FXML private CheckBox includeDeliveriesCheckBox;
    @FXML private CheckBox includeServicesCheckBox;
    @FXML private CheckBox includeChartsCheckBox;
    @FXML private CheckBox includeAnalyticsCheckBox;
    @FXML private TextArea reportPreviewArea;
    @FXML private Button generatePdfButton;
    @FXML private Button generateCsvButton;
    @FXML private Button generateExcelButton;
    @FXML private Button refreshDataButton;
    @FXML private ProgressIndicator loadingIndicator;
    @FXML private Label statusLabel;
    
    private final ApiService apiService;
    private final PdfReportGenerator pdfGenerator;
    private DashboardData currentData;
    
    public ReportsController() {
        this.apiService = ApiService.getInstance();
        this.pdfGenerator = new PdfReportGenerator();
    }
    
    @Override
    public void initialize(URL location, ResourceBundle resources) {
        logger.info("🎮 Initialisation du contrôleur Reports");
        
        setupReportTypes();
        setupDateFilters();
        setupActions();
        loadData();
    }
    
    /**
     * Configure les types de rapports
     */
    private void setupReportTypes() {
        reportTypeComboBox.getItems().addAll(
            "Rapport général",
            "Rapport mensuel",
            "Rapport des commerçants",
            "Rapport des livraisons",
            "Rapport des services",
            "Rapport financier",
            "Rapport de performance"
        );
        reportTypeComboBox.setValue("Rapport général");
        
        // Listener pour mise à jour du preview
        reportTypeComboBox.valueProperty().addListener((obs, oldVal, newVal) -> updatePreview());
    }
    
    /**
     * Configure les filtres de dates
     */
    private void setupDateFilters() {
        // Dates par défaut: dernier mois
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(1);
        
        startDatePicker.setValue(startDate);
        endDatePicker.setValue(endDate);
        
        // Listeners pour mise à jour du preview
        startDatePicker.valueProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        endDatePicker.valueProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        
        // Listeners pour les checkboxes
        includeMerchantsCheckBox.selectedProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        includeDeliveriesCheckBox.selectedProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        includeServicesCheckBox.selectedProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        includeChartsCheckBox.selectedProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        includeAnalyticsCheckBox.selectedProperty().addListener((obs, oldVal, newVal) -> updatePreview());
        
        // Sélectionner toutes les options par défaut
        includeMerchantsCheckBox.setSelected(true);
        includeDeliveriesCheckBox.setSelected(true);
        includeServicesCheckBox.setSelected(true);
        includeChartsCheckBox.setSelected(true);
        includeAnalyticsCheckBox.setSelected(true);
    }
    
    /**
     * Configure les actions des boutons
     */
    private void setupActions() {
        generatePdfButton.setOnAction(e -> generatePdfReport());
        generateCsvButton.setOnAction(e -> generateCsvReport());
        generateExcelButton.setOnAction(e -> generateExcelReport());
        refreshDataButton.setOnAction(e -> loadData());
    }
    
    /**
     * Charge les données
     */
    private void loadData() {
        showLoading(true, "Chargement des données...");
        
        Task<DashboardData> loadTask = new Task<DashboardData>() {
            @Override
            protected DashboardData call() throws Exception {
                return apiService.getDashboardData().get();
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    currentData = getValue();
                    updatePreview();
                    showLoading(false, "Données chargées");
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false, "Erreur de chargement");
                    showError("Erreur", "Impossible de charger les données: " + getException().getMessage());
                });
            }
        };
        
        Thread loadThread = new Thread(loadTask);
        loadThread.setDaemon(true);
        loadThread.start();
    }
    
    /**
     * Met à jour le preview du rapport
     */
    private void updatePreview() {
        if (currentData == null) {
            reportPreviewArea.setText("Aucune donnée disponible. Veuillez charger les données.");
            return;
        }
        
        StringBuilder preview = new StringBuilder();
        String reportType = reportTypeComboBox.getValue();
        LocalDate startDate = startDatePicker.getValue();
        LocalDate endDate = endDatePicker.getValue();
        
        // En-tête du rapport
        preview.append("=".repeat(80)).append("\n");
        preview.append("EcoDeli - ").append(reportType).append("\n");
        preview.append("=".repeat(80)).append("\n");
        preview.append("Période: ").append(startDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")))
               .append(" - ").append(endDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n");
        preview.append("Généré le: ").append(LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))).append("\n\n");
        
        // Résumé exécutif
        preview.append("RÉSUMÉ EXÉCUTIF\n");
        preview.append("-".repeat(40)).append("\n");
        preview.append("• Total commerçants: ").append(currentData.getTotalMerchants()).append("\n");
        preview.append("• Total livraisons: ").append(currentData.getTotalDeliveries()).append("\n");
        preview.append("• Total services: ").append(currentData.getTotalServices()).append("\n");
        preview.append("• Revenus totaux: ").append(String.format("%.2f €", currentData.getTotalRevenue())).append("\n");
        preview.append("• Livraisons terminées: ").append(currentData.getCompletedDeliveries()).append("\n");
        preview.append("• Services terminés: ").append(currentData.getCompletedServices()).append("\n");
        preview.append("• Note moyenne livraisons: ").append(String.format("%.1f/5", currentData.getAverageDeliveryRating())).append("\n");
        preview.append("• Note moyenne services: ").append(String.format("%.1f/5", currentData.getAverageServiceRating())).append("\n\n");
        
        // Sections conditionnelles
        if (includeMerchantsCheckBox.isSelected()) {
            preview.append("COMMERÇANTS\n");
            preview.append("-".repeat(40)).append("\n");
            preview.append("• Nombre total: ").append(currentData.getTotalMerchants()).append("\n");
            preview.append("• Actifs: ").append(currentData.getMerchants().stream()
                .mapToLong(m -> m.isActive() ? 1 : 0).sum()).append("\n");
            preview.append("• Revenus moyens par commerçant: ")
                .append(String.format("%.2f €", currentData.getTotalRevenue() / currentData.getTotalMerchants())).append("\n\n");
        }
        
        if (includeDeliveriesCheckBox.isSelected()) {
            preview.append("LIVRAISONS\n");
            preview.append("-".repeat(40)).append("\n");
            preview.append("• Nombre total: ").append(currentData.getTotalDeliveries()).append("\n");
            preview.append("• Terminées: ").append(currentData.getCompletedDeliveries()).append("\n");
            preview.append("• Taux de réussite: ").append(
                String.format("%.1f%%", (double) currentData.getCompletedDeliveries() / currentData.getTotalDeliveries() * 100)).append("\n");
            preview.append("• Revenus livraisons: ").append(
                String.format("%.2f €", currentData.getDeliveries().stream().mapToDouble(d -> d.getPrice()).sum())).append("\n\n");
        }
        
        if (includeServicesCheckBox.isSelected()) {
            preview.append("SERVICES\n");
            preview.append("-".repeat(40)).append("\n");
            preview.append("• Nombre total: ").append(currentData.getTotalServices()).append("\n");
            preview.append("• Terminés: ").append(currentData.getCompletedServices()).append("\n");
            preview.append("• Taux de réussite: ").append(
                String.format("%.1f%%", (double) currentData.getCompletedServices() / currentData.getTotalServices() * 100)).append("\n");
            preview.append("• Revenus services: ").append(
                String.format("%.2f €", currentData.getServices().stream().mapToDouble(s -> s.getPrice()).sum())).append("\n\n");
        }
        
        if (includeAnalyticsCheckBox.isSelected() && currentData.getAnalytics() != null) {
            preview.append("ANALYTICS\n");
            preview.append("-".repeat(40)).append("\n");
            
            if (currentData.getAnalytics().getTopMerchants() != null) {
                preview.append("Top 3 commerçants:\n");
                currentData.getAnalytics().getTopMerchants().stream()
                    .limit(3)
                    .forEach(m -> preview.append("  • ").append(m.getCompanyName())
                        .append(" (").append(String.format("%.2f €", m.getTotalRevenue())).append(")\n"));
                preview.append("\n");
            }
            
            if (currentData.getAnalytics().getTopServices() != null) {
                preview.append("Top 3 services:\n");
                currentData.getAnalytics().getTopServices().stream()
                    .limit(3)
                    .forEach(s -> preview.append("  • ").append(s.getServiceName())
                        .append(" (").append(s.getTotalBookings()).append(" réservations)\n"));
                preview.append("\n");
            }
        }
        
        if (includeChartsCheckBox.isSelected()) {
            preview.append("GRAPHIQUES\n");
            preview.append("-".repeat(40)).append("\n");
            preview.append("• Évolution des revenus par mois\n");
            preview.append("• Répartition des livraisons par type\n");
            preview.append("• Services par catégorie\n");
            preview.append("• Clients par région\n");
            preview.append("• Taux de satisfaction\n\n");
        }
        
        // Pied de page
        preview.append("=".repeat(80)).append("\n");
        preview.append("Fin du rapport - EcoDeli Analytics").append("\n");
        preview.append("=".repeat(80));
        
        reportPreviewArea.setText(preview.toString());
    }
    
    /**
     * Génère un rapport PDF
     */
    private void generatePdfReport() {
        if (currentData == null) {
            showError("Erreur", "Aucune donnée disponible. Veuillez d'abord charger les données.");
            return;
        }
        
        FileChooser fileChooser = new FileChooser();
        fileChooser.setTitle("Enregistrer le rapport PDF");
        fileChooser.getExtensionFilters().add(
            new FileChooser.ExtensionFilter("Fichiers PDF", "*.pdf"));
        fileChooser.setInitialFileName("rapport_ecodeli_" + 
            LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ".pdf");
        
        File file = fileChooser.showSaveDialog(reportsVBox.getScene().getWindow());
        if (file != null) {
            generatePdfReportAsync(file);
        }
    }
    
    /**
     * Génère le rapport PDF de façon asynchrone
     */
    private void generatePdfReportAsync(File file) {
        showLoading(true, "Génération du rapport PDF...");
        
        Task<Boolean> generateTask = new Task<Boolean>() {
            @Override
            protected Boolean call() throws Exception {
                return pdfGenerator.generateReport(
                    currentData,
                    file.getAbsolutePath(),
                    reportTypeComboBox.getValue(),
                    startDatePicker.getValue(),
                    endDatePicker.getValue(),
                    includeMerchantsCheckBox.isSelected(),
                    includeDeliveriesCheckBox.isSelected(),
                    includeServicesCheckBox.isSelected(),
                    includeChartsCheckBox.isSelected(),
                    includeAnalyticsCheckBox.isSelected()
                );
            }
            
            @Override
            protected void succeeded() {
                Platform.runLater(() -> {
                    showLoading(false, "Rapport PDF généré avec succès");
                    showInfo("Succès", "Le rapport PDF a été généré avec succès:\n" + file.getAbsolutePath());
                });
            }
            
            @Override
            protected void failed() {
                Platform.runLater(() -> {
                    showLoading(false, "Erreur lors de la génération");
                    showError("Erreur", "Impossible de générer le rapport PDF: " + getException().getMessage());
                });
            }
        };
        
        Thread generateThread = new Thread(generateTask);
        generateThread.setDaemon(true);
        generateThread.start();
    }
    
    /**
     * Génère un rapport CSV
     */
    private void generateCsvReport() {
        showInfo("CSV", "Génération de rapports CSV (à implémenter)");
    }
    
    /**
     * Génère un rapport Excel
     */
    private void generateExcelReport() {
        showInfo("Excel", "Génération de rapports Excel (à implémenter)");
    }
    
    /**
     * Affiche/masque l'indicateur de chargement
     */
    private void showLoading(boolean show, String message) {
        loadingIndicator.setVisible(show);
        statusLabel.setText(message);
        generatePdfButton.setDisable(show);
        generateCsvButton.setDisable(show);
        generateExcelButton.setDisable(show);
        refreshDataButton.setDisable(show);
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
    
    /**
     * Retourne la vue des rapports
     */
    public Node getView() {
        return reportsVBox;
    }
}