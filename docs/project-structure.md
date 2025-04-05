# Project Structure Documentation

## Overview

This document outlines the structure of the EcoDeli project, focusing on the authentication system and overall organization. The project follows a modern Next.js 15 application structure with a focus on clean architecture and maintainability.

## Authentication System

The authentication is implemented using NextAuth.js v5 (Auth.js), which provides a robust authentication solution with support for:

- Email/password credentials
- OAuth providers (Google, Facebook)
- Email verification
- Password reset
- Two-factor authentication

### Key Files

- `src/auth.ts`: Main NextAuth.js configuration
- `src/auth.config.ts`: Base configuration shared between auth.ts and middleware
- `src/middleware.ts`: Route protection and authorization
- `src/app/api/auth/[...nextauth]/route.ts`: API route handler for NextAuth.js
- `src/hooks/use-auth.ts`: Client-side authentication hook
- `src/components/providers/auth-provider.tsx`: Authentication provider component

## Project Directory Structure

### Root Directories

- `src/`: Application source code
- `prisma/`: Database schema and migrations
- `public/`: Static assets
- `docs/`: Documentation
- `tests/`: Test files
- `scripts/`: Utility scripts

### Source Code Organization

- `src/app/`: Next.js App Router pages and layouts
  - `(auth)/`: Authentication-related pages
  - `(public)/`: Public pages
  - `dashboard/`: User dashboard
  - `admin/`: Admin pages
  - `api/`: API routes

- `src/components/`: React components
  - `auth/`: Authentication-related components
  - `ui/`: UI components (based on Shadcn/UI)
  - `providers/`: Context providers
  - `layout/`: Layout components

- `src/lib/`: Utilities and services
  - `prisma.ts`: Prisma client
  - `validations/`: Zod schemas
  - `services/`: Service modules
  - `actions/`: Server actions

- `src/hooks/`: Custom React hooks
- `src/types/`: TypeScript type definitions
- `src/shared/`: Shared utilities and constants
- `src/locales/`: Internationalization files

## API Structure

The API routes are organized by domain and follow a RESTful approach:

- `src/app/api/auth/`: Authentication endpoints
- `src/app/api/users/`: User management
- `src/app/api/deliveries/`: Delivery-related endpoints
- And many other domain-specific endpoints

## Authentication Flows

### Login Flow

1. User submits credentials via the `LoginForm` component
2. The `signIn` function from `use-auth.ts` is called
3. NextAuth.js validates the credentials against the database
4. Upon success, the user is redirected to the dashboard

### Registration Flow

1. User submits registration data via the `RegisterForm` component
2. The form data is validated using Zod schemas
3. The registration API creates a new user in the database
4. The user is redirected to a verification page or logged in directly

### Protected Routes

Routes under `/dashboard`, `/admin`, and `/profile` are protected by the middleware, which:

1. Checks if the user is authenticated
2. Verifies the user's role for role-based access control
3. Redirects unauthenticated users to the login page

## Recent Refactoring Changes

The project was recently refactored to improve organization and eliminate redundant files:

1. Removed `better-auth` related files and dependencies which were unused
2. Consolidated authentication configuration in `auth.config.ts` and `auth.ts`
3. Improved middleware for better route protection
4. Enhanced type safety with dedicated NextAuth type definitions
5. Created a consistent authentication hook for client components
6. Updated the auth provider to use NextAuth's SessionProvider

## Development Guidelines

When working on this project, please follow these guidelines:

1. Use TypeScript for all new code and maintain proper type definitions
2. Follow the established naming conventions: kebab-case for files, PascalCase for components
3. Create Zod schemas for all form data and API endpoints
4. Use server components where possible to reduce client-side JavaScript
5. Implement proper error handling and user feedback
6. Include comprehensive tests for new features

## Environment Setup

The project requires several environment variables for authentication:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
FACEBOOK_CLIENT_ID=your_client_id
FACEBOOK_CLIENT_SECRET=your_client_secret

# Database
DATABASE_URL=your_database_url

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
EMAIL_FROM=noreply@example.com
```

For a complete list of required variables, refer to `.env.example`. 