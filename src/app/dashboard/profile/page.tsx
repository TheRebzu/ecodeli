'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { clientData } from '@/lib/seed-client';
import { ApiClient } from '@/lib/api-client';

// Type for profile data
type ProfileData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  bio: string;
  preferences: {
    newsletter: boolean;
    smsNotifications: boolean;
    theme: string;
  };
  avatar: string;
  [key: string]: any; // Allow for dynamic property access
};

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch user profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profileData = await clientData.fetchProfile();
        if (profileData) {
          setUser(profileData as ProfileData);
          setFormData(profileData as ProfileData);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (!formData) return;
    
    // Handle nested objects
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData[parent as keyof ProfileData] as Record<string, any>),
          [child]: value,
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    if (!formData) return;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData[parent as keyof ProfileData] as Record<string, any>),
          [child]: checked,
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: checked,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData) return;
    
    setIsSaving(true);
    
    try {
      // Send updated profile to API
      const response = await ApiClient.put('/api/profile', formData);
      
      if (response.success && response.data) {
        setUser(response.data as ProfileData);
        setIsEditing(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(user);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !formData) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load profile data.</p>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Profile</h1>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <form onSubmit={handleSubmit}>
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Manage your personal details and contact information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div className="relative">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                    {isEditing && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          className="w-4 h-4"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        {isEditing ? (
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded">{user.name}</div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded">{user.email}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 rounded">{user.phone}</div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      {isEditing ? (
                        <Textarea
                          id="bio"
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={3}
                        />
                      ) : (
                        <div className="p-2 bg-gray-50 rounded min-h-[5rem]">{user.bio}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="address">
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
                <CardDescription>
                  Manage your delivery and billing addresses.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street">Street Address</Label>
                  {isEditing ? (
                    <Input
                      id="street"
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <div className="p-2 bg-gray-50 rounded">{user.address.street}</div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    {isEditing ? (
                      <Input
                        id="city"
                        name="address.city"
                        value={formData.address.city}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded">{user.address.city}</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    {isEditing ? (
                      <Input
                        id="postalCode"
                        name="address.postalCode"
                        value={formData.address.postalCode}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded">{user.address.postalCode}</div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    {isEditing ? (
                      <Input
                        id="country"
                        name="address.country"
                        value={formData.address.country}
                        onChange={handleInputChange}
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded">{user.address.country}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>
                  Manage your notification and account preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      id="newsletter"
                      name="preferences.newsletter"
                      checked={formData.preferences.newsletter}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  ) : (
                    <div className={`h-4 w-4 rounded ${user.preferences.newsletter ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  )}
                  <Label htmlFor="newsletter">Receive our newsletter</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      id="smsNotifications"
                      name="preferences.smsNotifications"
                      checked={formData.preferences.smsNotifications}
                      onChange={handleCheckboxChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  ) : (
                    <div className={`h-4 w-4 rounded ${user.preferences.smsNotifications ? 'bg-primary' : 'bg-gray-300'}`}></div>
                  )}
                  <Label htmlFor="smsNotifications">SMS notifications</Label>
                </div>
                
                <div className="space-y-2">
                  <Label>Theme Preference</Label>
                  {isEditing ? (
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={formData.preferences.theme === 'light' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            theme: 'light'
                          }
                        })}
                      >
                        Light
                      </Button>
                      <Button
                        type="button"
                        variant={formData.preferences.theme === 'dark' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            theme: 'dark'
                          }
                        })}
                      >
                        Dark
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-50 rounded capitalize">{user.preferences.theme}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {isEditing && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </Tabs>
    </div>
  );
} 