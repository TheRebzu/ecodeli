package com.ecodeli.desktop.utils;

import com.ecodeli.desktop.api.models.*;
import com.fasterxml.jackson.core.type.TypeReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Générateur de données de test pour la démonstration
 */
public class DataGenerator {
    private static final Logger logger = LoggerFactory.getLogger(DataGenerator.class);
    
    private final Random random = new Random();
    
    // Données de base pour la génération
    private final String[] companyNames = {
        "TechCorp Solutions", "Green Energy France", "Digital Innovations",
        "EcoTech Services", "Smart Solutions", "Innovation Lab",
        "Sustainable Tech", "NextGen Systems", "CleanTech Partners",
        "Future Industries", "Modern Solutions", "Eco Dynamics",
        "Tech Innovators", "Green Solutions", "Digital Future",
        "Smart Industries", "Clean Energy Co", "Innovation Hub",
        "Sustainable Systems", "NextLevel Tech", "EcoSmart Solutions",
        "TechAdvantage", "Green Innovation", "Digital Excellence",
        "Smart Energy", "CleanTech Innovation", "Future Systems",
        "Modern Industries", "Eco Solutions", "Tech Partners",
        "Green Future", "Digital Solutions", "Smart Tech",
        "Innovation Systems", "Sustainable Future"
    };
    
    private final String[] firstNames = {
        "Jean", "Marie", "Pierre", "Sophie", "Michel", "Nathalie",
        "Laurent", "Isabelle", "Philippe", "Catherine", "Alain", "Françoise",
        "Nicolas", "Martine", "François", "Christine", "Patrick", "Sandrine",
        "David", "Valérie", "Christophe", "Sylvie", "Stéphane", "Anne",
        "Thierry", "Véronique", "Frédéric", "Brigitte", "Olivier", "Monique"
    };
    
    private final String[] lastNames = {
        "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard",
        "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent",
        "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent",
        "Fournier", "Morel", "Girard", "André", "Lefevre", "Mercier",
        "Dupont", "Lambert", "Bonnet", "François", "Martinez", "Legrand"
    };
    
    private final String[] cities = {
        "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes",
        "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims",
        "Le Havre", "Saint-Étienne", "Toulon", "Grenoble", "Dijon", "Angers",
        "Nîmes", "Villeurbanne", "Saint-Denis", "Le Mans", "Aix-en-Provence",
        "Clermont-Ferrand", "Brest", "Limoges", "Tours", "Amiens", "Perpignan", "Metz"
    };
    
    private final String[] businessTypes = {
        "E-commerce", "Restaurant", "Consulting", "Retail", "Manufacturing",
        "Technology", "Healthcare", "Education", "Construction", "Transport",
        "Finance", "Real Estate", "Agriculture", "Tourism", "Entertainment"
    };
    
    private final String[] serviceNames = {
        "Salle de conférence Premium", "Studio d'enregistrement", "Atelier créatif",
        "Salle de formation", "Espace coworking", "Studio photo", "Cuisine professionnelle",
        "Salle de sport", "Théâtre privé", "Laboratoire", "Garage automobile",
        "Menuiserie", "Plomberie", "Électricité", "Peinture", "Jardinage",
        "Nettoyage bureau", "Nettoyage domicile", "Maintenance informatique",
        "Réparation électroménager", "Installation climatisation", "Déménagement",
        "Formation informatique", "Cours de langue", "Coaching professionnel",
        "Consultation juridique", "Service comptable", "Design graphique",
        "Développement web", "Marketing digital"
    };
    
