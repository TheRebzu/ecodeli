# EcoDeli Desktop Analytics

> Application de bureau Java pour l'analyse et la gestion des données de la plateforme EcoDeli

## 📋 Description

EcoDeli Desktop Analytics est une application de bureau développée en Java avec JavaFX qui fournit un tableau de bord complet pour analyser les données de la plateforme EcoDeli. Elle permet aux gestionnaires et décideurs de visualiser les performances, générer des rapports et prendre des décisions éclairées.

## ✨ Fonctionnalités

### 🎯 Dashboard Principal
- **Métriques en temps réel** : Commerçants, livraisons, services, revenus
- **Indicateurs de performance** : Taux de réussite, notes moyennes
- **Graphiques interactifs** : Évolution des revenus, répartition par type
- **Top performers** : Meilleurs commerçants et services

### 🏪 Gestion des Commerçants
- **Liste complète** avec filtres avancés
- **Statistiques détaillées** par commerçant
- **Analyse des revenus** et commandes
- **Statuts d'activité** et historique

### 🚚 Suivi des Livraisons
- **Tableau de bord des livraisons** avec statuts en temps réel
- **Filtrage multi-critères** : type, statut, ville, priorité
- **Analyse des performances** : distances, temps, satisfaction
- **Détails complets** : route, contenu, évaluations

### 🔧 Gestion des Services
- **Vue d'ensemble des prestations** par catégorie et type
- **Suivi des réservations** et statuts
- **Analyse de la rentabilité** par service
- **Gestion des prestataires** et évaluations

### 📊 Génération de Rapports
- **Rapports PDF professionnels** avec graphiques
- **Export CSV/Excel** pour analyse externe
- **Rapports personnalisables** par période et contenu
- **Graphiques et visualisations** intégrés

### 🔄 Modes de Fonctionnement
- **Mode API** : Connexion directe à l'API tRPC
- **Mode Démo** : Données générées localement (30+ entrées par catégorie)
- **Synchronisation automatique** des données
- **Gestion hors-ligne** basique

## 🛠️ Technologies Utilisées

- **Java 17+** : Langage principal
- **JavaFX 21** : Interface utilisateur moderne
- **Maven** : Gestion des dépendances et build
- **OkHttp** : Client HTTP pour l'API tRPC
- **Jackson** : Traitement JSON
- **JFreeChart** : Génération de graphiques
- **Apache PDFBox** : Génération de rapports PDF
- **SLF4J + Logback** : Logging
- **Weka** : Data mining (bonus)

## 🚀 Installation et Lancement

### Prérequis
- **Java 17** ou supérieur
- **Maven 3.6+** (pour le build)
- **Connexion internet** (pour télécharger les dépendances)

### Installation Rapide

#### 1. Build de l'application
```bash
# Clone du projet (si pas déjà fait)
cd apps/desktop-java

# Build complet avec tests
./scripts/build.sh

# Ou build rapide sans tests
./scripts/build.sh quick
```

#### 2. Lancement
```bash
# Lancement normal
./scripts/run.sh

# Avec options
./scripts/run.sh --debug --api-url http://localhost:3000
./scripts/run.sh --demo --memory 1g
```

#### 3. Installation système (optionnel)
```bash
# Installation système (requiert sudo)
sudo ./scripts/install.sh

# Installation utilisateur
./scripts/install.sh --user

# Puis lancement depuis n'importe où
ecodeli-desktop
```

### Configuration

#### Variables d'environnement
```bash
# URL de l'API tRPC
export API_BASE_URL="http://localhost:3000"

# Mode debug
export DEBUG=true

# Répertoire de logs
export LOG_DIR="/var/log/ecodeli-desktop"
```

#### Options de lancement
```bash
# Toutes les options disponibles
./scripts/run.sh --help

# Exemples d'utilisation
./scripts/run.sh --api-url http://prod.api.com --memory 2g
./scripts/run.sh --demo --debug
./scripts/run.sh --build  # Build automatique avant lancement
```

## 📚 Utilisation

### 1. Démarrage Initial
1. **Lancer l'application** avec `./scripts/run.sh`
2. **Test de connexion** automatique à l'API
3. **Basculement automatique** en mode démo si API indisponible
4. **Chargement du dashboard** principal

### 2. Navigation
- **Menu principal** : Navigation entre les sections
- **Bouton actualiser** : Mise à jour des données
- **Mode démo/API** : Basculement manuel des modes
- **Barre de statut** : Informations sur l'état de l'application

### 3. Analyse des Données
- **Filtres avancés** : Recherche multicritère
- **Tableaux interactifs** : Tri, sélection, détails
- **Graphiques dynamiques** : Visualisation des tendances
- **Métriques temps réel** : Indicateurs clés

### 4. Génération de Rapports
1. **Accéder à la section Rapports**
2. **Configurer le type et la période**
3. **Sélectionner le contenu à inclure**
4. **Prévisualiser le rapport**
5. **Générer PDF/CSV/Excel**

## 🏗️ Architecture

### Structure du Projet
```
src/main/java/com/ecodeli/desktop/
├── Main.java                  # Point d'entrée
├── EcoDeliApp.java           # Application JavaFX
├── api/
│   ├── TrpcClient.java       # Client HTTP tRPC
│   └── models/               # Modèles de données
├── controllers/              # Contrôleurs JavaFX
├── services/                 # Services métier
└── utils/                    # Utilitaires

src/main/resources/
├── fxml/                     # Interfaces FXML
├── css/                      # Feuilles de style
└── images/                   # Ressources graphiques
```

