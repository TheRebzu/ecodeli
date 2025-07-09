const { test, expect } = require('@playwright/test')

test.describe('Provider Monthly Billing Automation', () => {
  test('should trigger monthly billing on 30th of month', async ({ request }) => {
    // Test the CRON job endpoint
    const response = await request.post('/api/cron/provider-monthly-billing', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        // Simulate CRON trigger
        trigger: 'monthly_billing',
        date: new Date().toISOString()
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('message')
    expect(data.message).toContain('Monthly billing processed')
  })

  test('should generate invoices for all active providers', async ({ request }) => {
    // First login as admin
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // Trigger monthly billing
    const response = await request.post('/api/cron/provider-monthly-billing', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: {
        trigger: 'monthly_billing',
        date: new Date().toISOString()
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('processedProviders')
    expect(data).toHaveProperty('generatedInvoices')
    expect(Array.isArray(data.processedProviders)).toBe(true)
    expect(Array.isArray(data.generatedInvoices)).toBe(true)
  })

  test('should calculate correct commission rates', async ({ request }) => {
    // First login as provider
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // Get monthly billing data
    const response = await request.get('/api/provider/billing/monthly?userId=prestataire@test.com&month=1&year=2025', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    
    // Check commission calculation
    expect(data).toHaveProperty('totalRevenue')
    expect(data).toHaveProperty('platformFee')
    expect(data).toHaveProperty('netAmount')
    
    // Commission should be 15% of total revenue
    const expectedCommission = data.totalRevenue * 0.15
    expect(data.platformFee).toBeCloseTo(expectedCommission, 2)
  })

  test('should generate PDF invoices', async ({ request }) => {
    // First login as admin
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // Trigger invoice generation
    const response = await request.post('/api/provider/invoices/generate', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: {
        providerId: 'test-provider-id',
        month: 1,
        year: 2025
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('invoiceUrl')
    expect(data.invoiceUrl).toMatch(/\.pdf$/)
  })

  test('should archive invoices after generation', async ({ request }) => {
    // First login as admin
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // Check archived invoices
    const response = await request.get('/api/provider/invoices/archive', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('archivedInvoices')
    expect(Array.isArray(data.archivedInvoices)).toBe(true)
  })

  test('should send notifications to providers', async ({ request }) => {
    // First login as admin
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // Trigger billing with notifications
    const response = await request.post('/api/cron/provider-monthly-billing', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: {
        trigger: 'monthly_billing',
        date: new Date().toISOString(),
        sendNotifications: true
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('notificationsSent')
    expect(Array.isArray(data.notificationsSent)).toBe(true)
  })
})

test.describe('Provider Billing API', () => {
  test('GET /api/provider/billing/monthly should return billing data', async ({ request }) => {
    // First login as provider
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const response = await request.get('/api/provider/billing/monthly?userId=prestataire@test.com&month=1&year=2025', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    
    // Check billing data structure
    expect(data).toHaveProperty('month')
    expect(data).toHaveProperty('year')
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('totalRevenue')
    expect(data).toHaveProperty('platformFee')
    expect(data).toHaveProperty('netAmount')
    expect(data).toHaveProperty('completedBookings')
    expect(data).toHaveProperty('billingPeriod')
    expect(data).toHaveProperty('bookingBreakdown')
    expect(data).toHaveProperty('feeBreakdown')
  })

  test('GET /api/provider/billing/monthly should calculate correct totals', async ({ request }) => {
    // First login as provider
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const response = await request.get('/api/provider/billing/monthly?userId=prestataire@test.com&month=1&year=2025', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    
    // Verify calculations
    const expectedPlatformFee = data.totalRevenue * 0.15
    const expectedProcessingFees = data.totalRevenue * 0.029
    const expectedTaxAmount = (data.totalRevenue - expectedPlatformFee) * 0.20
    const expectedNetAmount = data.totalRevenue - expectedPlatformFee - expectedProcessingFees - expectedTaxAmount
    
    expect(data.platformFee).toBeCloseTo(expectedPlatformFee + expectedProcessingFees, 2)
    expect(data.taxAmount).toBeCloseTo(expectedTaxAmount, 2)
    expect(data.netAmount).toBeCloseTo(expectedNetAmount, 2)
  })

  test('GET /api/provider/billing/monthly should handle different months', async ({ request }) => {
    // First login as provider
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // Test different months
    const months = [1, 2, 3, 12]
    
    for (const month of months) {
      const response = await request.get(`/api/provider/billing/monthly?userId=prestataire@test.com&month=${month}&year=2025`, {
        headers: {
          'Cookie': cookies
        }
      })
      
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(data.month).toBe(month)
      expect(data.year).toBe(2025)
    }
  })
}) 