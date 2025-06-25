// Test simple d'inscription client
const http = require('http')

const clientData = {
  email: 'client@test.com',
  password: 'Test123!',
  firstName: 'Marie',
  lastName: 'Dupont',
  phone: '0612345678',
  address: '123 Rue de la Paix',
  city: 'Paris',
  postalCode: '75001',
  termsAccepted: true
}

const postData = JSON.stringify(clientData)

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register/client',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}

console.log('🚀 Test inscription client...')

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`)
  
  let body = ''
  res.on('data', (chunk) => {
    body += chunk
  })
  
  res.on('end', () => {
    try {
      const response = JSON.parse(body)
      console.log('Response:', response)
    } catch (e) {
      console.log('Raw response:', body)
    }
  })
})

req.on('error', (e) => {
  console.error('Error:', e.message)
})

req.write(postData)
req.end() 