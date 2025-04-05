import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Demo data storage - in a real app, this would be in the database
interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  status: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  bio: string;
  preferences: {
    newsletter: boolean;
    smsNotifications: boolean;
    theme: string;
  };
  avatar: string;
}

const profileStore: Record<string, ProfileData> = {};

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get user profile from the store or create a default
    if (!profileStore[session.user.id]) {
      profileStore[session.user.id] = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: null,
        role: session.user.role,
        status: 'APPROVED',
        address: {
          street: '123 Main St',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
        },
        phone: '+33 6 12 34 56 78',
        bio: 'Passionate about eco-friendly products and sustainable living.',
        preferences: {
          newsletter: true,
          smsNotifications: false,
          theme: 'light',
        },
        avatar: 'https://i.pravatar.cc/150?img=68',
      };
    }
    
    // Return the profile
    return NextResponse.json({ 
      success: true, 
      data: profileStore[session.user.id]
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const data = await request.json();
    
    // Initialize profile if it doesn't exist
    if (!profileStore[session.user.id]) {
      await GET(); // This will initialize the profile
    }
    
    // Update the profile
    profileStore[session.user.id] = {
      ...profileStore[session.user.id],
      name: data.name || profileStore[session.user.id].name,
      bio: data.bio || profileStore[session.user.id].bio,
      phone: data.phone || profileStore[session.user.id].phone,
      address: {
        ...profileStore[session.user.id].address,
        ...(data.address || {})
      },
      preferences: {
        ...profileStore[session.user.id].preferences,
        ...(data.preferences || {})
      },
      avatar: data.avatar || profileStore[session.user.id].avatar,
    };
    
    return NextResponse.json({ 
      success: true, 
      data: profileStore[session.user.id]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update profile' 
    }, { status: 500 });
  }
} 