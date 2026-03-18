import { useEffect, useState } from 'react';
import api from './api';
import { US_STATES } from '../types/address';

interface CityCache {
  [state: string]: string[];
}

const cityCache: CityCache = {};

/**
 * Hook to fetch all US states
 * Returns states array and loading/error state
 */
export const useStates = () => {
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStates = async () => {
      try {
        setLoading(true);
        const response = await api.get('/locations/states');
        setStates(response.data.data?.length ? response.data.data : US_STATES);
        setError(null);
      } catch (err: any) {
        setStates(US_STATES);
        setError(err?.response?.data?.message || 'Failed to fetch states');
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  return { states, loading, error };
};

/**
 * Hook to fetch cities for a given state
 * Uses in-memory caching to minimize API calls
 */
export const useCities = (state: string | null | undefined) => {
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state) {
      setCities([]);
      return;
    }

    const stateCode = state.toUpperCase();

    // Check cache first
    if (cityCache[stateCode]) {
      setCities(cityCache[stateCode]);
      return;
    }

    const fetchCities = async () => {
      try {
        setLoading(true);
        const response = await api.get('/locations/cities', {
          params: { state: stateCode },
        });
        const data = response.data.data || [];
        cityCache[stateCode] = data;  // Cache the result
        setCities(data);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to fetch cities');
        setCities([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCities();
  }, [state]);

  return { cities, loading, error };
};
