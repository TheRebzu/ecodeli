const { test, expect } = require('@playwright/test')

test.describe('Provider Contracts Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as provider
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'prestataire@test.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/provider/**')
  })

  test('should display contracts management page', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/contracts')
    
    // Check page elements
    await expect(page.locator('text=Contrats EcoDeli')).toBeVisible()
    await expect(page.locator('text=Nouveau contrat')).toBeVisible()
    await expect(page.locator('text=Mes contrats')).toBeVisible()
  })

  test('should create new contract', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/contracts')
    
    // Click create contract button
    await page.click('text=Nouveau contrat')
    
    // Fill contract form
    await page.selectOption('select[name="contractType"]', 'STANDARD')
    await page.fill('input[name="commissionRate"]', '15')
    await page.fill('input[name="startDate"]', '2025-01-01')
    await page.fill('input[name="notes"]', 'Contrat de test')
    
    // Submit form
    await page.click('text=Créer le contrat')
    
    // Should show success message
    await expect(page.locator('text=Contrat créé avec succès')).toBeVisible()
  })

  test('should display contract in table', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/contracts')
    
    // Should show contract table
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('text=Standard')).toBeVisible()
    await expect(page.locator('text=15.0%')).toBeVisible()
  })

  test('should sign contract as provider', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/contracts')
    
    // Find and click sign button for first contract
    const signButton = page.locator('button:has-text("Signer")').first()
    if (await signButton.isVisible()) {
      await signButton.click()
      
      // Should show success message
      await expect(page.locator('text=Contrat signé avec succès')).toBeVisible()
    }
  })

  test('should show contract status badges', async ({ page }) => {
    await page.goto('http://localhost:3000/provider/contracts')
    
    // Check for status badges
    const statusBadges = page.locator('[class*="badge"]')
    await expect(statusBadges.first()).toBeVisible()
  })
})

test.describe('Provider Contracts API', () => {
  test('GET /api/provider/contracts should return provider contracts', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const response = await request.get('/api/provider/contracts', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('contracts')
    expect(Array.isArray(data.contracts)).toBe(true)
  })

  test('POST /api/provider/contracts should create new contract', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const contractData = {
      contractType: 'STANDARD',
      commissionRate: 0.15,
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-12-31T00:00:00.000Z',
      terms: {},
      notes: 'Contrat de test API'
    }
    
    const response = await request.post('/api/provider/contracts', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: contractData
    })
    
    expect(response.status()).toBe(201)
    const data = await response.json()
    expect(data).toHaveProperty('id')
    expect(data.contractType).toBe('STANDARD')
    expect(data.commissionRate).toBe(0.15)
  })

  test('POST /api/provider/contracts/[id]/sign should sign contract', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // First create a contract
    const contractData = {
      contractType: 'STANDARD',
      commissionRate: 0.15,
      startDate: '2025-01-01T00:00:00.000Z',
      terms: {},
      notes: 'Contrat pour signature'
    }
    
    const createResponse = await request.post('/api/provider/contracts', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: contractData
    })
    
    const contract = await createResponse.json()
    
    // Sign the contract
    const signData = {
      contractId: contract.id,
      signatureType: 'PROVIDER',
      signatureData: 'signed_by_provider_test'
    }
    
    const signResponse = await request.post(`/api/provider/contracts/${contract.id}/sign`, {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: signData
    })
    
    expect(signResponse.status()).toBe(200)
    const signResult = await signResponse.json()
    expect(signResult.message).toBe('Contract signed successfully')
  })

  test('POST /api/provider/contracts should validate required fields', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'prestataire@test.com',
        password: 'Test123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const invalidData = {
      // Missing required fields
      contractType: 'INVALID_TYPE',
      commissionRate: 50, // Invalid rate
    }
    
    const response = await request.post('/api/provider/contracts', {
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