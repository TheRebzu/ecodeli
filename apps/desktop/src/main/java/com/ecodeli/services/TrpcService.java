package com.ecodeli.services;

import com.ecodeli.config.AppConfig;
import com.ecodeli.models.ReportData;
import com.ecodeli.models.UserStatistics;
import com.ecodeli.models.DeliveryStatistics;
import com.ecodeli.models.FinancialStatistics;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.HttpEntity;
import org.apache.hc.core5.http.ParseException;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service de communication avec l'API tRPC du backend
 * Gère toutes les interactions avec le serveur EcoDeli
 */
public class TrpcService implements AutoCloseable {
    
    private static final Logger logger = LoggerFactory.getLogger(TrpcService.class);
    
    private final AppConfig config;
    private final CloseableHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    
    public TrpcService(AppConfig config) {
        this.config = config;
        this.baseUrl = config.getBackendUrl() + "/api/trpc";
        
        // Configuration du client HTTP
        this.httpClient = HttpClients.createDefault();
        
        // Configuration de l'ObjectMapper pour JSON
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        
        logger.info("Service tRPC initialisé avec l'URL: {}", baseUrl);
    }
    
    /**
     * Test de connexion au backend
     */
    public boolean testConnection() {
        try {
            logger.debug("Test de connexion au backend...");
            
            HttpGet request = new HttpGet(baseUrl + "/health");
            addAuthHeaders(request);
            
            try (CloseableHttpResponse response = httpClient.execute(request)) {
                int statusCode = response.getCode();
                boolean isConnected = statusCode == 200;
                
                logger.info("Test de connexion: {} (status: {})", 
                    isConnected ? "Succès" : "Échec", statusCode);
                
                return isConnected;
            }
            
        } catch (Exception e) {
            logger.error("Erreur lors du test de connexion", e);
            return false;
        }
    }
    
    /**
     * Récupère les statistiques utilisateurs pour les rapports
     */
    public UserStatistics getUserStatistics(LocalDate startDate, LocalDate endDate) throws Exception {
        logger.debug("Récupération des statistiques utilisateurs: {} à {}", startDate, endDate);
        
        Map<String, Object> params = new HashMap<>();
        params.put("startDate", startDate.toString());
        params.put("endDate", endDate.toString());
        
        JsonNode response = executeQuery("admin.getUserStatistics", params);
        return objectMapper.treeToValue(response.get("result").get("data"), UserStatistics.class);
    }
    
    /**
     * Récupère les statistiques de livraisons
     */
    public DeliveryStatistics getDeliveryStatistics(LocalDate startDate, LocalDate endDate) throws Exception {
        logger.debug("Récupération des statistiques de livraisons: {} à {}", startDate, endDate);
        
        Map<String, Object> params = new HashMap<>();
        params.put("startDate", startDate.toString());
        params.put("endDate", endDate.toString());
        
        JsonNode response = executeQuery("admin.getDeliveryStatistics", params);
        return objectMapper.treeToValue(response.get("result").get("data"), DeliveryStatistics.class);
    }
    
    /**
     * Récupère les statistiques financières
     */
    public FinancialStatistics getFinancialStatistics(LocalDate startDate, LocalDate endDate) throws Exception {
        logger.debug("Récupération des statistiques financières: {} à {}", startDate, endDate);
        
        Map<String, Object> params = new HashMap<>();
        params.put("startDate", startDate.toString());
        params.put("endDate", endDate.toString());
        
        JsonNode response = executeQuery("admin.getFinancialStatistics", params);
        return objectMapper.treeToValue(response.get("result").get("data"), FinancialStatistics.class);
    }
    
    /**
     * Récupère toutes les données nécessaires pour un rapport complet
     */
    public ReportData getCompleteReportData(LocalDate startDate, LocalDate endDate) throws Exception {
        logger.info("Récupération des données complètes de rapport: {} à {}", startDate, endDate);
        
        ReportData reportData = new ReportData();
        reportData.setGenerationDate(LocalDateTime.now());
        reportData.setStartDate(startDate);
        reportData.setEndDate(endDate);
        
        try {
            // Récupération parallèle des différentes statistiques
            reportData.setUserStatistics(getUserStatistics(startDate, endDate));
            reportData.setDeliveryStatistics(getDeliveryStatistics(startDate, endDate));
            reportData.setFinancialStatistics(getFinancialStatistics(startDate, endDate));
            
            // Génération de données de test si nécessaire pour atteindre le minimum requis
            ensureMinimumTestData(reportData);
            
            logger.info("Données de rapport récupérées avec succès");
            return reportData;
            
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des données de rapport", e);
            throw new Exception("Impossible de récupérer les données de rapport", e);
        }
    }
    
