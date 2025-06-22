#!/usr/bin/env python3
"""
Script d'authentification NextAuth avec Python et requests
"""

import requests
import json
import os
from urllib.parse import urlencode

# Configuration
BASE_URL = os.getenv('NEXTAUTH_URL', 'http://localhost:3000')
EMAIL = 'jean.dupont@orange.fr'
PASSWORD = 'password123'

def authenticate():
    """Authentification NextAuth et récupération du cookie de session"""
    
    print("🔐 Authentification NextAuth avec Python")
    print("=" * 40)
    print(f"URL de base: {BASE_URL}")
    print(f"Email: {EMAIL}")
    print()
    
    # Créer une session pour conserver les cookies
    session = requests.Session()
    
    try:
        # Étape 1: Obtenir le token CSRF
        print("📋 Étape 1: Récupération du token CSRF...")
        csrf_response = session.get(f"{BASE_URL}/api/auth/csrf")
        csrf_response.raise_for_status()
        csrf_token = csrf_response.json()['csrfToken']
        print(f"✅ Token CSRF obtenu: {csrf_token}")
        print()
        
        # Étape 2: Se connecter
        print("🔐 Étape 2: Connexion...")
        login_data = {
            'email': EMAIL,
            'password': PASSWORD,
            'csrfToken': csrf_token,
            'callbackUrl': f"{BASE_URL}/client",
            'json': 'true'
        }
        
        login_response = session.post(
            f"{BASE_URL}/api/auth/callback/credentials",
            data=urlencode(login_data),
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            allow_redirects=False
        )
        
        # Vérifier la connexion
        if login_response.status_code in [200, 302]:
            print("✅ Connexion réussie!")
            
            # Récupérer le cookie de session
            session_cookie = None
            for cookie in session.cookies:
                if 'next-auth.session-token' in cookie.name:
                    session_cookie = cookie
                    break
            
            if session_cookie:
                print()
                print("🍪 Cookie d'authentification:")
                print(f"Nom: {session_cookie.name}")
                print(f"Valeur: {session_cookie.value}")
                print()
                
                # Étape 3: Tester une route protégée
                print("🧪 Étape 3: Test d'une route protégée...")
                profile_response = session.post(
                    f"{BASE_URL}/api/trpc/client.getProfile",
                    json={"input": {}},
                    headers={'Content-Type': 'application/json'}
                )
                
                if profile_response.ok:
                    print("✅ Accès à la route protégée réussi!")
                    print()
                    print("📝 Réponse du serveur:")
                    print(json.dumps(profile_response.json(), indent=2))
                else:
                    print("❌ Erreur lors de l'accès à la route protégée")
                    print(f"Status: {profile_response.status_code}")
                
                print()
                print("📚 Utilisation du cookie:")
                print()
                print("1. Avec curl:")
                print(f'   curl -H "Cookie: {session_cookie.name}={session_cookie.value}" {BASE_URL}/api/...')
                print()
                print("2. Avec Python requests:")
                print(f"   cookies = {{'{session_cookie.name}': '{session_cookie.value}'}}")
                print(f"   requests.get('{BASE_URL}/api/...', cookies=cookies)")
                print()
                
                # Retourner le cookie pour utilisation ultérieure
                return {
                    'name': session_cookie.name,
                    'value': session_cookie.value,
                    'cookie_string': f"{session_cookie.name}={session_cookie.value}"
                }
            else:
                print("❌ Erreur: Cookie de session non trouvé")
                return None
        else:
            print("❌ Erreur de connexion")
            print(f"Status: {login_response.status_code}")
            if login_response.text:
                print(f"Réponse: {login_response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return None

def save_cookie_to_file(cookie_data, filename='auth-cookie.txt'):
    """Sauvegarder le cookie dans un fichier"""
    if cookie_data:
        with open(filename, 'w') as f:
            f.write(cookie_data['cookie_string'])
        print(f"💾 Cookie sauvegardé dans {filename}")

if __name__ == "__main__":
    import sys
    
    # Authentification
    cookie = authenticate()
    
    # Sauvegarder le cookie si demandé
    if '--save' in sys.argv and cookie:
        save_cookie_to_file(cookie)