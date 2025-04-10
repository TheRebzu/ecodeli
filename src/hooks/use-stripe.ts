'use client';

import { useState, useEffect } from 'react';

export function useStripe() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Logique du hook
  }, []);

  return { data, loading, error };
}

