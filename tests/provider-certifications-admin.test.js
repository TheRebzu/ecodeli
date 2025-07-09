const { test, expect } = require('@playwright/test')

test.describe('Provider Certifications Admin Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="email"]', 'admin@ecodeli.com')
    await page.fill('input[name="password"]', 'Admin123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/admin/**')
  })

  test('should display provider certifications admin page', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Check page elements
    await expect(page.locator('text=Validation des Certifications Prestataires')).toBeVisible()
    await expect(page.locator('text=Certifications en attente')).toBeVisible()
  })

  test('should show certifications table', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Should show table headers
    await expect(page.locator('text=Prestataire')).toBeVisible()
    await expect(page.locator('text=Certification')).toBeVisible()
    await expect(page.locator('text=Organisme')).toBeVisible()
    await expect(page.locator('text=Statut')).toBeVisible()
    await expect(page.locator('text=Actions')).toBeVisible()
  })

  test('should open validation dialog', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Find and click validate button for first certification
    const validateButton = page.locator('button:has-text("Valider")').first()
    if (await validateButton.isVisible()) {
      await validateButton.click()
      
      // Should show validation dialog
      await expect(page.locator('text=Validation:')).toBeVisible()
      await expect(page.locator('text=Statut')).toBeVisible()
      await expect(page.locator('text=Notes (optionnel)')).toBeVisible()
    }
  })

  test('should approve certification', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Find and click validate button for first certification
    const validateButton = page.locator('button:has-text("Valider")').first()
    if (await validateButton.isVisible()) {
      await validateButton.click()
      
      // Select approve status
      await page.selectOption('select', 'APPROVED')
      
      // Add notes
      await page.fill('textarea', 'Certification validée après vérification')
      
      // Submit validation
      await page.click('button:has-text("Approuver")')
      
      // Should show success message
      await expect(page.locator('text=Certification mise à jour avec succès')).toBeVisible()
    }
  })

  test('should reject certification', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Find and click validate button for first certification
    const validateButton = page.locator('button:has-text("Valider")').first()
    if (await validateButton.isVisible()) {
      await validateButton.click()
      
      // Select reject status
      await page.selectOption('select', 'REJECTED')
      
      // Add rejection notes
      await page.fill('textarea', 'Document incomplet ou expiré')
      
      // Submit validation
      await page.click('button:has-text("Rejeter")')
      
      // Should show success message
      await expect(page.locator('text=Certification mise à jour avec succès')).toBeVisible()
    }
  })

  test('should show certification details in dialog', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/provider-certifications')
    
    // Find and click validate button for first certification
    const validateButton = page.locator('button:has-text("Valider")').first()
    if (await validateButton.isVisible()) {
      await validateButton.click()
      
      // Should show certification details
      await expect(page.locator('text=Prestataire')).toBeVisible()
      await expect(page.locator('text=Organisme')).toBeVisible()
      await expect(page.locator('text=Date d\'émission')).toBeVisible()
      await expect(page.locator('text=Expiration')).toBeVisible()
    }
  })
})

test.describe('Provider Certifications Admin API', () => {
  test('GET /api/admin/provider-certifications should return certifications', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const response = await request.get('/api/admin/provider-certifications', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('certifications')
    expect(Array.isArray(data.certifications)).toBe(true)
  })

  test('GET /api/admin/provider-certifications should filter by status', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const response = await request.get('/api/admin/provider-certifications?status=PENDING', {
      headers: {
        'Cookie': cookies
      }
    })
    
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('certifications')
    
    // All certifications should have PENDING status
    data.certifications.forEach((cert: any) => {
      expect(cert.status).toBe('PENDING')
    })
  })

  test('POST /api/admin/provider-certifications should approve certification', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // First get certifications to find one to approve
    const getResponse = await request.get('/api/admin/provider-certifications?status=PENDING', {
      headers: {
        'Cookie': cookies
      }
    })
    
    const certifications = await getResponse.json()
    
    if (certifications.certifications.length > 0) {
      const certification = certifications.certifications[0]
      
      const approveData = {
        certificationId: certification.id,
        status: 'APPROVED',
        notes: 'Certification validée après vérification'
      }
      
      const response = await request.post('/api/admin/provider-certifications', {
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/json'
        },
        data: approveData
      })
      
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Certification updated successfully')
      expect(data.certification.status).toBe('APPROVED')
    }
  })

  test('POST /api/admin/provider-certifications should reject certification', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    // First get certifications to find one to reject
    const getResponse = await request.get('/api/admin/provider-certifications?status=PENDING', {
      headers: {
        'Cookie': cookies
      }
    })
    
    const certifications = await getResponse.json()
    
    if (certifications.certifications.length > 0) {
      const certification = certifications.certifications[0]
      
      const rejectData = {
        certificationId: certification.id,
        status: 'REJECTED',
        notes: 'Document incomplet ou expiré'
      }
      
      const response = await request.post('/api/admin/provider-certifications', {
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/json'
        },
        data: rejectData
      })
      
      expect(response.status()).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Certification updated successfully')
      expect(data.certification.status).toBe('REJECTED')
    }
  })

  test('POST /api/admin/provider-certifications should validate required fields', async ({ request }) => {
    // First login to get session
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: 'admin@ecodeli.com',
        password: 'Admin123!'
      }
    })
    
    const cookies = loginResponse.headers()['set-cookie']
    
    const invalidData = {
      // Missing certificationId and status
      notes: 'Test notes'
    }
    
    const response = await request.post('/api/admin/provider-certifications', {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      data: invalidData
    })
    
    expect(response.status()).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Certification ID and status are required')
  })
}) 