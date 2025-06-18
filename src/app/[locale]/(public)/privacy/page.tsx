import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Page() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Politique de confidentialité</CardTitle>
          <CardDescription>
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Collecte des informations</h2>
            <p className="text-muted-foreground">
              EcoDeli collecte les informations suivantes : données d'identification (nom, email), 
              informations de livraison (adresse), données de géolocalisation pour les livreurs, 
              et informations de paiement sécurisées.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Utilisation des données</h2>
            <p className="text-muted-foreground mb-3">
              Vos données sont utilisées pour :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Fournir nos services de livraison et de marketplace</li>
              <li>Traiter les paiements et commandes</li>
              <li>Communiquer avec vous concernant vos commandes</li>
              <li>Améliorer nos services</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons jamais vos données personnelles. Nous pouvons partager certaines informations 
              avec nos partenaires livreurs et marchands uniquement dans le cadre de l'exécution de votre commande.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Géolocalisation</h2>
            <p className="text-muted-foreground">
              Les livreurs partagent leur position en temps réel uniquement pendant les livraisons actives. 
              Ces données sont supprimées après 30 jours et ne sont utilisées que pour le suivi de livraison.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Vos droits</h2>
            <p className="text-muted-foreground mb-3">
              Conformément au RGPD, vous avez le droit de :
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Accéder à vos données personnelles</li>
              <li>Rectifier ou supprimer vos données</li>
              <li>Limiter le traitement de vos données</li>
              <li>Portabilité de vos données</li>
              <li>Vous opposer au traitement</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Sécurité</h2>
            <p className="text-muted-foreground">
              Nous mettons en place des mesures techniques et organisationnelles appropriées pour protéger 
              vos données contre la perte, l'utilisation abusive et l'accès non autorisé.
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
            <p className="text-muted-foreground">
              Pour exercer vos droits ou pour toute question concernant cette politique, contactez-nous à : 
              <a href="mailto:privacy@ecodeli.com" className="text-primary hover:underline ml-1">
                privacy@ecodeli.com
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
