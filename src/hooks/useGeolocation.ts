import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        });
      },
      (error) => {
        let errorMsg = 'Failed to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'GPS Permission Denied. Please enable location services.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS Position Unavailable. Ensure location is active.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'GPS Request timed out. Retrying...';
        }
        setState({
          lat: null,
          lng: null,
          accuracy: null,
          loading: false,
          error: errorMsg,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  // Capture position immediately on mount
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  return { ...state, refresh: getLocation };
}
