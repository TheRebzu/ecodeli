"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Mail, 
  Bell, 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity
} from "lucide-react"
import { EmailTests } from "./email-tests"
import { NotificationTests } from "./notification-tests"
import { ApiTests } from "./api-tests"

export function TestsDashboard() {
  const [activeTab, setActiveTab] = useState("email")

  return (
    <div className="space-y-6">
      {/* Status général */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status des Services
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de l'état des services critiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Emails</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Opérationnel
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">OneSignal</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Opérationnel
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">APIs</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Opérationnel
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tests par catégorie */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Tests Emails
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Tests Notifications
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Tests APIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <EmailTests />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationTests />
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <ApiTests />
        </TabsContent>
      </Tabs>
    </div>
  )
} 