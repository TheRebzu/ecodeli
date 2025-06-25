import { SimpleLoginForm } from "@/features/auth/components/simple-login-form"
import { AuthProvider } from "@/lib/auth-client-simple"

export default function SimpleLoginPage() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-green-600">EcoDeli</h1>
            <p className="text-gray-600 mt-2">Plateforme de crowdshipping</p>
          </div>
          <SimpleLoginForm />
        </div>
      </div>
    </AuthProvider>
  )
} 