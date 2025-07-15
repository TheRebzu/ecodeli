package com.ecodeli.mobile.core.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// EcoDeli Brand Colors
private val EcoGreen = Color(0xFF4CAF50)
private val EcoGreenDark = Color(0xFF388E3C)
private val EcoGreenLight = Color(0xFF81C784)
private val EcoBlue = Color(0xFF2196F3)
private val EcoBlueDark = Color(0xFF1976D2)
private val EcoBlueLight = Color(0xFF64B5F6)
private val EcoOrange = Color(0xFFFF9800)
private val EcoOrangeDark = Color(0xFFE65100)
private val EcoOrangeLight = Color(0xFFFFB74D)

private val DarkColorScheme = darkColorScheme(
    primary = EcoGreen,
    onPrimary = Color.White,
    primaryContainer = EcoGreenDark,
    onPrimaryContainer = Color.White,
    
    secondary = EcoBlue,
    onSecondary = Color.White,
    secondaryContainer = EcoBlueDark,
    onSecondaryContainer = Color.White,
    
    tertiary = EcoOrange,
    onTertiary = Color.White,
    tertiaryContainer = EcoOrangeDark,
    onTertiaryContainer = Color.White,
    
    background = Color(0xFF121212),
    onBackground = Color.White,
    surface = Color(0xFF1E1E1E),
    onSurface = Color.White,
    surfaceVariant = Color(0xFF424242),
    onSurfaceVariant = Color(0xFFE0E0E0),
    
    error = Color(0xFFCF6679),
    onError = Color.Black,
    errorContainer = Color(0xFFB00020),
    onErrorContainer = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = EcoGreen,
    onPrimary = Color.White,
    primaryContainer = EcoGreenLight,
    onPrimaryContainer = Color.Black,
    
    secondary = EcoBlue,
    onSecondary = Color.White,
    secondaryContainer = EcoBlueLight,
    onSecondaryContainer = Color.Black,
    
    tertiary = EcoOrange,
    onTertiary = Color.White,
    tertiaryContainer = EcoOrangeLight,
    onTertiaryContainer = Color.Black,
    
    background = Color(0xFFFAFAFA),
    onBackground = Color.Black,
    surface = Color.White,
    onSurface = Color.Black,
    surfaceVariant = Color(0xFFE0E0E0),
    onSurfaceVariant = Color.Black,
    
    error = Color(0xFFD32F2F),
    onError = Color.White,
    errorContainer = Color(0xFFFFEBEE),
    onErrorContainer = Color(0xFFB71C1C)
)

@Composable
fun EcoDeliTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Disabled to maintain brand consistency
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}