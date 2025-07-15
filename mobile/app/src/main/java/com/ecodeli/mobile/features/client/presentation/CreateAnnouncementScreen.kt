package com.ecodeli.mobile.features.client.presentation

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
import com.ecodeli.mobile.core.data.models.*
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateAnnouncementScreen(
    onAnnouncementCreated: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: ClientAnnouncementViewModel = hiltViewModel()
) {
    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf(AnnouncementType.PACKAGE) }
    var price by remember { mutableStateOf("") }
    var weight by remember { mutableStateOf("") }
    var pickupStreet by remember { mutableStateOf("") }
    var pickupCity by remember { mutableStateOf("") }
    var pickupPostalCode by remember { mutableStateOf("") }
    var deliveryStreet by remember { mutableStateOf("") }
    var deliveryCity by remember { mutableStateOf("") }
    var deliveryPostalCode by remember { mutableStateOf("") }
    var expandedType by remember { mutableStateOf(false) }
    
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(uiState) {
        when (uiState) {
            is AnnouncementUiState.Created -> {
                onAnnouncementCreated()
                viewModel.resetState()
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
                text = "Créer une annonce",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
            
            IconButton(onClick = onNavigateBack) {
                Text("❌", fontSize = 20.sp)
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Form
        Column(
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Titre") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description") },
                maxLines = 3,
                modifier = Modifier.fillMaxWidth()
            )
            
            ExposedDropdownMenuBox(
                expanded = expandedType,
                onExpandedChange = { expandedType = !expandedType }
            ) {
                OutlinedTextField(
                    value = getTypeText(selectedType),
                    onValueChange = { },
                    readOnly = true,
                    label = { Text("Type d'annonce") },
                    trailingIcon = {
                        ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedType)
                    },
                    modifier = Modifier
                        .menuAnchor()
                        .fillMaxWidth()
                )
                
                ExposedDropdownMenu(
                    expanded = expandedType,
                    onDismissRequest = { expandedType = false }
                ) {
                    AnnouncementType.values().forEach { type ->
                        DropdownMenuItem(
                            text = { Text(getTypeEmoji(type) + " " + getTypeText(type)) },
                            onClick = {
                                selectedType = type
                                expandedType = false
                            }
                        )
                    }
                }
            }
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = price,
                    onValueChange = { price = it },
                    label = { Text("Prix (€)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                
                if (selectedType == AnnouncementType.PACKAGE) {
                    OutlinedTextField(
                        value = weight,
                        onValueChange = { weight = it },
                        label = { Text("Poids (kg)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                }
            }
            
            // Pickup Address
            Text(
                text = "Adresse de récupération",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            OutlinedTextField(
                value = pickupStreet,
                onValueChange = { pickupStreet = it },
                label = { Text("Adresse") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = pickupCity,
                    onValueChange = { pickupCity = it },
                    label = { Text("Ville") },
                    singleLine = true,
                    modifier = Modifier.weight(2f)
                )
                
                OutlinedTextField(
                    value = pickupPostalCode,
                    onValueChange = { pickupPostalCode = it },
                    label = { Text("Code postal") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }
            
            // Delivery Address
            Text(
                text = "Adresse de livraison",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            
            OutlinedTextField(
                value = deliveryStreet,
                onValueChange = { deliveryStreet = it },
                label = { Text("Adresse") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedTextField(
                    value = deliveryCity,
                    onValueChange = { deliveryCity = it },
                    label = { Text("Ville") },
                    singleLine = true,
                    modifier = Modifier.weight(2f)
                )
                
                OutlinedTextField(
                    value = deliveryPostalCode,
                    onValueChange = { deliveryPostalCode = it },
                    label = { Text("Code postal") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Button(
                onClick = {
                    val announcement = Announcement(
                        id = UUID.randomUUID().toString(),
                        title = title,
                        description = description,
                        type = selectedType,
                        status = AnnouncementStatus.ACTIVE,
                        pickupAddress = "$pickupStreet, $pickupCity $pickupPostalCode",
                        deliveryAddress = "$deliveryStreet, $deliveryCity $deliveryPostalCode",
                        pickupDate = null,
                        deliveryDate = null,
                        basePrice = price.toDoubleOrNull() ?: 0.0,
                        finalPrice = price.toDoubleOrNull() ?: 0.0,
                        currency = "EUR",
                        isPriceNegotiable = false,
                        pickupLatitude = null,
                        pickupLongitude = null,
                        deliveryLatitude = null,
                        deliveryLongitude = null,
                        distance = null,
                        isFlexibleDate = false,
                        isUrgent = false,
                        requiresInsurance = false,
                        allowsPartialDelivery = false,
                        viewCount = 0,
                        matchCount = 0,
                        estimatedDuration = null,
                        specialInstructions = null,
                        customerNotes = null,
                        createdAt = "",
                        updatedAt = "",
                        publishedAt = null,
                        expiresAt = null,
                        author = AnnouncementAuthor(
                            id = "",
                            name = "",
                            avatar = null
                        ),
                        packageDetails = PackageDetails(
                            weight = weight.toDoubleOrNull(),
                            length = null,
                            width = null,
                            height = null,
                            fragile = null,
                            insuredValue = null,
                            specialInstructions = null
                        )
                    )
                    viewModel.createAnnouncement(announcement)
                },
                enabled = title.isNotBlank() && description.isNotBlank() && 
                         price.isNotBlank() && pickupStreet.isNotBlank() && 
                         pickupCity.isNotBlank() && pickupPostalCode.isNotBlank() &&
                         deliveryStreet.isNotBlank() && deliveryCity.isNotBlank() && 
                         deliveryPostalCode.isNotBlank() && uiState !is AnnouncementUiState.Loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                if (uiState is AnnouncementUiState.Loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text("Créer l'annonce")
                }
            }
        }
        
        when (val currentState = uiState) {
            is AnnouncementUiState.Error -> {
                Spacer(modifier = Modifier.height(16.dp))
                Card(
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer
                    )
                ) {
                    Text(
                        text = currentState.message,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
            else -> {}
        }
    }
}