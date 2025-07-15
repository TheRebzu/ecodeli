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
import com.ecodeli.mobile.core.data.models.Delivery
import com.ecodeli.mobile.core.data.models.DeliveryStatus
import com.ecodeli.mobile.features.delivery.presentation.DeliveryTrackingViewModel
import com.ecodeli.mobile.features.delivery.presentation.TrackingState
import java.text.NumberFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActiveDeliveriesScreen(
    onNavigateBack: () -> Unit,
    viewModel: ActiveDeliveriesViewModel = hiltViewModel()
) {
    val deliveries by viewModel.deliveries.collectAsState()
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
                text = "Livraisons actives",
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
        when (uiState) {
            is ActiveDeliveryUiState.Loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            is ActiveDeliveryUiState.Error -> {
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
                                text = "Aucune livraison active",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Acceptez des opportunités pour commencer",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(deliveries) { delivery ->
                            ActiveDeliveryCard(
                                delivery = delivery,
                                onConfirmPickup = { viewModel.confirmPickup(delivery.id) },
                                onGenerateCode = { viewModel.generateValidationCode(delivery.id) },
                                onCompleteDelivery = { code -> 
                                    viewModel.completeDelivery(delivery.id, code)
                                },
                                isProcessing = uiState is ActiveDeliveryUiState.Processing
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ActiveDeliveryCard(
    delivery: Delivery,
    onConfirmPickup: () -> Unit,
    onGenerateCode: () -> Unit,
    onCompleteDelivery: (String) -> Unit,
    isProcessing: Boolean
) {
    var showCodeDialog by remember { mutableStateOf(false) }
    
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
                
                DeliveryStatusChip(status = delivery.status)
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Code: ${delivery.trackingCode}",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.primary
            )
            
            delivery.announcement?.let { announcement ->
                Spacer(modifier = Modifier.height(8.dp))
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = "📍 ${announcement.pickupAddress.city}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                        Text(
                            text = "🏁 ${announcement.deliveryAddress.city}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                    
                    Text(
                        text = NumberFormat.getCurrencyInstance(Locale.FRANCE).format(announcement.price),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Action buttons based on delivery status
            when (delivery.status) {
                DeliveryStatus.PENDING_PICKUP -> {
                    Button(
                        onClick = onConfirmPickup,
                        enabled = !isProcessing,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (isProcessing) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text("📦 Confirmer récupération")
                        }
                    }
                }
                
                DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT -> {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = onGenerateCode,
                            enabled = !isProcessing,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("🔢 Code")
                        }
                        
                        Button(
                            onClick = { showCodeDialog = true },
                            enabled = !isProcessing,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("✅ Livrer")
                        }
                    }
                }
                
                else -> {
                    // No actions for completed/failed deliveries
                }
            }
            
            // Show validation code if available
            delivery.validationCode?.let { code ->
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Text(
                        text = "Code de validation: $code",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(12.dp)
                    )
                }
            }
        }
    }
    
    // Complete delivery dialog
    if (showCodeDialog) {
        var validationCode by remember { mutableStateOf("") }
        
        AlertDialog(
            onDismissRequest = { showCodeDialog = false },
            title = { Text("Compléter la livraison") },
            text = {
                Column {
                    Text("Entrez le code de validation du client:")
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = validationCode,
                        onValueChange = { validationCode = it },
                        label = { Text("Code") },
                        singleLine = true
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        onCompleteDelivery(validationCode)
                        showCodeDialog = false
                    },
                    enabled = validationCode.isNotBlank()
                ) {
                    Text("Confirmer")
                }
            },
            dismissButton = {
                TextButton(onClick = { showCodeDialog = false }) {
                    Text("Annuler")
                }
            }
        )
    }
}

@Composable
fun DeliveryStatusChip(status: DeliveryStatus) {
    val (color, text) = when (status) {
        DeliveryStatus.PENDING_PICKUP -> MaterialTheme.colorScheme.tertiary to "En attente"
        DeliveryStatus.PICKED_UP -> MaterialTheme.colorScheme.primary to "Récupéré"
        DeliveryStatus.IN_TRANSIT -> MaterialTheme.colorScheme.secondary to "En transit"
        DeliveryStatus.DELIVERED -> MaterialTheme.colorScheme.primary to "Livré"
        DeliveryStatus.FAILED -> MaterialTheme.colorScheme.error to "Échec"
        DeliveryStatus.CANCELLED -> MaterialTheme.colorScheme.error to "Annulé"
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

// ViewModel pour les livraisons actives
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ecodeli.mobile.core.data.repository.DeliveryRepository
import com.ecodeli.mobile.core.utils.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ActiveDeliveriesViewModel @Inject constructor(
    private val deliveryRepository: DeliveryRepository
) : ViewModel() {
    
    private val _deliveries = MutableStateFlow<List<Delivery>>(emptyList())
    val deliveries: StateFlow<List<Delivery>> = _deliveries.asStateFlow()
    
    private val _uiState = MutableStateFlow<ActiveDeliveryUiState>(ActiveDeliveryUiState.Idle)
    val uiState: StateFlow<ActiveDeliveryUiState> = _uiState.asStateFlow()
    
    init {
        loadDeliveries()
    }
    
    fun loadDeliveries() {
        viewModelScope.launch {
            _uiState.value = ActiveDeliveryUiState.Loading
            when (val result = deliveryRepository.getDelivererDeliveries()) {
                is Resource.Success -> {
                    _deliveries.value = result.data
                    _uiState.value = ActiveDeliveryUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = ActiveDeliveryUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun confirmPickup(deliveryId: String) {
        viewModelScope.launch {
            _uiState.value = ActiveDeliveryUiState.Processing
            when (val result = deliveryRepository.confirmPickup(deliveryId)) {
                is Resource.Success -> {
                    loadDeliveries() // Reload deliveries
                    _uiState.value = ActiveDeliveryUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = ActiveDeliveryUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun generateValidationCode(deliveryId: String) {
        viewModelScope.launch {
            _uiState.value = ActiveDeliveryUiState.Processing
            when (val result = deliveryRepository.generateValidationCode(deliveryId)) {
                is Resource.Success -> {
                    loadDeliveries() // Reload to get updated delivery with code
                    _uiState.value = ActiveDeliveryUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = ActiveDeliveryUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
    
    fun completeDelivery(deliveryId: String, validationCode: String) {
        viewModelScope.launch {
            _uiState.value = ActiveDeliveryUiState.Processing
            when (val result = deliveryRepository.completeDelivery(deliveryId, validationCode, null)) {
                is Resource.Success -> {
                    loadDeliveries() // Reload deliveries
                    _uiState.value = ActiveDeliveryUiState.Success
                }
                is Resource.Error -> {
                    _uiState.value = ActiveDeliveryUiState.Error(result.message)
                }
                is Resource.Loading -> {}
            }
        }
    }
}

sealed class ActiveDeliveryUiState {
    object Idle : ActiveDeliveryUiState()
    object Loading : ActiveDeliveryUiState()
    object Success : ActiveDeliveryUiState()
    object Processing : ActiveDeliveryUiState()
    data class Error(val message: String) : ActiveDeliveryUiState()
}