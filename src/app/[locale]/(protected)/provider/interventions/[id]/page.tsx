"use client";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from '@/components/ui/use-toast';

export default function InterventionValidationPage() {
  const router = useRouter();
  const { id } = useParams();
  const [intervention, setIntervention] = useState(null);
  const [realInterventionId, setRealInterventionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // 1. Essayer de charger l'intervention par id (toujours d'abord)
    fetch(`/api/provider/interventions/${id}`)
      .then(async res => {
        if (res.ok) {
          const data = await res.json();
          setIntervention(data);
          setRealInterventionId(data.id);
          setLoading(false);
          return;
        }
        // Si 404, on tente par bookingId (uniquement si l'id n'est PAS déjà un interventionId)
        if (res.status === 404) {
          // On suppose que si l'id n'est pas trouvé comme intervention, il s'agit peut-être d'un bookingId
          const byBooking = await fetch(`/api/provider/interventions/by-booking/${id}`);
          if (byBooking.ok) {
            const interventionData = await byBooking.json();
            setIntervention(interventionData);
            setRealInterventionId(interventionData.id);
            setLoading(false);
            return;
          }
        }
        // Si tout échoue
        setIntervention(null);
        setRealInterventionId(null);
        setLoading(false);
      })
      .catch(() => {
        toast({ title: "Erreur", description: "Impossible de charger l'intervention." });
        setIntervention(null);
        setRealInterventionId(null);
        setLoading(false);
      });
  }, [id]);

  const handleValidate = async () => {
    setValidating(true);
    // Always use the real intervention id for the POST
    const res = await fetch(`/api/provider/interventions/${realInterventionId}/complete`, { method: 'POST' });
    if (res.ok) {
      toast({ title: "Succès", description: "Intervention validée." });
      router.push(`/provider/interventions`);
    } else {
      toast({ title: "Erreur", description: "Échec de la validation." });
    }
    setValidating(false);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (!intervention) return <div className="text-center text-red-500">Intervention introuvable.</div>;

  // Blocage UX : intervention déjà terminée
  if (intervention.isCompleted) {
    return (
      <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Intervention terminée</h1>
        <div className="mb-4">
          <div><b>Service :</b> {intervention.service?.name}</div>
          <div><b>Date :</b> {new Date(intervention.scheduledAt).toLocaleString('fr-FR')}</div>
          <div><b>Client :</b> {intervention.client?.profile?.firstName} {intervention.client?.profile?.lastName}</div>
          <div><b>Statut :</b> Terminé</div>
        </div>
        <div className="alert alert-info">Cette intervention est déjà terminée.</div>
      </div>
    );
  }

  // Sinon, afficher le formulaire/bouton de validation
  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Valider l'intervention</h1>
      <div className="mb-4">
        <div><b>Service :</b> {intervention.service?.name}</div>
        <div><b>Date :</b> {new Date(intervention.scheduledAt).toLocaleString('fr-FR')}</div>
        <div><b>Client :</b> {intervention.client?.profile?.firstName} {intervention.client?.profile?.lastName}</div>
        <div><b>Statut :</b> {intervention.status}</div>
      </div>
      <Button onClick={handleValidate} disabled={validating}>
        {validating ? 'Validation...' : 'Valider le service'}
      </Button>
    </div>
  );
} 