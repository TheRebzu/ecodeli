'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { clientData } from '@/lib/seed-client';
import { ApiClient } from '@/lib/api-client';

// Types
type UserSettings = {
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
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await clientData.fetchSettings();
        if (data) {
          setSettings(data as UserSettings);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error('Could not load your settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSetting = async (path: string, value: any) => {
    if (!settings) return;
    
    // Create a deep copy of the settings
    const newSettings = JSON.parse(JSON.stringify(settings));
    
    // Update the specific path
    const keys = path.split('.');
    let current = newSettings.settings;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    setSettings(newSettings);
    
    // Save to API
    try {
      setIsSaving(true);
      const response = await ApiClient.put('/api/settings', newSettings);
      
      if (response.success) {
        toast.success('Setting updated');
      } else {
        // Revert changes if API call fails
        toast.error('Failed to update setting');
        loadSettings();
      }
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await clientData.fetchSettings();
      if (data) {
        setSettings(data as UserSettings);
      }
    } catch (error) {
      console.error('Failed to reload settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // Handle error state
  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-500">Failed to load settings</p>
        <Button onClick={loadSettings}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how you want to receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications" className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email.
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  disabled={isSaving}
                  checked={settings.settings.notifications.email}
                  onCheckedChange={(checked) => 
                    updateSetting('notifications.email', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications" className="text-base">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications on your devices.
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  disabled={isSaving}
                  checked={settings.settings.notifications.push}
                  onCheckedChange={(checked) => 
                    updateSetting('notifications.push', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sms-notifications" className="text-base">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important notifications via SMS.
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  disabled={isSaving}
                  checked={settings.settings.notifications.sms}
                  onCheckedChange={(checked) => 
                    updateSetting('notifications.sms', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Manage your privacy and data sharing preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Profile Visibility</Label>
                <p className="text-sm text-muted-foreground">
                  Control who can see your profile.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={settings.settings.privacy.profileVisibility === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('privacy.profileVisibility', 'public')}
                    disabled={isSaving}
                  >
                    Public
                  </Button>
                  <Button
                    variant={settings.settings.privacy.profileVisibility === 'contacts' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('privacy.profileVisibility', 'contacts')}
                    disabled={isSaving}
                  >
                    Contacts Only
                  </Button>
                  <Button
                    variant={settings.settings.privacy.profileVisibility === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('privacy.profileVisibility', 'private')}
                    disabled={isSaving}
                  >
                    Private
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="activity-status" className="text-base">Activity Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Show when you're active on the platform.
                  </p>
                </div>
                <Switch
                  id="activity-status"
                  disabled={isSaving}
                  checked={settings.settings.privacy.activityStatus}
                  onCheckedChange={(checked) => 
                    updateSetting('privacy.activityStatus', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="share-data" className="text-base">Share Usage Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Help us improve by sharing anonymous usage data.
                  </p>
                </div>
                <Switch
                  id="share-data"
                  disabled={isSaving}
                  checked={settings.settings.privacy.shareData}
                  onCheckedChange={(checked) => 
                    updateSetting('privacy.shareData', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how the application looks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Theme</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={settings.settings.appearance.theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.theme', 'light')}
                    disabled={isSaving}
                  >
                    Light
                  </Button>
                  <Button
                    variant={settings.settings.appearance.theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.theme', 'dark')}
                    disabled={isSaving}
                  >
                    Dark
                  </Button>
                  <Button
                    variant={settings.settings.appearance.theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.theme', 'system')}
                    disabled={isSaving}
                  >
                    System
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">Font Size</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={settings.settings.appearance.fontSize === 'small' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.fontSize', 'small')}
                    disabled={isSaving}
                  >
                    Small
                  </Button>
                  <Button
                    variant={settings.settings.appearance.fontSize === 'medium' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.fontSize', 'medium')}
                    disabled={isSaving}
                  >
                    Medium
                  </Button>
                  <Button
                    variant={settings.settings.appearance.fontSize === 'large' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.fontSize', 'large')}
                    disabled={isSaving}
                  >
                    Large
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">Color Scheme</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant={settings.settings.appearance.colorScheme === 'default' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.colorScheme', 'default')}
                    disabled={isSaving}
                  >
                    Default
                  </Button>
                  <Button
                    variant={settings.settings.appearance.colorScheme === 'contrast' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.colorScheme', 'contrast')}
                    disabled={isSaving}
                  >
                    High Contrast
                  </Button>
                  <Button
                    variant={settings.settings.appearance.colorScheme === 'colorful' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSetting('appearance.colorScheme', 'colorful')}
                    disabled={isSaving}
                  >
                    Colorful
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle>Accessibility Options</CardTitle>
              <CardDescription>
                Make the application more accessible for your needs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reduce-motion" className="text-base">Reduce Motion</Label>
                  <p className="text-sm text-muted-foreground">
                    Minimize animations throughout the application.
                  </p>
                </div>
                <Switch
                  id="reduce-motion"
                  disabled={isSaving}
                  checked={settings.settings.accessibility.reduceMotion}
                  onCheckedChange={(checked) => 
                    updateSetting('accessibility.reduceMotion', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="screen-reader" className="text-base">Screen Reader Optimization</Label>
                  <p className="text-sm text-muted-foreground">
                    Optimize interface for screen readers.
                  </p>
                </div>
                <Switch
                  id="screen-reader"
                  disabled={isSaving}
                  checked={settings.settings.accessibility.screenReader}
                  onCheckedChange={(checked) => 
                    updateSetting('accessibility.screenReader', checked)
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="high-contrast" className="text-base">High Contrast Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Increase contrast for better visibility.
                  </p>
                </div>
                <Switch
                  id="high-contrast"
                  disabled={isSaving}
                  checked={settings.settings.accessibility.highContrast}
                  onCheckedChange={(checked) => 
                    updateSetting('accessibility.highContrast', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 