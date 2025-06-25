// Test de connexion avec Better Auth
const http = require('http')

const loginData = {
  email: 'client@test.com',
  password: 'Test123!'
}

const postData = JSON.stringify(loginData)

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/sign-in/email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}

console.log('🔐 Test connexion Better Auth...')

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`)
  console.log('Headers:', res.headers)
  
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
    
    // Extraire les cookies si présents
    const cookies = res.headers['set-cookie']
    if (cookies) {
      console.log('Cookies reçus:', cookies)
    }
  })
})

req.on('error', (e) => {
  console.error('Error:', e.message)
})

req.write(postData)
req.end() 