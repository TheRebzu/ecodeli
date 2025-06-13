#!/usr/bin/env node

// Test basique en ES modules
import axios from "axios";

const BASE_URL = "http://localhost:3000";

async function testBasicConnectivity() {
  console.log("🔍 Test de connectivité basique...\n");

  try {
    // Test 1: Page d'accueil
    console.log("Test 1: Page d'accueil");
    const homeResponse = await axios.get(BASE_URL, {
      timeout: 10000,
      validateStatus: () => true,
    });
    console.log(`Status: ${homeResponse.status}`);
    console.log(`Content-Type: ${homeResponse.headers["content-type"]}`);

    if (homeResponse.status === 200) {
      console.log("✅ Page d'accueil accessible\n");
    } else {
      console.log(`⚠️  Page d'accueil retourne: ${homeResponse.status}\n`);
    }

    // Test 2: API Health Check
    console.log("Test 2: API Health Check");
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
        timeout: 5000,
        validateStatus: () => true,
      });
      console.log(`Status: ${healthResponse.status}`);
      if (healthResponse.data) {
        console.log(`Data: ${JSON.stringify(healthResponse.data, null, 2)}`);
      }

      if (healthResponse.status === 200) {
        console.log("✅ API Health accessible\n");
      } else {
        console.log("⚠️  API Health non accessible\n");
      }
    } catch (error) {
      console.log(`❌ API Health erreur: ${error.message}\n`);
    }

    // Test 3: Auth endpoints
    console.log("Test 3: Auth CSRF Token");
    try {
      const csrfResponse = await axios.get(`${BASE_URL}/api/auth/csrf`, {
        timeout: 5000,
        validateStatus: () => true,
      });
      console.log(`Status: ${csrfResponse.status}`);
      if (csrfResponse.data?.csrfToken) {
        console.log(
          `CSRF Token: ${csrfResponse.data.csrfToken.substring(0, 20)}...`,
        );
      }

      if (csrfResponse.status === 200) {
        console.log("✅ Auth CSRF endpoint accessible\n");
      } else {
        console.log("⚠️  Auth CSRF endpoint non accessible\n");
      }
    } catch (error) {
      console.log(`❌ Auth CSRF erreur: ${error.message}\n`);
    }

    console.log("🎉 Tests de connectivité terminés!");
    console.log("📊 Résumé: Le serveur Next.js semble accessible");
  } catch (error) {
    console.error("❌ Erreur générale:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log(
        "\n💡 Le serveur semble ne pas être accessible sur http://localhost:3000",
      );
      console.log("Vérifiez que le serveur Next.js est démarré avec: pnpm dev");
    }
  }
}

// Test simple de login
async function testSimpleLogin() {
  console.log("\n🔐 Test de login simple...\n");

  try {
    // Obtenir le token CSRF
    const csrfResponse = await axios.get(`${BASE_URL}/api/auth/csrf`, {
      withCredentials: true,
    });

    const csrfToken = csrfResponse.data.csrfToken;
    const cookies = csrfResponse.headers["set-cookie"];

    console.log("✅ CSRF token obtenu");

    // Tentative de login avec des credentials de test
    const loginData = {
      email: "test.client@ecodeli.test",
      password: "TestClient123!",
      csrfToken: csrfToken,
    };

    const loginResponse = await axios.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      loginData,
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: cookies?.join("; ") || "",
        },
        withCredentials: true,
        maxRedirects: 0,
        validateStatus: () => true,
      },
    );

    console.log(`Login Status: ${loginResponse.status}`);

    if (loginResponse.status >= 200 && loginResponse.status < 400) {
      console.log("✅ Login semble fonctionner");

      // Tester la session
      const sessionResponse = await axios.get(`${BASE_URL}/api/auth/session`, {
        headers: {
          Cookie:
            loginResponse.headers["set-cookie"]?.join("; ") ||
            cookies?.join("; ") ||
            "",
        },
        withCredentials: true,
        validateStatus: () => true,
      });

      console.log(`Session Status: ${sessionResponse.status}`);
      if (sessionResponse.data?.user) {
        console.log(
          `User: ${sessionResponse.data.user.email} (${sessionResponse.data.user.role})`,
        );
        console.log("✅ Session active");
      } else {
        console.log("⚠️  Pas de session utilisateur");
      }
    } else {
      console.log(`⚠️  Login failed with status: ${loginResponse.status}`);
      if (loginResponse.data) {
        console.log(`Response: ${JSON.stringify(loginResponse.data, null, 2)}`);
      }
    }
  } catch (error) {
    console.error("❌ Erreur de login:", error.message);
  }
}

// Lancer les tests
async function runTests() {
  await testBasicConnectivity();
  await testSimpleLogin();
}

runTests()
  .then(() => {
    console.log("\n✅ Tous les tests terminés!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Tests échoués:", error);
    process.exit(1);
  });
