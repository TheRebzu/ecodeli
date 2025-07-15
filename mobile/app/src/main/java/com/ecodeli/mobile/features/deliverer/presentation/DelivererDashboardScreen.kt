package com.ecodeli.mobile.features.deliverer.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecodeli.mobile.features.auth.presentation.AuthViewModel
import com.ecodeli.mobile.features.client.presentation.DashboardCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DelivererDashboardScreen(
    onNavigateToOpportunities: () -> Unit,
    onNavigateToActiveDeliveries: () -> Unit,
    onLogout: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val currentUser by authViewModel.currentUser.collectAsState(initial = null)
    
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
            Column {
                Text(
                    text = "Bonjour livreur,",
                    fontSize = 16.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                Text(
                    text = "${currentUser?.firstName} ${currentUser?.lastName}",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
            
            IconButton(onClick = onLogout) {
                Text("🚪", fontSize = 20.sp)
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Quick Stats
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Statistiques du jour",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    StatItem("📦", "0", "Livraisons")
                    StatItem("💰", "0€", "Gains")
                    StatItem("⭐", "5.0", "Note")
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Quick Actions
        LazyColumn(
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                DashboardCard(
                    title = "Opportunités",
                    description = "Voir les annonces disponibles",
                    icon = "🔍",
                    onClick = onNavigateToOpportunities
                )
            }
            
            item {
                DashboardCard(
                    title = "Livraisons actives",
                    description = "Gérer vos livraisons en cours",
                    icon = "🚚",
                    onClick = onNavigateToActiveDeliveries
                )
            }
            
            item {
                DashboardCard(
                    title = "Mon planning",
                    description = "Gérer vos disponibilités",
                    icon = "📅",
                    onClick = { /* TODO */ }
                )
            }
            
            item {
                DashboardCard(
                    title = "Mes gains",
                    description = "Consulter vos revenus",
                    icon = "💰",
                    onClick = { /* TODO */ }
                )
            }
            
            item {
                DashboardCard(
                    title = "Mon profil",
                    description = "Gérer votre profil livreur",
                    icon = "👤",
                    onClick = { /* TODO */ }
                )
            }
        }
    }
}

@Composable
fun StatItem(
    icon: String,
    value: String,
    label: String
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = icon,
            fontSize = 24.sp
        )
        Text(
            text = value,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = label,
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        )
    }
}