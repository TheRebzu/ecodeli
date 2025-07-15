package com.ecodeli.mobile.features.deliverer.presentation

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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.models.Announcement
import com.ecodeli.mobile.core.data.models.AnnouncementType
import com.ecodeli.mobile.core.data.repository.AnnouncementRepository
import com.ecodeli.mobile.core.utils.Resource
import com.ecodeli.mobile.features.client.presentation.getTypeEmoji
import com.ecodeli.mobile.features.client.presentation.getTypeText
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.*
import javax.inject.Inject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OpportunitiesScreen(
    onNavigateBack: () -> Unit,
    viewModel: DelivererOpportunitiesViewModel = hiltViewModel()
) {
    val opportunities by viewModel.opportunities.collectAsState()
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
                text = "Opportunités",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            
            Row {
                IconButton(onClick = { viewModel.loadOpportunities() }) {
                    Text("🔄", fontSize = 20.sp)
                }
                
                IconButton(onClick = onNavigateBack) {
                    Text("❌", fontSize = 20.sp)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Content
        when (uiState) {
            is OpportunityUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is OpportunityUiState.Error -> {
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    when (val currentState = uiState) {
                        is OpportunityUiState.Error -> {
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
                if (opportunities.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "🔍",
                                fontSize = 48.sp
                            )
                            Text(
                                text = "Aucune opportunité",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Revenez plus tard pour de nouvelles opportunités",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(opportunities) { opportunity ->
                            OpportunityCard(
                                opportunity = opportunity,
                                onAccept = { viewModel.acceptOpportunity(opportunity.id) },
                                isAccepting = uiState is OpportunityUiState.Accepting
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun OpportunityCard(
    opportunity: Announcement,
    onAccept: () -> Unit,
    isAccepting: Boolean
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
                    text = opportunity.title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Text(
                    text = NumberFormat.getCurrencyInstance(Locale.FRANCE).format(opportunity.basePrice),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = opportunity.description,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                maxLines = 2
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = getTypeEmoji(opportunity.type ?: AnnouncementType.PACKAGE) + " " + getTypeText(opportunity.type ?: AnnouncementType.PACKAGE),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary
                )
                
                opportunity.packageDetails?.weight?.let { weight ->
                    Text(
                        text = "${weight}kg",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f)
                ) {
                    Text(
                        text = "📍 ${opportunity.pickupAddress ?: "Non spécifié"}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        text = "🏁 ${opportunity.deliveryAddress ?: "Non spécifié"}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
                
                Button(
                    onClick = onAccept,
                    enabled = !isAccepting
                ) {
                    if (isAccepting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Accepter")
                    }
                }
            }
        }
    }
}

// ViewModel pour les opportunités

@HiltViewModel
class DelivererOpportunitiesViewModel @Inject constructor(
    private val announcementRepository: AnnouncementRepository
) : ViewModel() {
    
    private val _opportunities = MutableStateFlow<List<Announcement>>(emptyList())
    val opportunities: StateFlow<List<Announcement>> = _opportunities.asStateFlow()
    
    private val _uiState = MutableStateFlow<OpportunityUiState>(OpportunityUiState.Idle)
    val uiState: StateFlow<OpportunityUiState> = _uiState.asStateFlow()
    
    init {
        loadOpportunities()
    }
    
    fun loadOpportunities() {
        viewModelScope.launch {
            _uiState.value = OpportunityUiState.Loading
            when (val result = announcementRepository.getDelivererOpportunities()) {
                is Resource.Success -> {
                    _opportunities.value = result.data
                    _uiState.value = OpportunityUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = OpportunityUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun acceptOpportunity(opportunityId: String) {
        viewModelScope.launch {
            _uiState.value = OpportunityUiState.Accepting
            when (val result = announcementRepository.acceptAnnouncement(opportunityId)) {
                is Resource.Success -> {
                    loadOpportunities() // Reload opportunities
                    _uiState.value = OpportunityUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = OpportunityUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
}

sealed class OpportunityUiState {
    object Idle : OpportunityUiState()
    object Loading : OpportunityUiState()
    object Success : OpportunityUiState()
    object Accepting : OpportunityUiState()
    data class Error(val message: String) : OpportunityUiState()
}