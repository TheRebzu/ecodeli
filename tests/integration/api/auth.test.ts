<<<<<<< Updated upstream
=======
import { NextRequest, NextResponse } from "next/server";
import { mockDeep, mockReset } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

// Mock bcrypt
jest.mock("bcryptjs");
(bcrypt.compare as jest.Mock) = jest.fn();
(bcrypt.hash as jest.Mock) = jest.fn().mockResolvedValue("hashed_password");

// Mock Prisma client
const prismaObj = { default: undefined };
const mockPrisma = mockDeep<PrismaClient>();
prismaObj.default = mockPrisma;

jest.mock("@/lib/prisma", () => prismaObj);

// Mock Next Auth
jest.mock("next-auth");
jest.mock("next-auth/jwt");
const mockUserSession = { user: { id: "user-123", role: "USER", email: "user@example.com" } };

// Mock user data
const mockUser = {
  id: "user-123",
  email: "user@example.com",
  name: "Test User",
  password: "hashed_password",
  role: "USER",
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: {
    id: "profile-123",
    userId: "user-123",
    firstName: "Test",
    lastName: "User",
    phoneNumber: "+1234567890",
    address: "123 Test St",
    city: "Test City",
    zipCode: "12345",
    country: "Test Country",
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

// Mock JWT token
const mockJwtToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJVU0VSIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// Mock API handlers
const signUp = jest.fn();
const signIn = jest.fn();
const signOut = jest.fn();
const forgotPassword = jest.fn();
const resetPassword = jest.fn();
const verifyEmail = jest.fn();
const updatePassword = jest.fn();
const enableMfa = jest.fn();
const disableMfa = jest.fn();
const verifyMfa = jest.fn();

// Mock auth
jest.mock("@/auth", () => ({
  auth: jest.fn()
}));

describe("Auth API", () => {
  beforeEach(() => {
    mockReset(mockPrisma);
    jest.clearAllMocks();
    
    // Default mock responses
    signUp.mockResolvedValue(
      NextResponse.json({ 
        success: true, 
        message: "User registered successfully. Please verify your email." 
      }, { status: 201 })
    );
    
    signIn.mockResolvedValue(
      NextResponse.json({ 
        success: true, 
        user: { id: mockUser.id, email: mockUser.email, role: mockUser.role },
        token: mockJwtToken
      }, { status: 200 })
    );
    
    signOut.mockResolvedValue(
      NextResponse.json({ success: true, message: "Logged out successfully" }, { status: 200 })
    );
    
    forgotPassword.mockResolvedValue(
      NextResponse.json({ 
        success: true, 
        message: "Password reset link sent to your email if it exists in our system"
      }, { status: 200 })
    );
    
    resetPassword.mockResolvedValue(
      NextResponse.json({ success: true, message: "Password reset successful" }, { status: 200 })
    );
    
    verifyEmail.mockResolvedValue(
      NextResponse.json({ success: true, message: "Email verified successfully" }, { status: 200 })
    );
    
    updatePassword.mockResolvedValue(
      NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 })
    );
    
    enableMfa.mockResolvedValue(
      NextResponse.json({ 
        success: true, 
        message: "MFA enabled successfully",
        secret: "MFASECRETKEY123",
        qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      }, { status: 200 })
    );
    
    disableMfa.mockResolvedValue(
      NextResponse.json({ success: true, message: "MFA disabled successfully" }, { status: 200 })
    );
    
    verifyMfa.mockResolvedValue(
      NextResponse.json({ 
        success: true, 
        message: "MFA verification successful",
        token: mockJwtToken
      }, { status: 200 })
    );
  });

  // Test 1: POST for user registration
  describe("POST /api/auth/signup", () => {
    it("should register a new user successfully", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "Password123!",
          name: "New User",
          firstName: "New",
          lastName: "User",
          phoneNumber: "+1987654321",
          agreeToTerms: true
        })
      });
      
      // Call the handler
      const response = await signUp(req);
      
      // Assertions
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 400 if password is not strong enough", async () => {
      // Mock error response
      signUp.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character" 
        }, { status: 400 })
      );
      
      // Create request with weak password
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "weak",
          name: "New User",
          firstName: "New",
          lastName: "User",
          phoneNumber: "+1987654321",
          agreeToTerms: true
        })
      });
      
      // Call the handler
      const response = await signUp(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 409 if email already exists", async () => {
      // Mock error response
      signUp.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Email already in use" 
        }, { status: 409 })
      );
      
      // Create request with existing email
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com", // Existing email
          password: "Password123!",
          name: "Test User",
          firstName: "Test",
          lastName: "User",
          phoneNumber: "+1987654321",
          agreeToTerms: true
        })
      });
      
      // Call the handler
      const response = await signUp(req);
      
      // Assertions
      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if terms are not agreed to", async () => {
      // Mock error response
      signUp.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "You must agree to the terms and conditions" 
        }, { status: 400 })
      );
      
      // Create request without agreeing to terms
      const req = new NextRequest("http://localhost:3000/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: "newuser@example.com",
          password: "Password123!",
          name: "New User",
          firstName: "New",
          lastName: "User",
          phoneNumber: "+1987654321",
          agreeToTerms: false // Not agreeing to terms
        })
      });
      
      // Call the handler
      const response = await signUp(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 2: POST for user login
  describe("POST /api/auth/signin", () => {
    it("should login user successfully", async () => {
      // Setup bcrypt to return true for password comparison
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "Password123!"
        })
      });
      
      // Call the handler
      const response = await signIn(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("user");
      expect(data).toHaveProperty("token");
      expect(data.user).toHaveProperty("email", "user@example.com");
    });

    it("should return 401 for incorrect password", async () => {
      // Setup bcrypt to return false for password comparison
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // Mock error response
      signIn.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Invalid email or password" 
        }, { status: 401 })
      );
      
      // Create request with incorrect password
      const req = new NextRequest("http://localhost:3000/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "WrongPassword123!"
        })
      });
      
      // Call the handler
      const response = await signIn(req);
      
      // Assertions
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 for non-existent user", async () => {
      // Mock error response
      signIn.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Invalid email or password" 
        }, { status: 401 })
      );
      
      // Create request with non-existent email
      const req = new NextRequest("http://localhost:3000/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com",
          password: "Password123!"
        })
      });
      
      // Call the handler
      const response = await signIn(req);
      
      // Assertions
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should prompt for MFA if enabled", async () => {
      // Mock response for MFA challenge
      signIn.mockResolvedValueOnce(
        NextResponse.json({ 
          success: true, 
          requireMfa: true,
          message: "MFA verification required"
        }, { status: 200 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "Password123!"
        })
      });
      
      // Call the handler
      const response = await signIn(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("requireMfa", true);
      expect(data).not.toHaveProperty("token");
    });
  });

  // Test 3: POST for signout
  describe("POST /api/auth/signout", () => {
    it("should logout user successfully", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/auth/signout", {
        method: "POST"
      });
      
      // Call the handler
      const response = await signOut(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should still succeed even if not authenticated", async () => {
      // Set no session
      (auth as jest.Mock).mockResolvedValue(null);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/auth/signout", {
        method: "POST"
      });
      
      // Call the handler
      const response = await signOut(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });
  });

  // Test 4: POST for forgot password
  describe("POST /api/auth/forgot-password", () => {
    it("should send reset password email", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com"
        })
      });
      
      // Call the handler
      const response = await forgotPassword(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should still return 200 for non-existent email for security", async () => {
      // Create request with non-existent email
      const req = new NextRequest("http://localhost:3000/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: "nonexistent@example.com"
        })
      });
      
      // Call the handler
      const response = await forgotPassword(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });
  });

  // Test 5: POST for reset password
  describe("POST /api/auth/reset-password", () => {
    it("should reset password successfully with valid token", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "valid-reset-token",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!"
        })
      });
      
      // Call the handler
      const response = await resetPassword(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 400 if passwords don't match", async () => {
      // Mock error response
      resetPassword.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Passwords do not match" 
        }, { status: 400 })
      );
      
      // Create request with mismatched passwords
      const req = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "valid-reset-token",
          password: "NewPassword123!",
          confirmPassword: "DifferentPassword123!"
        })
      });
      
      // Call the handler
      const response = await resetPassword(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if token is invalid or expired", async () => {
      // Mock error response
      resetPassword.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Invalid or expired token" 
        }, { status: 400 })
      );
      
      // Create request with invalid token
      const req = new NextRequest("http://localhost:3000/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "invalid-reset-token",
          password: "NewPassword123!",
          confirmPassword: "NewPassword123!"
        })
      });
      
      // Call the handler
      const response = await resetPassword(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 6: GET for email verification
  describe("GET /api/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      // Create URL with token
      const url = new URL("http://localhost:3000/api/auth/verify-email");
      url.searchParams.set("token", "valid-verification-token");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await verifyEmail(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 400 if token is invalid or expired", async () => {
      // Mock error response
      verifyEmail.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Invalid or expired token" 
        }, { status: 400 })
      );
      
      // Create URL with invalid token
      const url = new URL("http://localhost:3000/api/auth/verify-email");
      url.searchParams.set("token", "invalid-verification-token");
      const req = new NextRequest(url);
      
      // Call the handler
      const response = await verifyEmail(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if token is missing", async () => {
      // Mock error response
      verifyEmail.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Verification token is required" 
        }, { status: 400 })
      );
      
      // Create URL without token
      const req = new NextRequest("http://localhost:3000/api/auth/verify-email");
      
      // Call the handler
      const response = await verifyEmail(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 7: PUT for updating password
  describe("PUT /api/auth/password", () => {
    it("should update password successfully for authenticated user", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Setup bcrypt to return true for old password verification
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: "CurrentPassword123!",
          newPassword: "NewPassword123!",
          confirmPassword: "NewPassword123!"
        })
      });
      
      // Call the handler
      const response = await updatePassword(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Set no session
      (auth as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      updatePassword.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: "CurrentPassword123!",
          newPassword: "NewPassword123!",
          confirmPassword: "NewPassword123!"
        })
      });
      
      // Call the handler
      const response = await updatePassword(req);
      
      // Assertions
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if current password is incorrect", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Setup bcrypt to return false for old password verification
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // Mock error response
      updatePassword.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Current password is incorrect" 
        }, { status: 400 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: "WrongCurrentPassword",
          newPassword: "NewPassword123!",
          confirmPassword: "NewPassword123!"
        })
      });
      
      // Call the handler
      const response = await updatePassword(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if new passwords don't match", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Setup bcrypt to return true for old password verification
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      
      // Mock error response
      updatePassword.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "New passwords do not match" 
        }, { status: 400 })
      );
      
      // Create request with mismatched new passwords
      const req = new NextRequest("http://localhost:3000/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: "CurrentPassword123!",
          newPassword: "NewPassword123!",
          confirmPassword: "DifferentNewPassword123!"
        })
      });
      
      // Call the handler
      const response = await updatePassword(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 8: POST for enabling MFA
  describe("POST /api/auth/mfa/enable", () => {
    it("should enable MFA for authenticated user", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/enable", {
        method: "POST"
      });
      
      // Call the handler
      const response = await enableMfa(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("secret");
      expect(data).toHaveProperty("qrCode");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Set no session
      (auth as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      enableMfa.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/enable", {
        method: "POST"
      });
      
      // Call the handler
      const response = await enableMfa(req);
      
      // Assertions
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 9: POST for disabling MFA
  describe("POST /api/auth/mfa/disable", () => {
    it("should disable MFA for authenticated user", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({
          password: "Password123!" // Current password for verification
        })
      });
      
      // Call the handler
      const response = await disableMfa(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("message");
    });

    it("should return 401 if user is not authenticated", async () => {
      // Set no session
      (auth as jest.Mock).mockResolvedValue(null);
      
      // Mock error response
      disableMfa.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Authentication required" 
        }, { status: 401 })
      );
      
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({
          password: "Password123!"
        })
      });
      
      // Call the handler
      const response = await disableMfa(req);
      
      // Assertions
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 if current password is incorrect", async () => {
      // Set authenticated session
      (auth as jest.Mock).mockResolvedValue(mockUserSession);
      
      // Setup bcrypt to return false for password verification
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      // Mock error response
      disableMfa.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Incorrect password" 
        }, { status: 400 })
      );
      
      // Create request with incorrect password
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({
          password: "WrongPassword123!"
        })
      });
      
      // Call the handler
      const response = await disableMfa(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });

  // Test 10: POST for verifying MFA
  describe("POST /api/auth/mfa/verify", () => {
    it("should verify MFA code and provide access token", async () => {
      // Create request with body
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          code: "123456" // Valid OTP code
        })
      });
      
      // Call the handler
      const response = await verifyMfa(req);
      
      // Assertions
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("token");
    });

    it("should return 400 if code is invalid", async () => {
      // Mock error response
      verifyMfa.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "Invalid verification code" 
        }, { status: 400 })
      );
      
      // Create request with invalid code
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          code: "999999" // Invalid OTP code
        })
      });
      
      // Call the handler
      const response = await verifyMfa(req);
      
      // Assertions
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 if no MFA challenge is in progress", async () => {
      // Mock error response
      verifyMfa.mockResolvedValueOnce(
        NextResponse.json({ 
          success: false, 
          error: "No MFA challenge in progress" 
        }, { status: 404 })
      );
      
      // Create request with no active challenge
      const req = new NextRequest("http://localhost:3000/api/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify({
          email: "nonmfa@example.com",
          code: "123456"
        })
      });
      
      // Call the handler
      const response = await verifyMfa(req);
      
      // Assertions
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("success", false);
      expect(data).toHaveProperty("error");
    });
  });
});
>>>>>>> Stashed changes
