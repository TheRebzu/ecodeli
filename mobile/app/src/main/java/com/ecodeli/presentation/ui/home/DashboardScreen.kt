package com.ecodeli.presentation.ui.home

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecodeli.presentation.ui.common.LoadingScreen
import com.ecodeli.presentation.viewmodels.DashboardViewModel

/**
 * Écran dashboard principal
 */
@Composable
fun DashboardScreen(
    onNavigateToDeliveries: () -> Unit,
    onNavigateToServices: () -> Unit,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    if (uiState.isLoading) {
        LoadingScreen()
    } else {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // En-tête avec salutation
            item {
                WelcomeHeader(userName = uiState.userName)
            }
            
            // Actions rapides
            item {
                QuickActions(
                    onDeliveryClick = onNavigateToDeliveries,
                    onServiceClick = onNavigateToServices
                )
            }
            
            // Statistiques
            item {
                StatsSection(
                    activeDeliveries = uiState.activeDeliveries,
                    upcomingServices = uiState.upcomingServices,
                    walletBalance = uiState.walletBalance
                )
            }
            
            // Livraisons actives
            if (uiState.recentDeliveries.isNotEmpty()) {
                item {
                    Text(
                        text = "Livraisons en cours",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                item {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.recentDeliveries) { delivery ->
                            DeliveryCard(
                                delivery = delivery,
                                onClick = { /* Navigation vers détail */ }
                            )
                        }
                    }
                }
            }
            
            // Services réservés
            if (uiState.upcomingBookings.isNotEmpty()) {
                item {
                    Text(
                        text = "Prochains services",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
                
                items(uiState.upcomingBookings) { booking ->
                    ServiceBookingCard(
                        booking = booking,
                        onClick = { /* Navigation vers détail */ }
                    )
                }
            }
        }
    }
}

/**
 * En-tête de bienvenue
 */
@Composable
private fun WelcomeHeader(userName: String) {
    Column {
        Text(
            text = "Bonjour $userName !",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Que souhaitez-vous faire aujourd'hui ?",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

/**
 * Actions rapides
 */
@Composable
private fun QuickActions(
    onDeliveryClick: () -> Unit,
    onServiceClick: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ElevatedCard(
            onClick = onDeliveryClick,
            modifier = Modifier.weight(1f)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Filled.LocalShipping,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Nouvelle\nlivraison",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        
        ElevatedCard(
            onClick = onServiceClick,
            modifier = Modifier.weight(1f)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Icon(
                    imageVector = Icons.Filled.Build,
                    contentDescription = null,
                    modifier = Modifier.size(48.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Réserver\nun service",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

/**
 * Section des statistiques
 */
@Composable
private fun StatsSection(
    activeDeliveries: Int,
    upcomingServices: Int,
    walletBalance: Double
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            StatItem(
                icon = Icons.Filled.LocalShipping,
                value = activeDeliveries.toString(),
                label = "Livraisons"
            )
            
            StatItem(
                icon = Icons.Filled.CalendarToday,
                value = upcomingServices.toString(),
                label = "Services"
            )
            
            StatItem(
                icon = Icons.Filled.Euro,
                value = String.format("%.2f€", walletBalance),
                label = "Solde"
            )
        }
    }
}

/**
 * Élément de statistique
 */
@Composable
private fun StatItem(
    icon: ImageVector,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(24.dp)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

/**
 * Carte de livraison
 */
@Composable
private fun DeliveryCard(
    delivery: Any, // TODO: Remplacer par le modèle Delivery
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.width(200.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp)
        ) {
            Text(
                text = "Livraison #123",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "En transit",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Destination: Paris",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

/**
 * Carte de réservation de service
 */
@Composable
private fun ServiceBookingCard(
    booking: Any, // TODO: Remplacer par le modèle ServiceBooking
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Filled.Build,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "Plomberie",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = "Demain à 14h00",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = null
            )
        }
    }
}