    /**
     * Récupère les données pour le data mining
     */
    public List<Map<String, Object>> getDataMiningDataset(String dataType, int limit) throws Exception {
        logger.debug("Récupération du dataset pour data mining: type={}, limit={}", dataType, limit);
        
        Map<String, Object> params = new HashMap<>();
        params.put("dataType", dataType);
        params.put("limit", limit);
        
        JsonNode response = executeQuery("admin.getDataMiningDataset", params);
        
        List<Map<String, Object>> dataset = new ArrayList<>();
        JsonNode dataArray = response.get("result").get("data");
        
        for (JsonNode item : dataArray) {
            Map<String, Object> dataPoint = objectMapper.convertValue(item, Map.class);
            dataset.add(dataPoint);
        }
        
        logger.info("Dataset récupéré: {} enregistrements", dataset.size());
        return dataset;
    }
    
    /**
     * Exécute une requête tRPC
     */
    private JsonNode executeQuery(String procedure, Map<String, Object> params) throws Exception {
        try {
            String url = baseUrl + "/" + procedure;
            
            // Sérialisation des paramètres
            String jsonParams = objectMapper.writeValueAsString(params);
            
            // Construction de l'URL avec paramètres
            if (!params.isEmpty()) {
                String encodedParams = URLEncoder.encode(jsonParams, StandardCharsets.UTF_8);
                url += "?input=" + encodedParams;
            }
            
            HttpGet request = new HttpGet(url);
            addAuthHeaders(request);
            
            try (CloseableHttpResponse response = httpClient.execute(request)) {
                int statusCode = response.getCode();
                HttpEntity entity = response.getEntity();
                String responseBody = EntityUtils.toString(entity);
                
                if (statusCode != 200) {
                    throw new IOException("Erreur HTTP " + statusCode + ": " + responseBody);
                }
                
                JsonNode jsonResponse = objectMapper.readTree(responseBody);
                
                // Vérification des erreurs tRPC
                if (jsonResponse.has("error")) {
                    JsonNode error = jsonResponse.get("error");
                    throw new Exception("Erreur tRPC: " + error.get("message").asText());
                }
                
                return jsonResponse;
            }
            
        } catch (IOException | ParseException e) {
            logger.error("Erreur lors de l'exécution de la requête tRPC: {}", procedure, e);
            throw new Exception("Erreur de communication avec le backend", e);
        }
    }
    
    /**
     * Ajoute les en-têtes d'authentification
     */
    private void addAuthHeaders(HttpGet request) {
        request.setHeader("Authorization", "Bearer " + config.getBackendApiKey());
        request.setHeader("Content-Type", "application/json");
        request.setHeader("User-Agent", "EcoDeli-Desktop/1.0.0");
    }
    
    /**
     * S'assure qu'il y a suffisamment de données de test
     */
    private void ensureMinimumTestData(ReportData reportData) {
        int minRecords = config.getMinTestRecords();
        
        // Générer des données de test supplémentaires si nécessaire
        if (reportData.getUserStatistics().getTotalUsers() < minRecords) {
            logger.info("Génération de données de test supplémentaires pour atteindre {} enregistrements", minRecords);
            generateTestData(reportData, minRecords);
        }
    }
    
    /**
     * Génère des données de test pour compléter le minimum requis
     */
    private void generateTestData(ReportData reportData, int minRecords) {
        // TODO: Implémenter la génération de données de test réalistes
        logger.debug("Génération de {} enregistrements de test", minRecords);
        
        // Cette méthode peut être utilisée pour générer des données fictives
        // pour s'assurer que le rapport contient au minimum 30 enregistrements par type
    }
    
    /**
     * Récupère les métriques système pour monitoring
     */
    public Map<String, Object> getSystemMetrics() throws Exception {
        logger.debug("Récupération des métriques système");
        
        JsonNode response = executeQuery("admin.getSystemMetrics", new HashMap<>());
        return objectMapper.convertValue(response.get("result").get("data"), Map.class);
    }
    
    /**
     * Valide la connectivité et les permissions
     */
    public boolean validateAccess() {
        try {
            executeQuery("admin.validateAccess", new HashMap<>());
            return true;
        } catch (Exception e) {
            logger.warn("Validation d'accès échouée", e);
            return false;
        }
    }
    
    @Override
    public void close() throws Exception {
        if (httpClient != null) {
            httpClient.close();
            logger.info("Client HTTP fermé");
        }
    }
}