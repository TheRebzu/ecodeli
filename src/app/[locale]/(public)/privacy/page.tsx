import { useTranslations } from "next-intl";

export default function Page() {
  const t = useTranslations('public.privacy');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>{t('title') || 'Politique de confidentialité'}</CardTitle>
          <CardDescription>
            {t('lastUpdated') || 'Dernière mise à jour'} : {new Date().toLocaleDateString('fr-FR')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section1.title') || '1. Collecte des informations'}</h2>
            <p className="text-muted-foreground">
              {t('section1.content', "EcoDeli collecte les informations suivantes : données d'identification (nom, email), informations de livraison (adresse), données de géolocalisation pour les livreurs, et informations de paiement sécurisées.")}
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section2.title') || '2. Utilisation des données'}</h2>
            <p className="text-muted-foreground mb-3">
              {t('section2.intro') || 'Vos données sont utilisées pour :'}
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t('section2.item1') || 'Fournir nos services de livraison et de marketplace'}</li>
              <li>{t('section2.item2') || 'Traiter les paiements et commandes'}</li>
              <li>{t('section2.item3') || 'Communiquer avec vous concernant vos commandes'}</li>
              <li>{t('section2.item4') || 'Améliorer nos services'}</li>
              <li>{t('section2.item5') || 'Respecter nos obligations légales'}</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section3.title') || '3. Partage des données'}</h2>
            <p className="text-muted-foreground">
              {t('section3.content', "Nous ne vendons jamais vos données personnelles. Nous pouvons partager certaines informations avec nos partenaires livreurs et marchands uniquement dans le cadre de l'exécution de votre commande.")}
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section4.title') || '4. Géolocalisation'}</h2>
            <p className="text-muted-foreground">
              {t('section4.content') || "Les livreurs partagent leur position en temps réel uniquement pendant les livraisons actives. Ces données sont supprimées après 30 jours et ne sont utilisées que pour le suivi de livraison."}
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section5.title') || '5. Vos droits'}</h2>
            <p className="text-muted-foreground mb-3">
              {t('section5.intro') || 'Conformément au RGPD, vous avez le droit de :'}
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>{t('section5.item1') || 'Accéder à vos données personnelles'}</li>
              <li>{t('section5.item2') || 'Rectifier ou supprimer vos données'}</li>
              <li>{t('section5.item3') || 'Limiter le traitement de vos données'}</li>
              <li>{t('section5.item4') || 'Portabilité de vos données'}</li>
              <li>{t('section5.item5') || 'Vous opposer au traitement'}</li>
            </ul>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section6.title') || '6. Sécurité'}</h2>
            <p className="text-muted-foreground">
              {t('section6.content', "Nous mettons en place des mesures techniques et organisationnelles appropriées pour protéger vos données contre la perte, l'utilisation abusive et l'accès non autorisé.")}
            </p>
          </section>

          <Separator />

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('section7.title') || '7. Contact'}</h2>
            <p className="text-muted-foreground">
              {t('section7.content') || "Pour exercer vos droits ou pour toute question concernant cette politique, contactez-nous à : "}
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