### Flux de Données
```
API tRPC ←→ TrpcClient ←→ ApiService ←→ Controllers ←→ FXML Views
                ↓
         DataGenerator (mode démo)
```

### Patterns Utilisés
- **MVC** : Séparation vue/contrôleur/modèle
- **Singleton** : ApiService unique
- **Observer** : Mise à jour reactive des vues
- **Factory** : Génération de données de test
- **Strategy** : Modes API/Démo

## 🔧 Développement

### Setup Développement
```bash
# Installation des dépendances
mvn clean install

# Compilation
mvn compile

# Tests
mvn test

# Packaging
mvn package

# Run depuis Maven
mvn javafx:run
```

### Tests
```bash
# Tests unitaires
mvn test

# Tests d'intégration
mvn integration-test

# Coverage
mvn jacoco:report
```

### Debug
```bash
# Mode debug complet
./scripts/run.sh --debug

# Profiling mémoire
./scripts/run.sh --memory 2g --debug

# Logs détaillés
tail -f logs/ecodeli-desktop.log
```

### Ajout de Fonctionnalités

#### Nouveau Contrôleur
1. Créer `NewController.java` dans `controllers/`
2. Créer `new-view.fxml` dans `resources/fxml/`
3. Ajouter l'entrée de menu dans `MainController.java`
4. Implémenter la logique métier

#### Nouveau Modèle
1. Créer la classe dans `api/models/`
2. Ajouter les annotations Jackson
3. Mettre à jour `DataGenerator` pour le mode démo
4. Adapter `ApiService` pour les appels API

#### Nouveau Rapport
1. Étendre `PdfReportGenerator`
2. Ajouter les options dans `ReportsController`
3. Créer les templates nécessaires

## 📊 Data Mining (Bonus)

L'application inclut des capacités de data mining avec Weka :

### Fonctionnalités
- **Classification** : Prédiction des succès de livraison
- **Clustering** : Segmentation des clients
- **Association** : Règles de recommandation
- **Régression** : Prédiction des revenus

### Utilisation
```java
// Exemple d'utilisation (à implémenter)
DataMiningService miningService = new DataMiningService();
List<Prediction> predictions = miningService.predictDeliverySuccess(deliveries);
```

## 🔒 Sécurité

### Considérations
- **Authentification** : Token API sécurisé
- **HTTPS** : Chiffrement des communications
- **Validation** : Données entrantes validées
- **Logs** : Pas de données sensibles loggées

### Bonnes Pratiques
- Utiliser HTTPS en production
- Valider toutes les entrées utilisateur
- Chiffrer les tokens d'authentification
- Implémenter la rotation des clés

## 📝 Logging

### Configuration
```xml
<!-- logback.xml -->
<configuration>
    <appender name="FILE" class="ch.qos.logback.core.FileAppender">
        <file>logs/ecodeli-desktop.log</file>
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    
    <root level="INFO">
        <appender-ref ref="FILE" />
    </root>
</configuration>
```

### Niveaux
- **ERROR** : Erreurs critiques
- **WARN** : Avertissements
- **INFO** : Informations générales
- **DEBUG** : Détails pour développement

## 🚀 Déploiement

### Build Production
```bash
# Build optimisé
mvn clean package -Pproduction

# Création d'un exécutable natif (GraalVM)
mvn package -Pnative

# Distribution
./scripts/build.sh full
./scripts/install.sh --prefix /opt/ecodeli
```

### Distribution
- **JAR autonome** : `target/ecodeli-desktop-*-jar-with-dependencies.jar`
- **Installateur** : Scripts dans `scripts/`
- **Service système** : Configuration systemd incluse

## 🤝 Contribution

### Guidelines
1. **Fork** le repository
2. **Créer une branche** feature/nouvelle-fonctionnalite
3. **Développer** avec tests
4. **Commiter** avec messages explicites
5. **Pull Request** vers main

### Standards
- **Code Style** : Google Java Style Guide
- **Documentation** : JavaDoc pour toutes les classes publiques
- **Tests** : Coverage minimum 80%
- **Performance** : Profiling requis pour nouvelles fonctionnalités

## 📞 Support

### Ressources
- **Documentation** : `/docs`
- **Issues** : GitHub Issues
- **Discussions** : GitHub Discussions
- **Contact** : support@ecodeli.com

### Troubleshooting
- **Logs** : `logs/ecodeli-desktop.log`
- **Mode debug** : `./scripts/run.sh --debug`
- **Mode démo** : Fallback en cas de problème API
- **Réinstallation** : `./scripts/install.sh --user`

## 📄 Licence

Ce projet est sous licence [MIT](LICENSE).

## 🎯 Roadmap

### Version 1.1
- [ ] Module de prédiction IA
- [ ] Export PowerBI/Tableau
- [ ] API GraphQL
- [ ] Mode multi-tenant

### Version 1.2
- [ ] Application web companion
- [ ] Notifications push
- [ ] Rapports automatisés
- [ ] Intégration CI/CD

---

**Développé avec ❤️ pour EcoDeli**