    /**
     * Génère une liste de commerçants de test
     */
    public List<Merchant> generateMerchants(int count) {
        logger.debug("🏭 Génération de {} commerçants de test", count);
        
        return IntStream.range(0, count)
            .mapToObj(i -> {
                Merchant merchant = new Merchant();
                merchant.setId("merchant_" + (i + 1));
                merchant.setCompanyName(companyNames[random.nextInt(companyNames.length)]);
                merchant.setContactName(generateFullName());
                merchant.setEmail(generateEmail(merchant.getContactName(), merchant.getCompanyName()));
                merchant.setPhone(generatePhoneNumber());
                merchant.setAddress(generateAddress());
                merchant.setCity(cities[random.nextInt(cities.length)]);
                merchant.setPostalCode(generatePostalCode());
                merchant.setCountry("France");
                merchant.setBusinessType(businessTypes[random.nextInt(businessTypes.length)]);
                merchant.setActive(random.nextDouble() > 0.1); // 90% actifs
                
                // Dates
                LocalDateTime registrationDate = LocalDateTime.now()
                    .minusDays(random.nextInt(730)); // Entre 0 et 2 ans
                merchant.setRegistrationDate(registrationDate);
                merchant.setLastLoginDate(LocalDateTime.now()
                    .minusDays(random.nextInt(30))); // Dernière connexion dans les 30 jours
                
                // Métriques financières
                merchant.setTotalOrders(random.nextInt(500) + 10);
                merchant.setTotalRevenue(random.nextDouble() * 50000 + 1000); // 1K à 51K€
                merchant.setAverageOrderValue(merchant.getTotalRevenue() / merchant.getTotalOrders());
                merchant.setLoyaltyScore(random.nextDouble() * 100); // 0 à 100
                
                // Générer des factures
                merchant.setInvoices(generateInvoicesForMerchant(merchant.getId(), 
                    random.nextInt(10) + 1));
                
                return merchant;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Génère une liste de livraisons de test
     */
    public List<Delivery> generateDeliveries(int count) {
        logger.debug("🚚 Génération de {} livraisons de test", count);
        
        return IntStream.range(0, count)
            .mapToObj(i -> {
                Delivery delivery = new Delivery();
                delivery.setId("delivery_" + (i + 1));
                delivery.setTrackingNumber("ECO" + String.format("%06d", i + 1));
                delivery.setClientId("client_" + (random.nextInt(100) + 1));
                delivery.setMerchantId("merchant_" + (random.nextInt(35) + 1));
                delivery.setDelivererId("deliverer_" + (random.nextInt(20) + 1));
                
                // Type et statut
                delivery.setType(Delivery.DeliveryType.values()[
                    random.nextInt(Delivery.DeliveryType.values().length)]);
                delivery.setStatus(Delivery.DeliveryStatus.values()[
                    random.nextInt(Delivery.DeliveryStatus.values().length)]);
                
                // Adresses
                delivery.setPickupCity(cities[random.nextInt(cities.length)]);
                delivery.setDeliveryCity(cities[random.nextInt(cities.length)]);
                delivery.setPickupAddress(generateAddress());
                delivery.setDeliveryAddress(generateAddress());
                
                // Détails du colis
                delivery.setPackageContent(generatePackageContent());
                delivery.setPackageSize(Delivery.PackageSize.values()[
                    random.nextInt(Delivery.PackageSize.values().length)]);
                delivery.setWeight(random.nextDouble() * 20 + 0.5); // 0.5 à 20.5 kg
                delivery.setFragile(random.nextBoolean());
                delivery.setPriority(Delivery.Priority.values()[
                    random.nextInt(Delivery.Priority.values().length)]);
                
                // Distance et prix
                delivery.setDistance(random.nextDouble() * 500 + 1); // 1 à 501 km
                delivery.setPrice(calculateDeliveryPrice(delivery));
                delivery.setCurrency("EUR");
                
                // Dates
                LocalDateTime createdDate = LocalDateTime.now()
                    .minusDays(random.nextInt(90)); // Dans les 90 derniers jours
                delivery.setCreatedDate(createdDate);
                
                if (delivery.getStatus() != Delivery.DeliveryStatus.PENDING) {
                    delivery.setPickupDate(createdDate.plusHours(random.nextInt(24)));
                }
                
                if (delivery.isCompleted()) {
                    delivery.setActualDeliveryTime(delivery.getPickupDate()
                        .plusHours(random.nextInt(48) + 1));
                    delivery.setRating(random.nextInt(5) + 1);
                    if (random.nextBoolean()) {
                        delivery.setClientComment(generateDeliveryComment());
                    }
                }
                
                return delivery;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Génère une liste de services de test
     */
    public List<Service> generateServices(int count) {
        logger.debug("🔧 Génération de {} services de test", count);
        
        return IntStream.range(0, count)
            .mapToObj(i -> {
                Service service = new Service();
                service.setId("service_" + (i + 1));
                service.setName(serviceNames[random.nextInt(serviceNames.length)]);
                service.setDescription(generateServiceDescription(service.getName()));
                
                // Type et catégorie
                service.setType(Service.ServiceType.values()[
                    random.nextInt(Service.ServiceType.values().length)]);
                service.setCategory(Service.ServiceCategory.values()[
                    random.nextInt(Service.ServiceCategory.values().length)]);
                
                // Participants
                service.setProviderId("provider_" + (random.nextInt(25) + 1));
                service.setProviderName(generateFullName());
                service.setClientId("client_" + (random.nextInt(100) + 1));
                service.setClientName(generateFullName());
                
                // Statut
                service.setStatus(Service.ServiceStatus.values()[
                    random.nextInt(Service.ServiceStatus.values().length)]);
                
                // Localisation
                service.setCity(cities[random.nextInt(cities.length)]);
                service.setLocation(generateAddress());
                
                // Dates et durée
                LocalDateTime scheduledDate = LocalDateTime.now()
                    .minusDays(random.nextInt(60))
                    .plusDays(random.nextInt(120)); // Entre -60 et +60 jours
                service.setScheduledDate(scheduledDate);
                service.setDuration(random.nextInt(480) + 30); // 30 min à 8h
                
                if (service.getStatus() == Service.ServiceStatus.IN_PROGRESS ||
                    service.getStatus() == Service.ServiceStatus.COMPLETED) {
                    service.setStartTime(scheduledDate);
                    if (service.getStatus() == Service.ServiceStatus.COMPLETED) {
                        service.setEndTime(scheduledDate.plusMinutes(service.getDuration()));
                    }
                }
                
                // Prix
                service.setHourlyRate(random.nextDouble() * 80 + 20); // 20 à 100€/h
                service.setPrice(service.getHourlyRate() * (service.getDuration() / 60.0));
                service.setCurrency("EUR");
                
                // Évaluation
                if (service.isCompleted() && random.nextDouble() > 0.3) {
                    service.setRating(random.nextInt(5) + 1);
                    service.setClientFeedback(generateServiceFeedback());
                }
                
                // Détails
                service.setEquipmentProvided(random.nextBoolean());
                if (service.isEquipmentProvided()) {
                    service.setEquipmentList(generateEquipmentList());
                }
                service.setCertificationRequired(random.nextDouble() > 0.7);
                service.setRepeatService(random.nextDouble() > 0.8);
                if (service.isRepeatService()) {
                    service.setRepeatFrequency(random.nextBoolean() ? "WEEKLY" : "MONTHLY");
                }
                
                // Dates de gestion
                service.setCreatedDate(scheduledDate.minusDays(random.nextInt(30)));
                service.setLastModified(LocalDateTime.now());
                
                return service;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Génère un commerçant avec ses factures
     */
    public Merchant generateMerchantWithInvoices(String merchantId) {
        List<Merchant> merchants = generateMerchants(1);
        Merchant merchant = merchants.get(0);
        merchant.setId(merchantId);
        
        // Générer plus de factures pour ce commerçant spécifique
        merchant.setInvoices(generateInvoicesForMerchant(merchantId, random.nextInt(20) + 5));
        
        return merchant;
    }
    
    /**
     * Génère des analytics pour un DashboardData
     */
    public DashboardData.Analytics generateAnalytics(DashboardData data) {
        DashboardData.Analytics analytics = new DashboardData.Analytics();
        
        // Revenus par mois
        Map<String, Double> revenueByMonth = new LinkedHashMap<>();
        for (int i = 11; i >= 0; i--) {
            LocalDateTime month = LocalDateTime.now().minusMonths(i);
            String monthKey = month.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            revenueByMonth.put(monthKey, random.nextDouble() * 20000 + 5000);
        }
        analytics.setRevenueByMonth(revenueByMonth);
        
        // Livraisons par type
        Map<String, Integer> deliveriesByType = new HashMap<>();
        for (Delivery.DeliveryType type : Delivery.DeliveryType.values()) {
            deliveriesByType.put(type.name(), random.nextInt(50) + 10);
        }
        analytics.setDeliveriesByType(deliveriesByType);
        
        // Services par catégorie
        Map<String, Integer> servicesByCategory = new HashMap<>();
        for (Service.ServiceCategory category : Service.ServiceCategory.values()) {
            servicesByCategory.put(category.name(), random.nextInt(30) + 5);
        }
        analytics.setServicesByCategory(servicesByCategory);
        
        // Clients par région
        Map<String, Integer> clientsByRegion = new HashMap<>();
        String[] regions = {"Île-de-France", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine", 
                           "Occitanie", "Hauts-de-France", "Provence-Alpes-Côte d'Azur",
                           "Grand Est", "Pays de la Loire", "Bretagne", "Normandie"};
        for (String region : regions) {
            clientsByRegion.put(region, random.nextInt(100) + 20);
        }
        analytics.setClientsByRegion(clientsByRegion);
        
        // Taux de satisfaction
        Map<String, Double> satisfactionRates = new HashMap<>();
        satisfactionRates.put("Livraisons", 4.2 + random.nextDouble() * 0.6);
        satisfactionRates.put("Services", 4.0 + random.nextDouble() * 0.8);
        satisfactionRates.put("Support", 4.1 + random.nextDouble() * 0.7);
        analytics.setSatisfactionRates(satisfactionRates);
        
        // Top merchants
        List<DashboardData.TopMerchant> topMerchants = data.getMerchants().stream()
            .sorted((m1, m2) -> Double.compare(m2.getTotalRevenue(), m1.getTotalRevenue()))
            .limit(5)
            .map(m -> new DashboardData.TopMerchant(
                m.getId(), m.getCompanyName(), m.getTotalRevenue(),
                m.getTotalOrders(), m.getLoyaltyScore()))
            .collect(Collectors.toList());
        analytics.setTopMerchants(topMerchants);
        
        // Top services
        Map<String, List<Service>> servicesByType = data.getServices().stream()
            .collect(Collectors.groupingBy(s -> s.getType().name()));
        
        List<DashboardData.TopService> topServices = servicesByType.entrySet().stream()
            .map(entry -> {
                List<Service> services = entry.getValue();
                int totalBookings = services.size();
                double avgRating = services.stream()
                    .filter(s -> s.getRating() != null)
                    .mapToInt(Service::getRating)
                    .average().orElse(4.0);
                double totalRevenue = services.stream()
                    .mapToDouble(Service::getPrice).sum();
                
                return new DashboardData.TopService(entry.getKey(), 
                    services.get(0).getName(), totalBookings, avgRating, totalRevenue);
            })
            .sorted((s1, s2) -> Integer.compare(s2.getTotalBookings(), s1.getTotalBookings()))
            .limit(5)
            .collect(Collectors.toList());
        analytics.setTopServices(topServices);
        
        return analytics;
    }
    
    /**
     * Génère des factures pour un commerçant
     */
    private List<Invoice> generateInvoicesForMerchant(String merchantId, int count) {
        return IntStream.range(0, count)
            .mapToObj(i -> {
                Invoice invoice = new Invoice();
                invoice.setId("invoice_" + merchantId + "_" + (i + 1));
                invoice.setInvoiceNumber("FAC-" + String.format("%06d", 
                    Integer.parseInt(merchantId.replace("merchant_", "")) * 1000 + i + 1));
                invoice.setMerchantId(merchantId);
                
                // Dates
                LocalDateTime issueDate = LocalDateTime.now()
                    .minusDays(random.nextInt(365));
                invoice.setIssueDate(issueDate);
                invoice.setDueDate(issueDate.plusDays(30));
                
                // Statut et paiement
                Invoice.InvoiceStatus[] statuses = Invoice.InvoiceStatus.values();
                invoice.setStatus(statuses[random.nextInt(statuses.length)]);
                
                if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
                    invoice.setPaidDate(issueDate.plusDays(random.nextInt(30)));
                }
                
                // Montants
                invoice.setSubtotal(random.nextDouble() * 2000 + 100);
                invoice.setTaxAmount(invoice.getSubtotal() * 0.20);
                invoice.setTotalAmount(invoice.getSubtotal() + invoice.getTaxAmount());
                invoice.setCurrency("EUR");
                
                // Méthode de paiement
                if (invoice.isPaid()) {
                    String[] methods = {"Virement", "Carte bancaire", "Chèque", "Espèces"};
                    invoice.setPaymentMethod(methods[random.nextInt(methods.length)]);
                }
                
                // Éléments de facture
                invoice.setItems(generateInvoiceItems(random.nextInt(3) + 1));
                
                return invoice;
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Génère des éléments de facture
     */
    private List<Invoice.InvoiceItem> generateInvoiceItems(int count) {
        String[] descriptions = {
            "Service de livraison express", "Frais de manutention", "Commission plateforme",
            "Service premium", "Frais de traitement", "Assurance colis", "Service standard"
        };
        
        return IntStream.range(0, count)
            .mapToObj(i -> {
                Invoice.InvoiceItem item = new Invoice.InvoiceItem();
                item.setId("item_" + i);
                item.setDescription(descriptions[random.nextInt(descriptions.length)]);
                item.setQuantity(random.nextInt(5) + 1);
                item.setUnitPrice(random.nextDouble() * 100 + 10);
                item.setTotalPrice(item.getQuantity() * item.getUnitPrice());
                return item;
            })
            .collect(Collectors.toList());
    }
    
    // Méthodes utilitaires de génération
    private String generateFullName() {
        return firstNames[random.nextInt(firstNames.length)] + " " + 
               lastNames[random.nextInt(lastNames.length)];
    }
    
    private String generateEmail(String contactName, String companyName) {
        String[] parts = contactName.toLowerCase().split(" ");
        String company = companyName.toLowerCase().replaceAll("[^a-z0-9]", "");
        return parts[0] + "." + parts[1] + "@" + company.substring(0, Math.min(company.length(), 10)) + ".com";
    }
    
    private String generatePhoneNumber() {
        return String.format("0%d %02d %02d %02d %02d",
            random.nextInt(6) + 1,
            random.nextInt(100),
            random.nextInt(100),
            random.nextInt(100),
            random.nextInt(100));
    }
    
    private String generateAddress() {
        return String.format("%d %s", 
            random.nextInt(200) + 1,
            generateStreetName());
    }
    
    private String generateStreetName() {
        String[] streetTypes = {"rue", "avenue", "boulevard", "place", "impasse"};
        String[] streetNames = {"de la Paix", "Victor Hugo", "Charles de Gaulle", "de la République",
                               "Jean Jaurès", "Georges Pompidou", "François Mitterrand", "Jacques Chirac"};
        return streetTypes[random.nextInt(streetTypes.length)] + " " + 
               streetNames[random.nextInt(streetNames.length)];
    }
    
    private String generatePostalCode() {
        return String.format("%05d", random.nextInt(100000));
    }
    
    private String generatePackageContent() {
        String[] contents = {"Documents", "Vêtements", "Électronique", "Livres", "Produits alimentaires",
                            "Cosmétiques", "Accessoires", "Matériel de bureau", "Pièces détachées", "Cadeaux"};
        return contents[random.nextInt(contents.length)];
    }
    
    private double calculateDeliveryPrice(Delivery delivery) {
        double basePrice = 5.0;
        double distancePrice = delivery.getDistance() * 0.8;
        double sizeMultiplier = switch (delivery.getPackageSize()) {
            case SMALL -> 1.0;
            case MEDIUM -> 1.3;
            case LARGE -> 1.7;
            case EXTRA_LARGE -> 2.2;
        };
        double typeMultiplier = switch (delivery.getType()) {
            case STANDARD -> 1.0;
            case EXPRESS -> 1.5;
            case SAME_DAY -> 2.0;
            case SCHEDULED -> 1.2;
            case INTERNATIONAL -> 3.0;
        };
        
        return (basePrice + distancePrice) * sizeMultiplier * typeMultiplier;
    }
    
    private String generateDeliveryComment() {
        String[] comments = {
            "Très satisfait du service", "Livraison rapide et soignée", "Parfait !",
            "Bon service mais pourrait être amélioré", "Excellent livreur, très professionnel",
            "Délai respecté, merci", "Service correct", "Très bien emballé"
        };
        return comments[random.nextInt(comments.length)];
    }
    
    private String generateServiceDescription(String serviceName) {
        return "Service professionnel de " + serviceName.toLowerCase() + 
               " avec équipement moderne et prestataire expérimenté.";
    }
    
    private String generateServiceFeedback() {
        String[] feedbacks = {
            "Prestation de qualité, très satisfait", "Professionnel et ponctuel",
            "Excellent travail, je recommande", "Service correct mais peut mieux faire",
            "Parfait, exactement ce que j'attendais", "Très professionnel, merci",
            "Bon rapport qualité-prix", "Service rapide et efficace"
        };
        return feedbacks[random.nextInt(feedbacks.length)];
    }
    
    private String generateEquipmentList() {
        String[] equipment = {"Outils professionnels", "Matériel de sécurité", "Équipement spécialisé",
                             "Produits de nettoyage", "Matériel informatique", "Instruments de mesure"};
        return equipment[random.nextInt(equipment.length)];
    }
    
    /**
     * Obtient le TypeReference pour les listes (pour Jackson)
     */
    public <T> TypeReference<List<T>> getListType(Class<T> clazz) {
        return new TypeReference<List<T>>() {};
    }
}