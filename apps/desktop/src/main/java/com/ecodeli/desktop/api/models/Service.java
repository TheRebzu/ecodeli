package com.ecodeli.desktop.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;

/**
 * Modèle représentant une prestation de service
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Service {
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("description")
    private String description;
    
    @JsonProperty("type")
    private ServiceType type;
    
    @JsonProperty("category")
    private ServiceCategory category;
    
    @JsonProperty("providerId")
    private String providerId;
    
    @JsonProperty("providerName")
    private String providerName;
    
    @JsonProperty("clientId")
    private String clientId;
    
    @JsonProperty("clientName")
    private String clientName;
    
    @JsonProperty("status")
    private ServiceStatus status;
    
    @JsonProperty("location")
    private String location;
    
    @JsonProperty("city")
    private String city;
    
    @JsonProperty("scheduledDate")
    private LocalDateTime scheduledDate;
    
    @JsonProperty("startTime")
    private LocalDateTime startTime;
    
    @JsonProperty("endTime")
    private LocalDateTime endTime;
    
    @JsonProperty("duration")
    private int duration; // en minutes
    
    @JsonProperty("price")
    private double price;
    
    @JsonProperty("hourlyRate")
    private double hourlyRate;
    
    @JsonProperty("currency")
    private String currency;
    
    @JsonProperty("rating")
    private Integer rating; // 1-5
    
    @JsonProperty("clientFeedback")
    private String clientFeedback;
    
    @JsonProperty("providerNotes")
    private String providerNotes;
    
    @JsonProperty("equipmentProvided")
    private boolean equipmentProvided;
    
    @JsonProperty("equipmentList")
    private String equipmentList;
    
    @JsonProperty("skillsRequired")
    private String skillsRequired;
    
    @JsonProperty("certificationRequired")
    private boolean certificationRequired;
    
    @JsonProperty("createdDate")
    private LocalDateTime createdDate;
    
    @JsonProperty("lastModified")
    private LocalDateTime lastModified;
    
    @JsonProperty("repeatService")
    private boolean repeatService;
    
    @JsonProperty("repeatFrequency")
    private String repeatFrequency; // WEEKLY, MONTHLY, etc.
    
    // Constructeurs
    public Service() {}
    
    public Service(String id, String name, ServiceType type, ServiceCategory category, 
                   String providerId, String clientId) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.category = category;
        this.providerId = providerId;
        this.clientId = clientId;
        this.status = ServiceStatus.SCHEDULED;
        this.currency = "EUR";
        this.createdDate = LocalDateTime.now();
        this.lastModified = LocalDateTime.now();
    }
    
    // Getters et Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public ServiceType getType() {
        return type;
    }
    
    public void setType(ServiceType type) {
        this.type = type;
    }
    
    public ServiceCategory getCategory() {
        return category;
    }
    
    public void setCategory(ServiceCategory category) {
        this.category = category;
    }
    
    public String getProviderId() {
        return providerId;
    }
    
    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
    
    public String getProviderName() {
        return providerName;
    }
    
    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }
    
    public String getClientId() {
        return clientId;
    }
    
    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
    
    public String getClientName() {
        return clientName;
    }
    
    public void setClientName(String clientName) {
        this.clientName = clientName;
    }
    
    public ServiceStatus getStatus() {
        return status;
    }
    
    public void setStatus(ServiceStatus status) {
        this.status = status;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    public String getCity() {
        return city;
    }
    
    public void setCity(String city) {
        this.city = city;
    }
    
    public LocalDateTime getScheduledDate() {
        return scheduledDate;
    }
    
    public void setScheduledDate(LocalDateTime scheduledDate) {
        this.scheduledDate = scheduledDate;
    }
    
    public LocalDateTime getStartTime() {
        return startTime;
    }
    
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }
    
    public LocalDateTime getEndTime() {
        return endTime;
    }
    
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
    
    public int getDuration() {
        return duration;
    }
    
    public void setDuration(int duration) {
        this.duration = duration;
    }
    
    public double getPrice() {
        return price;
    }
    
    public void setPrice(double price) {
        this.price = price;
    }
    
    public double getHourlyRate() {
        return hourlyRate;
    }
    
    public void setHourlyRate(double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    public Integer getRating() {
        return rating;
    }
    
    public void setRating(Integer rating) {
        this.rating = rating;
    }
    
    public String getClientFeedback() {
        return clientFeedback;
    }
    
    public void setClientFeedback(String clientFeedback) {
        this.clientFeedback = clientFeedback;
    }
    
    public String getProviderNotes() {
        return providerNotes;
    }
    
    public void setProviderNotes(String providerNotes) {
        this.providerNotes = providerNotes;
    }
    
    public boolean isEquipmentProvided() {
        return equipmentProvided;
    }
    
    public void setEquipmentProvided(boolean equipmentProvided) {
        this.equipmentProvided = equipmentProvided;
    }
    
    public String getEquipmentList() {
        return equipmentList;
    }
    
    public void setEquipmentList(String equipmentList) {
        this.equipmentList = equipmentList;
    }
    
    public String getSkillsRequired() {
        return skillsRequired;
    }
    
    public void setSkillsRequired(String skillsRequired) {
        this.skillsRequired = skillsRequired;
    }
    
    public boolean isCertificationRequired() {
        return certificationRequired;
    }
    
    public void setCertificationRequired(boolean certificationRequired) {
        this.certificationRequired = certificationRequired;
    }
    
    public LocalDateTime getCreatedDate() {
        return createdDate;
    }
    
    public void setCreatedDate(LocalDateTime createdDate) {
        this.createdDate = createdDate;
    }
    
    public LocalDateTime getLastModified() {
        return lastModified;
    }
    
    public void setLastModified(LocalDateTime lastModified) {
        this.lastModified = lastModified;
    }
    
    public boolean isRepeatService() {
        return repeatService;
    }
    
    public void setRepeatService(boolean repeatService) {
        this.repeatService = repeatService;
    }
    
    public String getRepeatFrequency() {
        return repeatFrequency;
    }
    
    public void setRepeatFrequency(String repeatFrequency) {
        this.repeatFrequency = repeatFrequency;
    }
    
    // Méthodes utilitaires
    public boolean isCompleted() {
        return status == ServiceStatus.COMPLETED;
    }
    
    public boolean isInProgress() {
        return status == ServiceStatus.IN_PROGRESS;
    }
    
    public double getDurationInHours() {
        return duration / 60.0;
    }
    
    public double calculateTotalPrice() {
        if (hourlyRate > 0 && duration > 0) {
            return hourlyRate * getDurationInHours();
        }
        return price;
    }
    
    @Override
    public String toString() {
        return String.format("Service{name='%s', type=%s, provider='%s', status=%s, price=%.2f}", 
            name, type, providerName, status, price);
    }
    
    /**
     * Énumération des types de service
     */
    public enum ServiceType {
        @JsonProperty("ROOM_RENTAL")
        ROOM_RENTAL("Location de salle"),
        
        @JsonProperty("EQUIPMENT_RENTAL")
        EQUIPMENT_RENTAL("Location de matériel"),
        
        @JsonProperty("CLEANING")
        CLEANING("Nettoyage"),
        
        @JsonProperty("MAINTENANCE")
        MAINTENANCE("Maintenance"),
        
        @JsonProperty("REPAIR")
        REPAIR("Réparation"),
        
        @JsonProperty("INSTALLATION")
        INSTALLATION("Installation"),
        
        @JsonProperty("CONSULTATION")
        CONSULTATION("Consultation"),
        
        @JsonProperty("TRAINING")
        TRAINING("Formation"),
        
        @JsonProperty("OTHER")
        OTHER("Autre");
        
        private final String displayName;
        
        ServiceType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    /**
     * Énumération des catégories de service
     */
    public enum ServiceCategory {
        @JsonProperty("PROFESSIONAL")
        PROFESSIONAL("Professionnel"),
        
        @JsonProperty("DOMESTIC")
        DOMESTIC("Domestique"),
        
        @JsonProperty("TECHNICAL")
        TECHNICAL("Technique"),
        
        @JsonProperty("CREATIVE")
        CREATIVE("Créatif"),
        
        @JsonProperty("EDUCATIONAL")
        EDUCATIONAL("Éducatif"),
        
        @JsonProperty("HEALTH")
        HEALTH("Santé"),
        
        @JsonProperty("TRANSPORT")
        TRANSPORT("Transport"),
        
        @JsonProperty("EVENT")
        EVENT("Événement");
        
        private final String displayName;
        
        ServiceCategory(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    /**
     * Énumération des statuts de service
     */
    public enum ServiceStatus {
        @JsonProperty("REQUESTED")
        REQUESTED("Demandé"),
        
        @JsonProperty("SCHEDULED")
        SCHEDULED("Programmé"),
        
        @JsonProperty("CONFIRMED")
        CONFIRMED("Confirmé"),
        
        @JsonProperty("IN_PROGRESS")
        IN_PROGRESS("En cours"),
        
        @JsonProperty("COMPLETED")
        COMPLETED("Terminé"),
        
        @JsonProperty("CANCELLED")
        CANCELLED("Annulé"),
        
        @JsonProperty("NO_SHOW")
        NO_SHOW("Absence"),
        
        @JsonProperty("RESCHEDULED")
        RESCHEDULED("Reprogrammé");
        
        private final String displayName;
        
        ServiceStatus(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
}