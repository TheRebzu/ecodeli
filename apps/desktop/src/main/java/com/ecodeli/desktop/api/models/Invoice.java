package com.ecodeli.desktop.api.models;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Modèle représentant une facture
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Invoice {
    @JsonProperty("id")
    private String id;
    
    @JsonProperty("invoiceNumber")
    private String invoiceNumber;
    
    @JsonProperty("merchantId")
    private String merchantId;
    
    @JsonProperty("issueDate")
    private LocalDateTime issueDate;
    
    @JsonProperty("dueDate")
    private LocalDateTime dueDate;
    
    @JsonProperty("paidDate")
    private LocalDateTime paidDate;
    
    @JsonProperty("status")
    private InvoiceStatus status;
    
    @JsonProperty("subtotal")
    private double subtotal;
    
    @JsonProperty("taxAmount")
    private double taxAmount;
    
    @JsonProperty("totalAmount")
    private double totalAmount;
    
    @JsonProperty("currency")
    private String currency;
    
    @JsonProperty("paymentMethod")
    private String paymentMethod;
    
    @JsonProperty("items")
    private List<InvoiceItem> items;
    
    @JsonProperty("notes")
    private String notes;
    
    // Constructeurs
    public Invoice() {}
    
    public Invoice(String id, String invoiceNumber, String merchantId, 
                   LocalDateTime issueDate, double totalAmount) {
        this.id = id;
        this.invoiceNumber = invoiceNumber;
        this.merchantId = merchantId;
        this.issueDate = issueDate;
        this.totalAmount = totalAmount;
        this.status = InvoiceStatus.PENDING;
        this.currency = "EUR";
    }
    
    // Getters et Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getInvoiceNumber() {
        return invoiceNumber;
    }
    
    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }
    
    public String getMerchantId() {
        return merchantId;
    }
    
    public void setMerchantId(String merchantId) {
        this.merchantId = merchantId;
    }
    
    public LocalDateTime getIssueDate() {
        return issueDate;
    }
    
    public void setIssueDate(LocalDateTime issueDate) {
        this.issueDate = issueDate;
    }
    
    public LocalDateTime getDueDate() {
        return dueDate;
    }
    
    public void setDueDate(LocalDateTime dueDate) {
        this.dueDate = dueDate;
    }
    
    public LocalDateTime getPaidDate() {
        return paidDate;
    }
    
    public void setPaidDate(LocalDateTime paidDate) {
        this.paidDate = paidDate;
    }
    
    public InvoiceStatus getStatus() {
        return status;
    }
    
    public void setStatus(InvoiceStatus status) {
        this.status = status;
    }
    
    public double getSubtotal() {
        return subtotal;
    }
    
    public void setSubtotal(double subtotal) {
        this.subtotal = subtotal;
    }
    
    public double getTaxAmount() {
        return taxAmount;
    }
    
    public void setTaxAmount(double taxAmount) {
        this.taxAmount = taxAmount;
    }
    
    public double getTotalAmount() {
        return totalAmount;
    }
    
    public void setTotalAmount(double totalAmount) {
        this.totalAmount = totalAmount;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    public String getPaymentMethod() {
        return paymentMethod;
    }
    
    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }
    
    public List<InvoiceItem> getItems() {
        return items;
    }
    
    public void setItems(List<InvoiceItem> items) {
        this.items = items;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    // Méthodes utilitaires
    public boolean isPaid() {
        return status == InvoiceStatus.PAID;
    }
    
    public boolean isOverdue() {
        return status == InvoiceStatus.PENDING && 
               dueDate != null && 
               LocalDateTime.now().isAfter(dueDate);
    }
    
    public double getTaxRate() {
        return subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
    }
    
    @Override
    public String toString() {
        return String.format("Invoice{number='%s', merchant='%s', amount=%.2f %s, status=%s}", 
            invoiceNumber, merchantId, totalAmount, currency, status);
    }
    
    /**
     * Énumération des statuts de facture
     */
    public enum InvoiceStatus {
        @JsonProperty("DRAFT")
        DRAFT,
        
        @JsonProperty("PENDING")
        PENDING,
        
        @JsonProperty("PAID")
        PAID,
        
        @JsonProperty("OVERDUE")
        OVERDUE,
        
        @JsonProperty("CANCELLED")
        CANCELLED,
        
        @JsonProperty("REFUNDED")
        REFUNDED
    }
    
    /**
     * Classe interne pour les éléments de facture
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class InvoiceItem {
        @JsonProperty("id")
        private String id;
        
        @JsonProperty("description")
        private String description;
        
        @JsonProperty("quantity")
        private int quantity;
        
        @JsonProperty("unitPrice")
        private double unitPrice;
        
        @JsonProperty("totalPrice")
        private double totalPrice;
        
        // Constructeurs
        public InvoiceItem() {}
        
        public InvoiceItem(String description, int quantity, double unitPrice) {
            this.description = description;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.totalPrice = quantity * unitPrice;
        }
        
        // Getters et Setters
        public String getId() {
            return id;
        }
        
        public void setId(String id) {
            this.id = id;
        }
        
        public String getDescription() {
            return description;
        }
        
        public void setDescription(String description) {
            this.description = description;
        }
        
        public int getQuantity() {
            return quantity;
        }
        
        public void setQuantity(int quantity) {
            this.quantity = quantity;
            this.totalPrice = quantity * unitPrice;
        }
        
        public double getUnitPrice() {
            return unitPrice;
        }
        
        public void setUnitPrice(double unitPrice) {
            this.unitPrice = unitPrice;
            this.totalPrice = quantity * unitPrice;
        }
        
        public double getTotalPrice() {
            return totalPrice;
        }
        
        public void setTotalPrice(double totalPrice) {
            this.totalPrice = totalPrice;
        }
    }
}