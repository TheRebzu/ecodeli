// Export des types de schémas pour l'authentification
export type { ClientRegisterSchemaType } from './auth/client-register.schema';
export type { DelivererRegisterSchemaType } from './auth/deliverer-register.schema';
export type { MerchantRegisterSchemaType } from './auth/merchant-register.schema';
export type { ProviderRegisterSchemaType } from './auth/provider-register.schema';
export type { LoginSchemaType } from './login.schema';
export type { RegisterBaseSchemaType } from './auth/register.schema';

// Export des schémas
export { clientRegisterSchema } from './auth/client-register.schema';
export { delivererRegisterSchema } from './auth/deliverer-register.schema';
export { merchantRegisterSchema } from './auth/merchant-register.schema';
export { providerRegisterSchema } from './auth/provider-register.schema';
export {
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './login.schema';
export {
  registerBaseSchema,
  passwordSchema,
  addressFields,
  registerBaseFields,
  UserRole,
} from './auth/register.schema';
export { userRoleSchema, userStatusSchema } from './user.schema';

// Export des schémas d'authentification
export * from './login.schema';
export * from './auth/register.schema';
export * from './auth/client-register.schema';
export * from './auth/deliverer-register.schema';
export * from './auth/merchant-register.schema';
export * from './auth/provider-register.schema';
export * from './user.schema';

// Export des types utilisés par les schémas
// L'export de UserRole est déjà fait plus haut

// Export all auth schemas from this file
export * from './user.schema';
export * from './login.schema';
export * from './document.schema';
export * from './verification.schema';
export * from './admin.schema';
