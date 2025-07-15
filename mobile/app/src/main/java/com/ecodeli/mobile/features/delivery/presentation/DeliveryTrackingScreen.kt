package com.ecodeli.mobile.features.delivery.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecodeli.mobile.core.data.models.Delivery
import com.ecodeli.mobile.core.data.models.DeliveryStatus
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryTrackingScreen(
    onNavigateToValidation: (String) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: DeliveryTrackingViewModel = hiltViewModel()
) {
    val deliveries by viewModel.deliveries.collectAsState()
    val trackingState by viewModel.trackingState.collectAsState()
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Mes livraisons",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            
            Row {
                IconButton(onClick = { viewModel.loadDeliveries() }) {
                    Text("🔄", fontSize = 20.sp)
                }
                
                IconButton(onClick = onNavigateBack) {
                    Text("❌", fontSize = 20.sp)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Content
        when (trackingState) {
            is TrackingState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is TrackingState.Error -> {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = trackingState.message,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
            else -> {
                if (deliveries.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "🚚",
                                fontSize = 48.sp
                            )
                            Text(
                                text = "Aucune livraison",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Vos livraisons apparaîtront ici",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(deliveries) { delivery ->
                            DeliveryCard(
                                delivery = delivery,
                                onTrackClick = { 
                                    viewModel.trackDelivery(delivery.id)
                                },
                                onValidateClick = { 
                                    onNavigateToValidation(delivery.id)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun DeliveryCard(
    delivery: Delivery,
    onTrackClick: () -> Unit,
    onValidateClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = delivery.announcement?.title ?: "Livraison",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                DeliveryStatusBadge(status = delivery.status)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Code de suivi: ${delivery.trackingCode}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.primary
            )
            
            delivery.announcement?.let { announcement ->
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${announcement.pickupAddress.city} → ${announcement.deliveryAddress.city}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = NumberFormat.getCurrencyInstance(Locale.FRANCE).format(announcement.price),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onTrackClick,
                    modifier = Modifier.weight(1f)
                ) {
                    Text("📍 Suivre")
                }
                
                if (delivery.status == DeliveryStatus.DELIVERED) {
                    Button(
                        onClick = onValidateClick,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("✅ Valider")
                    }
                }
            }
        }
    }
}

@Composable
fun DeliveryStatusBadge(status: DeliveryStatus) {
    val (color, text, emoji) = when (status) {
        DeliveryStatus.PENDING_PICKUP -> Triple(MaterialTheme.colorScheme.tertiary, "En attente", "⏳")
        DeliveryStatus.PICKED_UP -> Triple(MaterialTheme.colorScheme.primary, "Récupéré", "📦")
        DeliveryStatus.IN_TRANSIT -> Triple(MaterialTheme.colorScheme.secondary, "En transit", "🚚")
        DeliveryStatus.DELIVERED -> Triple(MaterialTheme.colorScheme.primary, "Livré", "✅")
        DeliveryStatus.FAILED -> Triple(MaterialTheme.colorScheme.error, "Échec", "❌")
        DeliveryStatus.CANCELLED -> Triple(MaterialTheme.colorScheme.error, "Annulé", "🚫")
    }
    
    Surface(
        color = color,
        shape = MaterialTheme.shapes.small
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        ) {
            Text(
                text = emoji,
                fontSize = 10.sp
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onPrimary
            )
        }
    }
}