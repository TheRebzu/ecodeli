package com.ecodeli.mobile.features.nfc

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NfcValidationScreen(
    deliveryId: String,
    onValidationComplete: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: NfcValidationViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val nfcState by viewModel.nfcState.collectAsState()
    val validationState by viewModel.validationState.collectAsState()
    val delivererCard by viewModel.delivererCard.collectAsState()
    val isNfcAvailable by viewModel.isNfcAvailable.collectAsState()
    
    LaunchedEffect(deliveryId) {
        viewModel.initializeForDelivery(deliveryId, context)
    }
    
    LaunchedEffect(validationState) {
        if (validationState is NfcValidationState.ValidationComplete) {
            delay(2000) // Show success animation
            onValidationComplete()
        }
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Header
        NfcValidationHeader(
            onNavigateBack = onNavigateBack,
            onRetry = { viewModel.retry() }
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Main Content
        when {
            !isNfcAvailable -> {
                NfcUnavailableCard()
            }
            else -> {
                NfcScanningContent(
                    nfcState = nfcState,
                    validationState = validationState,
                    delivererCard = delivererCard,
                    onStartScan = { viewModel.startScanning() },
                    onTestScan = { viewModel.simulateTestScan() }
                )
            }
        }
    }
}

@Composable
fun NfcValidationHeader(
    onNavigateBack: () -> Unit,
    onRetry: () -> Unit
) {
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
                    text = "Validation NFC",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                Text(
                    text = "Scannez la carte du livreur",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                )
            }
            
            Row {
                IconButton(
                    onClick = onRetry,
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                ) {
                    Icon(
                        imageVector = Icons.Default.Refresh,
                        contentDescription = "Réessayer",
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
}

@Composable
fun NfcScanningContent(
    nfcState: NfcState,
    validationState: NfcValidationState,
    delivererCard: DelivererCard?,
    onStartScan: () -> Unit,
    onTestScan: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Status Card
        NfcStatusCard(
            nfcState = nfcState,
            validationState = validationState
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Scanning Animation
        AnimatedVisibility(
            visible = nfcState is NfcState.Reading || nfcState is NfcState.Ready,
            enter = fadeIn() + scaleIn(),
            exit = fadeOut() + scaleOut()
        ) {
            NfcScanningAnimation(isScanning = nfcState is NfcState.Reading)
        }
        
        // Deliverer Card Info
        delivererCard?.let { card ->
            AnimatedVisibility(
                visible = nfcState is NfcState.Success,
                enter = fadeIn(animationSpec = tween(500)),
                exit = fadeOut()
            ) {
                DelivererCardInfo(card = card)
            }
        }
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Action Buttons
        NfcActionButtons(
            nfcState = nfcState,
            validationState = validationState,
            onStartScan = onStartScan,
            onTestScan = onTestScan
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Instructions
        NfcInstructions(nfcState = nfcState)
    }
}

@Composable
fun NfcStatusCard(
    nfcState: NfcState,
    validationState: NfcValidationState
) {
    val (backgroundColor, textColor, icon, title, subtitle) = when {
        validationState is NfcValidationState.ValidationComplete -> {
            Tuple5(
                Color(0xFF4CAF50).copy(alpha = 0.1f),
                Color(0xFF4CAF50),
                Icons.Default.CheckCircle,
                "Validation réussie",
                "Livreur vérifié avec succès"
            )
        }
        validationState is NfcValidationState.ValidationError -> {
            Tuple5(
                MaterialTheme.colorScheme.errorContainer,
                MaterialTheme.colorScheme.error,
                Icons.Default.Error,
                "Erreur de validation",
                validationState.message
            )
        }
        nfcState is NfcState.Success -> {
            Tuple5(
                MaterialTheme.colorScheme.primaryContainer,
                MaterialTheme.colorScheme.primary,
                Icons.Default.Nfc,
                "Carte détectée",
                "Validation en cours..."
            )
        }
        nfcState is NfcState.Reading -> {
            Tuple5(
                MaterialTheme.colorScheme.secondaryContainer,
                MaterialTheme.colorScheme.secondary,
                Icons.Default.Nfc,
                "Lecture en cours",
                "Maintenez la carte près du téléphone"
            )
        }
        nfcState is NfcState.Ready -> {
            Tuple5(
                MaterialTheme.colorScheme.tertiaryContainer,
                MaterialTheme.colorScheme.tertiary,
                Icons.Default.Nfc,
                "Prêt à scanner",
                "Approchez la carte NFC"
            )
        }
        nfcState is NfcState.Error -> {
            Tuple5(
                MaterialTheme.colorScheme.errorContainer,
                MaterialTheme.colorScheme.error,
                Icons.Default.Error,
                "Erreur NFC",
                nfcState.message
            )
        }
        else -> {
            Tuple5(
                MaterialTheme.colorScheme.surfaceVariant,
                MaterialTheme.colorScheme.onSurfaceVariant,
                Icons.Default.Nfc,
                "NFC inactif",
                "Appuyez pour activer"
            )
        }
    }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = backgroundColor),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = textColor,
                modifier = Modifier.size(32.dp)
            )
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column {
                Text(
                    text = title,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
                Text(
                    text = subtitle,
                    fontSize = 14.sp,
                    color = textColor.copy(alpha = 0.7f)
                )
            }
        }
    }
}

@Composable
fun NfcScanningAnimation(isScanning: Boolean) {
    val animationColor = if (isScanning) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
    
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(200.dp)
    ) {
        // Outer ring
        Box(
            modifier = Modifier
                .size(200.dp)
                .clip(CircleShape)
                .background(animationColor.copy(alpha = 0.1f))
        )
        
        // Middle ring
        Box(
            modifier = Modifier
                .size(150.dp)
                .clip(CircleShape)
                .background(animationColor.copy(alpha = 0.2f))
        )
        
        // Inner ring
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(animationColor.copy(alpha = 0.3f))
        )
        
        // NFC Icon
        Icon(
            imageVector = Icons.Default.Nfc,
            contentDescription = "NFC",
            tint = animationColor,
            modifier = Modifier.size(48.dp)
        )
    }
}

