package me.ecodeli.presentation.ui.delivery

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import me.ecodeli.data.models.DeliveryStatus
import me.ecodeli.presentation.ui.common.LoadingScreen
import me.ecodeli.presentation.ui.common.NfcReaderWithState
import me.ecodeli.presentation.ui.common.NfcState
import me.ecodeli.presentation.viewmodels.DeliveryDetailViewModel

/**
 * Écran de détail d'une livraison
 */
@Composable
fun DeliveryDetailScreen(
    onNavigateBack: () -> Unit,
    viewModel: DeliveryDetailViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var nfcState by remember { mutableStateOf<NfcState>(NfcState.Inactive) }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Header
        TopAppBar(
            title = { 
                Text(
                    text = uiState.delivery?.trackingNumber?.let { "Livraison #$it" } 
                        ?: "Détails de la livraison"
                ) 
            },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Retour")
                }
            }
        )
        
        // Contenu
        if (uiState.isLoading) {
            LoadingScreen("Chargement des détails...")
        } else {
            uiState.delivery?.let { delivery ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Statut de la livraison
                    DeliveryStatusCard(delivery = delivery)
                    
                    // Informations de livraison
                    DeliveryInfoCard(delivery = delivery)
                    
                    // Validation si en cours de livraison
                    if (delivery.status == DeliveryStatus.IN_TRANSIT && 
                        delivery.validatedAt == null) {
                        DeliveryValidationCard(
                            validationCode = uiState.validationCode,
                            onValidationCodeChange = viewModel::onValidationCodeChange,
                            onValidateWithCode = viewModel::validateWithCode,
                            nfcState = nfcState,
                            onStartNfcScan = { nfcState = NfcState.Scanning },
                            onStopNfcScan = { nfcState = NfcState.Inactive },
                            isValidating = uiState.isValidating,
                            validationError = uiState.validationError
                        )
                    }
                    
                    // Évaluation si livraison terminée
                    if (delivery.status == DeliveryStatus.DELIVERED && 
                        delivery.rating == null && 
                        !uiState.ratingSubmitted) {
                        DeliveryRatingCard(
                            rating = uiState.rating,
                            comment = uiState.comment,
                            onRatingChange = viewModel::onRatingChange,
                            onCommentChange = viewModel::onCommentChange,
                            onSubmitRating = viewModel::submitRating,
                            isSubmitting = uiState.isSubmittingRating
                        )
                    }
                    
                    // Historique de suivi
                    if (delivery.trackingHistory.isNotEmpty()) {
                        TrackingHistoryCard(delivery = delivery)
                    }
                }
            }
        }
    }
}

/**
 * Carte du statut de livraison
 */
@Composable
private fun DeliveryStatusCard(delivery: Any) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Icône de statut
            val (icon, statusText) = when (delivery.status) {
                DeliveryStatus.PENDING -> Icons.Filled.Schedule to "En attente"
                DeliveryStatus.ACCEPTED -> Icons.Filled.CheckCircle to "Acceptée"
                DeliveryStatus.IN_TRANSIT -> Icons.Filled.LocalShipping to "En cours"
                DeliveryStatus.DELIVERED -> Icons.Filled.TaskAlt to "Livrée"
                DeliveryStatus.CANCELLED -> Icons.Filled.Cancel to "Annulée"
                else -> Icons.Filled.Help to "Statut inconnu"
            }
            
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.primary
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = statusText,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * Carte des informations de livraison
 */
@Composable
private fun DeliveryInfoCard(delivery: Any) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Informations de livraison",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            // Description
            InfoRow(
                label = "Description",
                value = delivery.description
            )
            
            // Adresses
            InfoRow(
                label = "De",
                value = "${delivery.pickupAddress.street}, ${delivery.pickupAddress.city}"
            )
            
            InfoRow(
                label = "Vers",
                value = "${delivery.deliveryAddress.street}, ${delivery.deliveryAddress.city}"
            )
            
            // Prix
            InfoRow(
                label = "Prix",
                value = "${String.format("%.2f", delivery.price)}€"
            )
            
            // Livreur
            delivery.delivererName?.let { delivererName ->
                InfoRow(
                    label = "Livreur",
                    value = delivererName
                )
            }
        }
    }
}

/**
 * Carte de validation de livraison
 */
@Composable
private fun DeliveryValidationCard(
    validationCode: String,
    onValidationCodeChange: (String) -> Unit,
    onValidateWithCode: () -> Unit,
    nfcState: NfcState,
    onStartNfcScan: () -> Unit,
    onStopNfcScan: () -> Unit,
    isValidating: Boolean,
    validationError: String?
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Valider la livraison",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            // Validation par code
            Text(
                text = "Option 1: Code de validation",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = validationCode,
                    onValueChange = onValidationCodeChange,
                    label = { Text("Code (6 chiffres)") },
                    modifier = Modifier.weight(1f),
                    enabled = !isValidating
                )
                
                Button(
                    onClick = onValidateWithCode,
                    enabled = !isValidating && validationCode.length == 6
                ) {
                    if (isValidating) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("Valider")
                    }
                }
            }
            
            validationError?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            
            Divider()
            
            // Validation par NFC
            Text(
                text = "Option 2: Validation NFC",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium
            )
            
            NfcReaderWithState(
                nfcState = nfcState,
                onStartScan = onStartNfcScan,
                onStopScan = onStopNfcScan
            )
        }
    }
}

/**
 * Carte d'évaluation de livraison
 */
@Composable
private fun DeliveryRatingCard(
    rating: Int,
    comment: String,
    onRatingChange: (Int) -> Unit,
    onCommentChange: (String) -> Unit,
    onSubmitRating: () -> Unit,
    isSubmitting: Boolean
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Évaluer cette livraison",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            // Étoiles de notation
            Row(
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                repeat(5) { index ->
                    IconButton(
                        onClick = { onRatingChange(index + 1) }
                    ) {
                        Icon(
                            imageVector = if (index < rating) {
                                Icons.Filled.Star
                            } else {
                                Icons.Filled.StarBorder
                            },
                            contentDescription = null,
                            tint = if (index < rating) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outline
                            }
                        )
                    }
                }
            }
            
            // Commentaire
            OutlinedTextField(
                value = comment,
                onValueChange = onCommentChange,
                label = { Text("Commentaire (optionnel)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                enabled = !isSubmitting
            )
            
            // Bouton d'envoi
            Button(
                onClick = onSubmitRating,
                enabled = !isSubmitting && rating > 0,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (isSubmitting) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Envoyer l'évaluation")
                }
            }
        }
    }
}

/**
 * Carte de l'historique de suivi
 */
@Composable
private fun TrackingHistoryCard(delivery: Any) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Historique de suivi",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            
            // TODO: Afficher l'historique réel quand les modèles seront prêts
            Text(
                text = "Historique de suivi bientôt disponible",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Composant pour afficher une ligne d'information
 */
@Composable
private fun InfoRow(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = "$label:",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(1f)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(2f)
        )
    }
}