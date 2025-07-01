import { useTranslations } from "next-intl";

export default function LegalPage() {
  const t = useTranslations('public.legal');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('title', 'Mentions légales')}
        description={t("description")}
      />

      <Card className="p-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">{t('legalInfo.title', 'Informations légales')}</h2>
            <div className="space-y-2 text-sm">
              <p><strong>{t('legalInfo.companyName', 'Dénomination sociale')} :</strong> EcoDeli SAS</p>
              <p><strong>{t('legalInfo.address', 'Siège social')} :</strong> 123 Avenue de la République, 75011 Paris</p>
              <p><strong>{t('legalInfo.siret', 'SIRET')} :</strong> 123 456 789 00012</p>
              <p><strong>{t('legalInfo.capital', 'Capital social')} :</strong> 100 000 €</p>
              <p><strong>{t('legalInfo.director', 'Directeur de publication')} :</strong> Jean Dupont</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('hosting.title', 'Hébergement')}</h2>
            <div className="space-y-2 text-sm">
              <p><strong>{t('hosting.provider', 'Hébergeur')} :</strong> Vercel Inc.</p>
              <p><strong>{t('hosting.address', 'Adresse')} :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('dataProtection.title', 'Protection des données')}</h2>
            <p className="text-sm">
              {t('dataProtection.content', "Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition aux données vous concernant. Pour exercer ces droits, contactez-nous à dpo@ecodeli.com")}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">{t('intellectualProperty.title', 'Propriété intellectuelle')}</h2>
            <p className="text-sm">
              {t('intellectualProperty.content', "Tous les éléments du site EcoDeli (textes, images, vidéos, etc.) sont protégés par le droit de la propriété intellectuelle. Toute reproduction est interdite sans autorisation préalable.")}
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
}
