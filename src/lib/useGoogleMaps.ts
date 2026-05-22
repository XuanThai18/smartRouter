/**
 * Hook tải Google Maps JS API một lần duy nhất
 */
import { useEffect, useState } from "react";

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps) { setReady(true); return; }

    const key = process.env.NEXT_PUBLIC_GMAPS_KEY;
    if (!key || key === "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      console.warn("[SmartRoute] Chưa cấu hình NEXT_PUBLIC_GMAPS_KEY");
      return;
    }

    window.initGoogleMaps = () => setReady(true);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initGoogleMaps&language=vi&region=VN`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => { document.head.removeChild(script); };
  }, []);

  return ready;
}
