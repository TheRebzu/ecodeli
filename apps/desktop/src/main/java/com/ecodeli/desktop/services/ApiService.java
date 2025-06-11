package com.ecodeli.desktop.services;

import com.ecodeli.desktop.api.TrpcClient;
import com.ecodeli.desktop.api.models.DashboardData;
import com.ecodeli.desktop.api.models.Delivery;
import com.ecodeli.desktop.api.models.Merchant;
import com.ecodeli.desktop.api.models.Service;
import com.ecodeli.desktop.utils.DataGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Service principal pour la gestion des appels API
 */
public class ApiService {
    private static final Logger logger = LoggerFactory.getLogger(ApiService.class);
    
    private static ApiService instance;
    private final TrpcClient trpcClient;
    private final ExecutorService executorService;
    private final DataGenerator dataGenerator;
    
    private boolean isDemoMode = false;
    private DashboardData cachedData = null;
    
    /**
     * Constructeur privé pour le pattern Singleton
     */
    private ApiService() {
        // Initialiser le client tRPC avec l'URL de base
        String apiUrl = System.getProperty("api.base.url", "http://localhost:3000");
        this.trpcClient = new TrpcClient(apiUrl);
        
        // Créer un pool de threads pour les appels asynchrones
        this.executorService = Executors.newFixedThreadPool(5);
        
        // Initialiser le générateur de données de test
        this.dataGenerator = new DataGenerator();
        
        logger.info("🔧 ApiService initialisé avec URL: {}", apiUrl);
    }
    
    /**
     * Obtient l'instance singleton du service
     */
    public static synchronized ApiService getInstance() {
        if (instance == null) {
            instance = new ApiService();
        }
        return instance;
    }
    
    /**
     * Test la connexion à l'API
     */
    public boolean testConnection() {
        try {
            boolean connected = trpcClient.testConnection();
            if (!connected) {
                logger.warn("⚠️ Connexion API échouée - Passage en mode démo");
                setDemoMode(true);
            }
            return connected;
        } catch (Exception e) {
            logger.error("❌ Erreur lors du test de connexion", e);
            setDemoMode(true);
            return false;
        }
    }
    
    /**
     * Récupère toutes les données du dashboard
     */
    public CompletableFuture<DashboardData> getDashboardData() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (isDemoMode) {
                    logger.info("📊 Récupération des données en mode démo");
                    return generateDemoData();
                }
                
                logger.info("📊 Récupération des données depuis l'API...");
                
                // Récupérer les données en parallèle pour optimiser les performances
                CompletableFuture<List<Merchant>> merchantsFuture = getMerchantsAsync();
                CompletableFuture<List<Delivery>> deliveriesFuture = getDeliveriesAsync();
                CompletableFuture<List<Service>> servicesFuture = getServicesAsync();
                
                // Attendre que toutes les requêtes se terminent
                CompletableFuture.allOf(merchantsFuture, deliveriesFuture, servicesFuture).join();
                
                // Construire l'objet DashboardData
                DashboardData data = new DashboardData(
                    merchantsFuture.get(),
                    deliveriesFuture.get(),
                    servicesFuture.get()
                );
                
                // Mettre en cache les données
                cachedData = data;
                
