'use client';

import { useState, useEffect } from 'react';

export function useCourierDocuments() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // This would be an API call in a real application
    setIsLoading(true);
    // Mock data for development
    setTimeout(() => {
      setDocuments([]);
      setIsLoading(false);
    }, 500);
  }, []);

  return {
    documents,
    isLoading,
    error
  };
}