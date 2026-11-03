import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plane, Plus, Search, Pencil, Trash2, ExternalLink, X, Check, Power } from "lucide-react";
import { adminFetch } from "../api.ts";
import type { FlightRouteRecord } from "../types.ts";
import { SingleImageField } from "../components/ImageUploaderField.tsx";

interface FlightFormState {
  departureAirport: string;
  arrivalAirport: string;
  departureCityKa: string;
  departureCityEn: string;
  arrivalCityKa: string;
  arrivalCityEn: string;
  arrivalCountryKa: string;
  arrivalCountryEn: string;
  airlineName: string;
  airlineLogo: string;
  routeDescriptionKa: string;
  routeDescriptionEn: string;
  partnerBookingUrl: string;
  price: string;
  currency: string;
  routeImage: string;
  active: boolean;
}

const EMPTY_FORM: FlightFormState = {
  departureAirport: "TBS",
  arrivalAirport: "",
  departureCityKa: "თბილისი",
  departureCityEn: "Tbilisi",
  arrivalCityKa: "",
  arrivalCityEn: "",
  arrivalCountryKa: "",
  arrivalCountryEn: "",
  airlineName: "",
  airlineLogo: "",
  routeDescriptionKa: "",
  routeDescriptionEn: "",
  partnerBookingUrl: "",
  price: "",
  currency: "EUR",
  routeImage: "",
  active: true,
};

const DEPARTURE_PRESETS: Record<string, { ka: string; en: string }> = {
  TBS: { ka: "თბილისი", en: "Tbilisi" },
  KUT: { ka: "ქუთაისი", en: "Kutaisi" },
  BUS: { ka: "ბათუმი", en: "Batumi" },
};

