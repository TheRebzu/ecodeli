"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { MapPin, Phone, Eye, Star, Truck, Calendar, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface Delivery {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  announcementTitle: string;
  scheduledDate?: string;
  actualDelivery?: string;
  createdAt: string;
  price: number;
  pickupAddress: string;
  deliveryAddress: string;
  delivererName?: string;
  delivererPhone?: string;
  delivererAvatar?: string;
  validationCode?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  rating?: number;
  review?: string;
}

interface DeliveryListProps {
  clientId: string;
}

export default function DeliveryList({ clientId }: DeliveryListProps) {
  const t = useTranslations("client.deliveries");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingDialog, setRatingDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  useEffect(() => {
    fetchDeliveries();
  }, [clientId]);

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/client/deliveries?clientId=${clientId}`);
      
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Calendar className="h-4 w-4" />;
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Truck className="h-4 w-4" />;
      case 'DELIVERED': return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED': return <XCircle className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleRateDelivery = async () => {
    if (!selectedDelivery || rating === 0) return;

    try {
      const response = await fetch(`/api/client/deliveries/${selectedDelivery.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review })
      });

      if (response.ok) {
        setDeliveries(prev => prev.map(d => 
          d.id === selectedDelivery.id 
            ? { ...d, rating, review }
            : d
        ));
        setRatingDialog(false);
        setRating(0);
        setReview("");
        setSelectedDelivery(null);
      }
    } catch (error) {
      console.error('Error rating delivery:', error);
    }
  };

  const activeDeliveries = deliveries.filter(d => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(d.status));
  const completedDeliveries = deliveries.filter(d => ['DELIVERED', 'CANCELLED'].includes(d.status));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="active">{t("tabs.active")} ({activeDeliveries.length})</TabsTrigger>
          <TabsTrigger value="history">{t("tabs.history")} ({completedDeliveries.length})</TabsTrigger>
        </TabsList>

        {/* Active Deliveries */}
        <TabsContent value="active" className="space-y-6">
          {activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("empty.active.title")}
                </h3>
                <p className="text-gray-600">
                  {t("empty.active.description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{delivery.announcementTitle}</CardTitle>
                      <Badge className={`${getStatusColor(delivery.status)} flex items-center gap-1`}>
                        {getStatusIcon(delivery.status)}
                        {t(`statuses.${delivery.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{delivery.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{delivery.deliveryAddress}</span>
                      </div>
                      {delivery.scheduledDate && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(delivery.scheduledDate)}</span>
                        </div>
                      )}
                    </div>

                    {delivery.delivererName && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">{t("deliverer.title")}</h4>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                            {delivery.delivererName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{delivery.delivererName}</p>
                            {delivery.delivererPhone && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <Phone className="h-3 w-3" />
                                {delivery.delivererPhone}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {delivery.validationCode && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-sm mb-1">{t("validation.code")}</h4>
                        <p className="text-lg font-mono font-bold text-blue-700">
                          {delivery.validationCode}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          {t("validation.instructions")}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold text-green-600">{delivery.price}€</span>
                      <div className="flex gap-2">
                        <Link href={`/client/deliveries/${delivery.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            {t("actions.view")}
                          </Button>
                        </Link>
                        {delivery.trackingUrl && (
                          <Link href={delivery.trackingUrl}>
                            <Button size="sm">
                              <Truck className="h-4 w-4 mr-1" />
                              {t("actions.track")}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Delivery History */}
        <TabsContent value="history" className="space-y-6">
          {completedDeliveries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("empty.history.title")}
                </h3>
                <p className="text-gray-600">
                  {t("empty.history.description")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {completedDeliveries.map((delivery) => (
                <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{delivery.announcementTitle}</CardTitle>
                      <Badge className={`${getStatusColor(delivery.status)} flex items-center gap-1`}>
                        {getStatusIcon(delivery.status)}
                        {t(`statuses.${delivery.status.toLowerCase()}`)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{delivery.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{delivery.deliveryAddress}</span>
                      </div>
                      {delivery.actualDelivery && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{formatDate(delivery.actualDelivery)}</span>
                        </div>
                      )}
                    </div>

                    {delivery.delivererName && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {delivery.delivererName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{delivery.delivererName}</p>
                          <p className="text-xs text-gray-600">{t("deliverer.completed")}</p>
                        </div>
                      </div>
                    )}

                    {delivery.rating && (
                      <div>
                        <h5 className="font-medium text-gray-900 mb-1 flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {t("rating.your_rating")}
                        </h5>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < delivery.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                          ))}
                        </div>
                        {delivery.review && (
                          <p className="text-sm text-gray-600 mt-1">"{delivery.review}"</p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="font-semibold text-green-600">{delivery.price}€</span>
                      <div className="flex gap-2">
                        <Link href={`/client/deliveries/${delivery.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            {t("actions.view")}
                          </Button>
                        </Link>
                        
                        {delivery.status === 'DELIVERED' && !delivery.rating && (
                          <Dialog open={ratingDialog} onOpenChange={setRatingDialog}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedDelivery(delivery)}
                              >
                                <Star className="h-4 w-4 mr-1" />
                                {t("actions.rate")}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t("rating.dialog.title")}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>{t("rating.dialog.rating_label")}</Label>
                                  <div className="flex items-center gap-1 mt-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none"
                                      >
                                        <Star className={`h-6 w-6 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <Label htmlFor="review">{t("rating.dialog.review_label")}</Label>
                                  <Textarea
                                    id="review"
                                    placeholder={t("rating.dialog.review_placeholder")}
                                    value={review}
                                    onChange={(e) => setReview(e.target.value)}
                                  />
                                </div>
                                <Button 
                                  onClick={handleRateDelivery}
                                  className="w-full"
                                  disabled={rating === 0}
                                >
                                  <Star className="h-4 w-4 mr-1" />
                                  {t("rating.dialog.submit")}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}