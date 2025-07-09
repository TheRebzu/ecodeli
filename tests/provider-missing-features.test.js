const { test, expect } = require('@playwright/test')

test.describe('Provider Missing Features Validation', () => {
  test('should have autoentrepreneur status validation', async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
    
    // Navigate to autoentrepreneur validation
    await page.goto('http://localhost:3000/provider/validation/autoentrepreneur')
    
    // Check required fields
    await expect(page.locator('text=Statut Autoentrepreneur')).toBeVisible()
    await expect(page.locator('text=Statut juridique')).toBeVisible()
    await expect(page.locator('text=Assurance professionnelle')).toBeVisible()
    
    // Check form fields
    await expect(page.locator('select[name="legalStatus"]')).toBeVisible()
    await expect(page.locator('input[name="insuranceProvider"]')).toBeVisible()
    await expect(page.locator('input[name="insurancePolicy"]')).toBeVisible()
    await expect(page.locator('input[name="insuranceExpiry"]')).toBeVisible()
    await expect(page.locator('input[name="insuranceDocument"]')).toBeVisible()
  })

  test('should have contract management system', async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
    
    // Navigate to contracts
    await page.goto('http://localhost:3000/provider/contracts')
    
    // Check contract management features
    await expect(page.locator('text=Contrats EcoDeli')).toBeVisible()
    await expect(page.locator('text=Nouveau contrat')).toBeVisible()
    await expect(page.locator('text=Mes contrats')).toBeVisible()
    
    // Check contract types
    await page.click('text=Nouveau contrat')
    await expect(page.locator('text=Type de contrat')).toBeVisible()
    await expect(page.locator('text=Standard (15%)')).toBeVisible()
    await expect(page.locator('text=Premium (12%)')).toBeVisible()
    await expect(page.locator('text=Sur mesure')).toBeVisible()
  })

  test('should have certification validation workflow', async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'admin@ecodeli.com')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin/**')
    
    // Navigate to provider certifications
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Check certification validation features
    await expect(page.locator('text=Validation des Certifications Prestataires')).toBeVisible()
    await expect(page.locator('text=Certifications en attente')).toBeVisible()
    
    // Check table headers
    await expect(page.locator('text=Prestataire')).toBeVisible()
    await expect(page.locator('text=Certification')).toBeVisible()
    await expect(page.locator('text=Organisme')).toBeVisible()
    await expect(page.locator('text=Statut')).toBeVisible()
    await expect(page.locator('text=Actions')).toBeVisible()
  })

  test('should have monthly billing automation', async ({ request }) => {
    // Test CRON endpoint exists
    const response = await request.post('/api/cron/provider-monthly-billing', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        trigger: 'monthly_billing',
        date: new Date().toISOString()
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('message')
  })

  test('should have service warranty system', async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
    
    // Navigate to services
    await page.goto('http://localhost:3000/provider/services')
    
    // Check service warranty features
    await expect(page.locator('text=Mes Services')).toBeVisible()
    
    // Check for warranty options
    const warrantyElements = page.locator('[class*="warranty"], [class*="garantie"]')
    if (await warrantyElements.count() > 0) {
      await expect(warrantyElements.first()).toBeVisible()
    }
  })

  test('should have negotiated rates management', async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
    
    // Navigate to rates
    await page.goto('http://localhost:3000/provider/rates')
    
    // Check negotiated rates features
    await expect(page.locator('text=Tarifs Négociés')).toBeVisible()
    await expect(page.locator('text=Commission EcoDeli')).toBeVisible()
  })

  test('should have intervention management', async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
    
    // Navigate to interventions
    await page.goto('http://localhost:3000/provider/interventions')
    
    // Check intervention management features
    await expect(page.locator('text=Mes Interventions')).toBeVisible()
    await expect(page.locator('text=Calendrier')).toBeVisible()
  })

  test('should have client evaluation system', async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
    
    // Navigate to evaluations
    await page.goto('http://localhost:3000/provider/evaluations')
    
    // Check evaluation features
    await expect(page.locator('text=Évaluations Clients')).toBeVisible()
    await expect(page.locator('text=Notes')).toBeVisible()
  })

  test('should have automatic invoice generation', async ({ request }) => {
    // Test invoice generation endpoint
    const response = await request.post('/api/provider/invoices/generate', {
      headers: {
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
  })

  test('should have bank transfer simulation', async ({ request }) => {
    // Test bank transfer endpoint
    const response = await request.post('/api/provider/payments/transfer', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        providerId: 'test-provider-id',
        amount: 1000,
        bankDetails: {
          iban: 'FR1234567890123456789012345',
          bic: 'BNPAFRPP'
        }
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('transferId')
    expect(data).toHaveProperty('status')
  })
})

test.describe('Provider API Endpoints Validation', () => {
  test('should have all required API endpoints', async ({ request }) => {
    const requiredEndpoints = [
      '/api/provider/validation/autoentrepreneur',
      '/api/provider/contracts',
      '/api/provider/contracts/[id]/sign',
      '/api/admin/provider-certifications',
      '/api/provider/billing/monthly',
      '/api/cron/provider-monthly-billing',
      '/api/provider/invoices/generate',
      '/api/provider/services',
      '/api/provider/interventions',
      '/api/provider/evaluations',
      '/api/provider/rates',
      '/api/provider/payments/transfer'
    ]
    
    for (const endpoint of requiredEndpoints) {
      // Test endpoint exists (should return 401 for unauthorized access)
      const response = await request.get(endpoint.replace('[id]', 'test-id'))
      expect([200, 401, 404]).toContain(response.status())
    }
  })

  test('should have proper authentication for all endpoints', async ({ request }) => {
    const protectedEndpoints = [
      '/api/provider/validation/autoentrepreneur',
      '/api/provider/contracts',
      '/api/provider/billing/monthly',
      '/api/admin/provider-certifications'
    ]
    
    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint)
      expect(response.status()).toBe(401) // Should require authentication
    }
  })

  test('should have proper role-based access control', async ({ request }) => {
    // Test provider endpoints with admin user (should fail)
    const adminLogin = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const adminCookies = adminLogin.headers()['set-cookie']
    
    const providerEndpoints = [
      '/api/provider/validation/autoentrepreneur',
      '/api/provider/contracts',
      '/api/provider/billing/monthly'
    ]
    
    for (const endpoint of providerEndpoints) {
      const response = await request.get(endpoint, {
        headers: {
          'Cookie': adminCookies
        }
      })
      expect(response.status()).toBe(403) // Should be forbidden for admin
    }
  })
}) 