"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard,
  Shield,
  Bell,
  FileText,
  Settings,
  Trash2,
  Plus,
  Edit,
  Upload,
  Download,
  Star,
  Package,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react"
import { useClientProfile, ProfileUpdateData } from "@/features/client/hooks/useClientProfile"

const subscriptionLabels = {
  FREE: { name: 'Gratuit', color: 'bg-gray-100 text-gray-800' },
  STARTER: { name: 'Starter', color: 'bg-blue-100 text-blue-800' },
  PREMIUM: { name: 'Premium', color: 'bg-yellow-100 text-yellow-800' }
}

const documentTypes = {
  IDENTITY: 'Pièce d\'identité',
  PROOF_OF_ADDRESS: 'Justificatif de domicile',
  DRIVING_LICENSE: 'Permis de conduire',
  INSURANCE: 'Assurance',
  OTHER: 'Autre'
}

const documentStatusLabels = {
  PENDING: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircle }
}

export default function ClientProfilePage() {
  const {
    profile,
    isLoading,
    error,
    updateProfile,
    uploadDocument,
    deleteDocument,
    addPaymentMethod,
    removePaymentMethod,
    addAddress,
    updateAddress,
    deleteAddress
  } = useClientProfile()

  const [editMode, setEditMode] = useState(false)
  const [documentDialog, setDocumentDialog] = useState(false)
  const [addressDialog, setAddressDialog] = useState(false)
  const [paymentDialog, setPaymentDialog] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<any>(null)
  
  // Formulaires
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    dateOfBirth: ''
  })

  const [documentForm, setDocumentForm] = useState({
    type: '',
    file: null as File | null
  })

  const [addressForm, setAddressForm] = useState({
    label: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'France',
    isDefault: false
  })

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    sms: false,
    push: true,
    marketing: false
  })

  const t = useTranslations()

  const handleEditProfile = () => {
    if (profile) {
      setProfileForm({
        name: profile.user.name || '',
        email: profile.user.email || '',
        phone: profile.user.phone || '',
        address: profile.user.address || '',
        city: profile.user.city || '',
        postalCode: profile.user.postalCode || '',
        country: profile.user.country || '',
        dateOfBirth: profile.user.dateOfBirth ? profile.user.dateOfBirth.split('T')[0] : ''
      })
      setNotificationPrefs(profile.preferences.notifications)
      setEditMode(true)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const updates: ProfileUpdateData = {
        ...profileForm,
        preferences: {
          ...profile?.preferences,
          notifications: notificationPrefs
        }
      }

      await updateProfile(updates)
      setEditMode(false)
      alert('Profil mis à jour avec succès !')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de la mise à jour')
    }
  }

  const handleUploadDocument = async () => {
    if (!documentForm.file || !documentForm.type) {
      alert('Veuillez sélectionner un fichier et un type')
      return
    }

    try {
      await uploadDocument(documentForm.file, documentForm.type)
      setDocumentDialog(false)
      setDocumentForm({ type: '', file: null })
      alert('Document uploadé avec succès !')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'upload')
    }
  }

  const handleAddAddress = async () => {
    if (!addressForm.street || !addressForm.city || !addressForm.postalCode) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      if (selectedAddress) {
        await updateAddress(selectedAddress.id, addressForm)
        alert('Adresse mise à jour avec succès !')
      } else {
        await addAddress(addressForm)
        alert('Adresse ajoutée avec succès !')
      }
      
      setAddressDialog(false)
      setAddressForm({
        label: '',
        street: '',
        city: '',
        postalCode: '',
        country: 'France',
        isDefault: false
      })
      setSelectedAddress(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Erreur lors de l\'opération')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <div className="text-red-600 mb-4">Erreur de chargement</div>
              <p className="text-red-800">{error}</p>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
                variant="outline"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">Profil non trouvé</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                👤 Mon Profil
              </h1>
              <p className="text-gray-600">
                Gérez vos informations personnelles et préférences
              </p>
            </div>
            <Badge className={subscriptionLabels[profile.subscriptionPlan].color}>
              {subscriptionLabels[profile.subscriptionPlan].name}
            </Badge>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Commandes</p>
                  <p className="text-2xl font-bold">{profile.stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Dépenses</p>
                  <p className="text-2xl font-bold">{profile.stats.totalSpent}€</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Note moyenne</p>
                  <p className="text-2xl font-bold">{profile.stats.averageRating.toFixed(1)}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Livraisons</p>
                  <p className="text-2xl font-bold">{profile.stats.completedDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="profile">Profil</TabsTrigger>
            <TabsTrigger value="addresses">Adresses</TabsTrigger>
            <TabsTrigger value="payments">Paiements</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          {/* Onglet Profil */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Informations personnelles</CardTitle>
                  <Button
                    variant="outline"
                    onClick={editMode ? handleSaveProfile : handleEditProfile}
                  >
                    {editMode ? <CheckCircle className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                    {editMode ? 'Sauvegarder' : 'Modifier'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      value={editMode ? profileForm.name : profile.user.name}
                      onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editMode ? profileForm.email : profile.user.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={editMode ? profileForm.phone : profile.user.phone || ''}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dateOfBirth">Date de naissance</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={editMode ? profileForm.dateOfBirth : profile.user.dateOfBirth?.split('T')[0] || ''}
                      onChange={(e) => setProfileForm({...profileForm, dateOfBirth: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={editMode ? profileForm.address : profile.user.address || ''}
                      onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={editMode ? profileForm.city : profile.user.city || ''}
                      onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input
                      id="postalCode"
                      value={editMode ? profileForm.postalCode : profile.user.postalCode || ''}
                      onChange={(e) => setProfileForm({...profileForm, postalCode: e.target.value})}
                      disabled={!editMode}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Adresses */}
          <TabsContent value="addresses" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mes adresses</CardTitle>
                  <Dialog open={addressDialog} onOpenChange={setAddressDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une adresse
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {selectedAddress ? 'Modifier l\'adresse' : 'Nouvelle adresse'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="addressLabel">Libellé</Label>
                          <Input
                            id="addressLabel"
                            placeholder="Domicile, Bureau..."
                            value={addressForm.label}
                            onChange={(e) => setAddressForm({...addressForm, label: e.target.value})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="street">Adresse</Label>
                          <Input
                            id="street"
                            placeholder="Rue, avenue..."
                            value={addressForm.street}
                            onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="addressCity">Ville</Label>
                            <Input
                              id="addressCity"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="addressPostalCode">Code postal</Label>
                            <Input
                              id="addressPostalCode"
                              value={addressForm.postalCode}
                              onChange={(e) => setAddressForm({...addressForm, postalCode: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="defaultAddress"
                            checked={addressForm.isDefault}
                            onCheckedChange={(checked) => setAddressForm({...addressForm, isDefault: checked})}
                          />
                          <Label htmlFor="defaultAddress">Adresse par défaut</Label>
                        </div>
                        <Button onClick={handleAddAddress} className="w-full">
                          {selectedAddress ? 'Modifier' : 'Ajouter'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {profile.addresses.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune adresse enregistrée</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.addresses.map((address) => (
                      <Card key={address.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{address.label}</h4>
                                {address.isDefault && (
                                  <Badge variant="outline">Par défaut</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">
                                {address.street}, {address.city} {address.postalCode}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAddress(address)
                                  setAddressForm({
                                    label: address.label,
                                    street: address.street,
                                    city: address.city,
                                    postalCode: address.postalCode,
                                    country: address.country,
                                    isDefault: address.isDefault
                                  })
                                  setAddressDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteAddress(address.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Paiements */}
          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Moyens de paiement</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une carte
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {profile.paymentMethods.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun moyen de paiement</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.paymentMethods.map((method) => (
                      <Card key={method.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CreditCard className="h-6 w-6 text-gray-600" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    **** **** **** {method.lastFour}
                                  </span>
                                  {method.isDefault && (
                                    <Badge variant="outline">Principal</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  {method.brand} • Expire {method.expiryDate}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removePaymentMethod(method.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Documents */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mes documents</CardTitle>
                  <Dialog open={documentDialog} onOpenChange={setDocumentDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Ajouter un document
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouveau document</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="documentType">Type de document</Label>
                          <Select
                            value={documentForm.type}
                            onValueChange={(value) => setDocumentForm({...documentForm, type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choisir un type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(documentTypes).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="documentFile">Fichier</Label>
                          <Input
                            id="documentFile"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setDocumentForm({
                              ...documentForm,
                              file: e.target.files?.[0] || null
                            })}
                          />
                        </div>
                        <Button onClick={handleUploadDocument} className="w-full">
                          Uploader
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {profile.documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucun document uploadé</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {profile.documents.map((document) => {
                      const StatusIcon = documentStatusLabels[document.status].icon
                      return (
                        <Card key={document.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="h-6 w-6 text-gray-600" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{document.name}</span>
                                    <Badge className={documentStatusLabels[document.status].color}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {documentStatusLabels[document.status].label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {documentTypes[document.type as keyof typeof documentTypes]} • 
                                    Uploadé le {new Date(document.uploadedAt).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {document.url && (
                                  <Button variant="outline" size="sm" asChild>
                                    <a href={document.url} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteDocument(document.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Paramètres */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifications par email</h4>
                    <p className="text-sm text-gray-600">Recevez les mises à jour par email</p>
                  </div>
                  <Switch
                    checked={editMode ? notificationPrefs.email : profile.preferences.notifications.email}
                    onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, email: checked})}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifications SMS</h4>
                    <p className="text-sm text-gray-600">Recevez les alertes par SMS</p>
                  </div>
                  <Switch
                    checked={editMode ? notificationPrefs.sms : profile.preferences.notifications.sms}
                    onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, sms: checked})}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Notifications push</h4>
                    <p className="text-sm text-gray-600">Notifications dans le navigateur</p>
                  </div>
                  <Switch
                    checked={editMode ? notificationPrefs.push : profile.preferences.notifications.push}
                    onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, push: checked})}
                    disabled={!editMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Communications marketing</h4>
                    <p className="text-sm text-gray-600">Offres et nouveautés</p>
                  </div>
                  <Switch
                    checked={editMode ? notificationPrefs.marketing : profile.preferences.notifications.marketing}
                    onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, marketing: checked})}
                    disabled={!editMode}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sécurité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Changer le mot de passe
                </Button>
                
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Télécharger mes données
                </Button>
                
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer mon compte
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}