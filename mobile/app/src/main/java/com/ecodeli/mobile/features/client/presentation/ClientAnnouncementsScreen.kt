package com.ecodeli.mobile.features.client.presentation

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
import com.ecodeli.mobile.core.data.models.Announcement
import com.ecodeli.mobile.core.data.models.AnnouncementStatus
import com.ecodeli.mobile.core.data.models.AnnouncementType
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientAnnouncementsScreen(
    onNavigateToCreate: () -> Unit,
    onNavigateToDetail: (String) -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: ClientAnnouncementViewModel = hiltViewModel()
) {
    val announcements by viewModel.announcements.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    
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
                text = "Mes annonces",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            
            Row {
                IconButton(onClick = { viewModel.loadAnnouncements() }) {
                    Text("🔄", fontSize = 20.sp)
                }
                
                IconButton(onClick = onNavigateBack) {
                    Text("❌", fontSize = 20.sp)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Create Button
        Button(
            onClick = onNavigateToCreate,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("➕ Créer une annonce")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Content
        when (uiState) {
            is AnnouncementUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is AnnouncementUiState.Error -> {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = uiState.message,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
            else -> {
                if (announcements.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "📦",
                                fontSize = 48.sp
                            )
                            Text(
                                text = "Aucune annonce",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Créez votre première annonce pour commencer",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(announcements) { announcement ->
                            AnnouncementCard(
                                announcement = announcement,
                                onClick = { onNavigateToDetail(announcement.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AnnouncementCard(
    announcement: Announcement,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick
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
                    text = announcement.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                StatusBadge(status = announcement.status)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = announcement.description,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                maxLines = 2
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = getTypeEmoji(announcement.type) + " " + getTypeText(announcement.type),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                
                Text(
                    text = NumberFormat.getCurrencyInstance(Locale.FRANCE).format(announcement.price),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            Spacer(modifier = Modifier.height(4.dp))
            
            Text(
                text = "${announcement.pickupAddress.city} → ${announcement.deliveryAddress.city}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            )
        }
    }
}

@Composable
fun StatusBadge(status: AnnouncementStatus) {
    val (color, text) = when (status) {
        AnnouncementStatus.PENDING -> MaterialTheme.colorScheme.tertiary to "En attente"
        AnnouncementStatus.ACCEPTED -> MaterialTheme.colorScheme.primary to "Acceptée"
        AnnouncementStatus.IN_PROGRESS -> MaterialTheme.colorScheme.secondary to "En cours"
        AnnouncementStatus.COMPLETED -> MaterialTheme.colorScheme.primary to "Terminée"
        AnnouncementStatus.CANCELLED -> MaterialTheme.colorScheme.error to "Annulée"
    }
    
    Surface(
        color = color,
        shape = MaterialTheme.shapes.small
    ) {
        Text(
            text = text,
            fontSize = 10.sp,
            color = MaterialTheme.colorScheme.onPrimary,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}

fun getTypeEmoji(type: AnnouncementType): String {
    return when (type) {
        AnnouncementType.PACKAGE -> "📦"
        AnnouncementType.PERSON_TRANSPORT -> "🚗"
        AnnouncementType.SHOPPING -> "🛒"
        AnnouncementType.PET_SITTING -> "🐕"
        AnnouncementType.SERVICE -> "🔧"
        AnnouncementType.INTERNATIONAL_PURCHASE -> "🌍"
    }
}

fun getTypeText(type: AnnouncementType): String {
    return when (type) {
        AnnouncementType.PACKAGE -> "Colis"
        AnnouncementType.PERSON_TRANSPORT -> "Transport"
        AnnouncementType.SHOPPING -> "Courses"
        AnnouncementType.PET_SITTING -> "Garde animaux"
        AnnouncementType.SERVICE -> "Service"
        AnnouncementType.INTERNATIONAL_PURCHASE -> "Achat international"
    }
}