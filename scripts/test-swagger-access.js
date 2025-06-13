const { execSync } = require("child_process");

console.log("🔍 Test d'accès à la documentation Swagger...\n");

try {
  // Test direct de l'endpoint OpenAPI
  console.log("1. Test de l'endpoint OpenAPI spec...");
  const curlCmd =
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/openapi';
  const statusCode = execSync(curlCmd, { encoding: "utf8" }).trim();

  if (statusCode === "200") {
    console.log("✅ OpenAPI endpoint accessible (200)");

    // Récupérer le contenu
    const contentCmd = "curl -s http://localhost:3000/api/openapi | head -20";
    const content = execSync(contentCmd, { encoding: "utf8" });
    console.log("📄 Aperçu du contenu:");
    console.log(content);
  } else {
    console.log(`❌ OpenAPI endpoint erreur: ${statusCode}`);
  }

  console.log("\n2. URLs à tester dans le navigateur:");
  console.log(
    "🌐 Documentation Swagger: http://localhost:3000/fr/developers/api-docs",
  );
  console.log(
    "📋 Documentation manuelle: http://localhost:3000/fr/developers/api-manual",
  );
  console.log("🔧 Spécification OpenAPI: http://localhost:3000/api/openapi");

  console.log("\n3. Instructions:");
  console.log(
    "- Assurez-vous d'être connecté avec votre compte jean.dupont@orange.fr",
  );
  console.log(
    "- Le middleware devrait maintenant autoriser l'accès aux chemins /developers/*",
  );
  console.log(
    "- Si ça redirige encore, vérifiez les logs du middleware dans la console",
  );
} catch (error) {
  console.error("❌ Erreur lors du test:", error.message);
  console.log("\n💡 Vérifiez que le serveur Next.js est en cours d'exécution:");
  console.log("   pnpm dev");
}
