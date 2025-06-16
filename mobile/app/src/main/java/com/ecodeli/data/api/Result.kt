package me.ecodeli.data.api

/**
 * Classe Result pour encapsuler les résultats des appels API
 */
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Exception) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

/**
 * Extension pour mapper un Result
 */
inline fun <T, R> Result<T>.map(transform: (T) -> R): Result<R> {
    return when (this) {
        is Result.Success -> Result.Success(transform(data))
        is Result.Error -> this
        is Result.Loading -> this
    }
}

/**
 * Extension pour obtenir la donnée ou null
 */
fun <T> Result<T>.getOrNull(): T? {
    return when (this) {
        is Result.Success -> data
        else -> null
    }
}

/**
 * Extension pour obtenir la donnée ou une valeur par défaut
 */
fun <T> Result<T>.getOrDefault(default: T): T {
    return when (this) {
        is Result.Success -> data
        else -> default
    }
}

/**
 * Extension pour exécuter une action en cas de succès
 */
inline fun <T> Result<T>.onSuccess(action: (T) -> Unit): Result<T> {
    if (this is Result.Success) {
        action(data)
    }
    return this
}

/**
 * Extension pour exécuter une action en cas d'erreur
 */
inline fun <T> Result<T>.onError(action: (Exception) -> Unit): Result<T> {
    if (this is Result.Error) {
        action(exception)
    }
    return this
}

/**
 * Extension pour exécuter une action en cas de chargement
 */
inline fun <T> Result<T>.onLoading(action: () -> Unit): Result<T> {
    if (this is Result.Loading) {
        action()
    }
    return this
}