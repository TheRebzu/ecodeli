"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Key, 
  Smartphone, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  History,
  Globe
} from "lucide-react";
import Link from "next/link";
import { api } from "@/trpc/react";
import { toast } from "sonner";

export default function SecurityPage() {
  const { data: session } = useSession();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  // Récupérer les informations de sécurité
  const { data: securityInfo, refetch } = api.auth.getSecurityInfo.useQuery();
  const { data: loginHistory } = api.auth.getLoginHistory.useQuery({ limit: 5 });

  // Mutations
  const changePasswordMutation = api.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Mot de passe modifié", {
        description: "Votre mot de passe a été mis à jour avec succès"
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (error) => {
      toast.error("Erreur", {
        description: error.message || "Impossible de modifier le mot de passe"
      });
    }
  });

  const toggleTwoFactorMutation = api.auth.toggleTwoFactor.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("2FA mis à jour", {
        description: securityInfo?.twoFactorEnabled ? "2FA désactivée" : "2FA activée"
      });
    }
  });

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Erreur", { description: "Les mots de passe ne correspondent pas" });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Erreur", { description: "Le mot de passe doit contenir au moins 8 caractères" });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres de sécurité</h1>
          <p className="text-muted-foreground">Gérez la sécurité de votre compte</p>
        </div>
      </div>

      {/* Statut de sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Statut de sécurité
          </CardTitle>
          <CardDescription>
            Aperçu de la sécurité de votre compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                securityInfo?.twoFactorEnabled ? "bg-green-100" : "bg-yellow-100"
              }`}>
                {securityInfo?.twoFactorEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="font-medium">2FA</p>
                <p className="text-sm text-muted-foreground">
                  {securityInfo?.twoFactorEnabled ? "Activée" : "Désactivée"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Lock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Mot de passe</p>
                <p className="text-sm text-muted-foreground">Sécurisé</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Globe className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Sessions</p>
                <p className="text-sm text-muted-foreground">
                  {securityInfo?.activeSessions || 1} active{(securityInfo?.activeSessions || 1) > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Authentification à deux facteurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Authentification à deux facteurs
          </CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">2FA par application</p>
              <p className="text-sm text-muted-foreground">
                Utilisez une application d'authentification pour générer des codes
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {securityInfo?.twoFactorEnabled && (
                <Badge variant="outline" className="text-green-600">
                  Activée
                </Badge>
              )}
              <Switch
                checked={securityInfo?.twoFactorEnabled || false}
                onCheckedChange={() => toggleTwoFactorMutation.mutate()}
                disabled={toggleTwoFactorMutation.isPending}
              />
            </div>
          </div>

          {!securityInfo?.twoFactorEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Votre compte n'est pas protégé par l'authentification à deux facteurs. 
                <Button variant="link" className="ml-1 p-0 h-auto" asChild>
                  <Link href="/two-factor/setup">Configurer maintenant</Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Changement de mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
          <CardDescription>
            Mettez à jour votre mot de passe régulièrement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirm-password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
            />
          </div>

          <Button 
            onClick={handlePasswordChange}
            disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
          >
            {changePasswordMutation.isPending ? "Modification..." : "Changer le mot de passe"}
          </Button>
        </CardContent>
      </Card>

      {/* Historique des connexions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activité récente
          </CardTitle>
          <CardDescription>
            Vos dernières connexions au compte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loginHistory && loginHistory.length > 0 ? (
              loginHistory.map((login: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{login.location || "Localisation inconnue"}</p>
                    <p className="text-sm text-muted-foreground">
                      {login.userAgent || "Navigateur inconnu"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium">
                      {new Date(login.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(login.createdAt).toLocaleTimeString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Aucune activité récente
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
