/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeofenceConfig, LocationCheckResult } from '../types';

/**
 * Calculates distance between two coordinates in meters using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats a distance in meters into human readable Portuguese text.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km.replace('.', ',')} km`;
}

/**
 * Checks current browser permission state for geolocation safely across all browsers.
 */
export async function checkGeolocationPermission(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'prompt';
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state;
  } catch {
    return 'prompt';
  }
}

/**
 * Promisified wrapper for navigator.geolocation.getCurrentPosition with resilient
 * high-accuracy to network-accuracy fallback and normalized error messages.
 */
export async function getDevicePosition(
  options?: PositionOptions
): Promise<GeolocationPosition> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    const err = new Error('Geolocalização não é suportada por este dispositivo ou navegador.');
    (err as any).code = 2;
    throw err;
  }

  const queryGeo = (opts: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (geoErr: GeolocationPositionError) => {
          let msg = 'Erro ao obter localização do GPS.';
          if (geoErr.code === 1) {
            msg = 'Permissão de localização negada pelo navegador ou dispositivo.';
          } else if (geoErr.code === 2) {
            msg = 'Sinal de localização/GPS indisponível no momento.';
          } else if (geoErr.code === 3) {
            msg = 'Tempo limite esgotado ao buscar sinal do GPS.';
          }
          const err = new Error(msg);
          (err as any).code = geoErr.code;
          reject(err);
        },
        opts
      );
    });
  };

  // If caller specifically requested low accuracy, query directly
  if (options && options.enableHighAccuracy === false) {
    return await queryGeo(options);
  }

  // Attempt 1: High accuracy with a 6-second timeout
  try {
    return await queryGeo({
      enableHighAccuracy: true,
      timeout: 6000,
      maximumAge: 20000,
      ...options,
    });
  } catch (firstErr: any) {
    // If user explicitly denied permission (code 1), do not retry — throw immediately
    if (firstErr && firstErr.code === 1) {
      throw firstErr;
    }

    // Attempt 2: Fallback to network/Wi-Fi triangulation (essential for desktop/laptops and indoors)
    try {
      return await queryGeo({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });
    } catch (secondErr: any) {
      throw secondErr;
    }
  }
}

/**
 * Evaluates device position against the geofence configuration.
 */
export async function evaluateGeofence(
  config: GeofenceConfig
): Promise<LocationCheckResult> {
  // If geofencing is disabled, allow immediately
  if (!config.enabled) {
    return {
      isAllowed: true,
      reason: 'disabled',
      message: 'Geolocalização desativada pelo administrador.',
    };
  }

  // Validate coordinates
  if (
    typeof config.latitude !== 'number' ||
    typeof config.longitude !== 'number' ||
    isNaN(config.latitude) ||
    isNaN(config.longitude)
  ) {
    return {
      isAllowed: false,
      reason: 'position_unavailable',
      message: 'Coordenadas do evento não configuradas pelo administrador.',
    };
  }

  try {
    const position = await getDevicePosition();
    const currentLat = position.coords.latitude;
    const currentLng = position.coords.longitude;

    const distance = calculateDistanceMeters(
      currentLat,
      currentLng,
      config.latitude,
      config.longitude
    );

    const radius = config.radiusMeters || 300;
    const isInside = distance <= radius;

    if (isInside) {
      return {
        isAllowed: true,
        reason: 'inside',
        distanceMeters: distance,
        currentLat,
        currentLng,
        message: `Você está dentro da área do evento (${formatDistance(distance)} do centro).`,
      };
    } else {
      return {
        isAllowed: false,
        reason: 'outside',
        distanceMeters: distance,
        currentLat,
        currentLng,
        message: `Você está fora da área do evento (${formatDistance(distance)} de distância). O raio máximo permitido é ${formatDistance(radius)}.`,
      };
    }
  } catch (err: any) {
    let reason: LocationCheckResult['reason'] = 'position_unavailable';
    let message = 'Não foi possível obter a sua localização atual.';

    if (err && err.code === 1) { // PERMISSION_DENIED
      reason = 'permission_denied';
      message = 'Permissão de localização negada. Para investir nas agências, permita o acesso ao GPS nas configurações do seu navegador.';
    } else if (err && err.code === 2) { // POSITION_UNAVAILABLE
      reason = 'position_unavailable';
      message = 'Sinal de GPS indisponível no momento. Certifique-se de que a localização está ligada.';
    } else if (err && err.code === 3) { // TIMEOUT
      reason = 'timeout';
      message = 'Tempo limite esgotado ao buscar sinal do GPS. Tente novamente.';
    }

    return {
      isAllowed: false,
      reason,
      message,
    };
  }
}

/**
 * Geocodes an address string using Nominatim OpenStreetMap API.
 */
export async function geocodeAddress(
  address: string
): Promise<{ success: boolean; latitude?: number; longitude?: number; displayName?: string; error?: string }> {
  const query = address.trim();
  if (!query) {
    return { success: false, error: 'Por favor, digite um endereço para buscar.' };
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Erro ao consultar serviço de mapas.' };
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: 'Endereço não encontrado. Tente detalhar com cidade e estado ou use "Minha Localização Atual".' };
    }

    const firstResult = data[0];
    const lat = parseFloat(firstResult.lat);
    const lon = parseFloat(firstResult.lon);

    return {
      success: true,
      latitude: lat,
      longitude: lon,
      displayName: firstResult.display_name,
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Falha de conexão com o serviço de geocodificação: ' + (err.message || 'Erro de rede'),
    };
  }
}

/**
 * Reverse geocodes latitude/longitude to a readable address string.
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}
