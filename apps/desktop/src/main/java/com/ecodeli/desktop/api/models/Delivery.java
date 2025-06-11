package com.ecodeli.desktop.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * Modèle représentant une livraison
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Delivery {
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("trackingNumber")
    private String trackingNumber;
    
    @JsonProperty("clientId")
    private String clientId;
    
    @JsonProperty("delivererId")
    private String delivererId;
    
    @JsonProperty("merchantId")
    private String merchantId;
    
    @JsonProperty("type")
    private DeliveryType type;
    
    @JsonProperty("status")
    private DeliveryStatus status;
    
    @JsonProperty("pickupAddress")
    private String pickupAddress;
    
    @JsonProperty("pickupCity")
    private String pickupCity;
    
    @JsonProperty("deliveryAddress")
    private String deliveryAddress;
    
    @JsonProperty("deliveryCity")
    private String deliveryCity;
    
    @JsonProperty("distance")
    private double distance; // en kilomètres
    
    @JsonProperty("packageContent")
    private String packageContent;
    
    @JsonProperty("packageSize")
    private PackageSize packageSize;
    
    @JsonProperty("weight")
    private double weight; // en kg
    
    @JsonProperty("fragile")
    private boolean fragile;
    
    @JsonProperty("priority")
    private Priority priority;
    
    @JsonProperty("price")
    private double price;
    
    @JsonProperty("currency")
    private String currency;
    
    @JsonProperty("createdDate")
    private LocalDateTime createdDate;
    
    @JsonProperty("pickupDate")
    private LocalDateTime pickupDate;
    
    @JsonProperty("deliveryDate")
    private LocalDateTime deliveryDate;
    
    @JsonProperty("estimatedDeliveryTime")
    private LocalDateTime estimatedDeliveryTime;
    
    @JsonProperty("actualDeliveryTime")
    private LocalDateTime actualDeliveryTime;
    
    @JsonProperty("rating")
    private Integer rating; // 1-5
    
    @JsonProperty("clientComment")
    private String clientComment;
    
    @JsonProperty("deliveryNotes")
    private String deliveryNotes;
    
    // Constructeurs
    public Delivery() {}
    
    public Delivery(String id, String trackingNumber, String clientId, 
                    DeliveryType type, String pickupCity, String deliveryCity) {
        this.id = id;
        this.trackingNumber = trackingNumber;
        this.clientId = clientId;
        this.type = type;
        this.pickupCity = pickupCity;
        this.deliveryCity = deliveryCity;
        this.status = DeliveryStatus.PENDING;
        this.currency = "EUR";
        this.createdDate = LocalDateTime.now();
    }
    
    // Getters et Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getTrackingNumber() {
        return trackingNumber;
    }
    
    public void setTrackingNumber(String trackingNumber) {
        this.trackingNumber = trackingNumber;
    }
    
    public String getClientId() {
        return clientId;
    }
    
    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
    
    public String getDelivererId() {
        return delivererId;
    }
    
    public void setDelivererId(String delivererId) {
        this.delivererId = delivererId;
    }
    
    public String getMerchantId() {
        return merchantId;
    }
    
    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }
    
    public DeliveryType getType() {
        return type;
    }
    
    public void setType(DeliveryType type) {
        this.type = type;
    }
    
    public DeliveryStatus getStatus() {
        return status;
    }
    
    public void setStatus(DeliveryStatus status) {
        this.status = status;
    }
    
    public String getPickupAddress() {
        return pickupAddress;
    }
    
    public void setPickupAddress(String pickupAddress) {
        this.pickupAddress = pickupAddress;
    }
    
    public String getPickupCity() {
        return pickupCity;
    }
    
    public void setPickupCity(String pickupCity) {
        this.pickupCity = pickupCity;
    }
    
    public String getDeliveryAddress() {
        return deliveryAddress;
    }
    
    public void setDeliveryAddress(String deliveryAddress) {
        this.deliveryAddress = deliveryAddress;
    }
    
    public String getDeliveryCity() {
        return deliveryCity;
    }
    
    public void setDeliveryCity(String deliveryCity) {
        this.deliveryCity = deliveryCity;
    }
    
    public double getDistance() {
        return distance;
    }
    
    public void setDistance(double distance) {
        this.distance = distance;
    }
    
    public String getPackageContent() {
        return packageContent;
    }
    
    public void setPackageContent(String packageContent) {
        this.packageContent = packageContent;
    }
    
    public PackageSize getPackageSize() {
        return packageSize;
    }
    
    public void setPackageSize(PackageSize packageSize) {
        this.packageSize = packageSize;
    }
    
    public double getWeight() {
        return weight;
    }
    
    public void setWeight(double weight) {
        this.weight = weight;
    }
    
    public boolean isFragile() {
        return fragile;
    }
    
    public void setFragile(boolean fragile) {
        this.fragile = fragile;
    }
    
    public Priority getPriority() {
        return priority;
    }
    
    public void setPriority(Priority priority) {
        this.priority = priority;
    }
    
    public double getPrice() {
        return price;
    }
    
    public void setPrice(double price) {
        this.price = price;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    public LocalDateTime getCreatedDate() {
        return createdDate;
    }
    
    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
    
    public LocalDateTime getPickupDate() {
        return pickupDate;
    }
    
    public void setPickupDate(LocalDateTime pickupDate) {
        this.pickupDate = pickupDate;
    }
    
    public LocalDateTime getDeliveryDate() {
        return deliveryDate;
    }
    
    public void setDeliveryDate(LocalDateTime deliveryDate) {
        this.deliveryDate = deliveryDate;
    }
    
    public LocalDateTime getEstimatedDeliveryTime() {
        return estimatedDeliveryTime;
    }
    
    public void setEstimatedDeliveryTime(LocalDateTime estimatedDeliveryTime) {
        this.estimatedDeliveryTime = estimatedDeliveryTime;
    }
    
    public LocalDateTime getActualDeliveryTime() {
        return actualDeliveryTime;
    }
    
    public void setActualDeliveryTime(LocalDateTime actualDeliveryTime) {
        this.actualDeliveryTime = actualDeliveryTime;
    }
    
    public Integer getRating() {
        return rating;
    }
    
    public void setRating(Integer rating) {
        this.rating = rating;
    }
    
    public String getClientComment() {
        return clientComment;
    }
    
    public void setClientComment(String clientComment) {
        this.clientComment = clientComment;
    }
    
    public String getDeliveryNotes() {
        return deliveryNotes;
    }
    
    public void setDeliveryNotes(String deliveryNotes) {
        this.deliveryNotes = deliveryNotes;
    }
    
    // Méthodes utilitaires
    public boolean isCompleted() {
        return status == DeliveryStatus.DELIVERED;
    }
    
    public boolean isInProgress() {
        return status == DeliveryStatus.IN_TRANSIT || status == DeliveryStatus.PICKUP_IN_PROGRESS;
    }
    
    public String getRoute() {
        return String.format("%s → %s", pickupCity, deliveryCity);
    }
    
    @Override
    public String toString() {
        return String.format("Delivery{tracking='%s', route='%s', status=%s, price=%.2f}", 
            trackingNumber, getRoute(), status, price);
    }
    
    /**
     * Énumération des types de livraison
     */
    public enum DeliveryType {
        @JsonProperty("STANDARD")
        STANDARD("Standard"),
        
        @JsonProperty("EXPRESS")
        EXPRESS("Express"),
        
        @JsonProperty("SAME_DAY")
        SAME_DAY("Jour même"),
        
        @JsonProperty("SCHEDULED")
        SCHEDULED("Programmée"),
        
        @JsonProperty("INTERNATIONAL")
        INTERNATIONAL("International");
        
        private final String displayName;
        
        DeliveryType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    /**
     * Énumération des statuts de livraison
     */
    public enum DeliveryStatus {
        @JsonProperty("PENDING")
        PENDING("En attente"),
        
        @JsonProperty("ACCEPTED")
        ACCEPTED("Acceptée"),
        
        @JsonProperty("PICKUP_IN_PROGRESS")
        PICKUP_IN_PROGRESS("Enlèvement en cours"),
        
        @JsonProperty("IN_TRANSIT")
        IN_TRANSIT("En transit"),
        
        @JsonProperty("OUT_FOR_DELIVERY")
        OUT_FOR_DELIVERY("En cours de livraison"),
        
        @JsonProperty("DELIVERED")
        DELIVERED("Livrée"),
        
        @JsonProperty("FAILED")
        FAILED("Échec"),
        
        @JsonProperty("CANCELLED")
        CANCELLED("Annulée"),
        
        @JsonProperty("RETURNED")
        RETURNED("Retournée");
        
        private final String displayName;
        
        DeliveryStatus(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    /**
     * Énumération des tailles de colis
     */
    public enum PackageSize {
        @JsonProperty("SMALL")
        SMALL("Petit", "< 30cm"),
        
        @JsonProperty("MEDIUM")
        MEDIUM("Moyen", "30-60cm"),
        
        @JsonProperty("LARGE")
        LARGE("Grand", "60-100cm"),
        
        @JsonProperty("EXTRA_LARGE")
        EXTRA_LARGE("Très grand", "> 100cm");
        
        private final String displayName;
        private final String dimensions;
        
        PackageSize(String displayName, String dimensions) {
            this.displayName = displayName;
            this.dimensions = dimensions;
        }
        
        public String getDisplayName() {
            return displayName;
        }
        
        public String getDimensions() {
            return dimensions;
        }
    }
    
    /**
     * Énumération des priorités
     */
    public enum Priority {
        @JsonProperty("LOW")
        LOW("Basse"),
        
        @JsonProperty("NORMAL")
        NORMAL("Normale"),
        
        @JsonProperty("HIGH")
        HIGH("Haute"),
        
        @JsonProperty("URGENT")
        URGENT("Urgente");
        
        private final String displayName;
        
        Priority(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}