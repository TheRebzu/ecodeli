package com.ecodeli.mobile.features.delivery.presentation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.RemoveRedEye
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecodeli.mobile.core.data.models.Delivery
import com.ecodeli.mobile.core.data.models.DeliveryStatus
import java.text.NumberFormat
import java.text.SimpleDateFormat
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
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.primaryContainer
            ),
            shape = RoundedCornerShape(16.dp)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Mes livraisons",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = "Suivez vos colis en temps réel",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                }
                
                Row {
                    IconButton(
                        onClick = { viewModel.loadDeliveries() },
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.primary)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Refresh,
                            contentDescription = "Actualiser",
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    IconButton(
                        onClick = onNavigateBack,
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(MaterialTheme.colorScheme.error)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Retour",
                            tint = MaterialTheme.colorScheme.onError
                        )
                    }
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
                    when (val currentState = trackingState) {
                        is TrackingState.Error -> {
                            Text(
                                text = currentState.message,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.padding(16.dp)
                            )
                        }
                        else -> {}
                    }
                }
            }
            else -> {
                // Summary card
                if (deliveries.isNotEmpty()) {
                    DeliveryStatsCard(deliveries = deliveries)
                    
                    Spacer(modifier = Modifier.height(16.dp))
                }
                
                if (deliveries.isEmpty()) {
                    EmptyDeliveryState()
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(deliveries) { delivery ->
                            AnimatedVisibility(
                                visible = true,
                                enter = fadeIn(animationSpec = tween(300)),
                                exit = fadeOut(animationSpec = tween(300))
                            ) {
                                EnhancedDeliveryCard(
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
                    text = "${announcement.pickupAddress ?: "Non spécifié"} → ${announcement.deliveryAddress ?: "Non spécifié"}",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = NumberFormat.getCurrencyInstance(Locale.FRANCE).format(announcement.basePrice),
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
fun EnhancedDeliveryCard(
    delivery: Delivery,
    onTrackClick: () -> Unit,
    onValidateClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp)
        ) {
            // Header avec statut
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = delivery.announcement?.title ?: "Livraison",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Code: ${delivery.trackingCode}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                
                EnhancedDeliveryStatusBadge(status = delivery.status)
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Informations de livraison
            delivery.announcement?.let { announcement ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.LocationOn,
                        contentDescription = "Adresse",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "De: ${announcement.pickupAddress ?: "Non spécifié"}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "À: ${announcement.deliveryAddress ?: "Non spécifié"}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Prix et date
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.MonetizationOn,
                            contentDescription = "Prix",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = NumberFormat.getCurrencyInstance(Locale.FRANCE).format(announcement.basePrice),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Date",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = formatDate(delivery.createdAt),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Barre de progression
            DeliveryProgressBar(status = delivery.status)
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Boutons d'action
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedButton(
                    onClick = onTrackClick,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.RemoveRedEye,
                        contentDescription = "Suivre",
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Suivre")
                }
                
                if (delivery.status == DeliveryStatus.DELIVERED) {
                    Button(
                        onClick = onValidateClick,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Valider",
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Valider")
                    }
                }
            }
        }
    }
}

@Composable
fun EnhancedDeliveryStatusBadge(status: DeliveryStatus) {
    val (color, text, icon) = when (status) {
        DeliveryStatus.PENDING_PICKUP -> Triple(
            MaterialTheme.colorScheme.tertiary, 
            "En attente", 
            Icons.Default.Add
        )
        DeliveryStatus.PICKED_UP -> Triple(
            MaterialTheme.colorScheme.primary, 
            "Récupéré", 
            Icons.Default.Business
        )
        DeliveryStatus.IN_TRANSIT -> Triple(
            MaterialTheme.colorScheme.secondary, 
            "En transit", 
            Icons.Default.DirectionsCar
        )
        DeliveryStatus.DELIVERED -> Triple(
            Color(0xFF4CAF50), 
            "Livré", 
            Icons.Default.CheckCircle
        )
        DeliveryStatus.FAILED -> Triple(
            MaterialTheme.colorScheme.error, 
            "Échec", 
            Icons.Default.Close
        )
        DeliveryStatus.CANCELLED -> Triple(
            MaterialTheme.colorScheme.error, 
            "Annulé", 
            Icons.Default.Close
        )
    }
    
    Surface(
        color = color,
        shape = RoundedCornerShape(20.dp),
        modifier = Modifier.padding(4.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = text,
                tint = Color.White,
                modifier = Modifier.size(12.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = text,
                fontSize = 11.sp,
                color = Color.White,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
fun DeliveryProgressBar(status: DeliveryStatus) {
    val progress = when (status) {
        DeliveryStatus.PENDING_PICKUP -> 0.2f
        DeliveryStatus.PICKED_UP -> 0.4f
        DeliveryStatus.IN_TRANSIT -> 0.7f
        DeliveryStatus.DELIVERED -> 1.0f
        DeliveryStatus.FAILED, DeliveryStatus.CANCELLED -> 0.0f
    }
    
    val color = when (status) {
        DeliveryStatus.DELIVERED -> Color(0xFF4CAF50)
        DeliveryStatus.FAILED, DeliveryStatus.CANCELLED -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.primary
    }
    
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = "Progression",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = "${(progress * 100).toInt()}%",
                fontSize = 12.sp,
                color = color
            )
        }
        
        Spacer(modifier = Modifier.height(4.dp))
        
        LinearProgressIndicator(
            progress = progress,
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(4.dp)),
            color = color,
            trackColor = MaterialTheme.colorScheme.surfaceVariant
        )
    }
}

@Composable
fun DeliveryStatsCard(deliveries: List<Delivery>) {
    val inProgress = deliveries.count { it.status in listOf(DeliveryStatus.PENDING_PICKUP, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT) }
    val delivered = deliveries.count { it.status == DeliveryStatus.DELIVERED }
    val failed = deliveries.count { it.status in listOf(DeliveryStatus.FAILED, DeliveryStatus.CANCELLED) }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Résumé",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                StatItem(
                    count = inProgress,
                    label = "En cours",
                    color = MaterialTheme.colorScheme.primary,
                    icon = Icons.Default.DirectionsCar
                )
                StatItem(
                    count = delivered,
                    label = "Livrées",
                    color = Color(0xFF4CAF50),
                    icon = Icons.Default.CheckCircle
                )
                StatItem(
                    count = failed,
                    label = "Problèmes",
                    color = MaterialTheme.colorScheme.error,
                    icon = Icons.Default.Close
                )
            }
        }
    }
}

@Composable
fun StatItem(count: Int, label: String, color: Color, icon: ImageVector) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(color.copy(alpha = 0.1f))
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(24.dp)
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = count.toString(),
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.7f)
        )
    }
}

@Composable
fun EmptyDeliveryState() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            Icon(
                imageVector = Icons.Default.DirectionsCar,
                contentDescription = "Aucune livraison",
                modifier = Modifier.size(72.dp),
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Aucune livraison",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Vos livraisons apparaîtront ici dès que vous en aurez",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
        }
    }
}

fun formatDate(dateString: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
        val outputFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        val date = inputFormat.parse(dateString)
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        "Date inconnue"
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