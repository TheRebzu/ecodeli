import { NextResponse } from 'next/server';
import { auth } from '@/auth';

// Demo data storage - in a real app, this would be in the database
interface UserSettings {
  id: string;
  userId: string;
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'contacts' | 'private';
      activityStatus: boolean;
      shareData: boolean;
    };
    appearance: {
      theme: 'light' | 'dark' | 'system';
      fontSize: 'small' | 'medium' | 'large';
      colorScheme: 'default' | 'contrast' | 'colorful';
    };
    accessibility: {
      reduceMotion: boolean;
      screenReader: boolean;
      highContrast: boolean;
    };
  };
}

const settingsStore: Record<string, UserSettings> = {};

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get user settings from the store or create default
    if (!settingsStore[session.user.id]) {
      settingsStore[session.user.id] = {
        id: 'settings-' + session.user.id,
        userId: session.user.id,
        settings: {
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          privacy: {
            profileVisibility: 'public',
            activityStatus: true,
            shareData: false
          },
          appearance: {
            theme: 'light',
            fontSize: 'medium',
            colorScheme: 'default'
          },
          accessibility: {
            reduceMotion: false,
            screenReader: false,
            highContrast: false
          }
        }
      };
    }
    
    return NextResponse.json({ 
      success: true, 
      data: settingsStore[session.user.id]
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch settings' 
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
    
    // Initialize settings if they don't exist
    if (!settingsStore[session.user.id]) {
      await GET(); // This will initialize the settings
    }
    
    // Update settings with the new values
    settingsStore[session.user.id] = {
      ...settingsStore[session.user.id],
      settings: data.settings || data
    };
    
    return NextResponse.json({ 
      success: true, 
      data: settingsStore[session.user.id]
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update settings' 
    }, { status: 500 });
  }
} 