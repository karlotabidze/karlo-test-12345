import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";
import { Search, MapPin } from "lucide-react";

const MAPS_API_KEY = String(import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] || "");

export interface SelectedMapLocation {
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  displayName?: string;
}

function checkQuotaError(err: unknown) {
  const msg = String(err instanceof Error ? err.message : err);
  if (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("OVER_QUERY_LIMIT") ||
    msg.includes("OverQuotaMapError") ||
    msg.includes("QuotaExceededError") ||
    msg.includes("429")
  ) {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
  }
}

interface PlacesSearchBarProps {
  onSelectLocation: (loc: SelectedMapLocation) => void;
}

const PlacesSearchBar: React.FC<PlacesSearchBarProps> = ({ onSelectLocation }) => {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }

    let cancelled = false;
    setLoading(true);

    const timer = window.setTimeout(() => {
      placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: sessionTokenRef.current!,
      })
        .then((res) => {
          if (!cancelled) {
            setSuggestions(res.suggestions || []);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setLoading(false);
            checkQuotaError(err);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, query]);

  const handlePickSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;

      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: ["id", "displayName", "formattedAddress", "location", "viewport"],
        });

        sessionTokenRef.current = null;
        setSuggestions([]);
        setQuery("");

        const lat = place.location ? place.location.lat() : null;
        const lng = place.location ? place.location.lng() : null;

        if (map) {
          if (place.viewport) {
            map.fitBounds(place.viewport);
          } else if (lat !== null && lng !== null) {
            map.setCenter({ lat, lng });
            map.setZoom(13);
          }
        }

        const payload: SelectedMapLocation = {
          googlePlaceId: place.id || "",
          formattedAddress: place.formattedAddress || "",
          latitude: lat,
          longitude: lng,
        };
        if (place.displayName) {
          payload.displayName = place.displayName;
        }
        onSelectLocation(payload);
      } catch (err) {
        checkQuotaError(err);
        console.error("Failed to fetch selected place details:", err);
      }
    },
    [map, onSelectLocation, placesLib],
  );

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Google Places (New) — city, landmark, or region..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-emerald-800"
        />
        {loading && <span className="text-xs text-slate-400 absolute right-3">Searching...</span>}
      </div>

      {suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((s, idx) => {
            const label = s.placePrediction?.text?.text || "Place suggestion";
            return (
              <li key={`${label}-${idx}`}>
                <button
                  type="button"
                  onClick={() => void handlePickSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

interface GoogleMapLocationPickerProps {
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  onChange: (next: SelectedMapLocation) => void;
}

export const GoogleMapLocationPicker: React.FC<GoogleMapLocationPickerProps> = ({
  googlePlaceId,
  formattedAddress,
  latitude,
  longitude,
  onChange,
}) => {
  const hasCoords =
    latitude !== null &&
    longitude !== null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  const defaultCenter = hasCoords
    ? { lat: latitude, lng: longitude }
    : { lat: 41.7151, lng: 44.8271 };

  const handleMapClick = (e: MapMouseEvent) => {
    const latLng = e.detail.latLng;
    if (!latLng) return;
    onChange({
      googlePlaceId,
      formattedAddress,
      latitude: Number(latLng.lat.toFixed(6)),
      longitude: Number(latLng.lng.toFixed(6)),
    });
  };

  if (!MAPS_API_KEY) {
    return (
      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
        Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`) is not set in this environment. You can
        still enter latitude, longitude, and Place ID manually below.
      </div>
    );
  }

  return (
    <APIProvider apiKey={MAPS_API_KEY} language="en" region="GE">
      <div className="space-y-3">
        <PlacesSearchBar onSelectLocation={onChange} />

        <div className="h-72 w-full rounded-lg overflow-hidden border border-slate-200">
          <GoogleMap
            mapId="DEMO_MAP_ID"
            defaultCenter={defaultCenter}
            defaultZoom={hasCoords ? 12 : 7}
            gestureHandling="greedy"
            onClick={handleMapClick}
            internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
            className="w-full h-full"
          >
            {hasCoords && (
              <AdvancedMarker position={{ lat: latitude, lng: longitude }}>
                <Pin background="#173c35" borderColor="#0f2924" glyphColor="#e4c28e" />
              </AdvancedMarker>
            )}
          </GoogleMap>
        </div>

        <p className="text-xs text-slate-500">
          Search via Google Places (New) above or click anywhere on the map to pin exact
          coordinates.
        </p>
      </div>
    </APIProvider>
  );
};
