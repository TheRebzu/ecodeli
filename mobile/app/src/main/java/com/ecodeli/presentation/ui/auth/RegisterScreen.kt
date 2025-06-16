package me.ecodeli.presentation.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import me.ecodeli.presentation.viewmodels.RegisterViewModel

/**
 * Écran d'inscription
 */
@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateBack: () -> Unit,
    viewModel: RegisterViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(uiState.registerSuccess) {
        if (uiState.registerSuccess) {
            onRegisterSuccess()
        }
    }
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Header avec bouton retour
        TopAppBar(
            title = { Text("Créer un compte") },
            navigationIcon = {
                IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Filled.ArrowBack, contentDescription = "Retour")
                }
            }
        )
        
        // Contenu principal
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(24.dp))
            
            // Description
            Text(
                text = "Rejoignez EcoDeli pour profiter de nos services de livraison collaborative",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 32.dp)
            )
            
            // Formulaire
            Card(
                modifier = Modifier.fillMaxWidth(),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Prénom
                    OutlinedTextField(
                        value = uiState.firstName,
                        onValueChange = viewModel::onFirstNameChange,
                        label = { Text("Prénom") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    // Nom
                    OutlinedTextField(
                        value = uiState.lastName,
                        onValueChange = viewModel::onLastNameChange,
                        label = { Text("Nom") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    // Email
                    OutlinedTextField(
                        value = uiState.email,
                        onValueChange = viewModel::onEmailChange,
                        label = { Text("Email") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    // Téléphone
                    OutlinedTextField(
                        value = uiState.phone,
                        onValueChange = viewModel::onPhoneChange,
                        label = { Text("Téléphone") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Phone,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    // Mot de passe
                    OutlinedTextField(
                        value = uiState.password,
                        onValueChange = viewModel::onPasswordChange,
                        label = { Text("Mot de passe") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next
                        ),
                        singleLine = true,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    // Confirmation mot de passe
                    OutlinedTextField(
                        value = uiState.confirmPassword,
                        onValueChange = viewModel::onConfirmPasswordChange,
                        label = { Text("Confirmer le mot de passe") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        singleLine = true,
                        enabled = !uiState.isLoading,
                        modifier = Modifier.fillMaxWidth()
                    )
                    
                    // Acceptation des conditions
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = uiState.acceptTerms,
                            onCheckedChange = viewModel::onAcceptTermsChange,
                            enabled = !uiState.isLoading
                        )
                        Text(
                            text = "J'accepte les conditions d'utilisation et la politique de confidentialité",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                    
                    // Message d'erreur
                    uiState.error?.let { error ->
                        Text(
                            text = error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    
                    // Bouton d'inscription
                    Button(
                        onClick = viewModel::register,
                        enabled = !uiState.isLoading && 
                                uiState.firstName.isNotBlank() && 
                                uiState.lastName.isNotBlank() && 
                                uiState.email.isNotBlank() && 
                                uiState.phone.isNotBlank() && 
                                uiState.password.isNotBlank() && 
                                uiState.confirmPassword.isNotBlank() && 
                                uiState.acceptTerms,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Créer mon compte")
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Retour à la connexion
            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Déjà un compte ?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                TextButton(onClick = onNavigateBack) {
                    Text("Se connecter")
                }
            }
        }
    }
}