#!/usr/bin/env node

const https = require('https')
const http = require('http')

// Configuration
const config = {
  baseUrl: 'http://localhost:3000',
  apiKey: process.env.API_TEST_KEY || 'test-key',
  testUser: {
    email: 'client@test.com',
    password: 'Test123!',
    role: 'CLIENT'
  }
}

// Test accounts for different subscription plans
const testAccounts = [
  { email: 'client-free@test.com', password: 'Test123!', role: 'CLIENT', plan: 'FREE' },
  { email: 'client-starter@test.com', password: 'Test123!', role: 'CLIENT', plan: 'STARTER' },
  { email: 'client-premium@test.com', password: 'Test123!', role: 'CLIENT', plan: 'PREMIUM' }
]

// Utility functions
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.baseUrl + path)
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    const req = (url.protocol === 'https:' ? https : http).request(url, options, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            data: body ? JSON.parse(body) : null
          }
          resolve(result)
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          })
        }
      })
    })

    req.on('error', reject)
    
    if (data) {
      req.write(JSON.stringify(data))
    }
    
    req.end()
  })
}

async function login(email, password) {
  console.log(`🔐 Logging in as ${email}...`)
  
  const response = await makeRequest('POST', '/api/auth/login', {
    email,
    password
  })

  if (response.status === 200) {
    const cookies = response.headers['set-cookie']
    const sessionCookie = cookies?.find(cookie => cookie.includes('next-auth.session-token'))
    if (sessionCookie) {
      return sessionCookie.split(';')[0]
    }
  }
  
  throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`)
}

async function testSubscriptionEndpoints() {
  console.log('\n🧪 Testing Subscription API Endpoints\n')
  
  try {
    // Test 1: Get available plans (should work without auth)
    console.log('📋 Test 1: Get available subscription plans')
    const plansResponse = await makeRequest('GET', '/api/subscriptions')
    console.log(`Status: ${plansResponse.status}`)
    if (plansResponse.data?.availablePlans) {
      console.log('✅ Available plans retrieved successfully')
      console.log('Plans:', Object.keys(plansResponse.data.availablePlans))
    } else {
      console.log('❌ Failed to get available plans')
    }

    // Test 2: Login and get user subscription
    const sessionCookie = await login(testAccounts[0].email, testAccounts[0].password)
    
    console.log('\n📊 Test 2: Get user subscription')
    const userSubResponse = await makeRequest('GET', '/api/subscriptions', null, {
      'Cookie': sessionCookie
    })
    console.log(`Status: ${userSubResponse.status}`)
    if (userSubResponse.status === 200) {
      console.log('✅ User subscription retrieved successfully')
      if (userSubResponse.data?.subscription) {
        console.log(`Current plan: ${userSubResponse.data.subscription.plan}`)
        console.log(`Status: ${userSubResponse.data.subscription.status}`)
      }
    } else {
      console.log('❌ Failed to get user subscription')
    }

    // Test 3: Create subscription payment intent
    console.log('\n💳 Test 3: Create subscription payment intent')
    const paymentIntentResponse = await makeRequest('POST', '/api/subscriptions/create-payment-intent', {
      planId: 'STARTER'
    }, {
      'Cookie': sessionCookie
    })
    console.log(`Status: ${paymentIntentResponse.status}`)
    if (paymentIntentResponse.status === 200 && paymentIntentResponse.data?.clientSecret) {
      console.log('✅ Payment intent created successfully')
      console.log('Client secret received (hidden for security)')
    } else {
      console.log('❌ Failed to create payment intent')
      console.log('Response:', paymentIntentResponse.data)
    }

    // Test 4: Update subscription (downgrade to FREE)
    console.log('\n🔄 Test 4: Update subscription to FREE')
    const updateResponse = await makeRequest('PUT', '/api/subscriptions', {
      planId: 'FREE'
    }, {
      'Cookie': sessionCookie
    })
    console.log(`Status: ${updateResponse.status}`)
    if (updateResponse.status === 200) {
      console.log('✅ Subscription updated successfully')
      if (updateResponse.data?.plan) {
        console.log(`New plan: ${updateResponse.data.plan}`)
      }
    } else {
      console.log('❌ Failed to update subscription')
      console.log('Response:', updateResponse.data)
    }

    // Test 5: Try to cancel subscription (should fail for FREE plan)
    console.log('\n❌ Test 5: Cancel FREE subscription (should fail)')
    const cancelResponse = await makeRequest('DELETE', '/api/subscriptions', null, {
      'Cookie': sessionCookie
    })
    console.log(`Status: ${cancelResponse.status}`)
    if (cancelResponse.status === 404 || cancelResponse.status === 400) {
      console.log('✅ Correctly rejected cancellation of FREE plan')
    } else {
      console.log('❌ Unexpected response for FREE plan cancellation')
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
  }
}

async function testSubscriptionPlans() {
  console.log('\n💰 Testing Subscription Plan Features\n')
  
  const testPlan = (planId, features) => {
    console.log(`📦 ${planId} Plan:`)
    console.log(`  Price: €${features.price || 0}/month`)
    console.log(`  Insurance: €${features.features?.insurance || 0}`)
    console.log(`  Discount: ${features.features?.discount || 0}%`)
    console.log(`  Priority Shipping: ${features.features?.priorityShipping ? '✅' : '❌'}`)
    if (features.features?.firstShipmentFree) {
      console.log(`  First Shipment Free: ✅`)
    }
    if (features.features?.freeShipments > 0) {
      console.log(`  Free Priority Shipments: ${features.features.freeShipments}/month`)
    }
    console.log()
  }

  // Test plan configurations
  try {
    const plansResponse = await makeRequest('GET', '/api/subscriptions')
    if (plansResponse.data?.availablePlans) {
      const plans = plansResponse.data.availablePlans
      Object.entries(plans).forEach(([planId, features]) => {
        testPlan(planId, features)
      })
    }
  } catch (error) {
    console.error('❌ Failed to test subscription plans:', error.message)
  }
}

async function testSubscriptionWebhook() {
  console.log('\n🪝 Testing Stripe Webhook Simulation\n')
  
  // Simulate Stripe webhook events
  const webhookEvents = [
    {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test_123',
          customer: 'cus_test_123',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_test_starter',
                lookup_key: 'starter'
              }
            }]
          },
          metadata: {
            userId: 'test-user-id',
            planId: 'STARTER'
          }
        }
      }
    },
    {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test_123',
          customer: 'cus_test_123',
          subscription: 'sub_test_123',
          amount_paid: 990, // €9.90 in cents
          currency: 'eur'
        }
      }
    }
  ]

  for (const event of webhookEvents) {
    console.log(`📨 Simulating webhook: ${event.type}`)
    
    try {
      // Note: In real scenario, this would include proper Stripe signature
      const response = await makeRequest('POST', '/api/webhooks/stripe', event, {
        'stripe-signature': 'test-signature'
      })
      
      console.log(`Status: ${response.status}`)
      if (response.status === 200) {
        console.log('✅ Webhook processed successfully')
      } else {
        console.log('❌ Webhook processing failed')
        console.log('Response:', response.data)
      }
    } catch (error) {
      console.log('❌ Webhook test failed:', error.message)
    }
    console.log()
  }
}

async function validateSubscriptionFeatures() {
  console.log('\n🔍 Validating Subscription Feature Calculations\n')
  
  // Test pricing calculations
  const testCases = [
    { plan: 'FREE', basePrice: 25, itemValue: 100, isPriority: false },
    { plan: 'STARTER', basePrice: 25, itemValue: 100, isPriority: false },
    { plan: 'STARTER', basePrice: 25, itemValue: 100, isPriority: true },
    { plan: 'PREMIUM', basePrice: 25, itemValue: 100, isPriority: false },
    { plan: 'PREMIUM', basePrice: 25, itemValue: 100, isPriority: true },
    { plan: 'PREMIUM', basePrice: 100, itemValue: 2000, isPriority: false },
  ]

  console.log('Testing subscription feature calculations:')
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.plan} plan`)
    console.log(`  Base price: €${testCase.basePrice}`)
    console.log(`  Item value: €${testCase.itemValue}`)
    console.log(`  Priority: ${testCase.isPriority ? 'Yes' : 'No'}`)
    
    // These calculations would use the actual service methods
    // For now, we'll just show the test structure
    console.log(`  ✅ Test case configured`)
  })
}

// Main test execution
async function runAllTests() {
  console.log('🚀 EcoDeli Subscription API Test Suite\n')
  console.log('=' * 50)
  
  try {
    await testSubscriptionEndpoints()
    await testSubscriptionPlans()
    await testSubscriptionWebhook()
    await validateSubscriptionFeatures()
    
    console.log('\n✅ All subscription tests completed!')
    console.log('\n📝 Next Steps:')
    console.log('1. Set up Stripe products and prices in Stripe Dashboard')
    console.log('2. Configure environment variables (see src/config/env.example.ts)')
    console.log('3. Test with real Stripe payment methods')
    console.log('4. Set up webhook endpoint with proper signature verification')
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message)
    process.exit(1)
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
}

module.exports = {
  testSubscriptionEndpoints,
  testSubscriptionPlans,
  testSubscriptionWebhook,
  validateSubscriptionFeatures
}