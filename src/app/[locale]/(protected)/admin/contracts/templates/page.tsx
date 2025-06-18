"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Download, 
  Upload,
  Eye,
  Save,
  Users,
  Truck,
  Package,
  Building,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ContractTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "DELIVERER",
    description: "",
    content: "",
    isActive: true
  });

  // Récupérer les modèles de contrats
  const { data: templates, refetch } = api.adminContract.getTemplates.useQuery({});
  const { data: stats } = api.adminContract.getContractStats.useQuery({});

  // Mutations
  const createTemplateMutation = api.adminContract.createTemplate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Modèle créé avec succès");
      setIsCreateDialogOpen(false);
      setNewTemplate({
        name: "",
        type: "DELIVERER",
        description: "",
        content: "",
        isActive: true
      });
    },
    onError: (error) => {
      toast.error("Erreur", { description: error.message });
    }
  });

  const updateTemplateMutation = api.adminContract.updateTemplate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Modèle mis à jour");
    }
  });

  const deleteTemplateMutation = api.adminContract.deleteTemplate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Modèle supprimé");
    }
  });

  const contractTypes = [
    { id: "DELIVERER", label: "Livreurs", icon: Truck, color: "text-blue-600", bgColor: "bg-blue-100" },
    { id: "PROVIDER", label: "Prestataires", icon: Users, color: "text-green-600", bgColor: "bg-green-100" },
    { id: "MERCHANT", label: "Marchands", icon: Building, color: "text-purple-600", bgColor: "bg-purple-100" },
    { id: "STORAGE", label: "Stockage", icon: Package, color: "text-orange-600", bgColor: "bg-orange-100" }
  ];

  const createTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  const toggleTemplateStatus = (templateId: string, isActive: boolean) => {
    updateTemplateMutation.mutate({
      id: templateId,
      isActive
    });
  };

  const duplicateTemplate = (template: any) => {
    setNewTemplate({
      name: `${template.name} (Copie)`,
      type: template.type,
      description: template.description,
      content: template.content,
      isActive: false
    });
    setIsCreateDialogOpen(true);
  };

  const getTypeInfo = (type: string) => {
    return contractTypes.find(t => t.id === type) || contractTypes[0];
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modèles de contrats</h1>
          <p className="text-muted-foreground">
            Gérez les modèles de contrats pour chaque type d'utilisateur
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau modèle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Créer un modèle de contrat</DialogTitle>
              <DialogDescription>
                Créez un nouveau modèle de contrat pour un type d'utilisateur
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nom du modèle</Label>
                  <Input
                    id="template-name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Contrat livreur standard"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-type">Type de contrat</Label>
                  <Select
                    value={newTemplate.type}
                    onValueChange={(value) => setNewTemplate(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description courte du modèle"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-content">Contenu du contrat</Label>
                <Textarea
                  id="template-content"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Tapez le contenu du contrat ici..."
                  className="min-h-[300px]"
                />
                <p className="text-sm text-muted-foreground">
                  Utilisez des variables comme {"{USER_NAME}"}, {"{USER_EMAIL}"}, {"{PLATFORM_NAME}"} qui seront remplacées automatiquement.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="template-active"
                  checked={newTemplate.isActive}
                  onCheckedChange={(checked) => setNewTemplate(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="template-active">Activer immédiatement</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={createTemplate}
                disabled={createTemplateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {createTemplateMutation.isPending ? "Création..." : "Créer le modèle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Modèles actifs</p>
                <p className="text-2xl font-bold">{templates?.filter(t => t.isActive).length || 0}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total modèles</p>
                <p className="text-2xl font-bold">{templates?.length || 0}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contrats signés</p>
                <p className="text-2xl font-bold">{stats?.signedContracts || 0}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold">{stats?.pendingContracts || 0}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des modèles par type */}
      <div className="space-y-6">
        {contractTypes.map((type) => {
          const typeTemplates = templates?.filter(t => t.type === type.id) || [];
          
          return (
            <Card key={type.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${type.bgColor} flex items-center justify-center`}>
                    <type.icon className={`h-4 w-4 ${type.color}`} />
                  </div>
                  Contrats {type.label}
                  <Badge variant="secondary">{typeTemplates.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Modèles de contrats pour les {type.label.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {typeTemplates.length > 0 ? (
                  <div className="space-y-4">
                    {typeTemplates.map((template: any) => (
                      <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-medium">{template.name}</h3>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {template.description || "Aucune description"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Modifié le {format(new Date(template.updatedAt), 'dd MMM yyyy', { locale: fr })}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={(checked) => toggleTemplateStatus(template.id, checked)}
                            disabled={updateTemplateMutation.isPending}
                          />
                          
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateTemplate(template)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplateMutation.mutate({ id: template.id })}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucun modèle pour ce type</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setNewTemplate(prev => ({ ...prev, type: type.id }));
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Créer le premier modèle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Actions globales */}
      <Card>
        <CardHeader>
          <CardTitle>Actions globales</CardTitle>
          <CardDescription>
            Opérations sur l'ensemble des modèles de contrats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importer des modèles
            </Button>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter tous les modèles
            </Button>
            
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Rapport d'utilisation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
