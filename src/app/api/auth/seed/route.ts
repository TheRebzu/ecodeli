import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hash } from "bcryptjs";

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10);
}

export async function GET(req: NextRequest) {
  // This is a protected route that should only be accessible in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    console.log('🌱 Starting simplified database seeding...');

    // Creating a simple admin user only to test authentication
    // This approach avoids having to deal with constraint issues in the database
    console.log('👤 Creating admin user for authentication testing...');
    
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: 'admin@ecodeli.me' }
      });

      if (existingUser) {
        return NextResponse.json({
          success: true,
          message: "Test user already exists, no need to re-seed",
          users: [
            { email: 'admin@ecodeli.me', role: 'ADMIN', password: 'password123' }
          ]
        });
      }

      // Create password hash
      const passwordHash = await hashPassword('password123');

      // Create Admin User
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@ecodeli.me',
          password: passwordHash,
          name: 'Admin User',
          phone: '+33123456789',
          address: '123 Admin Street',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
          isVerified: true,
          language: 'fr',
          role: 'ADMIN',
          status: 'APPROVED',
        },
      });

      // Create admin profile
      await prisma.admin.create({
        data: {
          userId: adminUser.id,
          accessLevel: 'SUPERADMIN',
          department: 'Management',
        },
      });

      return NextResponse.json({
        success: true,
        message: "Admin user created successfully",
        users: [
          { email: 'admin@ecodeli.me', role: 'ADMIN', password: 'password123' }
        ]
      });
    } catch (error) {
      console.error('Error creating admin user:', error);
      return NextResponse.json({ 
        error: "Failed to create admin user", 
        details: error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error during seeding:', error);
    return NextResponse.json({ error: "Failed to seed database", details: error }, { status: 500 });
  }
} 