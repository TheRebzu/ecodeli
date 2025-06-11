package com.ecodeli.desktop.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Modèle représentant les données agrégées du dashboard
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class DashboardData {
    @JsonProperty("merchants")
    private List<Merchant> merchants;
    
    @JsonProperty("deliveries")
    private List<Delivery> deliveries;
    
    @JsonProperty("services")
    private List<Service> services;
    
    @JsonProperty("analytics")
    private Analytics analytics;
    
    @JsonProperty("lastUpdated")
    private LocalDateTime lastUpdated;
    
    // Constructeurs
    public DashboardData() {
        this.lastUpdated = LocalDateTime.now();
    }
    
    public DashboardData(List<Merchant> merchants, List<Delivery> deliveries, List<Service> services) {
        this.merchants = merchants;
        this.deliveries = deliveries;
        this.services = services;
        this.lastUpdated = LocalDateTime.now();
        this.analytics = new Analytics();
    }
    
    // Getters et Setters
    public List<Merchant> getMerchants() {
        return merchants;
    }
    
    public void setMerchants(List<Merchant> merchants) {
        this.merchants = merchants;
    }
    
    public List<Delivery> getDeliveries() {
        return deliveries;
    }
    
    public void setDeliveries(List<Delivery> deliveries) {
        this.deliveries = deliveries;
    }
    
    public List<Service> getServices() {
        return services;
    }
    
    public void setServices(List<Service> services) {
        this.services = services;
    }
    
    public Analytics getAnalytics() {
        return analytics;
    }
    
    public void setAnalytics(Analytics analytics) {
        this.analytics = analytics;
    }
    
    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }
    
    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
    
    // Méthodes utilitaires
    public int getTotalMerchants() {
        return merchants != null ? merchants.size() : 0;
    }
    
    public int getTotalDeliveries() {
        return deliveries != null ? deliveries.size() : 0;
    }
    
    public int getTotalServices() {
        return services != null ? services.size() : 0;
    }
    
    public double getTotalRevenue() {
        double total = 0.0;
        if (merchants != null) {
            total += merchants.stream().mapToDouble(Merchant::getTotalRevenue).sum();
        }
        if (deliveries != null) {
            total += deliveries.stream().mapToDouble(Delivery::getPrice).sum();
        }
        if (services != null) {
            total += services.stream().mapToDouble(Service::getPrice).sum();
        }
        return total;
    }
    
    public long getCompletedDeliveries() {
        return deliveries != null ? 
            deliveries.stream().filter(Delivery::isCompleted).count() : 0;
    }
    
    public long getCompletedServices() {
        return services != null ? 
            services.stream().filter(Service::isCompleted).count() : 0;
    }
    
    public double getAverageDeliveryRating() {
        if (deliveries == null || deliveries.isEmpty()) {
            return 0.0;
        }
        
        return deliveries.stream()
            .filter(d -> d.getRating() != null)
            .mapToInt(Delivery::getRating)
            .average()
            .orElse(0.0);
    }
    
    public double getAverageServiceRating() {
        if (services == null || services.isEmpty()) {
            return 0.0;
        }
        
        return services.stream()
            .filter(s -> s.getRating() != null)
            .mapToInt(Service::getRating)
            .average()
            .orElse(0.0);
    }
    
    @Override
    public String toString() {
        return String.format("DashboardData{merchants=%d, deliveries=%d, services=%d, revenue=%.2f}", 
            getTotalMerchants(), getTotalDeliveries(), getTotalServices(), getTotalRevenue());
    }
    
    /**
     * Classe interne pour les analytics détaillées
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Analytics {
        @JsonProperty("revenueByMonth")
        private Map<String, Double> revenueByMonth;
        
        @JsonProperty("deliveriesByType")
        private Map<String, Integer> deliveriesByType;
        
        @JsonProperty("servicesByCategory")
        private Map<String, Integer> servicesByCategory;
        
        @JsonProperty("clientsByRegion")
        private Map<String, Integer> clientsByRegion;
        
        @JsonProperty("satisfactionRates")
        private Map<String, Double> satisfactionRates;
        
        @JsonProperty("topMerchants")
        private List<TopMerchant> topMerchants;
        
        @JsonProperty("topServices")
        private List<TopService> topServices;
        
        // Constructeurs
        public Analytics() {}
        
        // Getters et Setters
        public Map<String, Double> getRevenueByMonth() {
            return revenueByMonth;
        }
        
        public void setRevenueByMonth(Map<String, Double> revenueByMonth) {
            this.revenueByMonth = revenueByMonth;
        }
        
        public Map<String, Integer> getDeliveriesByType() {
            return deliveriesByType;
        }
        
        public void setDeliveriesByType(Map<String, Integer> deliveriesByType) {
            this.deliveriesByType = deliveriesByType;
        }
        
        public Map<String, Integer> getServicesByCategory() {
            return servicesByCategory;
        }
        
        public void setServicesByCategory(Map<String, Integer> servicesByCategory) {
            this.servicesByCategory = servicesByCategory;
        }
        
        public Map<String, Integer> getClientsByRegion() {
            return clientsByRegion;
        }
        
        public void setClientsByRegion(Map<String, Integer> clientsByRegion) {
            this.clientsByRegion = clientsByRegion;
        }
        
        public Map<String, Double> getSatisfactionRates() {
            return satisfactionRates;
        }
        
        public void setSatisfactionRates(Map<String, Double> satisfactionRates) {
            this.satisfactionRates = satisfactionRates;
        }
        
        public List<TopMerchant> getTopMerchants() {
            return topMerchants;
        }
        
        public void setTopMerchants(List<TopMerchant> topMerchants) {
            this.topMerchants = topMerchants;
        }
        
        public List<TopService> getTopServices() {
            return topServices;
        }
        
        public void setTopServices(List<TopService> topServices) {
            this.topServices = topServices;
        }
    }
    
    /**
     * Classe pour les top merchants
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TopMerchant {
        @JsonProperty("merchantId")
        private String merchantId;
        
        @JsonProperty("companyName")
        private String companyName;
        
        @JsonProperty("totalRevenue")
        private double totalRevenue;
        
        @JsonProperty("totalOrders")
        private int totalOrders;
        
        @JsonProperty("loyaltyScore")
        private double loyaltyScore;
        
        // Constructeurs
        public TopMerchant() {}
        
        public TopMerchant(String merchantId, String companyName, double totalRevenue, 
                          int totalOrders, double loyaltyScore) {
            this.merchantId = merchantId;
            this.companyName = companyName;
            this.totalRevenue = totalRevenue;
            this.totalOrders = totalOrders;
            this.loyaltyScore = loyaltyScore;
        }
        
        // Getters et Setters
        public String getMerchantId() {
            return merchantId;
        }
        
        public void setMerchantId(String merchantId) {
            this.merchantId = merchantId;
        }
        
        public String getCompanyName() {
            return companyName;
        }
        
        public void setCompanyName(String companyName) {
            this.companyName = companyName;
        }
        
        public double getTotalRevenue() {
            return totalRevenue;
        }
        
        public void setTotalRevenue(double totalRevenue) {
            this.totalRevenue = totalRevenue;
        }
        
        public int getTotalOrders() {
            return totalOrders;
        }
        
        public void setTotalOrders(int totalOrders) {
            this.totalOrders = totalOrders;
        }
        
        public double getLoyaltyScore() {
            return loyaltyScore;
        }
        
        public void setLoyaltyScore(double loyaltyScore) {
            this.loyaltyScore = loyaltyScore;
        }
    }
    
    /**
     * Classe pour les top services
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TopService {
        @JsonProperty("serviceType")
        private String serviceType;
        
        @JsonProperty("serviceName")
        private String serviceName;
        
        @JsonProperty("totalBookings")
        private int totalBookings;
        
        @JsonProperty("averageRating")
        private double averageRating;
        
        @JsonProperty("totalRevenue")
        private double totalRevenue;
        
        // Constructeurs
        public TopService() {}
        
        public TopService(String serviceType, String serviceName, int totalBookings, 
                         double averageRating, double totalRevenue) {
            this.serviceType = serviceType;
            this.serviceName = serviceName;
            this.totalBookings = totalBookings;
            this.averageRating = averageRating;
            this.totalRevenue = totalRevenue;
        }
        
        // Getters et Setters
        public String getServiceType() {
            return serviceType;
        }
        
        public void setServiceType(String serviceType) {
            this.serviceType = serviceType;
        }
        
        public String getServiceName() {
            return serviceName;
        }
        
        public void setServiceName(String serviceName) {
            this.serviceName = serviceName;
        }
        
        public int getTotalBookings() {
            return totalBookings;
        }
        
        public void setTotalBookings(int totalBookings) {
            this.totalBookings = totalBookings;
        }
        
        public double getAverageRating() {
            return averageRating;
        }
        
        public void setAverageRating(double averageRating) {
            this.averageRating = averageRating;
        }
        
        public double getTotalRevenue() {
            return totalRevenue;
        }
        
        public void setTotalRevenue(double totalRevenue) {
            this.totalRevenue = totalRevenue;
        }
    }
}