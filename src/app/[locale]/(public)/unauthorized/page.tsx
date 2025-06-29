import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserX, ArrowLeft, Home, LogIn } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl"

export default function UnauthorizedPage() {
  const t = useTranslations('errors.unauthorized')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="border-orange-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
              <UserX className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-orange-600">
              {t('title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-gray-600">
              {t('message')}
            </p>
            <p className="text-sm text-gray-500">
              {t('subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Button asChild variant="outline" className="flex-1">
                <Link href="javascript:history.back()">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t('backButton')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/login">
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('loginButton')}
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  {t('homeButton')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 