package com.ecodeli.desktop.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Client HTTP pour communiquer avec l'API tRPC d'EcoDeli
 */
public class TrpcClient {
    private static final Logger logger = LoggerFactory.getLogger(TrpcClient.class);
    
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final int TIMEOUT_SECONDS = 30;
    
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    
    /**
     * Constructeur avec URL de base personnalisée
     */
    public TrpcClient(String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        
        // Configuration OkHttp avec timeouts et logging
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .addInterceptor(new HttpLoggingInterceptor(logger::debug)
                .setLevel(HttpLoggingInterceptor.Level.BODY))
            .build();
        
        // Configuration Jackson pour JSON
        this.objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }
    
    /**
     * Constructeur par défaut avec URL localhost
     */
    public TrpcClient() {
        this("http://localhost:3000");
    }
    
    /**
     * Effectue un appel tRPC synchrone
     * 
     * @param procedure Nom de la procédure tRPC (ex: "admin.dashboard.getMetrics")
     * @param input Données d'entrée (peut être null)
     * @param responseType Type de la réponse attendue
     * @return Objet de réponse désérialisé
     */
    public <T> T call(String procedure, Object input, Class<T> responseType) throws IOException {
        logger.debug("📡 Appel tRPC: {} avec input: {}", procedure, input);
        
        try {
            // Construire l'URL
            String url = baseUrl + "api/trpc/" + procedure;
            
            // Construire le body JSON selon le format tRPC
            ObjectNode requestBody = objectMapper.createObjectNode();
            if (input != null) {
                JsonNode inputNode = objectMapper.valueToTree(input);
                requestBody.set("json", inputNode);
            } else {
                requestBody.putObject("json");
            }
            
            // Créer la requête HTTP
            Request request = new Request.Builder()
                .url(url)
                .post(RequestBody.create(requestBody.toString(), JSON))
                .addHeader("Content-Type", "application/json")
                .build();
            
            // Exécuter la requête
            try (Response response = httpClient.newCall(request).execute()) {
                if (!response.isSuccessful()) {
                    throw new IOException("Erreur HTTP " + response.code() + ": " + response.message());
                }
                
                ResponseBody responseBody = response.body();
                if (responseBody == null) {
                    throw new IOException("Réponse vide du serveur");
                }
                
                String responseStr = responseBody.string();
                logger.debug("📨 Réponse tRPC: {}", responseStr);
                
                // Parser la réponse tRPC
                JsonNode responseJson = objectMapper.readTree(responseStr);
                
                // Vérifier s'il y a une erreur
                if (responseJson.has("error")) {
                    JsonNode error = responseJson.get("error");
                    String errorMessage = error.has("message") ? 
                        error.get("message").asText() : "Erreur inconnue";
                    throw new TrpcException(errorMessage, error);
                }
                
                // Extraire les données du résultat
                JsonNode result = responseJson.get("result");
                if (result == null) {
                    throw new IOException("Pas de résultat dans la réponse tRPC");
                }
                
                JsonNode data = result.get("data");
                if (data == null) {
                    throw new IOException("Pas de données dans le résultat tRPC");
                }
                
                // Désérialiser vers le type attendu
                T resultObject = objectMapper.treeToValue(data, responseType);
                logger.debug("✅ Appel tRPC réussi pour {}", procedure);
                
                return resultObject;
            }
            
        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'appel tRPC {}: {}", procedure, e.getMessage());
            throw new IOException("Erreur tRPC: " + e.getMessage(), e);
        }
    }
    
    /**
     * Effectue un appel tRPC asynchrone
     */
    public <T> CompletableFuture<T> callAsync(String procedure, Object input, Class<T> responseType) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return call(procedure, input, responseType);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        });
    }
    
    /**
     * Teste la connectivité avec l'API
     */
    public boolean testConnection() {
        try {
            String url = baseUrl + "api/trpc/health";
            Request request = new Request.Builder()
                .url(url)
                .get()
                .build();
            
            try (Response response = httpClient.newCall(request).execute()) {
                boolean isConnected = response.isSuccessful();
                logger.info(isConnected ? 
                    "✅ Connexion API établie" : 
                    "❌ Échec de connexion API: " + response.code());
                return isConnected;
            }
        } catch (Exception e) {
            logger.warn("❌ Test de connexion échoué: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Ferme le client HTTP
     */
    public void shutdown() {
        httpClient.dispatcher().executorService().shutdown();
        httpClient.connectionPool().evictAll();
        logger.info("🔌 Client tRPC fermé");
    }
    
    /**
     * Exception spécifique aux erreurs tRPC
     */
    public static class TrpcException extends IOException {
        private final JsonNode errorDetails;
        
        public TrpcException(String message, JsonNode errorDetails) {
            super(message);
            this.errorDetails = errorDetails;
        }
        
        public JsonNode getErrorDetails() {
            return errorDetails;
        }
        
        public String getErrorCode() {
            return errorDetails.has("code") ? errorDetails.get("code").asText() : "UNKNOWN";
        }
    }
}