package me.ecodeli.domain.usecases.auth

import me.ecodeli.data.api.Result
import me.ecodeli.data.models.LoginOutput
import me.ecodeli.data.repositories.AuthRepository
import javax.inject.Inject

/**
 * Use case pour la connexion utilisateur
 */
class LoginUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    suspend operator fun invoke(
        email: String,
        password: String,
        twoFactorCode: String? = null
    ): Result<LoginOutput> {
        // Validation des entrées
        if (email.isBlank() || !isValidEmail(email)) {
            return Result.Error(IllegalArgumentException("Email invalide"))
        }
        
        if (password.isBlank() || password.length < 6) {
            return Result.Error(IllegalArgumentException("Mot de passe invalide"))
        }
        
        return authRepository.login(email, password, twoFactorCode)
    }
    
    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
}