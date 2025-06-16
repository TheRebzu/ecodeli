package me.ecodeli.domain.usecases.auth

import me.ecodeli.data.api.Result
import me.ecodeli.data.models.RegisterInput
import me.ecodeli.data.models.RegisterOutput
import me.ecodeli.data.models.UserRole
import me.ecodeli.data.repositories.AuthRepository
import javax.inject.Inject

/**
 * Use case pour l'inscription utilisateur
 */
class RegisterUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(
        email: String,
        password: String,
        confirmPassword: String,
        firstName: String,
        lastName: String,
        phone: String,
        acceptTerms: Boolean
    ): Result<RegisterOutput> {
        // Validation des entrées
        if (email.isBlank() || !isValidEmail(email)) {
            return Result.Error(IllegalArgumentException("Email invalide"))
        }
        
        if (password.isBlank() || password.length < 8) {
            return Result.Error(IllegalArgumentException("Le mot de passe doit contenir au moins 8 caractères"))
        }
        
        if (password != confirmPassword) {
            return Result.Error(IllegalArgumentException("Les mots de passe ne correspondent pas"))
        }
        
        if (firstName.isBlank() || lastName.isBlank()) {
            return Result.Error(IllegalArgumentException("Nom et prénom requis"))
        }
        
        if (phone.isBlank() || !isValidPhone(phone)) {
            return Result.Error(IllegalArgumentException("Numéro de téléphone invalide"))
        }
        
        if (!acceptTerms) {
            return Result.Error(IllegalArgumentException("Vous devez accepter les conditions d'utilisation"))
        }
        
        val input = RegisterInput(
            email = email.trim(),
            password = password,
            firstName = firstName.trim(),
            lastName = lastName.trim(),
            phone = phone.trim(),
            role = UserRole.CLIENT,
            acceptTerms = acceptTerms
        )
        
        return authRepository.register(input)
    }
    
    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
    
    private fun isValidPhone(phone: String): Boolean {
        // Validation basique du numéro de téléphone français
        val cleanPhone = phone.replace("[^0-9+]".toRegex(), "")
        return cleanPhone.matches("^(\\+33|0)[1-9]\\d{8}$".toRegex())
    }
}