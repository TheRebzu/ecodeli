package com.ecodeli.desktop.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Modèle représentant un commerçant
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Merchant {
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("companyName")
    private String companyName;
    
    @JsonProperty("contactName")
    private String contactName;
    
    @JsonProperty("email")
    private String email;
    
    @JsonProperty("phone")
    private String phone;
    
    @JsonProperty("address")
    private String address;
    
    @JsonProperty("city")
    private String city;
    
    @JsonProperty("postalCode")
    private String postalCode;
    
    @JsonProperty("country")
    private String country;
    
    @JsonProperty("businessType")
    private String businessType;
    
    @JsonProperty("isActive")
    private boolean isActive;
    
    @JsonProperty("registrationDate")
    private LocalDateTime registrationDate;
    
    @JsonProperty("lastLoginDate")
    private LocalDateTime lastLoginDate;
    
    @JsonProperty("totalRevenue")
    private double totalRevenue;
    
    @JsonProperty("totalOrders")
    private int totalOrders;
    
    @JsonProperty("averageOrderValue")
    private double averageOrderValue;
    
    @JsonProperty("loyaltyScore")
    private double loyaltyScore;
    
    @JsonProperty("invoices")
    private List<Invoice> invoices;
    
    // Constructeurs
    public Merchant() {}
    
    public Merchant(String id, String companyName, String contactName, String email) {
        this.id = id;
        this.companyName = companyName;
        this.contactName = contactName;
        this.email = email;
    }
    
    // Getters et Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getCompanyName() {
        return companyName;
    }
    
    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }
    
    public String getContactName() {
        return contactName;
    }
    
    public void setContactName(String contactName) {
        this.contactName = contactName;
    }
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public String getCity() {
        return city;
    }
    
    public void setCity(String city) {
        this.city = city;
    }
    
    public String getPostalCode() {
        return postalCode;
    }
    
    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }
    
    public String getCountry() {
        return country;
    }
    
    public void setCountry(String country) {
        this.country = country;
    }
    
    public String getBusinessType() {
        return businessType;
    }
    
    public void setBusinessType(String businessType) {
        this.businessType = businessType;
    }
    
    public boolean isActive() {
        return isActive;
    }
    
    public void setActive(boolean active) {
        isActive = active;
    }
    
    public LocalDateTime getRegistrationDate() {
        return registrationDate;
    }
    
    public void setRegistrationDate(LocalDateTime registrationDate) {
        this.registrationDate = registrationDate;
    }
    
    public LocalDateTime getLastLoginDate() {
        return lastLoginDate;
    }
    
    public void setLastLoginDate(LocalDateTime lastLoginDate) {
        this.lastLoginDate = lastLoginDate;
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
    
    public double getAverageOrderValue() {
        return averageOrderValue;
    }
    
    public void setAverageOrderValue(double averageOrderValue) {
        this.averageOrderValue = averageOrderValue;
    }
    
    public double getLoyaltyScore() {
        return loyaltyScore;
    }
    
    public void setLoyaltyScore(double loyaltyScore) {
        this.loyaltyScore = loyaltyScore;
    }
    
    public List<Invoice> getInvoices() {
        return invoices;
    }
    
    public void setInvoices(List<Invoice> invoices) {
        this.invoices = invoices;
    }
    
    // Méthodes utilitaires
    public String getFullAddress() {
        return String.format("%s, %s %s, %s", 
            address != null ? address : "",
            postalCode != null ? postalCode : "",
            city != null ? city : "",
            country != null ? country : "").trim();
    }
    
    public String getDisplayName() {
        return companyName != null ? companyName : contactName;
    }
    
    @Override
    public String toString() {
        return String.format("Merchant{id='%s', companyName='%s', email='%s', revenue=%.2f}", 
            id, companyName, email, totalRevenue);
    }
}