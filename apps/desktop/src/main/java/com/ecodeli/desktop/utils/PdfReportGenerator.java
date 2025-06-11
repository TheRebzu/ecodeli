package com.ecodeli.desktop.utils;

import com.ecodeli.desktop.api.models.DashboardData;
import com.ecodeli.desktop.api.models.Delivery;
import com.ecodeli.desktop.api.models.Merchant;
import com.ecodeli.desktop.api.models.Service;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.awt.*;
import java.io.IOException;
import java.text.DecimalFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Générateur de rapports PDF pour EcoDeli
 */
public class PdfReportGenerator {
    private static final Logger logger = LoggerFactory.getLogger(PdfReportGenerator.class);
    
    // Constantes de mise en page
    private static final float MARGIN = 50;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT = PDRectangle.A4.getHeight();
    private static final float CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
    
    // Polices
    private static final PDType1Font FONT_TITLE = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDType1Font FONT_HEADING = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
    private static final PDType1Font FONT_NORMAL = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    private static final PDType1Font FONT_SMALL = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
    
    // Tailles de police
    private static final int FONT_SIZE_TITLE = 20;
    private static final int FONT_SIZE_HEADING = 16;
    private static final int FONT_SIZE_SUBHEADING = 14;
    private static final int FONT_SIZE_NORMAL = 12;
    private static final int FONT_SIZE_SMALL = 10;
    
    // Formatters
    private static final DecimalFormat CURRENCY_FORMAT = new DecimalFormat("#,##0.00 €");
    private static final DecimalFormat NUMBER_FORMAT = new DecimalFormat("#,##0");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    
    // Couleurs
    private static final Color PRIMARY_COLOR = new Color(46, 139, 87); // #2E8B57
    private static final Color SECONDARY_COLOR = new Color(108, 117, 125); // #6C757D
    private static final Color LIGHT_GRAY = new Color(248, 249, 250); // #F8F9FA
    
    /**
     * Génère un rapport PDF complet
     */
    public boolean generateReport(DashboardData data, String filePath, String reportType,
                                LocalDate startDate, LocalDate endDate,
                                boolean includeMerchants, boolean includeDeliveries, 
                                boolean includeServices, boolean includeCharts, 
                                boolean includeAnalytics) {
        
        logger.info("🎯 Génération du rapport PDF: {}", filePath);
        
        try (PDDocument document = new PDDocument()) {
            // Page de couverture
            generateCoverPage(document, reportType, startDate, endDate);
            
            // Résumé exécutif
            generateExecutiveSummary(document, data);
            
            // Sections conditionnelles
            if (includeMerchants && data.getMerchants() != null) {
                generateMerchantsSection(document, data.getMerchants());
            }
            
            if (includeDeliveries && data.getDeliveries() != null) {
                generateDeliveriesSection(document, data.getDeliveries());
            }
            
            if (includeServices && data.getServices() != null) {
                generateServicesSection(document, data.getServices());
            }
            
            if (includeAnalytics && data.getAnalytics() != null) {
                generateAnalyticsSection(document, data.getAnalytics());
            }
            
            if (includeCharts) {
                generateChartsSection(document, data);
            }
            
            // Annexes
            generateAppendices(document, data);
            
            // Sauvegarde
            document.save(filePath);
            logger.info("✅ Rapport PDF généré avec succès: {}", filePath);
            return true;
            
        } catch (IOException e) {
            logger.error("❌ Erreur lors de la génération du PDF", e);
            return false;
        }
    }
    
    /**
     * Génère la page de couverture
     */
    private void generateCoverPage(PDDocument document, String reportType, 
                                 LocalDate startDate, LocalDate endDate) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN - 100;
            
            // Logo/Titre principal
            contentStream.setFont(FONT_TITLE, 28);
            contentStream.setNonStrokingColor(PRIMARY_COLOR);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("EcoDeli");
            contentStream.endText();
            