@Composable
fun DelivererCardInfo(card: DelivererCard) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.secondaryContainer
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.Badge,
                contentDescription = "Carte livreur",
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(32.dp)
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = card.delivererName,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSecondaryContainer
            )
            
            Text(
                text = "ID: ${card.delivererId}",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.7f)
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.Verified,
                    contentDescription = "Vérifié",
                    tint = Color(0xFF4CAF50),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = "Carte valide",
                    fontSize = 12.sp,
                    color = Color(0xFF4CAF50),
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun NfcActionButtons(
    nfcState: NfcState,
    validationState: NfcValidationState,
    onStartScan: () -> Unit,
    onTestScan: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        when {
            validationState is NfcValidationState.ValidationComplete -> {
                Button(
                    onClick = { /* Already handled */ },
                    enabled = false,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF4CAF50),
                        disabledContainerColor = Color(0xFF4CAF50)
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Validé",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Validation terminée", fontSize = 16.sp)
                }
            }
            nfcState is NfcState.Idle || nfcState is NfcState.Error -> {
                Button(
                    onClick = onStartScan,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Nfc,
                        contentDescription = "Scanner",
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Commencer le scan", fontSize = 16.sp)
                }
            }
            nfcState is NfcState.Reading -> {
                Button(
                    onClick = { /* Scanning in progress */ },
                    enabled = false,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Lecture en cours...", fontSize = 16.sp)
                }
            }
        }
        
        Spacer(modifier = Modifier.height(12.dp))
        
        // Test button for development
        OutlinedButton(
            onClick = onTestScan,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.BugReport,
                contentDescription = "Test",
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Test de validation", fontSize = 14.sp)
        }
    }
}

@Composable
fun NfcInstructions(nfcState: NfcState) {
    val instruction = when (nfcState) {
        is NfcState.Ready -> "Approchez la carte NFC du livreur près de votre téléphone"
        is NfcState.Reading -> "Maintenez la carte stable pendant la lecture"
        is NfcState.Success -> "Carte lue avec succès, validation en cours"
        is NfcState.Error -> "Erreur lors de la lecture, veuillez réessayer"
        else -> "Assurez-vous que le NFC est activé sur votre téléphone"
    }
    
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(12.dp)
    ) {
        Text(
            text = instruction,
            modifier = Modifier.padding(16.dp),
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )
    }
}

@Composable
fun NfcUnavailableCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.errorContainer
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.NearMeDisabled,
                contentDescription = "NFC indisponible",
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(48.dp)
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "NFC indisponible",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = "Veuillez activer le NFC dans les paramètres de votre téléphone pour utiliser cette fonctionnalité.",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.7f),
                textAlign = TextAlign.Center
            )
        }
    }
}

// Helper data class for complex return types
data class Tuple5<T1, T2, T3, T4, T5>(
    val first: T1,
    val second: T2,
    val third: T3,
    val fourth: T4,
    val fifth: T5
)

sealed class NfcValidationState {
    object Idle : NfcValidationState()
    object Validating : NfcValidationState()
    object ValidationComplete : NfcValidationState()
    data class ValidationError(val message: String) : NfcValidationState()
}