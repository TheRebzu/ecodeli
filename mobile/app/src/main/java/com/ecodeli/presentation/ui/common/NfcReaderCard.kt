package me.ecodeli.presentation.ui.common

import androidx.compose.animation.core.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Nfc
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import me.ecodeli.utils.nfc.ValidationResult

/**
 * Composant pour la lecture NFC avec animation
 */
@Composable
fun NfcReaderCard(
    isActive: Boolean = false,
    onNfcValidated: (ValidationResult.Success) -> Unit = {},
    onNfcError: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    // Animation de pulsation pour l'icône NFC
    val infiniteTransition = rememberInfiniteTransition(label = "nfc_pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isActive) 1.2f else 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "nfc_scale"
    )
    
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isActive) {
                MaterialTheme.colorScheme.primaryContainer
            } else {
                MaterialTheme.colorScheme.surfaceVariant
            }
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Icône NFC avec animation
            Icon(
                imageVector = Icons.Filled.Nfc,
                contentDescription = "NFC",
                modifier = Modifier
                    .size(64.dp)
                    .scale(scale),
                tint = if (isActive) {
                    MaterialTheme.colorScheme.primary
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                }
            )
            
            // Texte d'instruction
            Text(
                text = if (isActive) {
                    "Approchez la carte NFC du livreur de votre téléphone"
                } else {
                    "Appuyez sur 'Scanner NFC' pour valider la livraison"
                },
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = if (isActive) FontWeight.Medium else FontWeight.Normal,
                textAlign = TextAlign.Center,
                color = if (isActive) {
                    MaterialTheme.colorScheme.onPrimaryContainer
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                }
            )
            
            if (isActive) {
                // Indicateur de statut actif
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp
                    )
                    Text(
                        text = "Scan en cours...",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

/**
 * États pour la lecture NFC
 */
sealed class NfcState {
    object Inactive : NfcState()
    object Scanning : NfcState()
    data class Success(val delivererId: String) : NfcState()
    data class Error(val message: String) : NfcState()
}

/**
 * Composant NFC avec gestion d'état
 */
@Composable
fun NfcReaderWithState(
    nfcState: NfcState,
    onStartScan: () -> Unit,
    onStopScan: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        when (nfcState) {
            is NfcState.Inactive -> {
                NfcReaderCard(isActive = false)
                Button(
                    onClick = onStartScan,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(
                        imageVector = Icons.Filled.Nfc,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Scanner NFC")
                }
            }
            
            is NfcState.Scanning -> {
                NfcReaderCard(isActive = true)
                OutlinedButton(
                    onClick = onStopScan,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Annuler le scan")
                }
            }
            
            is NfcState.Success -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.tertiaryContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Filled.CheckCircle,
                            contentDescription = "Succès",
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.tertiary
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Validation réussie !",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Livreur ID: ${nfcState.delivererId}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                }
            }
            
            is NfcState.Error -> {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Error,
                            contentDescription = "Erreur",
                            modifier = Modifier.size(48.dp),
                            tint = MaterialTheme.colorScheme.error
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Erreur de validation",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                        Text(
                            text = nfcState.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onErrorContainer
                        )
                    }
                }
                
                OutlinedButton(
                    onClick = onStartScan,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Réessayer")
                }
            }
        }
    }
}