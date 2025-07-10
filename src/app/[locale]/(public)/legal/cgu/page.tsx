import { useTranslations } from "next-intl";

export default function CGUPage() {
  const t = useTranslations('public.legal.cgu');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title={t('title') || 'CGU'} description={t("description")} />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('article1.title') || 'Article 1 - Objet'}</h2>
            <p className="text-sm">
              {t('article1.content', "Les présentes conditions générales d'utilisation (CGU) régissent l'utilisation de la plateforme EcoDeli, service de livraison écologique et de mise en relation entre clients, livreurs, commerçants et prestataires de services.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('article2.title') || 'Article 2 - Acceptation'}</h2>
            <p className="text-sm">
              {t('article2.content', "L'utilisation de la plateforme EcoDeli implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser nos services.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('article3.title') || 'Article 3 - Services proposés'}</h2>
            <div className="space-y-2 text-sm">
              <p>{t('article3.intro') || 'EcoDeli propose les services suivants :'}</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>{t('article3.service1') || 'Livraison écologique de colis et marchandises'}</li>
                <li>{t('article3.service2') || 'Services à domicile par des prestataires qualifiés'}</li>
                <li>{t('article3.service3') || 'Solutions de stockage temporaire'}</li>
                <li>{t('article3.service4') || 'Mise en relation entre utilisateurs'}</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('article4.title') || 'Article 4 - Inscription'}</h2>
            <p className="text-sm">
              {t('article4.content', "L'inscription sur EcoDeli est gratuite et ouverte à toute personne physique ou morale. Les informations fournies lors de l'inscription doivent être exactes et à jour.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('article5.title') || 'Article 5 - Responsabilité'}</h2>
            <p className="text-sm">
              {t('article5.content', "EcoDeli agit en qualité d'intermédiaire et ne peut être tenu responsable des dommages résultant de l'utilisation des services par les utilisateurs.")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('article6.title') || 'Article 6 - Modification des CGU'}</h2>
            <p className="text-sm">
              {t('article6.content') || "EcoDeli se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés des modifications par email ou notification sur la plateforme."}
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
