'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from './use-socket';

/**
 * Custom hook for live tracking of deliveries
 * Connects to the real-time socket service for location updates
 */
export function useLiveTracking(deliveryId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { socket } = useSocket();
  const { data: session } = useSession();

  useEffect(() => {
    if (!socket || !deliveryId || !session?.user) {
      return;
    }

    const trackingChannel = `delivery-tracking:${deliveryId}`;

    // Connect to tracking
    socket.emit('join-tracking', {
      deliveryId,
      userId: session.user.id,
    });

    // Handle connection status
    socket.on('tracking-connected', () => {
      setIsConnected(true);
      setIsError(false);
    });

    // Handle location updates
    socket.on(
      `${trackingChannel}:location-update`,
      (data: { latitude: number; longitude: number; timestamp: string }) => {
        setCurrentLocation({
          lat: data.latitude,
          lng: data.longitude,
        });
        setLastUpdate(new Date(data.timestamp));
      }
    );

    // Handle errors
    socket.on(`${trackingChannel}:error`, (error: { message: string }) => {
      setIsError(true);
      setErrorMessage(error.message);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Cleanup
    return () => {
      socket.off(`${trackingChannel}:location-update`);
      socket.off(`${trackingChannel}:error`);
      socket.emit('leave-tracking', { deliveryId });
    };
  }, [socket, deliveryId, session]);

  // Function to request fresh location
  const requestLocationUpdate = () => {
    if (socket && isConnected) {
      socket.emit('request-location-update', { deliveryId });
    }
  };

  return {
    isConnected,
    currentLocation,
    lastUpdate,
    isError,
    errorMessage,
    requestLocationUpdate,
  };
}

export default useLiveTracking;
