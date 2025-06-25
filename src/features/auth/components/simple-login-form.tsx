"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-client-simple"

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
})

type LoginForm = z.infer<typeof loginSchema>

export function SimpleLoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const { signIn } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "celian@celian-vf.fr", // Valeur par défaut pour les tests
      password: "password123"
    }
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn(data.email, data.password)

      if (result.success) {
        // Redirection selon le rôle sera gérée par le hook
        router.push("/fr/client") // Par défaut
      } else {
        setError(result.error || "Erreur de connexion")
      }
    } catch (error) {
      console.error("Erreur de connexion:", error)
      setError("Erreur de connexion. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Connexion EcoDeli</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Input
              {...register("email")}
              type="email"
              placeholder="Email"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              {...register("password")}
              type="password"
              placeholder="Mot de passe"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion...
              </>
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Comptes de test :</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Email:</strong> celian@celian-vf.fr</p>
            <p><strong>Mot de passe:</strong> password123</p>
            <p><strong>Rôle:</strong> CLIENT</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 