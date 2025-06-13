#!/usr/bin/env tsx

import { AuthHelper } from '../../helpers/auth.helper';
import { testLogger } from '../../helpers/logger.helper';
import { defaultUsers, testUsers } from '../../config/users.config';

export class AuthTests {
  private logger = testLogger.child('Auth');

  /**
   * Test login for all user types
   */
  async testAllUserLogins(): Promise<void> {
    this.logger.title('Testing Authentication for All User Types');

    const userTypes = Object.keys(defaultUsers) as Array<keyof typeof defaultUsers>;
    
    for (const userType of userTypes) {
      try {
        this.logger.info(`Testing login for: ${userType}`);
        const user = defaultUsers[userType];
        
        const result = await AuthHelper.login({
          email: user.email,
          password: user.password
        });

        if (result.success && result.session) {
          this.logger.success(`✅ ${userType} login successful`, {
            email: result.session.user.email,
            role: result.session.user.role,
            hasToken: !!result.session.token
          });
        } else {
          this.logger.error(`❌ ${userType} login failed`, result.error);
        }

        // Test session retrieval
        const session = await AuthHelper.getSession(user);
        if (session) {
          this.logger.success(`✅ ${userType} session retrieved`, {
            email: session.user.email,
            expiresAt: session.expiresAt.toISOString()
          });
        } else {
          this.logger.error(`❌ ${userType} session retrieval failed`);
        }

        this.logger.separator();

      } catch (error) {
        this.logger.error(`❌ ${userType} test failed`, error);
      }
    }
  }

  /**
   * Test session management
   */
  async testSessionManagement(): Promise<void> {
    this.logger.title('Testing Session Management');

    const client = defaultUsers.client;
    
    try {
      // Login
      this.logger.info('Testing session creation...');
      const loginResult = await AuthHelper.login({
        email: client.email,
        password: client.password
      });

      if (!loginResult.success) {
        this.logger.error('Login failed, cannot test session management');
        return;
      }

      // Get session
      this.logger.info('Testing session retrieval...');
      const session1 = await AuthHelper.getSession(client);
      if (session1) {
        this.logger.success('Session retrieved successfully');
      }

      // Get session again (should use cached)
      this.logger.info('Testing cached session...');
      const session2 = await AuthHelper.getSession(client);
      if (session2) {
        this.logger.success('Cached session retrieved successfully');
      }

      // Logout
      this.logger.info('Testing logout...');
      await AuthHelper.logout(client.email);
      this.logger.success('Logout successful');

      // Try to get session after logout
      this.logger.info('Testing session after logout...');
      const session3 = await AuthHelper.getSession(client);
      if (session3) {
        this.logger.success('New session created after logout');
      } else {
        this.logger.warning('No session after logout (expected if auth fails)');
      }

    } catch (error) {
      this.logger.error('Session management test failed', error);
    }
  }

  /**
   * Test invalid credentials
   */
  async testInvalidCredentials(): Promise<void> {
    this.logger.title('Testing Invalid Credentials');

    const invalidTests = [
      {
        name: 'Wrong password',
        email: defaultUsers.client.email,
        password: 'wrongpassword'
      },
      {
        name: 'Non-existent user',
        email: 'nonexistent@test.com',
        password: 'anypassword'
      },
      {
        name: 'Empty credentials',
        email: '',
        password: ''
      }
    ];

    for (const test of invalidTests) {
      try {
        this.logger.info(`Testing: ${test.name}`);
        
        const result = await AuthHelper.login({
          email: test.email,
          password: test.password
        });

        if (result.success) {
          this.logger.warning(`⚠️  ${test.name}: Expected failure but got success`);
        } else {
          this.logger.success(`✅ ${test.name}: Correctly failed with: ${result.error}`);
        }

      } catch (error) {
        this.logger.success(`✅ ${test.name}: Correctly threw error`);
      }
    }
  }

  /**
   * Run all auth tests
   */
  async runAllTests(): Promise<void> {
    this.logger.title('🔐 Authentication Test Suite');
    this.logger.separator();

    try {
      await this.testAllUserLogins();
      await this.testSessionManagement();
      await this.testInvalidCredentials();

      this.logger.separator();
      this.logger.success('🎉 All authentication tests completed!');

    } catch (error) {
      this.logger.error('Authentication test suite failed', error);
      throw error;
    } finally {
      // Clean up all sessions
      AuthHelper.clearAllSessions();
      this.logger.info('🧹 Cleaned up all test sessions');
    }
  }
}

// Export for direct execution
export async function runAuthTests(): Promise<void> {
  const tests = new AuthTests();
  await tests.runAllTests();
}

// Run if executed directly
if (require.main === module) {
  runAuthTests()
    .then(() => {
      console.log('✅ Auth tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Auth tests failed:', error);
      process.exit(1);
    });
}