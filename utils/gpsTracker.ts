import { useCallback, useRef, useState } from 'react';
import * as Location from 'expo-location';

// شعاع زمین بر حسب متر - برای محاسبه فاصله بین دو مختصات (فرمول هاورساین)
const EARTH_RADIUS_M = 6371000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// فاصله بین دو نقطه GPS بر حسب متر
export function haversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

// نقاط با دقت پایین (پرش GPS در توقف) را فیلتر می‌کند
const MIN_ACCURACY_M = 30;
const MIN_MOVE_M = 4; // کمتر از این مقدار به عنوان نویز GPS نادیده گرفته می‌شود

export type GpsTrackerState = {
  isTracking: boolean;
  distanceKm: number;
  durationSec: number;
  points: number;
  error: string | null;
};

export function useGpsTripTracker() {
  const [state, setState] = useState<GpsTrackerState>({
    isTracking: false,
    distanceKm: 0,
    durationSec: 0,
    points: 0,
    error: null,
  });

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<{ lat: number; lon: number } | null>(null);
  const totalMetersRef = useRef(0);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setState(s => ({ ...s, isTracking: false }));
  }, []);

  const start = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState(s => ({ ...s, error: 'دسترسی به موقعیت مکانی داده نشد' }));
      return false;
    }
    totalMetersRef.current = 0;
    lastPointRef.current = null;
    startedAtRef.current = Date.now();
    setState({ isTracking: true, distanceKm: 0, durationSec: 0, points: 0, error: null });

    subRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (loc) => {
        const { latitude, longitude, accuracy } = loc.coords;
        if (accuracy != null && accuracy > MIN_ACCURACY_M) return; // نویز GPS
        const prev = lastPointRef.current;
        if (prev) {
          const d = haversineDistance(prev.lat, prev.lon, latitude, longitude);
          if (d >= MIN_MOVE_M) {
            totalMetersRef.current += d;
            lastPointRef.current = { lat: latitude, lon: longitude };
          }
        } else {
          lastPointRef.current = { lat: latitude, lon: longitude };
        }
        setState(s => ({
          ...s,
          distanceKm: Math.round((totalMetersRef.current / 1000) * 100) / 100,
          points: s.points + 1,
        }));
      }
    );

    timerRef.current = setInterval(() => {
      setState(s => ({ ...s, durationSec: Math.floor((Date.now() - startedAtRef.current) / 1000) }));
    }, 1000);

    return true;
  }, []);

  const reset = useCallback(() => {
    totalMetersRef.current = 0;
    lastPointRef.current = null;
    setState({ isTracking: false, distanceKm: 0, durationSec: 0, points: 0, error: null });
  }, []);

  return { ...state, start, stop, reset };
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
