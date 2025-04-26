import { describe, expect, it } from 'vitest';
import { loginSchema } from '@/schemas/auth/login.schema';
import { registerSchema, UserRole } from '@/schemas/auth/register.schema';
import { merchantRegisterSchema } from '@/schemas/auth/merchant-register.schema';

describe('Auth Schemas', () => {
  describe('Login Schema', () => {
    it('should validate a valid login input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'Password123!'
      };
      
      const result = loginSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
    
    it('should reject an invalid email', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'Password123!'
      };
      
      const result = loginSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
    
    it('should reject a short password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'short'
      };
      
      const result = loginSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Register Schema', () => {
    it('should validate a valid registration input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Test User',
        phoneNumber: '0123456789',
        role: UserRole.CLIENT
      };
      
      const result = registerSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
    
    it('should reject mismatched passwords', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword',
        name: 'Test User',
        phoneNumber: '0123456789',
        role: UserRole.CLIENT
      };
      
      const result = registerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
    
    it('should reject an invalid role', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Test User',
        phoneNumber: '0123456789',
        role: 'INVALID_ROLE'
      };
      
      const result = registerSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
  
  describe('Merchant Register Schema', () => {
    it('should validate a valid merchant registration input', () => {
      const validInput = {
        email: 'merchant@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Merchant Name',
        phoneNumber: '0123456789',
        role: UserRole.MERCHANT,
        businessName: 'Business Name',
        businessAddress: '123 Business St',
        businessCity: 'Business City',
        businessPostal: '12345',
        businessCountry: 'France',
        taxId: '12345678',
        siret: '12345678901234'
      };
      
      const result = merchantRegisterSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid business details', () => {
      const invalidInput = {
        email: 'merchant@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Merchant Name',
        phoneNumber: '0123456789',
        role: UserRole.MERCHANT,
        businessName: '', // Empty business name
        businessAddress: '123 Business St',
        businessCity: 'Business City',
        businessPostal: '12345',
        businessCountry: 'France',
        taxId: '12345678',
        siret: '12345678901234'
      };
      
      const result = merchantRegisterSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
    
    it('should reject an invalid SIRET number', () => {
      const invalidInput = {
        email: 'merchant@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Merchant Name',
        phoneNumber: '0123456789',
        role: UserRole.MERCHANT,
        businessName: 'Business Name',
        businessAddress: '123 Business St',
        businessCity: 'Business City',
        businessPostal: '12345',
        businessCountry: 'France',
        taxId: '12345678',
        siret: '123' // Too short
      };
      
      const result = merchantRegisterSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });
  });
}); 