import { useTranslations } from "next-intl";

export default function FAQPage() {
  const t = useTranslations('public.faq');

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <Badge className="mb-2">{t('badge', 'FAQ')}</Badge>
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t('title', 'Questions fréquemment posées')}
                </h1>
                <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed mx-auto">
                  {t('subtitle', 'Retrouvez les réponses aux questions les plus courantes sur notre plateforme de crowdshipping')}
                </p>
              </div>
              <div className="relative w-full max-w-md mx-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  className="w-full pl-10 py-6 text-base rounded-full"
                  placeholder={t('searchPlaceholder', 'Rechercher dans la FAQ...')}
                  type="search"
                />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Main Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Categories */}
              <div className="lg:col-span-1">
                <div className="sticky top-20">
                  <h2 className="text-xl font-semibold mb-4">{t('categories.title', 'Catégories')}</h2>
                  <div className="flex flex-col space-y-1">
                    {[
                      t('categories.announcements', 'Annonces et trajets'),
                      t('categories.shipping', 'Expédition et réception'),
                      t('categories.delivery', 'Livraison et transport'),
                      t('categories.services', 'Services et missions'),
                      t('categories.payment', 'Paiement et facturation'),
                      t('categories.security', 'Sécurité et garanties'),
                      t('categories.account', 'Inscription et compte')].map((category, i) => (
                      <a
                        key={i}
                        href={`#${category.toLowerCase().replace(/\s+/g, "-")}`}
                        className="px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      >
                        {category}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* FAQ Content */}
              <div className="lg:col-span-2 space-y-10">
                {/* Annonces et Trajets */}
                <div id="annonces-et-trajets">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('announcements.title', 'Annonces et trajets')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question: t('announcements.q1.question', 'Comment publier une annonce de trajet ?'),
                        answer:
                          t('announcements.q1.answer', "Pour publier une annonce de trajet, connectez-vous à votre compte, cliquez sur 'Publier une annonce' et suivez les étapes. Vous devrez préciser votre point de départ, votre destination, la date, l'heure, ainsi que les détails sur ce que vous êtes prêt à transporter.")},
                      {
                        question: t('announcements.q2.question', 'Puis-je modifier ou annuler mon annonce ?'),
                        answer:
                          t('announcements.q2.answer', "Oui, vous pouvez modifier ou annuler votre annonce tant qu'aucun utilisateur n'a réservé votre service. Rendez-vous dans la section 'Mes annonces' de votre compte et utilisez les options de modification ou d'annulation.")},
                      {
                        question:
                          t('announcements.q3.question', 'Comment rechercher des trajets disponibles ?'),
                        answer:
                          t('announcements.q3.answer', "Utilisez la barre de recherche sur la page d'accueil pour saisir votre point de départ et d'arrivée. Vous pouvez filtrer les résultats par date, heure, et type de service. Les résultats afficheront les annonces correspondant à vos critères.")},
                      {
                        question:
                          t('announcements.q4.question', "Quelle est la différence entre une annonce et une mission ?"),
                        answer:
                          t('announcements.q4.answer', "Une annonce est publiée par un livreur indiquant un trajet qu'il va effectuer et sur lequel il peut transporter des colis. Une mission est une demande spécifique d'un expéditeur pour faire livrer un colis. Les deux sont traitées via notre système d'annonces.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-annonces-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Expédition et Réception */}
                <div id="expédition-et-réception">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('shipping.title', 'Expédition et réception')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question:
                          t('shipping.q1.question', "Comment préparer mon colis pour l'expédition ?"),
                        answer:
                          t('shipping.q1.answer', "Votre colis doit être correctement emballé pour éviter tout dommage pendant le transport. Utilisez une boîte solide, ajoutez du matériel de protection si nécessaire, et assurez-vous que le colis est bien fermé. N'oubliez pas d'indiquer clairement les coordonnées du destinataire.")},
                      {
                        question: t('shipping.q2.question', 'Comment suivre mon colis en temps réel ?'),
                        answer:
                          t('shipping.q2.answer', "Une fois votre colis confié à un livreur, vous pouvez suivre sa progression en temps réel via l'interface de suivi dans votre compte. Vous recevrez également des notifications à chaque étape du processus de livraison.")},
                      {
                        question:
                          t('shipping.q3.question', "Comment fonctionne la remise du colis au destinataire ?"),
                        answer:
                          t('shipping.q3.answer', "Le livreur remet le colis directement au destinataire. Pour confirmer la livraison, le destinataire doit fournir un code de validation qui lui a été envoyé. Le livreur saisit ce code dans l'application pour finaliser la livraison.")},
                      {
                        question:
                          t('shipping.q4.question', "Que faire si le destinataire est absent lors de la livraison ?"),
                        answer:
                          t('shipping.q4.answer', "Si le destinataire est absent, le livreur peut, selon les instructions préalables, laisser le colis à un voisin, dans un point relais convenu, ou reprogrammer la livraison. Toutes ces options sont à discuter avec le livreur via la messagerie de notre plateforme.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-expedition-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Livraison et Transport */}
                <div id="livraison-et-transport">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('delivery.title', 'Livraison et transport')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question:
                          t('delivery.q1.question', "Quels types de colis peuvent être transportés ?"),
                        answer:
                          t('delivery.q1.answer', "Nous acceptons la plupart des colis de taille standard respectant nos conditions d'utilisation. Les objets interdits incluent les produits dangereux, illégaux, les animaux vivants (sauf service spécifique de transport d'animaux domestiques) et les objets de très grande valeur sans assurance spécifique.")},
                      {
                        question:
                          t('delivery.q2.question', "Quelles sont les limitations de poids et de taille ?"),
                        answer:
                          t('delivery.q2.answer', "Les limitations dépendent du mode de transport du livreur. En général, pour un transport en vélo ou à pied, le poids est limité à 5-10 kg et la taille à ce qui peut tenir dans un sac à dos. Pour les voitures ou autres véhicules, les limites sont plus élevées et spécifiées par chaque livreur dans son annonce.")},
                      {
                        question:
                          t('delivery.q3.question', "Comment s'organise le transport de personnes ?"),
                        answer:
                          t('delivery.q3.answer', "Le transport de personnes fonctionne sur le même principe que le transport de colis. Les conducteurs qualifiés indiquent dans leur annonce qu'ils proposent ce service. Les passagers peuvent les contacter directement via la plateforme pour organiser le transport.")},
                      {
                        question: t('delivery.q4.question', 'Que faire en cas de retard de livraison ?'),
                        answer:
                          t('delivery.q4.answer', "En cas de retard, le livreur doit vous informer via la messagerie de l'application. Si vous n'avez pas de nouvelles, vous pouvez contacter le livreur directement. Si le problème persiste, notre service client est disponible pour vous aider à résoudre la situation.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-livraison-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Services et Missions */}
                <div id="services-et-missions">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('services.title', 'Services et missions')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question:
                          t('services.q1.question', "Quels types de services sont proposés sur EcoDeli ?"),
                        answer:
                          t('services.q1.answer', "EcoDeli propose plusieurs types de services : le transport de colis, le transport de personnes (notamment pour les rendez-vous médicaux ou transferts aéroport), les courses (achats de produits selon une liste), et divers services à la personne comme la garde d'animaux pendant un transport.")},
                      {
                        question:
                          t('services.q2.question', "Comment fonctionnent les achats à l'étranger ?"),
                        answer:
                          t('services.q2.answer', "Pour les achats à l'étranger, vous devez trouver un livreur qui se rend dans le pays concerné. Vous lui fournissez une liste précise des produits à acheter, et vous convenez ensemble des modalités de paiement et de livraison. Tous les détails doivent être clairement établis via notre système de messagerie.")},
                      {
                        question:
                          t('services.q3.question', "Comment fonctionne le service de lâcher de chariot ?"),
                        answer:
                          t('services.q3.answer', "Le service de lâcher de chariot permet aux commerçants de confier leurs livraisons à nos livreurs. Le commerçant prépare les commandes, et un livreur les récupère pour les livrer aux clients finaux. Ce service est idéal pour les petits commerces qui souhaitent proposer la livraison sans disposer de leur propre flotte.")},
                      {
                        question:
                          t('services.q4.question', "Puis-je demander des services personnalisés ?"),
                        answer:
                          t('services.q4.answer', "Oui, vous pouvez publier une annonce pour un service spécifique non standard. Décrivez précisément vos besoins, et les livreurs intéressés vous contacteront avec leurs propositions. La faisabilité et le prix seront déterminés en fonction de la complexité et des exigences de votre demande.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-services-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Paiement et Facturation */}
                <div id="paiement-et-facturation">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('payment.title', 'Paiement et facturation')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question:
                          t('payment.q1.question', "Comment sont déterminés les prix des livraisons ?"),
                        answer:
                          t('payment.q1.answer', "Les prix sont fixés par les livreurs en fonction de la distance, du poids du colis, de l'urgence et du mode de transport. Pour certains services standard, nous proposons des fourchettes de prix recommandées, mais la tarification finale reste à la discrétion des livreurs.")},
                      {
                        question: t('payment.q2.question', 'Quels moyens de paiement sont acceptés ?'),
                        answer:
                          t('payment.q2.answer', "Nous acceptons les cartes bancaires (Visa, Mastercard), PayPal, et certains portefeuilles électroniques. Tous les paiements sont sécurisés et traités par notre plateforme. Nous n'acceptons pas les paiements directs entre utilisateurs pour garantir la sécurité des transactions.")},
                      {
                        question:
                          t('payment.q3.question', "Comment fonctionne le système de commissions ?"),
                        answer:
                          t('payment.q3.answer', "EcoDeli prélève une commission sur chaque transaction. Cette commission varie selon le type de service et votre abonnement. Les utilisateurs standards paient une commission de 10%, tandis que les utilisateurs premium bénéficient de taux réduits. Les détails sont disponibles dans la section 'Tarification' de notre site.")},
                      {
                        question:
                          t('payment.q4.question', "Comment obtenir une facture pour mes livraisons ?"),
                        answer:
                          t('payment.q4.answer', "Les factures sont automatiquement générées et disponibles dans la section 'Mes paiements' de votre compte. Vous pouvez les télécharger au format PDF. Pour les entreprises ayant des besoins spécifiques de facturation, vous pouvez contacter notre service comptabilité via le formulaire dédié.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-paiement-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Sécurité et Garanties */}
                <div id="sécurité-et-garanties">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('security.title', 'Sécurité et garanties')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question: t('security.q1.question', "Comment les colis sont-ils assurés ?"),
                        answer:
                          t('security.q1.answer', "Tous les colis transportés via notre plateforme sont automatiquement assurés jusqu'à une valeur de 500€. Pour les objets de plus grande valeur, nous proposons des assurances complémentaires que vous pouvez souscrire lors de la création de votre annonce.")},
                      {
                        question: t('security.q2.question', 'Comment sont vérifiés les livreurs ?'),
                        answer:
                          t('security.q2.answer', "Tous nos livreurs passent par un processus de vérification rigoureux. Nous vérifions leur identité, leurs coordonnées et, selon les services proposés, leurs permis et assurances. Nous collectons également les avis des utilisateurs pour maintenir un niveau de qualité élevé.")},
                      {
                        question:
                          t('security.q3.question', "Que faire en cas de problème avec ma livraison ?"),
                        answer:
                          t('security.q3.answer', "En cas de problème (retard significatif, colis endommagé, non-livraison), contactez d'abord le livreur via notre messagerie. Si le problème persiste, utilisez le bouton 'Signaler un problème' dans l'interface de suivi. Notre service client prendra en charge votre réclamation dans les 24 heures.")},
                      {
                        question:
                          t('security.q4.question', "Comment fonctionne le système d'évaluation ?"),
                        answer:
                          t('security.q4.answer', "Après chaque livraison, l'expéditeur et le destinataire peuvent évaluer le livreur sur une échelle de 1 à 5 étoiles et laisser un commentaire. De même, les livreurs peuvent évaluer les expéditeurs. Ces évaluations sont publiques et contribuent à la réputation des utilisateurs sur la plateforme.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-securite-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                {/* Inscription et Compte */}
                <div id="inscription-et-compte">
                  <h2 className="text-2xl font-bold mb-6">
                    {t('account.title', 'Inscription et compte')}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {[
                      {
                        question: t('account.q1.question', 'Comment créer un compte sur EcoDeli ?'),
                        answer:
                          t('account.q1.answer', "Pour créer un compte, cliquez sur 'S'inscrire' en haut à droite de notre site. Vous devrez fournir votre nom, prénom, adresse email, et créer un mot de passe. Vous devrez ensuite vérifier votre email et compléter votre profil avec des informations supplémentaires en fonction du type de compte souhaité (expéditeur ou livreur).")},
                      {
                        question:
                          t('account.q2.question', "Quelle est la différence entre un compte standard et un compte premium ?"),
                        answer:
                          t('account.q2.answer', "Le compte standard est gratuit et permet d'utiliser les fonctionnalités de base de la plateforme. Le compte premium, moyennant un abonnement mensuel, offre des avantages supplémentaires : commissions réduites, visibilité accrue pour les annonces, service client prioritaire, et outils avancés de gestion pour les professionnels.")},
                      {
                        question: t('account.q3.question', 'Comment devenir livreur sur EcoDeli ?'),
                        answer:
                          t('account.q3.answer', "Pour devenir livreur, créez d'abord un compte utilisateur standard, puis accédez à la section 'Devenir livreur' dans votre profil. Vous devrez fournir des documents supplémentaires (pièce d'identité, justificatif de domicile, et selon les services que vous souhaitez proposer, permis de conduire, assurance, etc.). Après vérification de votre dossier, vous pourrez commencer à publier des annonces.")},
                      {
                        question:
                          t('account.q4.question', "Comment modifier mes informations personnelles ?"),
                        answer:
                          t('account.q4.answer', "Vous pouvez modifier vos informations personnelles dans la section 'Mon profil' de votre compte. Certaines modifications (comme le changement d'adresse email principal) peuvent nécessiter une vérification supplémentaire pour des raisons de sécurité.")}].map((faq, i) => (
                      <AccordionItem key={i} value={`item-inscription-${i}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent>{faq.answer}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Didn't Find Answer Section */}
        <section className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <h2 className="text-3xl font-bold">
                {t('notFound.title', "Vous n'avez pas trouvé votre réponse ?")}
              </h2>
              <p className="text-muted-foreground max-w-[600px]">
                {t('notFound.subtitle', 'Notre équipe de support est disponible pour répondre à toutes vos questions')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button asChild variant="default">
                  <Link href="/contact">{t('notFound.contactUs', 'Contactez-nous')}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="mailto:support@ecodeli.me">
                    support@ecodeli.me
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
