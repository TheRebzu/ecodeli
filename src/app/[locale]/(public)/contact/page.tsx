import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AtSign,
  Clock,
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Twitter,
} from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("public.contact");

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 border-b relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{
              backgroundImage: "url(/images/contact/contact-bg.jpg)",
              opacity: 0.05,
            }}
          ></div>
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center text-center space-y-4">
              <Badge className="mb-2">{t("badge") || "Contact"}</Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                {t("title") || "Contactez-nous"}
              </h1>
              <p className="text-xl text-muted-foreground max-w-[700px] mx-auto">
                {t("subtitle") ||
                  "Notre équipe est à votre disposition pour répondre à toutes vos questions."}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Details Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="bg-background h-full">
                <CardHeader className="pb-3">
                  <div className="bg-primary/10 p-2 w-10 h-10 flex items-center justify-center rounded-full mb-3">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{t("phone.title") || "Téléphone"}</CardTitle>
                  <CardDescription>
                    {t("phone.description") || "Appelez-nous directement"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">+33 (0)1 23 45 67 89</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("phone.button") || "Appeler maintenant"}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-background h-full">
                <CardHeader className="pb-3">
                  <div className="bg-primary/10 p-2 w-10 h-10 flex items-center justify-center rounded-full mb-3">
                    <AtSign className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{t("email.title") || "Email"}</CardTitle>
                  <CardDescription>
                    {t("email.description") || "Envoyez-nous un message"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">contact@ecodeli.me</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("email.button") || "Envoyer un email"}
                  </Button>
                </CardFooter>
              </Card>

              <Card className="bg-background h-full">
                <CardHeader className="pb-3">
                  <div className="bg-primary/10 p-2 w-10 h-10 flex items-center justify-center rounded-full mb-3">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{t("address.title") || "Adresse"}</CardTitle>
                  <CardDescription>
                    {t("address.description") || "Venez nous rencontrer"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {t(
                      "address.value",
                      "123 Rue de l'Innovation, 75012 Paris, France",
                    )}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("address.button") || "Voir sur la carte"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* Horaires Section */}
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8 md:mb-12">
              <Badge>{t("schedule.badge") || "Horaires"}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                {t("schedule.title", "Nos heures d'ouverture")}
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                {t("schedule.subtitle") ||
                  "Notre service client est disponible aux horaires suivants"}
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="bg-background shadow-sm">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[
                      {
                        day: t("schedule.mondayFriday") || "Lundi - Vendredi",
                        hours: "9:00 - 18:00",
                      },
                      {
                        day: t("schedule.saturday") || "Samedi",
                        hours: "10:00 - 16:00",
                      },
                      {
                        day: t("schedule.sunday") || "Dimanche",
                        hours: t("schedule.closed") || "Fermé",
                      },
                    ].map((schedule, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b last:border-0"
                      >
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-primary mr-2" />
                          <span className="font-medium">{schedule.day}</span>
                        </div>
                        <span
                          className={
                            schedule.hours === t("schedule.closed") || "Fermé"
                              ? "text-gray-500"
                              : ""
                          }
                        >
                          {schedule.hours}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Formulaire de contact */}
        <section className="w-full py-12 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8 md:mb-12">
              <Badge>{t("form.badge") || "Message"}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                {t("form.title") || "Envoyez-nous un message"}
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                {t("form.subtitle") ||
                  "Remplissez le formulaire ci-dessous et nous vous répondrons dans les plus brefs délais"}
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Card className="bg-background shadow-sm">
                <CardContent className="p-6">
                  <form className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor="firstName"
                          className="text-sm font-medium"
                        >
                          {t("form.firstName") || "Prénom"}
                        </label>
                        <input
                          id="firstName"
                          className="w-full p-2 rounded-md border border-input bg-transparent"
                          placeholder={
                            t("form.firstNamePlaceholder") || "Votre prénom"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="lastName"
                          className="text-sm font-medium"
                        >
                          {t("form.lastName") || "Nom"}
                        </label>
                        <input
                          id="lastName"
                          className="w-full p-2 rounded-md border border-input bg-transparent"
                          placeholder={
                            t("form.lastNamePlaceholder") || "Votre nom"
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                          {t("form.email") || "Email"}
                        </label>
                        <input
                          id="email"
                          type="email"
                          className="w-full p-2 rounded-md border border-input bg-transparent"
                          placeholder={
                            t("form.emailPlaceholder") || "email@domaine.com"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium">
                          {t("form.phone") || "Téléphone"}
                        </label>
                        <input
                          id="phone"
                          className="w-full p-2 rounded-md border border-input bg-transparent"
                          placeholder={
                            t("form.phonePlaceholder") ||
                            "Votre numéro de téléphone"
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">
                        {t("form.subject") || "Sujet"}
                      </label>
                      <input
                        id="subject"
                        className="w-full p-2 rounded-md border border-input bg-transparent"
                        placeholder={
                          t("form.subjectPlaceholder") ||
                          "Objet de votre message"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">
                        {t("form.message") || "Message"}
                      </label>
                      <textarea
                        id="message"
                        className="w-full p-2 rounded-md border border-input bg-transparent min-h-[150px]"
                        placeholder={
                          t("form.messagePlaceholder") || "Votre message..."
                        }
                      ></textarea>
                    </div>
                    <Button className="w-full">
                      {t("form.submit") || "Envoyer le message"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section réseaux sociaux */}
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
              <Badge>{t("social.badge") || "Suivez-nous"}</Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
                {t("social.title") || "Restez connectés"}
              </h2>
              <p className="text-muted-foreground max-w-[700px]">
                {t("social.subtitle") ||
                  "Suivez-nous sur les réseaux sociaux pour les dernières nouvelles et mises à jour"}
              </p>
            </div>

            <div className="flex justify-center space-x-6 mt-6">
              {[
                { icon: Facebook, name: "Facebook", href: "#" },
                { icon: Twitter, name: "Twitter", href: "#" },
                { icon: Instagram, name: "Instagram", href: "#" },
                { icon: Linkedin, name: "LinkedIn", href: "#" },
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="bg-background p-3 rounded-full border hover:border-primary transition-colors"
                  aria-label={`Follow on ${social.name}`}
                >
                  <social.icon className="h-5 w-5 text-foreground" />
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
