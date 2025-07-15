package com.ecodeli.mobile.features.delivery.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ecodeli.mobile.features.nfc.NfcState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DeliveryValidationScreen(
    deliveryId: String,
    onValidationSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: DeliveryTrackingViewModel = hiltViewModel()
) {
    var validationCode by remember { mutableStateOf("") }
    
    val validationState by viewModel.validationState.collectAsState()
    val nfcState by viewModel.nfcState.collectAsState()
    val delivererCard by viewModel.delivererCard.collectAsState()
    
    LaunchedEffect(validationState) {
        when (validationState) {
            is ValidationState.Validated -> {
                onValidationSuccess()
            }
            else -> {}
        }
    }
    
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
                text = "Validation de livraison",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            
            IconButton(onClick = onNavigateBack) {
                Text("❌", fontSize = 20.sp)
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // NFC Section
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp)
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "📱",
                    fontSize = 48.sp
                )
                
                Text(
                    text = "Reconnaissance NFC",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                when (nfcState) {
                    is NfcState.Idle -> {
                        Text(
                            text = "Approchez la carte NFC du livreur de votre téléphone",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                    is NfcState.Ready -> {
                        Text(
                            text = "NFC activé - Prêt à scanner",
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    is NfcState.Reading -> {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp)
                            )
                            Text("Lecture en cours...")
                        }
                    }
                    is NfcState.Success -> {
                        Text(
                            text = "✅ Livreur reconnu: ${nfcState.delivererCard.delivererName}",
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                    is NfcState.Error -> {
                        Text(
                            text = "❌ ${nfcState.message}",
                            color = MaterialTheme.colorScheme.error
                        )
                    }
                }
                
                if (delivererCard != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "ID: ${delivererCard.delivererId}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Manual Code Input
        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp)
            ) {
                Text(
                    text = "Validation manuelle",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = validationCode,
                    onValueChange = { validationCode = it },
                    label = { Text("Code de validation") },
                    placeholder = { Text("Entrez le code à 6 chiffres") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                
                Spacer(modifier = Modifier.height(16.dp))
                
                Button(
                    onClick = {
                        viewModel.validateDelivery(deliveryId, validationCode)
                    },
                    enabled = validationCode.length == 6 && validationState !is ValidationState.Validating,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (validationState is ValidationState.Validating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Valider la livraison")
                    }
                }
            }
        }
        
        // Error Display
        when (validationState) {
            is ValidationState.Error -> {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = validationState.message,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
            is ValidationState.DelivererVerified -> {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer
                    )
                ) {
                    Text(
                        text = "✅ Livreur ${validationState.card.delivererName} vérifié avec succès",
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
            else -> {}
        }
    }
}