# =============================================================================
# DOCKERFILE POUR L'APPLICATION DESKTOP JAVA - MULTI-STAGE
# =============================================================================

# Stage 1: Build environment
FROM openjdk:17-jdk-alpine AS builder

# Installation des outils de build
RUN apk add --no-cache \
    maven \
    git \
    curl

# Définition du répertoire de travail
WORKDIR /app

# Copie des fichiers de configuration Maven
COPY pom.xml ./
COPY src/ ./src/

# Configuration Maven pour Docker
RUN mvn dependency:go-offline -B

# Build de l'application
RUN mvn clean package -DskipTests -Pdocker

# Vérification du build
RUN ls -la target/

# =============================================================================
# Stage 2: Runtime environment
FROM openjdk:17-jre-alpine AS runtime

# Installation des dépendances système nécessaires
RUN apk add --no-cache \
    # Dépendances pour JavaFX
    gtk+3.0-dev \
    libxrender \
    libxtst \
    libxi \
    freetype \
    fontconfig \
    # Outils système
    curl \
    bash \
    tzdata \
    # Support pour les polices
    ttf-dejavu \
    # X11 pour l'affichage (si nécessaire)
    xvfb \
    x11vnc \
    fluxbox

# Configuration du timezone
ENV TZ=Europe/Paris
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Création d'un utilisateur non-root
RUN addgroup -g 1001 -S ecodeli && \
    adduser -u 1001 -S ecodeli -G ecodeli

# Création des répertoires de travail
RUN mkdir -p /app/config \
    /app/logs \
    /app/data \
    /app/reports \
    /app/temp

# Copie de l'application depuis le builder
COPY --from=builder /app/target/ecodeli-desktop-*.jar /app/ecodeli-desktop.jar

# Copie des fichiers de configuration
COPY src/main/resources/application.conf /app/config/
COPY src/main/resources/application-production.conf /app/config/
COPY src/main/resources/logback.xml /app/config/

# Configuration des permissions
RUN chown -R ecodeli:ecodeli /app

# Changement vers l'utilisateur non-root
USER ecodeli

# Variables d'environnement
ENV JAVA_OPTS="-Xmx2G -Xms512M -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
ENV APP_ENV=production
ENV DISPLAY=:1

# Répertoire de travail final
WORKDIR /app

# Exposition du port pour l'API REST (si nécessaire)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Script d'entrypoint
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["java", "-jar", "ecodeli-desktop.jar"]

# =============================================================================
# Stage 3: Development
FROM runtime AS development

# Retour en root pour installer les outils de dev
USER root

# Installation d'outils de développement supplémentaires
RUN apk add --no-cache \
    maven \
    git \
    nano \
    htop

# Changement vers l'utilisateur de développement
USER ecodeli

# Variables d'environnement pour le développement
ENV APP_ENV=development
ENV JAVA_OPTS="-Xmx1G -Xms256M -XX:+UseG1GC -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"

# Exposition du port de debug
EXPOSE 5005

# Commande de développement avec auto-reload
CMD ["java", "-jar", "ecodeli-desktop.jar", "--dev"]

# =============================================================================
# Stage 4: Headless (pour serveur sans interface graphique)
FROM runtime AS headless

# Variables d'environnement pour mode headless
ENV JAVA_OPTS="-Xmx2G -Xms512M -XX:+UseG1GC -Djava.awt.headless=true"
ENV APP_MODE=headless

# Pas besoin d'interface graphique
USER ecodeli

# Commande pour mode headless
CMD ["java", "-jar", "ecodeli-desktop.jar", "--headless"]

# =============================================================================
# Stage 5: Testing
FROM builder AS testing

# Installation des outils de test
RUN apk add --no-cache \
    xvfb \
    gtk+3.0-dev

# Configuration pour les tests
ENV DISPLAY=:99
ENV TESTFX_HEADLESS=true

# Commande de test
CMD ["mvn", "test"]

# =============================================================================
# Métadonnées
LABEL maintainer="EcoDeli Team"
LABEL description="Application Desktop EcoDeli - JavaFX"
LABEL version="1.0.0"
LABEL java.version="17"