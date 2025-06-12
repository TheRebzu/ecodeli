package com.ecodeli.presentation.ui.delivery

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.ecodeli.data.models.Delivery
import com.ecodeli.data.models.DeliveryStatus
import com.ecodeli.presentation.ui.common.LoadingScreen
import com.ecodeli.presentation.ui.theme.*
import com.ecodeli.presentation.viewmodels.DeliveryListViewModel
import java.text.SimpleDateFormat
import java.util.*

/**
 * Écran de liste des livraisons
 */
@Composable
fun DeliveryListScreen(
    onDeliveryClick: (Delivery) -> Unit,
    onNavigateBack: (() -> Unit)? = null,
    viewModel: DeliveryListViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Header avec filtres
        if (onNavigateBack != null) {
            TopAppBar(
                title = { Text("Mes livraisons") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Retour")
                    }
                }
            )
        }
        
        // Filtres par statut
        DeliveryStatusFilter(
            selectedStatus = uiState.selectedStatus,
            onStatusSelected = viewModel::loadDeliveries
        )
        
        // Contenu principal
        if (uiState.isLoading) {
            LoadingScreen("Chargement des livraisons...")
        } else if (uiState.deliveries.isEmpty()) {
            EmptyDeliveryState(
                selectedStatus = uiState.selectedStatus,
                onRefresh = viewModel::refresh
            )
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(
                    items = uiState.deliveries,
                    key = { it.id }
                ) { delivery ->
                    DeliveryCard(
                        delivery = delivery,
                        onClick = { onDeliveryClick(delivery) }
                    )
                }
            }
        }
    }
}

/**
 * Filtres par statut de livraison
 */
@Composable
private fun DeliveryStatusFilter(
    selectedStatus: DeliveryStatus?,
    onStatusSelected: (DeliveryStatus?) -> Unit
) {
    val statusFilters = listOf(
        null to "Toutes",
        DeliveryStatus.PENDING to "En attente",
        DeliveryStatus.IN_TRANSIT to "En cours",
        DeliveryStatus.DELIVERED to "Livrées",
        DeliveryStatus.CANCELLED to "Annulées"
    )
    
    LazyRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
    ) {
        items(statusFilters) { (status, label) ->
            FilterChip(
                onClick = { onStatusSelected(status) },
                label = { Text(label) },
                selected = selectedStatus == status
            )
        }
    }
}

/**
 * Carte d'une livraison
 */
@Composable
private fun DeliveryCard(
    delivery: Delivery,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // En-tête avec numéro de suivi et statut
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "# ${delivery.trackingNumber}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                
                DeliveryStatusChip(status = delivery.status)
            }
            
            // Description
            Text(
                text = delivery.description,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            
            // Adresses
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "De:",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${delivery.pickupAddress.city}",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
                
                Icon(
                    imageVector = Icons.Filled.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Vers:",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${delivery.deliveryAddress.city}",
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            
            // Informations supplémentaires
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${String.format("%.2f", delivery.price)}€",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                
                Text(
                    text = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
                        .format(delivery.createdAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

/**
 * Chip de statut de livraison
 */
@Composable
private fun DeliveryStatusChip(status: DeliveryStatus) {
    val (color, text) = when (status) {
        DeliveryStatus.PENDING -> DeliveryPending to "En attente"
        DeliveryStatus.ACCEPTED -> DeliveryAccepted to "Acceptée"
        DeliveryStatus.IN_TRANSIT -> DeliveryInTransit to "En cours"
        DeliveryStatus.DELIVERED -> DeliveryDelivered to "Livrée"
        DeliveryStatus.CANCELLED -> DeliveryCancelled to "Annulée"
        DeliveryStatus.FAILED -> DeliveryCancelled to "Échec"
        else -> MaterialTheme.colorScheme.outline to "Inconnu"
    }
    
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = MaterialTheme.shapes.small,
        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.Medium
        )
    }
}

/**
 * État vide des livraisons
 */
@Composable
private fun EmptyDeliveryState(
    selectedStatus: DeliveryStatus?,
    onRefresh: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Filled.LocalShipping,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = if (selectedStatus == null) {
                "Aucune livraison trouvée"
            } else {
                "Aucune livraison avec ce statut"
            },
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Text(
            text = "Vos livraisons apparaîtront ici une fois créées",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Button(onClick = onRefresh) {
            Text("Actualiser")
        }
    }
}