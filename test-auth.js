const https = require('http');

async function testRegister() {
  const data = JSON.stringify({
    email: 'test@test.com',
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '0123456789',
    address: '123 Test Street',
    city: 'Paris',
    postalCode: '75001',
    termsAccepted: true
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/register/client',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', (error) => {
      console.error('Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function testLogin() {
  const data = JSON.stringify({
    email: 'test@test.com',
    password: 'Test123!'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/sign-in',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        console.log('Login Status:', res.statusCode);
        console.log('Login Response:', body);
        resolve({ status: res.statusCode, body });
      });
    });

    req.on('error', (error) => {
      console.error('Login Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== Test Registration ===');
  try {
    await testRegister();
  } catch (error) {
    console.error('Registration failed:', error.message);
  }

  console.log('\n=== Test Login ===');
  try {
    await testLogin();
  } catch (error) {
    console.error('Login failed:', error.message);
  }
}

main(); 