import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Conditions générales d'utilisation</CardTitle>
          <CardDescription>
            Dernière mise à jour : {new Date().toLocaleDateString("fr-FR")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Objet</h2>
            <p className="text-muted-foreground">
              Les présentes conditions générales d'utilisation (CGU) définissent
              les règles d'utilisation de la plateforme EcoDeli, service de
              livraison écologique et de mise en relation entre clients,
              livreurs, marchands et prestataires de services.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              2. Acceptation des conditions
            </h2>
            <p className="text-muted-foreground">
              L'utilisation de nos services implique l'acceptation pleine et
              entière des présentes CGU. Si vous n'acceptez pas ces conditions,
              vous ne devez pas utiliser nos services.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              3. Description des services
            </h2>
            <p className="text-muted-foreground mb-3">
              EcoDeli propose les services suivants :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Service de livraison écologique</li>
              <li>Plateforme marketplace pour marchands</li>
              <li>Services professionnels à domicile</li>
              <li>Solutions de stockage temporaire</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">
              4. Inscription et compte utilisateur
            </h2>
            <p className="text-muted-foreground">
              L'inscription nécessite de fournir des informations exactes et à
              jour. Vous êtes responsable de la confidentialité de vos
              identifiants de connexion.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Responsabilités</h2>
            <p className="text-muted-foreground">
              Chaque utilisateur est responsable de l'utilisation qu'il fait de
              la plateforme et doit respecter la législation en vigueur ainsi
              que les droits des tiers.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant ces conditions, vous pouvez nous
              contacter à l'adresse :
              <a
                href="mailto:contact@ecodeli.me"
                className="text-primary hover:underline ml-1"
              >
                contact@ecodeli.me
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
