"use client";

import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Award, 
  Plus,
  Edit,
  Trash2,
  Calendar,
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  BookOpen
} from "lucide-react";

interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  certificateNumber?: string;
  description: string;
  category: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING_RENEWAL';
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  documentUrl?: string;
  skills: string[];
}

interface CertificationCategory {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

const certificationCategories: CertificationCategory[] = [
  {
    key: 'TECHNICAL',
    label: 'Compétences Techniques',
    description: 'Certifications liées aux compétences techniques spécifiques',
    required: false
  },
  {
    key: 'SAFETY',
    label: 'Sécurité et Habilitations',
    description: 'Habilitations sécurité, premiers secours, etc.',
    required: true
  },
  {
    key: 'PROFESSIONAL',
    label: 'Qualifications Professionnelles',
    description: 'Diplômes, certifications métier, formations professionnelles',
    required: false
  },
  {
    key: 'QUALITY',
    label: 'Qualité et Normes',
    description: 'Certifications qualité, normes ISO, etc.',
    required: false
  }
];

export default function ProviderCertificationsPage() {
  const { user } = useAuth();
  const t = useTranslations("provider.certifications");
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCert, setEditingCert] = useState<Certification | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
    description: '',
    category: 'TECHNICAL',
    skills: [] as string[]
  });

  useEffect(() => {
    const fetchCertifications = async () => {
      if (!user?.id) return;
      
      try {
        const response = await fetch(`/api/provider/profile/certifications?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setCertifications(data.certifications || []);
        }
      } catch (error) {
        console.error("Error fetching certifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertifications();
  }, [user]);

  const handleSaveCertification = async () => {
    if (!user?.id || !formData.name || !formData.issuingOrganization) return;

    try {
      const method = editingCert ? 'PUT' : 'POST';
      const url = editingCert 
        ? `/api/provider/profile/certifications/${editingCert.id}`
        : '/api/provider/profile/certifications';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.id })
      });

      if (response.ok) {
        const savedCertification = await response.json();
        
        if (editingCert) {
          setCertifications(prev => prev.map(cert => 
            cert.id === editingCert.id ? savedCertification : cert
          ));
        } else {
          setCertifications(prev => [...prev, savedCertification]);
        }

        setShowAddDialog(false);
        setEditingCert(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error saving certification:", error);
    }
  };

  const handleDeleteCertification = async (certId: string) => {
    try {
      const response = await fetch(`/api/provider/profile/certifications/${certId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCertifications(prev => prev.filter(cert => cert.id !== certId));
      }
    } catch (error) {
      console.error("Error deleting certification:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      issuingOrganization: '',
      issueDate: '',
      expiryDate: '',
      certificateNumber: '',
      description: '',
      category: 'TECHNICAL',
      skills: []
    });
  };

  const startEdit = (cert: Certification) => {
    setEditingCert(cert);
    setFormData({
      name: cert.name,
      issuingOrganization: cert.issuingOrganization,
      issueDate: cert.issueDate.split('T')[0],
      expiryDate: cert.expiryDate?.split('T')[0] || '',
      certificateNumber: cert.certificateNumber || '',
      description: cert.description,
      category: cert.category,
      skills: cert.skills
    });
    setShowAddDialog(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge className="bg-green-100 text-green-800">Vérifiée</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejetée</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCertificationStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Active</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expirée</Badge>;
      case 'PENDING_RENEWAL':
        return <Badge className="bg-orange-100 text-orange-800">À renouveler</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateCertificationStats = () => {
    const total = certifications.length;
    const verified = certifications.filter(cert => cert.verificationStatus === 'VERIFIED').length;
    const active = certifications.filter(cert => cert.status === 'ACTIVE').length;
    const expiringSoon = certifications.filter(cert => {
      if (!cert.expiryDate) return false;
      const expiryDate = new Date(cert.expiryDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow && cert.status === 'ACTIVE';
    }).length;

    return { total, verified, active, expiringSoon };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des certifications...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p>Vous devez être connecté pour accéder à cette page.</p>
      </div>
    );
  }

  const stats = calculateCertificationStats();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes Certifications"
        description="Gérez vos certifications et qualifications professionnelles"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">certifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vérifiées</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verified}</div>
            <p className="text-xs text-muted-foreground">validées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actives</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">en cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À renouveler</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">< 30 jours</p>
          </CardContent>
        </Card>
      </div>

      {stats.expiringSoon > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            {stats.expiringSoon} certification(s) expire(nt) dans les 30 prochains jours. Pensez à les renouveler.
          </AlertDescription>
        </Alert>
      )}

      {/* Add Certification Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Mes Certifications</h3>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingCert(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter une certification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCert ? 'Modifier la certification' : 'Ajouter une certification'}
              </DialogTitle>
              <DialogDescription>
                Ajoutez vos certifications professionnelles pour améliorer votre profil
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom de la certification *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Certification ISO 9001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organisme certificateur *</Label>
                  <Input
                    value={formData.issuingOrganization}
                    onChange={(e) => setFormData(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                    placeholder="Ex: AFNOR, CNAM, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date d'obtention *</Label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date d'expiration</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Numéro de certificat</Label>
                  <Input
                    value={formData.certificateNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))}
                    placeholder="Numéro optionnel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {certificationCategories.map(cat => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez brièvement cette certification..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveCertification} className="flex-1">
                  {editingCert ? 'Mettre à jour' : 'Ajouter'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Certifications by Category */}
      {certificationCategories.map(category => {
        const categoryCerts = certifications.filter(cert => cert.category === category.key);
        
        if (categoryCerts.length === 0 && !category.required) return null;

        return (
          <Card key={category.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {category.label}
                {category.required && (
                  <Badge variant="outline" className="text-xs">Requis</Badge>
                )}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryCerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune certification dans cette catégorie</p>
                  {category.required && (
                    <p className="text-sm text-orange-600 mt-2">
                      Cette catégorie est requise pour valider votre profil
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {categoryCerts.map(cert => (
                    <div key={cert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{cert.name}</h4>
                            {getStatusIcon(cert.verificationStatus)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            {cert.issuingOrganization}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            Obtenue le {new Date(cert.issueDate).toLocaleDateString('fr-FR')}
                            {cert.expiryDate && (
                              <span> • Expire le {new Date(cert.expiryDate).toLocaleDateString('fr-FR')}</span>
                            )}
                          </div>
                          {cert.description && (
                            <p className="text-sm">{cert.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(cert.verificationStatus)}
                          {getCertificationStatusBadge(cert.status)}
                          <Button variant="outline" size="sm" onClick={() => startEdit(cert)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteCertification(cert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 