            yPosition -= 40;
            contentStream.setFont(FONT_HEADING, 24);
            contentStream.setNonStrokingColor(Color.BLACK);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Dashboard Analytics");
            contentStream.endText();
            
            yPosition -= 80;
            
            // Type de rapport
            contentStream.setFont(FONT_HEADING, FONT_SIZE_HEADING);
            contentStream.setNonStrokingColor(PRIMARY_COLOR);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText(reportType);
            contentStream.endText();
            
            yPosition -= 60;
            
            // Période
            contentStream.setFont(FONT_NORMAL, FONT_SIZE_NORMAL);
            contentStream.setNonStrokingColor(Color.BLACK);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Période: " + startDate.format(DATE_FORMAT) + 
                                 " - " + endDate.format(DATE_FORMAT));
            contentStream.endText();
            
            yPosition -= 30;
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Généré le: " + LocalDate.now().format(DATE_FORMAT));
            contentStream.endText();
            
            // Pied de page
            contentStream.setFont(FONT_SMALL, FONT_SIZE_SMALL);
            contentStream.setNonStrokingColor(SECONDARY_COLOR);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, 50);
            contentStream.showText("Rapport généré automatiquement par EcoDeli Desktop Analytics");
            contentStream.endText();
        }
    }
    
    /**
     * Génère le résumé exécutif
     */
    private void generateExecutiveSummary(PDDocument document, DashboardData data) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            // Titre de la section
            yPosition = drawSectionTitle(contentStream, "RÉSUMÉ EXÉCUTIF", yPosition);
            yPosition -= 30;
            
            // Métriques principales
            yPosition = drawKeyMetric(contentStream, "Commerçants totaux", 
                NUMBER_FORMAT.format(data.getTotalMerchants()), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Livraisons totales", 
                NUMBER_FORMAT.format(data.getTotalDeliveries()), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Services totaux", 
                NUMBER_FORMAT.format(data.getTotalServices()), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Revenus totaux", 
                CURRENCY_FORMAT.format(data.getTotalRevenue()), yPosition);
            
            yPosition -= 20;
            
            // Indicateurs de performance
            yPosition = drawSubheading(contentStream, "Indicateurs de Performance", yPosition);
            yPosition -= 20;
            
            double deliverySuccessRate = data.getTotalDeliveries() > 0 ? 
                (double) data.getCompletedDeliveries() / data.getTotalDeliveries() * 100 : 0;
            
            double serviceSuccessRate = data.getTotalServices() > 0 ? 
                (double) data.getCompletedServices() / data.getTotalServices() * 100 : 0;
            
            yPosition = drawKeyMetric(contentStream, "Taux de réussite livraisons", 
                String.format("%.1f%%", deliverySuccessRate), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Taux de réussite services", 
                String.format("%.1f%%", serviceSuccessRate), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Note moyenne livraisons", 
                String.format("%.1f/5", data.getAverageDeliveryRating()), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Note moyenne services", 
                String.format("%.1f/5", data.getAverageServiceRating()), yPosition);
        }
    }
    
    /**
     * Génère la section des commerçants
     */
    private void generateMerchantsSection(PDDocument document, List<Merchant> merchants) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            yPosition = drawSectionTitle(contentStream, "ANALYSE DES COMMERÇANTS", yPosition);
            yPosition -= 30;
            
            // Statistiques générales
            int totalMerchants = merchants.size();
            int activeMerchants = (int) merchants.stream().filter(Merchant::isActive).count();
            double totalRevenue = merchants.stream().mapToDouble(Merchant::getTotalRevenue).sum();
            double avgRevenue = totalRevenue / totalMerchants;
            
            yPosition = drawKeyMetric(contentStream, "Nombre total de commerçants", 
                NUMBER_FORMAT.format(totalMerchants), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Commerçants actifs", 
                NUMBER_FORMAT.format(activeMerchants), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Revenus moyens par commerçant", 
                CURRENCY_FORMAT.format(avgRevenue), yPosition);
            
            yPosition -= 20;
            
            // Top 5 commerçants
            yPosition = drawSubheading(contentStream, "Top 5 Commerçants par Chiffre d'Affaires", yPosition);
            yPosition -= 20;
            
            merchants.stream()
                .sorted((m1, m2) -> Double.compare(m2.getTotalRevenue(), m1.getTotalRevenue()))
                .limit(5)
                .forEach(merchant -> {
                    try {
                        float currentY = drawMerchantLine(contentStream, merchant, yPosition);
                    } catch (IOException e) {
                        logger.error("Erreur lors de l'écriture d'une ligne commerçant", e);
                    }
                });
        }
    }
    
    /**
     * Génère la section des livraisons
     */
    private void generateDeliveriesSection(PDDocument document, List<Delivery> deliveries) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            yPosition = drawSectionTitle(contentStream, "ANALYSE DES LIVRAISONS", yPosition);
            yPosition -= 30;
            
            // Statistiques des livraisons
            int totalDeliveries = deliveries.size();
            long completedDeliveries = deliveries.stream().filter(Delivery::isCompleted).count();
            double totalDeliveryRevenue = deliveries.stream().mapToDouble(Delivery::getPrice).sum();
            double avgDistance = deliveries.stream().mapToDouble(Delivery::getDistance).average().orElse(0);
            
            yPosition = drawKeyMetric(contentStream, "Livraisons totales", 
                NUMBER_FORMAT.format(totalDeliveries), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Livraisons terminées", 
                NUMBER_FORMAT.format(completedDeliveries), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Revenus des livraisons", 
                CURRENCY_FORMAT.format(totalDeliveryRevenue), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Distance moyenne", 
                String.format("%.1f km", avgDistance), yPosition);
            
            yPosition -= 20;
            
            // Répartition par type
            yPosition = drawSubheading(contentStream, "Répartition par Type de Livraison", yPosition);
            yPosition -= 15;
            
            deliveries.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                    d -> d.getType() != null ? d.getType().getDisplayName() : "Non défini",
                    java.util.stream.Collectors.counting()))
                .entrySet().stream()
                .sorted(java.util.Map.Entry.<String, Long>comparingByValue().reversed())
                .forEach(entry -> {
                    try {
                        float currentY = drawSimpleLine(contentStream, entry.getKey(), 
                            NUMBER_FORMAT.format(entry.getValue()), yPosition);
                    } catch (IOException e) {
                        logger.error("Erreur lors de l'écriture d'une ligne de livraison", e);
                    }
                });
        }
    }
    
    /**
     * Génère la section des services
     */
    private void generateServicesSection(PDDocument document, List<Service> services) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            yPosition = drawSectionTitle(contentStream, "ANALYSE DES SERVICES", yPosition);
            yPosition -= 30;
            
            // Statistiques des services
            int totalServices = services.size();
            long completedServices = services.stream().filter(Service::isCompleted).count();
            double totalServiceRevenue = services.stream().mapToDouble(Service::getPrice).sum();
            double avgDuration = services.stream().mapToInt(Service::getDuration).average().orElse(0);
            
            yPosition = drawKeyMetric(contentStream, "Services totaux", 
                NUMBER_FORMAT.format(totalServices), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Services terminés", 
                NUMBER_FORMAT.format(completedServices), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Revenus des services", 
                CURRENCY_FORMAT.format(totalServiceRevenue), yPosition);
            
            yPosition = drawKeyMetric(contentStream, "Durée moyenne", 
                String.format("%.0f minutes", avgDuration), yPosition);
            
            yPosition -= 20;
            
            // Répartition par catégorie
            yPosition = drawSubheading(contentStream, "Répartition par Catégorie de Service", yPosition);
            yPosition -= 15;
            
            services.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                    s -> s.getCategory() != null ? s.getCategory().getDisplayName() : "Non défini",
                    java.util.stream.Collectors.counting()))
                .entrySet().stream()
                .sorted(java.util.Map.Entry.<String, Long>comparingByValue().reversed())
                .forEach(entry -> {
                    try {
                        float currentY = drawSimpleLine(contentStream, entry.getKey(), 
                            NUMBER_FORMAT.format(entry.getValue()), yPosition);
                    } catch (IOException e) {
                        logger.error("Erreur lors de l'écriture d'une ligne de service", e);
                    }
                });
        }
    }
    
    /**
     * Génère la section analytics
     */
    private void generateAnalyticsSection(PDDocument document, DashboardData.Analytics analytics) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            yPosition = drawSectionTitle(contentStream, "ANALYTICS AVANCÉS", yPosition);
            yPosition -= 30;
            
            // Top merchants
            if (analytics.getTopMerchants() != null && !analytics.getTopMerchants().isEmpty()) {
                yPosition = drawSubheading(contentStream, "Top Commerçants", yPosition);
                yPosition -= 15;
                
                analytics.getTopMerchants().stream()
                    .limit(5)
                    .forEach(merchant -> {
                        try {
                            float currentY = drawSimpleLine(contentStream, merchant.getCompanyName(), 
                                CURRENCY_FORMAT.format(merchant.getTotalRevenue()), yPosition);
                        } catch (IOException e) {
                            logger.error("Erreur lors de l'écriture d'un top merchant", e);
                        }
                    });
                
                yPosition -= 20;
            }
            
            // Top services
            if (analytics.getTopServices() != null && !analytics.getTopServices().isEmpty()) {
                yPosition = drawSubheading(contentStream, "Top Services", yPosition);
                yPosition -= 15;
                
                analytics.getTopServices().stream()
                    .limit(5)
                    .forEach(service -> {
                        try {
                            float currentY = drawSimpleLine(contentStream, service.getServiceName(), 
                                NUMBER_FORMAT.format(service.getTotalBookings()) + " réservations", yPosition);
                        } catch (IOException e) {
                            logger.error("Erreur lors de l'écriture d'un top service", e);
                        }
                    });
            }
        }
    }
    
    /**
     * Génère la section des graphiques
     */
    private void generateChartsSection(PDDocument document, DashboardData data) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            yPosition = drawSectionTitle(contentStream, "GRAPHIQUES ET VISUALISATIONS", yPosition);
            yPosition -= 30;
            
            // Note: Dans une implémentation complète, ici on ajouterait
            // la génération d'images de graphiques avec JFreeChart
            
            contentStream.setFont(FONT_NORMAL, FONT_SIZE_NORMAL);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Les graphiques suivants sont disponibles dans l'interface:");
            contentStream.endText();
            
            yPosition -= 30;
            
            String[] chartDescriptions = {
                "• Évolution des revenus par mois",
                "• Répartition des livraisons par type",
                "• Services par catégorie",
                "• Clients par région",
                "• Taux de satisfaction"
            };
            
            for (String description : chartDescriptions) {
                contentStream.beginText();
                contentStream.newLineAtOffset(MARGIN + 20, yPosition);
                contentStream.showText(description);
                contentStream.endText();
                yPosition -= 20;
            }
        }
    }
    
    /**
     * Génère les annexes
     */
    private void generateAppendices(PDDocument document, DashboardData data) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        
        try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
            float yPosition = PAGE_HEIGHT - MARGIN;
            
            yPosition = drawSectionTitle(contentStream, "ANNEXES", yPosition);
            yPosition -= 30;
            
            // Méthodologie
            yPosition = drawSubheading(contentStream, "Méthodologie", yPosition);
            yPosition -= 15;
            
            String[] methodology = {
                "• Les données sont extraites en temps réel de la base de données EcoDeli",
                "• Les calculs de performance sont basés sur les transactions terminées",
                "• Les notes moyennes excluent les transactions non notées",
                "• Les revenus incluent tous les frais et commissions"
            };
            
            for (String point : methodology) {
                contentStream.setFont(FONT_SMALL, FONT_SIZE_SMALL);
                contentStream.beginText();
                contentStream.newLineAtOffset(MARGIN, yPosition);
                contentStream.showText(point);
                contentStream.endText();
                yPosition -= 15;
            }
            
            yPosition -= 20;
            
            // Informations techniques
            yPosition = drawSubheading(contentStream, "Informations Techniques", yPosition);
            yPosition -= 15;
            
            contentStream.setFont(FONT_SMALL, FONT_SIZE_SMALL);
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Rapport généré le: " + java.time.LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")));
            contentStream.endText();
            
            yPosition -= 15;
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Version de l'application: EcoDeli Desktop Analytics v1.0");
            contentStream.endText();
            
            yPosition -= 15;
            contentStream.beginText();
            contentStream.newLineAtOffset(MARGIN, yPosition);
            contentStream.showText("Contact: support@ecodeli.com");
            contentStream.endText();
        }
    }
    
    // Méthodes utilitaires pour le dessin
    
    private float drawSectionTitle(PDPageContentStream contentStream, String title, float yPosition) throws IOException {
        contentStream.setFont(FONT_HEADING, FONT_SIZE_HEADING);
        contentStream.setNonStrokingColor(PRIMARY_COLOR);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(title);
        contentStream.endText();
        
        // Ligne de séparation
        contentStream.setStrokingColor(PRIMARY_COLOR);
        contentStream.setLineWidth(2);
        contentStream.moveTo(MARGIN, yPosition - 5);
        contentStream.lineTo(MARGIN + 200, yPosition - 5);
        contentStream.stroke();
        
        return yPosition - 15;
    }
    
    private float drawSubheading(PDPageContentStream contentStream, String heading, float yPosition) throws IOException {
        contentStream.setFont(FONT_HEADING, FONT_SIZE_SUBHEADING);
        contentStream.setNonStrokingColor(Color.BLACK);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(heading);
        contentStream.endText();
        return yPosition - 20;
    }
    
    private float drawKeyMetric(PDPageContentStream contentStream, String label, String value, float yPosition) throws IOException {
        contentStream.setFont(FONT_NORMAL, FONT_SIZE_NORMAL);
        contentStream.setNonStrokingColor(Color.BLACK);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN, yPosition);
        contentStream.showText(label + ": ");
        contentStream.endText();
        
        contentStream.setFont(FONT_HEADING, FONT_SIZE_NORMAL);
        contentStream.setNonStrokingColor(PRIMARY_COLOR);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 200, yPosition);
        contentStream.showText(value);
        contentStream.endText();
        
        return yPosition - 20;
    }
    
    private float drawSimpleLine(PDPageContentStream contentStream, String label, String value, float yPosition) throws IOException {
        contentStream.setFont(FONT_NORMAL, FONT_SIZE_NORMAL);
        contentStream.setNonStrokingColor(Color.BLACK);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 20, yPosition);
        contentStream.showText(label + ": " + value);
        contentStream.endText();
        return yPosition - 15;
    }
    
    private float drawMerchantLine(PDPageContentStream contentStream, Merchant merchant, float yPosition) throws IOException {
        String line = String.format("%s - %s (%s commandes)", 
            merchant.getCompanyName(),
            CURRENCY_FORMAT.format(merchant.getTotalRevenue()),
            NUMBER_FORMAT.format(merchant.getTotalOrders()));
        
        contentStream.setFont(FONT_NORMAL, FONT_SIZE_NORMAL);
        contentStream.setNonStrokingColor(Color.BLACK);
        contentStream.beginText();
        contentStream.newLineAtOffset(MARGIN + 20, yPosition);
        contentStream.showText(line);
        contentStream.endText();
        return yPosition - 15;
    }
}