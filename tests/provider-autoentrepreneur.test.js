const { test, expect } = require('@playwright/test')

test.describe('Provider Autoentrepreneur Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
  })

  test('should display autoentrepreneur validation form', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/validation/autoentrepreneur')
    
    // Check form elements
    await expect(page.locator('text=Statut Autoentrepreneur')).toBeVisible()
    await expect(page.locator('text=Statut juridique')).toBeVisible()
    await expect(page.locator('text=Assurance professionnelle')).toBeVisible()
    
    // Check required fields
    await expect(page.locator('select[name="legalStatus"]')).toBeVisible()
    await expect(page.locator('input[name="insuranceProvider"]')).toBeVisible()
    await expect(page.locator('input[name="insurancePolicy"]')).toBeVisible()
    await expect(page.locator('input[name="insuranceExpiry"]')).toBeVisible()
    await expect(page.locator('input[name="insuranceDocument"]')).toBeVisible()
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/validation/autoentrepreneur')
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=Nom de l\'assureur requis')).toBeVisible()
    await expect(page.locator('text=Numéro de police requis')).toBeVisible()
    await expect(page.locator('text=Date d\'expiration invalide')).toBeVisible()
    await expect(page.locator('text=URL du document d\'assurance invalide')).toBeVisible()
  })

  test('should save autoentrepreneur data successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/validation/autoentrepreneur')
    
    // Fill form with valid data
    await page.selectOption('select[name="legalStatus"]', 'AUTOENTREPRENEUR')
    await page.fill('input[name="insuranceProvider"]', 'AXA Assurance')
    await page.fill('input[name="insurancePolicy"]', 'POL123456789')
    await page.fill('input[name="insuranceExpiry"]', '2025-12-31')
    await page.fill('input[name="insuranceDocument"]', 'https://example.com/insurance.pdf')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('text=Statut autoentrepreneur mis à jour avec succès')).toBeVisible()
  })

  test('should show insurance status badge', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/validation/autoentrepreneur')
    
    // Initially should show "Assurance manquante"
    await expect(page.locator('text=Assurance manquante')).toBeVisible()
    
    // Fill insurance data
    await page.fill('input[name="insuranceProvider"]', 'AXA Assurance')
    await page.fill('input[name="insurancePolicy"]', 'POL123456789')
    await page.fill('input[name="insuranceExpiry"]', '2025-12-31')
    await page.fill('input[name="insuranceDocument"]', 'https://example.com/insurance.pdf')
    
    await page.click('button[type="submit"]')
    
    // Should show "Complète" badge
    await expect(page.locator('text=Complète')).toBeVisible()
  })

  test('should show expired insurance warning', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/validation/autoentrepreneur')
    
    // Fill with expired insurance
    await page.fill('input[name="insuranceProvider"]', 'AXA Assurance')
    await page.fill('input[name="insurancePolicy"]', 'POL123456789')
    await page.fill('input[name="insuranceExpiry"]', '2023-12-31') // Expired date
    await page.fill('input[name="insuranceDocument"]', 'https://example.com/insurance.pdf')
    
    await page.click('button[type="submit"]')
    
    // Should show "Assurance expirée" badge
    await expect(page.locator('text=Assurance expirée')).toBeVisible()
  })
})

test.describe('Provider Autoentrepreneur API', () => {
  test('GET /api/provider/validation/autoentrepreneur should return provider data', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const response = await request.get('/api/provider/validation/autoentrepreneur', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('legalStatus')
    expect(data).toHaveProperty('insuranceProvider')
    expect(data).toHaveProperty('insurancePolicy')
  })

  test('POST /api/provider/validation/autoentrepreneur should update provider data', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const updateData = {
      legalStatus: 'AUTOENTREPRENEUR',
      insuranceProvider: 'AXA Assurance',
      insurancePolicy: 'POL123456789',
      insuranceExpiry: '2025-12-31T00:00:00.000Z',
      insuranceDocument: 'https://example.com/insurance.pdf'
    }
    
    const response = await request.post('/api/provider/validation/autoentrepreneur', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: updateData
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.legalStatus).toBe('AUTOENTREPRENEUR')
    expect(data.insuranceProvider).toBe('AXA Assurance')
    expect(data.insurancePolicy).toBe('POL123456789')
  })

  test('POST /api/provider/validation/autoentrepreneur should validate required fields', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const invalidData = {
      legalStatus: 'AUTOENTREPRENEUR',
      // Missing required fields
    }
    
    const response = await request.post('/api/provider/validation/autoentrepreneur', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: invalidData
    })
    
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toBeDefined()
  })
}) 