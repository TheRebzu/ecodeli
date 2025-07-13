"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  HelpCircle,
  Search,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Video,
  BookOpen,
  Play,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    question: "Comment fonctionne le système de matching des livraisons ?",
    answer:
      "Le système analyse vos trajets déclarés et les annonces disponibles. Quand une correspondance est trouvée, vous recevez une notification.",
    category: "Livraisons",
  },
  {
    question: "Comment valider une livraison avec le code à 6 chiffres ?",
    answer:
      "Lors de la livraison, le client vous remet un code à 6 chiffres. Saisissez ce code dans l'application pour confirmer la livraison.",
    category: "Livraisons",
  },
  {
    question: "Comment configurer mes trajets réguliers ?",
    answer:
      "Allez dans 'Trajets' > 'Mes trajets' et cliquez sur 'Ajouter un trajet'. Définissez votre point de départ, destination et horaires.",
    category: "Trajets",
  },
  {
    question: "Comment retirer mes gains ?",
    answer:
      "Dans 'Portefeuille' > 'Retraits', vous pouvez demander un virement vers votre compte bancaire. Le minimum de retrait est de 50€.",
    category: "Paiements",
  },
];

export default function DelivererHelpPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [supportTicket, setSupportTicket] = useState({
    subject: "",
    message: "",
    priority: "medium",
    category: "general",
  });

  const categories = ["all", "Livraisons", "Trajets", "Paiements", "Documents"];

  const filteredFAQ = faqData.filter((item) => {
    const matchesSearch = item.question
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supportTicket.subject || !supportTicket.message) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const response = await fetch("/api/deliverer/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supportTicket),
      });

      if (response.ok) {
        toast.success("Ticket de support envoyé avec succès");
        setSupportTicket({
          subject: "",
          message: "",
          priority: "medium",
          category: "general",
        });
      }
    } catch (error) {
      toast.error("Erreur lors de l'envoi du ticket");
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Authentification requise
          </h2>
          <p className="text-gray-600">
            Vous devez être connecté pour accéder à cette page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centre d'aide"
        description="Trouvez rapidement des réponses à vos questions et obtenez de l'aide"
      />

      <Tabs defaultValue="faq" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="tutorials">Tutoriels</TabsTrigger>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Questions fréquemment posées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher dans la FAQ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={
                      selectedCategory === category ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === "all" ? "Toutes" : category}
                  </Button>
                ))}
              </div>

              <Separator />

              <Accordion type="single" collapsible className="space-y-2">
                {filteredFAQ.map((item, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {item.category}
                        </span>
                        <span className="font-medium">{item.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-600">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tutorials" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tutoriels vidéo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg overflow-hidden">
                  <div className="aspect-video bg-gray-100 flex items-center justify-center">
                    <Play className="h-12 w-12 text-gray-400" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold mb-2">
                      Premiers pas avec EcoDeli
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Guide complet pour commencer à livrer
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">5:32</span>
                      <Button size="sm" variant="outline">
                        Regarder
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guides" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Guides et documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold">
                        Guide du livreur EcoDeli
                      </h3>
                      <p className="text-sm text-gray-600">
                        Manuel complet pour les livreurs
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact direct</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Support téléphonique</p>
                    <p className="text-sm text-gray-600">01 23 45 67 89</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Support email</p>
                    <p className="text-sm text-gray-600">support@ecodeli.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Créer un ticket de support</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="subject">Sujet *</Label>
                    <Input
                      id="subject"
                      value={supportTicket.subject}
                      onChange={(e) =>
                        setSupportTicket({
                          ...supportTicket,
                          subject: e.target.value,
                        })
                      }
                      placeholder="Décrivez brièvement votre problème"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={supportTicket.message}
                      onChange={(e) =>
                        setSupportTicket({
                          ...supportTicket,
                          message: e.target.value,
                        })
                      }
                      placeholder="Décrivez votre problème en détail..."
                      rows={4}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Envoyer le ticket
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
