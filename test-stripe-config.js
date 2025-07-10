require('dotenv').config();
const Stripe = require('stripe');

// Test de la configuration Stripe
async function testStripeConfig() {
  console.log('🔍 Test de la configuration Stripe...');
  
  // Vérifier les variables d'environnement
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  
  console.log('📋 Variables d\'environnement:');
  console.log('- STRIPE_SECRET_KEY:', stripeSecretKey ? '✅ Configuré' : '❌ Manquant');
  console.log('- STRIPE_PUBLISHABLE_KEY:', stripePublishableKey ? '✅ Configuré' : '❌ Manquant');
  console.log('- NEXTAUTH_URL:', nextAuthUrl || '❌ Non configuré');
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY manquant');
    return;
  }
  
  try {
    // Initialiser Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20'
    });
    
    console.log('✅ Stripe initialisé avec succès');
    
    // Tester la création d'une session de test
    console.log('🔍 Test création session Stripe...');
    
    const testSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Test Payment',
              description: 'Test de configuration Stripe',
            },
            unit_amount: 1000, // 10€ en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${nextAuthUrl || 'http://localhost:3000'}/test-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${nextAuthUrl || 'http://localhost:3000'}/test-cancel`,
      metadata: {
        test: 'true',
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ Session de test créée:', testSession.id);
    console.log('✅ URL de checkout:', testSession.url);
    
    // Tester la récupération de la session
    const retrievedSession = await stripe.checkout.sessions.retrieve(testSession.id);
    console.log('✅ Session récupérée:', retrievedSession.id);
    
    // Supprimer la session de test
    await stripe.checkout.sessions.expire(testSession.id);
    console.log('✅ Session de test supprimée');
    
    console.log('🎉 Configuration Stripe OK !');
    
  } catch (error) {
    console.error('❌ Erreur Stripe:', error.message);
    console.error('Détails:', error);
  }
}

// Test des URLs de redirection
function testRedirectUrls() {
  console.log('\n🔍 Test des URLs de redirection...');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const bookingId = 'test-booking-id';
  
  const successUrl = `${baseUrl}/fr/client/bookings/${bookingId}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/fr/client/bookings/${bookingId}/payment?cancelled=true`;
  
  console.log('✅ Success URL:', successUrl);
  console.log('✅ Cancel URL:', cancelUrl);
  
  // Vérifier que les URLs sont valides
  try {
    new URL(successUrl);
    new URL(cancelUrl);
    console.log('✅ URLs de redirection valides');
  } catch (error) {
    console.error('❌ URLs de redirection invalides:', error.message);
  }
}

// Exécuter les tests
async function runTests() {
  console.log('🚀 Démarrage des tests Stripe...\n');
  
  await testStripeConfig();
  testRedirectUrls();
  
  console.log('\n✅ Tests terminés');
}

// Exécuter si appelé directement
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testStripeConfig, testRedirectUrls }; 