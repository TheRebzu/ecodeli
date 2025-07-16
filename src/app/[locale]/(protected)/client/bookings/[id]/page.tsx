"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface BookingDetail {
  id: string;
  serviceType: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerPhone: string;
  providerRating: number;
  providerAvatar?: string;
  scheduledDate: string;
  duration: number;
  price: number;
  status: string;
  location: string;
  description: string;
  notes?: string;
  cancelReason?: string;
  completedAt?: string;
  rating?: number;
  review?: string;
  createdAt: string;
  messages?: {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    timestamp: string;
  }[];
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchBookingDetail(params.id as string);
    }
  }, [params.id]);

  const fetchBookingDetail = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/client/bookings/${id}`);

      if (!response.ok) {
        throw new Error("Réservation non trouvée");
      }

      const data = await response.json();
      setBooking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !booking) return;

    setSendingMessage(true);
    try {
      const response = await fetch(
        `/api/client/bookings/${booking.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: newMessage }),
        },
      );

      if (response.ok) {
        setNewMessage("");
        await fetchBookingDetail(booking.id); // Refresh to get new message
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-purple-100 text-purple-800",
      COMPLETED: "bg-green-100 text-green-800",
      CANCELLED: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="bg-white rounded-lg p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg p-8 text-center">
            <div className="text-red-600 text-lg mb-2">❌</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link
              href="/client/bookings"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Retour aux réservations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/client/bookings"
            className="text-green-600 hover:text-green-700 text-sm font-medium mb-4 inline-block"
          >
            ← Retour aux réservations
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {booking.serviceType}
              </h1>
              <p className="text-gray-600 mt-1">
                {booking?.id
                  ? <>Réservation #{booking.id.slice(-8)}</>
                  : <>Réservation inconnue</>
                }
              </p>
            </div>

            <span
              className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}
            >
              {booking.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Détails principaux */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informations de la réservation */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">
                Détails de la réservation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">
                    Date et heure
                  </h3>
                  <p className="text-gray-600">
                    {new Date(booking.scheduledDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Durée</h3>
                  <p className="text-gray-600">{booking.duration} minutes</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Lieu</h3>
                  <p className="text-gray-600">{booking.location}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Prix</h3>
                  <p className="text-gray-600 font-semibold">
                    {booking.price}€
                  </p>
                </div>
              </div>

              {booking.description && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-1">
                    Description
                  </h3>
                  <p className="text-gray-600">{booking.description}</p>
                </div>
              )}

              {booking.notes && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-1">Notes</h3>
                  <p className="text-gray-600">{booking.notes}</p>
                </div>
              )}

              {booking.cancelReason && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-900 mb-1">
                    Raison d'annulation
                  </h3>
                  <p className="text-red-800">{booking.cancelReason}</p>
                </div>
              )}
            </div>

            {/* Chat */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Messagerie</h2>

              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {booking.messages && booking.messages.length > 0 ? (
                  booking.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === booking.providerId ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.senderId === booking.providerId
                            ? "bg-gray-100 text-gray-900"
                            : "bg-green-600 text-white"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.senderId === booking.providerId
                              ? "text-gray-500"
                              : "text-green-100"
                          }`}
                        >
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Aucun message pour le moment
                  </p>
                )}
              </div>

              {booking.status !== "CANCELLED" &&
                booking.status !== "COMPLETED" && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Envoyer
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informations du prestataire */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">Prestataire</h3>

              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  {booking.providerAvatar ? (
                    <img
                      src={booking.providerAvatar}
                      alt={booking.providerName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-green-600 font-medium">
                      {booking?.providerName
                        ? booking.providerName.charAt(0).toUpperCase() + booking.providerName.slice(1)
                        : 'Prestataire inconnu'}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">
                    {booking.providerName}
                  </h4>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">⭐</span>
                    <span className="text-sm text-gray-600">
                      {typeof booking?.providerRating === 'number'
                        ? booking.providerRating.toFixed(1)
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span>📧</span>
                  <span>{booking.providerEmail}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📞</span>
                  <span>{booking.providerPhone}</span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
                  Contacter le prestataire
                </button>
                <Link
                  href={`/client/providers/${booking.providerId}`}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm text-center block"
                >
                  Voir le profil
                </Link>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">Actions</h3>

              <div className="space-y-3">
                {booking.status === "PENDING" ||
                booking.status === "CONFIRMED" ? (
                  <>
                    <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                      Modifier la réservation
                    </button>
                    <button className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
                      Annuler la réservation
                    </button>
                  </>
                ) : booking.status === "COMPLETED" && !booking.rating ? (
                  <button className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm">
                    Évaluer le service
                  </button>
                ) : null}

                <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm">
                  Télécharger la facture
                </button>
              </div>
            </div>

            {/* Historique */}
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h3 className="font-semibold mb-4">Historique</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Créée le:</span>
                  <span className="text-gray-900">
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {booking.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Terminée le:</span>
                    <span className="text-gray-900">
                      {new Date(booking.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {booking.rating && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Note donnée:</span>
                    <span className="text-gray-900">{booking.rating}/5 ⭐</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