export const FlightsModule: React.FC = () => {
  const [routes, setRoutes] = useState<FlightRouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [airportFilter, setAirportFilter] = useState("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FlightFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<FlightRouteRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<FlightRouteRecord[]>("/api/admin/flights");
      setRoutes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flight routes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      if (airportFilter !== "ALL" && r.departureAirport !== airportFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.departureAirport.toLowerCase().includes(q) ||
        r.arrivalAirport.toLowerCase().includes(q) ||
        r.arrivalCityEn.toLowerCase().includes(q) ||
        r.arrivalCityKa.toLowerCase().includes(q) ||
        r.arrivalCountryEn.toLowerCase().includes(q) ||
        r.airlineName.toLowerCase().includes(q)
      );
    });
  }, [routes, airportFilter, searchQuery]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDrawerOpen(true);
  };

  const openEdit = (route: FlightRouteRecord) => {
    setEditingId(route.id);
    setForm({
      departureAirport: route.departureAirport,
      arrivalAirport: route.arrivalAirport,
      departureCityKa: route.departureCityKa,
      departureCityEn: route.departureCityEn,
      arrivalCityKa: route.arrivalCityKa,
      arrivalCityEn: route.arrivalCityEn,
      arrivalCountryKa: route.arrivalCountryKa,
      arrivalCountryEn: route.arrivalCountryEn,
      airlineName: route.airlineName,
      airlineLogo: route.airlineLogo,
      routeDescriptionKa: route.routeDescriptionKa,
      routeDescriptionEn: route.routeDescriptionEn,
      partnerBookingUrl: route.partnerBookingUrl,
      price: route.price !== null ? String(route.price) : "",
      currency: route.currency || "EUR",
      routeImage: route.routeImage,
      active: route.active,
    });
    setFormError("");
    setDrawerOpen(true);
  };

  const handleDepartureCodeChange = (raw: string) => {
    const code = raw.toUpperCase().slice(0, 4);
    const preset = DEPARTURE_PRESETS[code];
    setForm((prev) => ({
      ...prev,
      departureAirport: code,
      ...(preset ? { departureCityKa: preset.ka, departureCityEn: preset.en } : {}),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.departureAirport.trim() || !form.arrivalAirport.trim()) {
      setFormError("Departure and arrival IATA airport codes are required.");
      return;
    }
    if (!form.departureCityEn.trim() || !form.arrivalCityEn.trim()) {
      setFormError("Departure and arrival city names (English) are required.");
      return;
    }

    const parsedPrice = form.price.trim() !== "" ? Number(form.price) : null;
    if (parsedPrice !== null && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setFormError("Optional route price must be a non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        departureAirport: form.departureAirport.trim().toUpperCase(),
        arrivalAirport: form.arrivalAirport.trim().toUpperCase(),
        price: parsedPrice,
      };

      if (editingId) {
        await adminFetch<FlightRouteRecord>(`/api/admin/flights/${editingId}`, {
          method: "PUT",
          body: payload,
        });
        setNotice("Flight route updated.");
      } else {
        await adminFetch<FlightRouteRecord>("/api/admin/flights", {
          method: "POST",
          body: payload,
        });
        setNotice("Flight route created.");
      }
      setDrawerOpen(false);
      await loadRoutes();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save flight route");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (route: FlightRouteRecord) => {
    try {
      await adminFetch<FlightRouteRecord>(`/api/admin/flights/${route.id}`, {
        method: "PUT",
        body: { active: !route.active },
      });
      setRoutes((prev) =>
        prev.map((item) => (item.id === route.id ? { ...item, active: !route.active } : item)),
      );
      setNotice(
        `${route.departureAirport} → ${route.arrivalAirport} ${
          !route.active ? "activated" : "deactivated"
        }.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/flights/${deleteTarget.id}`, { method: "DELETE" });
      setNotice(`Deleted route ${deleteTarget.departureAirport} → ${deleteTarget.arrivalAirport}.`);
      setDeleteTarget(null);
      await loadRoutes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete flight route");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Flight Routes Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Curated direct & partner flight routes displayed on the public website, kept strictly
            separate from live schedule API lookups.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-sm font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Flight Route
        </button>
      </div>

      {notice && (
        <div className="px-4 py-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search IATA code, destination city, country, airline..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-emerald-800"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "TBS", "KUT", "BUS"].map((hub) => (
            <button
              key={hub}
              type="button"
              onClick={() => setAirportFilter(hub)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap cursor-pointer transition-colors ${
                airportFilter === hub
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {hub === "ALL" ? "All Hubs" : `${hub} Departures`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading flight routes...</div>
        ) : filteredRoutes.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Plane className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-sm font-medium text-slate-800">No flight routes match this filter</p>
            <p className="text-xs text-slate-500">
              Add a new route or clear your current search filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4">Destination (EN / KA)</th>
                  <th className="py-3 px-4">Airline</th>
                  <th className="py-3 px-4 text-right">Indicative Fare</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-semibold text-slate-900">
                        {route.departureAirport} → {route.arrivalAirport}
                      </div>
                      <div className="text-xs text-slate-500">
                        {route.departureCityEn} · Curated Route
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">
                        {route.arrivalCityEn}
                        {route.arrivalCountryEn ? `, ${route.arrivalCountryEn}` : ""}
                      </div>
                      <div className="text-xs text-slate-500">
                        {route.arrivalCityKa}
                        {route.arrivalCountryKa ? ` · ${route.arrivalCountryKa}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {route.airlineLogo ? (
                          <img
                            src={route.airlineLogo}
                            alt={route.airlineName}
                            referrerPolicy="no-referrer"
                            className="w-6 h-6 rounded object-contain bg-slate-50 border border-slate-200"
                          />
                        ) : null}
                        <span className="text-slate-800">{route.airlineName || "—"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                      {route.price !== null ? (
                        <span className="font-semibold text-slate-900">
                          {route.price} {route.currency}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Partner Live Fare</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          route.active ? "text-emerald-800" : "text-slate-500"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            route.active ? "bg-emerald-600" : "bg-slate-400"
                          }`}
                        />
                        {route.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {route.partnerBookingUrl && (
                          <a
                            href={route.partnerBookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open partner booking URL"
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(route)}
                          title={route.active ? "Deactivate route" : "Activate route"}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(route)}
                          title="Edit route"
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(route)}
                          title="Delete route"
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/40 flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-xl border-l border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {editingId ? "Edit Flight Route" : "Add Manual Flight Route"}
                </h2>
                <p className="text-xs text-slate-500">
                  Configure airport codes, bilingual city labels, airline branding, and booking
                  link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5 flex-1">
              {formError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure Airport (IATA) *
                  </label>
                  <input
                    type="text"
                    value={form.departureAirport}
                    onChange={(e) => handleDepartureCodeChange(e.target.value)}
                    placeholder="TBS, KUT, BUS..."
                    maxLength={4}
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arrival Airport (IATA) *
                  </label>
                  <input
                    type="text"
                    value={form.arrivalAirport}
                    onChange={(e) =>
                      setForm({ ...form, arrivalAirport: e.target.value.toUpperCase().slice(0, 4) })
                    }
                    placeholder="CDG, FCO, BER, DXB..."
                    maxLength={4}
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure City (Georgian) *
                  </label>
                  <input
                    type="text"
                    value={form.departureCityKa}
                    onChange={(e) => setForm({ ...form, departureCityKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure City (English) *
                  </label>
                  <input
                    type="text"
                    value={form.departureCityEn}
                    onChange={(e) => setForm({ ...form, departureCityEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arrival City (Georgian) *
                  </label>
                  <input
                    type="text"
                    value={form.arrivalCityKa}
                    onChange={(e) => setForm({ ...form, arrivalCityKa: e.target.value })}
                    placeholder="მაგ: პარიზი"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arrival City (English) *
                  </label>
                  <input
                    type="text"
                    value={form.arrivalCityEn}
                    onChange={(e) => setForm({ ...form, arrivalCityEn: e.target.value })}
                    placeholder="e.g. Paris"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arrival Country (Georgian)
                  </label>
                  <input
                    type="text"
                    value={form.arrivalCountryKa}
                    onChange={(e) => setForm({ ...form, arrivalCountryKa: e.target.value })}
                    placeholder="მაგ: საფრანგეთი"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Arrival Country (English)
                  </label>
                  <input
                    type="text"
                    value={form.arrivalCountryEn}
                    onChange={(e) => setForm({ ...form, arrivalCountryEn: e.target.value })}
                    placeholder="e.g. France"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Airline Name
                  </label>
                  <input
                    type="text"
                    value={form.airlineName}
                    onChange={(e) => setForm({ ...form, airlineName: e.target.value })}
                    placeholder="Wizz Air, Georgian Airways..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Optional Starting Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="Leave blank if dynamic"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="GEL">GEL (₾)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Partner Booking URL
                </label>
                <input
                  type="url"
                  value={form.partnerBookingUrl}
                  onChange={(e) => setForm({ ...form, partnerBookingUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <SingleImageField
                label="Airline Logo"
                value={form.airlineLogo}
                entityType="flight"
                onChange={(url) => setForm({ ...form, airlineLogo: url })}
                helperText="Optional square/transparent airline emblem."
              />

              <SingleImageField
                label="Destination Route Cover Image"
                value={form.routeImage}
                entityType="flight"
                onChange={(url) => setForm({ ...form, routeImage: url })}
                helperText="Displayed on route highlight cards."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Route Description (Georgian)
                  </label>
                  <textarea
                    rows={3}
                    value={form.routeDescriptionKa}
                    onChange={(e) => setForm({ ...form, routeDescriptionKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Route Description (English)
                  </label>
                  <textarea
                    rows={3}
                    value={form.routeDescriptionEn}
                    onChange={(e) => setForm({ ...form, routeDescriptionEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-900"
                />
                Active on public Flights directory
              </label>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete Flight Route?</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{" "}
              <strong className="font-mono">
                {deleteTarget.departureAirport} → {deleteTarget.arrivalAirport}
              </strong>{" "}
              ({deleteTarget.arrivalCityEn})? It will immediately disappear from the public flight
              finder.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-60 cursor-pointer"
              >
                {deleting ? "Deleting..." : "Delete Route"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
