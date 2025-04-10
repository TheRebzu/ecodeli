'use client';

import * as React from 'react';
import { TutorialReset } from '@/components/client/tutorial/tutorial-reset';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useTutorialContext } from '@/providers/tutorial-provider';

export function HelpContent(): React.ReactElement {
  const { startTutorial } = useTutorialContext();
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tutoriel</h2>
        <p>Découvrez les fonctionnalités de notre application avec notre tutoriel interactif.</p>
        <div className="flex items-center gap-4">
          <Button onClick={startTutorial}>Lancer le tutoriel</Button>
          <TutorialReset />
        </div>
      </section>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <Accordion type="single" collapsible>
          <AccordionItem value="order">
            <AccordionTrigger>Comment passer une commande ?</AccordionTrigger>
            <AccordionContent>
              Pour passer une commande, suivez ces étapes :
              <ol className="list-decimal list-inside mt-2 space-y-2">
                <li>Connectez-vous à votre compte</li>
                <li>Sélectionnez les produits que vous souhaitez commander</li>
                <li>Ajoutez-les à votre panier</li>
                <li>Vérifiez votre commande</li>
                <li>Choisissez votre mode de livraison</li>
                <li>Procédez au paiement</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="support">
            <AccordionTrigger>Comment contacter le support ?</AccordionTrigger>
            <AccordionContent>
              Vous pouvez nous contacter de plusieurs façons :
              <ul className="list-disc list-inside mt-2 space-y-2">
                <li>Par email : support@ecodeli.fr</li>
                <li>Par téléphone : 01 23 45 67 89</li>
                <li>Via le formulaire de contact sur notre site</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
} 