                logger.info("✅ Données du dashboard récupérées avec succès");
                return data;
                
            } catch (Exception e) {
                logger.error("❌ Erreur lors de la récupération des données", e);
                
                // En cas d'erreur, basculer en mode démo
                logger.warn("🔄 Basculement vers les données de démonstration");
                setDemoMode(true);
                return generateDemoData();
            }
        }, executorService);
    }
    
    /**
     * Récupère la liste des commerçants de façon asynchrone
     */
    public CompletableFuture<List<Merchant>> getMerchantsAsync() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (isDemoMode) {
                    return dataGenerator.generateMerchants(35);
                }
                
                // Appel tRPC pour récupérer les commerçants
                List<Merchant> merchants = trpcClient.call("merchant.list", null, 
                    dataGenerator.getListType(Merchant.class));
                
                logger.debug("📋 {} commerçants récupérés", merchants.size());
                return merchants;
                
            } catch (IOException e) {
                logger.error("❌ Erreur lors de la récupération des commerçants", e);
                return dataGenerator.generateMerchants(35);
            }
        }, executorService);
    }
    
    /**
     * Récupère la liste des livraisons de façon asynchrone
     */
    public CompletableFuture<List<Delivery>> getDeliveriesAsync() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (isDemoMode) {
                    return dataGenerator.generateDeliveries(40);
                }
                
                // Appel tRPC pour récupérer les analytics de livraison
                List<Delivery> deliveries = trpcClient.call("delivery.analytics", null, 
                    dataGenerator.getListType(Delivery.class));
                
                logger.debug("🚚 {} livraisons récupérées", deliveries.size());
                return deliveries;
                
            } catch (IOException e) {
                logger.error("❌ Erreur lors de la récupération des livraisons", e);
                return dataGenerator.generateDeliveries(40);
            }
        }, executorService);
    }
    
    /**
     * Récupère la liste des services de façon asynchrone
     */
    public CompletableFuture<List<Service>> getServicesAsync() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (isDemoMode) {
                    return dataGenerator.generateServices(30);
                }
                
                // Appel tRPC pour récupérer les analytics de service
                List<Service> services = trpcClient.call("service.analytics", null, 
                    dataGenerator.getListType(Service.class));
                
                logger.debug("🔧 {} services récupérés", services.size());
                return services;
                
            } catch (IOException e) {
                logger.error("❌ Erreur lors de la récupération des services", e);
                return dataGenerator.generateServices(30);
            }
        }, executorService);
    }
    
    /**
     * Récupère un commerçant avec ses factures
     */
    public CompletableFuture<Merchant> getMerchantWithInvoices(String merchantId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (isDemoMode) {
                    return dataGenerator.generateMerchantWithInvoices(merchantId);
                }
                
                // Appel tRPC pour récupérer le commerçant avec factures
                Merchant merchant = trpcClient.call("merchant.getWithInvoices", 
                    new MerchantRequest(merchantId), Merchant.class);
                
                logger.debug("📊 Commerçant {} récupéré avec {} factures", 
                    merchantId, 
                    merchant.getInvoices() != null ? merchant.getInvoices().size() : 0);
                
                return merchant;
                
            } catch (IOException e) {
                logger.error("❌ Erreur lors de la récupération du commerçant {}", merchantId, e);
                return dataGenerator.generateMerchantWithInvoices(merchantId);
            }
        }, executorService);
    }
    
    /**
     * Rafraîchit les données en cache
     */
    public CompletableFuture<DashboardData> refreshData() {
        logger.info("🔄 Actualisation des données...");
        cachedData = null;
        return getDashboardData();
    }
    
    /**
     * Génère des données de démonstration
     */
    private DashboardData generateDemoData() {
        logger.info("🎭 Génération des données de démonstration...");
        
        DashboardData demoData = new DashboardData(
            dataGenerator.generateMerchants(35),
            dataGenerator.generateDeliveries(40),
            dataGenerator.generateServices(30)
        );
        
        // Générer les analytics
        demoData.setAnalytics(dataGenerator.generateAnalytics(demoData));
        
        logger.info("✅ Données de démonstration générées: {} commerçants, {} livraisons, {} services",
            demoData.getTotalMerchants(), demoData.getTotalDeliveries(), demoData.getTotalServices());
        
        return demoData;
    }
    
    /**
     * Obtient les données en cache ou les recharge
     */
    public DashboardData getCachedData() {
        if (cachedData == null) {
            try {
                return getDashboardData().get();
            } catch (Exception e) {
                logger.error("❌ Erreur lors du chargement des données", e);
                return generateDemoData();
            }
        }
        return cachedData;
    }
    
    /**
     * Vérifie si le service est en mode démo
     */
    public boolean isDemoMode() {
        return isDemoMode;
    }
    
    /**
     * Active ou désactive le mode démo
     */
    public void setDemoMode(boolean demoMode) {
        if (this.isDemoMode != demoMode) {
            this.isDemoMode = demoMode;
            this.cachedData = null; // Invalider le cache
            logger.info(demoMode ? 
                "🎭 Mode démo activé" : 
                "🌐 Mode API activé");
        }
    }
    
    /**
     * Ferme les ressources du service
     */
    public void shutdown() {
        logger.info("🔌 Fermeture du service API...");
        
        executorService.shutdown();
        if (trpcClient != null) {
            trpcClient.shutdown();
        }
        
        logger.info("✅ Service API fermé");
    }
    
    /**
     * Classe interne pour les requêtes de commerçant
     */
    private static class MerchantRequest {
        private final String merchantId;
        
        public MerchantRequest(String merchantId) {
            this.merchantId = merchantId;
        }
        
        public String getMerchantId() {
            return merchantId;
        }
    }
}