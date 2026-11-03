import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, AlertTriangle, X } from "lucide-react";
import { adminFetch, ApiRequestError } from "../api.ts";
import type { CityRecord, CountryRecord } from "../types.ts";
import { SingleImageField } from "../components/ImageUploaderField.tsx";

export const CountriesCitiesModule: React.FC = () => {
  const [subTab, setSubTab] = useState<"countries" | "cities">("countries");
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dependencyWarning, setDependencyWarning] = useState<{
    message: string;
    items: string[];
  } | null>(null);

  // Country Modal
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [editingCountryId, setEditingCountryId] = useState<number | null>(null);
  const [countryForm, setCountryForm] = useState({
    code: "",
    nameKa: "",
    nameEn: "",
    descriptionKa: "",
    descriptionEn: "",
    imageUrl: "",
    featured: false,
    published: true,
  });

  // City Modal
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [editingCityId, setEditingCityId] = useState<number | null>(null);
  const [cityForm, setCityForm] = useState({
    countryId: "",
    slug: "",
    nameKa: "",
    nameEn: "",
    descriptionKa: "",
    descriptionEn: "",
    imageUrl: "",
    airportCode: "",
    featured: false,
    published: true,
  });

  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [countryRes, cityRes] = await Promise.all([
        adminFetch<CountryRecord[]>("/api/admin/countries"),
        adminFetch<CityRecord[]>("/api/admin/cities"),
      ]);
      setCountries(countryRes);
      setCities(cityRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load countries & cities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openNewCountry = () => {
    setEditingCountryId(null);
    setCountryForm({
      code: "",
      nameKa: "",
      nameEn: "",
      descriptionKa: "",
      descriptionEn: "",
      imageUrl: "",
      featured: false,
      published: true,
    });
    setCountryModalOpen(true);
  };

  const openEditCountry = (c: CountryRecord) => {
    setEditingCountryId(c.id);
    setCountryForm({
      code: c.code,
      nameKa: c.nameKa,
      nameEn: c.nameEn,
      descriptionKa: c.descriptionKa,
      descriptionEn: c.descriptionEn,
      imageUrl: c.imageUrl,
      featured: c.featured,
      published: c.published,
    });
    setCountryModalOpen(true);
  };

  const saveCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingCountryId) {
        await adminFetch(`/api/admin/countries/${editingCountryId}`, {
          method: "PUT",
          body: countryForm,
        });
      } else {
        await adminFetch("/api/admin/countries", {
          method: "POST",
          body: countryForm,
        });
      }
      setCountryModalOpen(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save country");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCountry = async (id: number) => {
    setDependencyWarning(null);
    setError("");
    try {
      await adminFetch(`/api/admin/countries/${id}`, { method: "DELETE" });
      setConfirmDeleteKey(null);
      await loadAll();
    } catch (err) {
      setConfirmDeleteKey(null);
      if (err instanceof ApiRequestError && err.dependencies.length > 0) {
        setDependencyWarning({
          message: err.message,
          items: err.dependencies,
        });
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete country");
      }
    }
  };

  const openNewCity = () => {
    const defaultCountry = countries.find((c) => c.code === "GE") || countries[0];
    setEditingCityId(null);
    setCityForm({
      countryId: defaultCountry ? String(defaultCountry.id) : "",
      slug: "",
      nameKa: "",
      nameEn: "",
      descriptionKa: "",
      descriptionEn: "",
      imageUrl: "",
      airportCode: "",
      featured: false,
      published: true,
    });
    setCityModalOpen(true);
  };

  const openEditCity = (city: CityRecord) => {
    setEditingCityId(city.id);
    setCityForm({
      countryId: String(city.countryId),
      slug: city.slug,
      nameKa: city.nameKa,
      nameEn: city.nameEn,
      descriptionKa: city.descriptionKa,
      descriptionEn: city.descriptionEn,
      imageUrl: city.imageUrl,
      airportCode: city.airportCode,
      featured: city.featured,
      published: city.published,
    });
    setCityModalOpen(true);
  };

  const saveCity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...cityForm,
        countryId: Number(cityForm.countryId),
      };
      if (editingCityId) {
        await adminFetch(`/api/admin/cities/${editingCityId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await adminFetch("/api/admin/cities", {
          method: "POST",
          body: payload,
        });
      }
      setCityModalOpen(false);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save city");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCity = async (id: number) => {
    setDependencyWarning(null);
    setError("");
    try {
      await adminFetch(`/api/admin/cities/${id}`, { method: "DELETE" });
      setConfirmDeleteKey(null);
      await loadAll();
    } catch (err) {
      setConfirmDeleteKey(null);
      if (err instanceof ApiRequestError && err.dependencies.length > 0) {
        setDependencyWarning({
          message: err.message,
          items: err.dependencies,
        });
      } else {
        setError(err instanceof Error ? err.message : "Failed to delete city");
      }
    }
  };

  const countryLookup: Record<number, CountryRecord> = {};
  countries.forEach((c) => {
    countryLookup[c.id] = c;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Countries & Cities Management</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage country and city records with referential integrity protection against accidental
            deletion.
          </p>
        </div>
        <button
          type="button"
          onClick={subTab === "countries" ? openNewCountry : openNewCity}
          className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {subTab === "countries" ? "Add Country" : "Add City"}
        </button>
      </div>

      {/* Segmented Switch */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        <button
          type="button"
          onClick={() => {
            setSubTab("countries");
            setDependencyWarning(null);
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === "countries"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Countries ({countries.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab("cities");
            setDependencyWarning(null);
          }}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
            subTab === "cities"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Cities ({cities.length})
        </button>
      </div>

      {dependencyWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
              <span>Deletion Prevented — Dependent Records Found</span>
            </div>
            <button
              type="button"
              onClick={() => setDependencyWarning(null)}
              className="text-amber-700 hover:text-amber-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-amber-900">{dependencyWarning.message}</p>
          <ul className="text-xs text-amber-950 list-disc pl-5 space-y-0.5">
            {dependencyWarning.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-xs text-amber-800">
            Reassign or delete these dependent records first before removing this location.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Countries Table */}
      {subTab === "countries" ? (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading countries...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4 text-right">Cities</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {countries.map((c) => {
                  const linkedCitiesCount = cities.filter((ct) => ct.countryId === c.id).length;
                  const delKey = `country-${c.id}`;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {c.imageUrl ? (
                            <img
                              src={c.imageUrl}
                              alt={c.nameEn}
                              referrerPolicy="no-referrer"
                              className="w-10 h-7 rounded object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-7 rounded bg-slate-100 shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-slate-900">{c.nameEn}</div>
                            <div className="text-xs text-slate-500">{c.nameKa}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{c.code}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                        {linkedCitiesCount}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span>{c.published ? "Published" : "Hidden"}</span>
                        {c.featured && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-amber-700 font-medium">Featured</span>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCountry(c)}
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteKey === delKey ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDeleteCountry(c.id)}
                                className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(null)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(delKey)}
                              className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Cities Table */
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading cities...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">Airport</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cities.map((city) => {
                  const delKey = `city-${city.id}`;
                  return (
                    <tr key={city.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {city.imageUrl ? (
                            <img
                              src={city.imageUrl}
                              alt={city.nameEn}
                              referrerPolicy="no-referrer"
                              className="w-10 h-7 rounded object-cover bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-7 rounded bg-slate-100 shrink-0" />
                          )}
                          <div>
                            <div className="font-medium text-slate-900">{city.nameEn}</div>
                            <div className="text-xs text-slate-500">{city.nameKa}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {countryLookup[city.countryId]?.nameEn || "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">
                        {city.airportCode || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <span>{city.published ? "Published" : "Hidden"}</span>
                        {city.featured && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Featured
                            </span>
                          </>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditCity(city)}
                            className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteKey === delKey ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDeleteCity(city.id)}
                                className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(null)}
                                className="px-2 py-1 text-xs border border-slate-300 rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteKey(delKey)}
                              className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Country Modal */}
      {countryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCountryId ? "Edit Country" : "Add Country"}
              </h2>
              <button
                type="button"
                onClick={() => setCountryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveCountry} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ISO Code *
                  </label>
                  <input
                    required
                    maxLength={6}
                    value={countryForm.code}
                    onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value })}
                    placeholder="GE"
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name (Georgian) *
                  </label>
                  <input
                    required
                    value={countryForm.nameKa}
                    onChange={(e) => setCountryForm({ ...countryForm, nameKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name (English) *
                  </label>
                  <input
                    required
                    value={countryForm.nameEn}
                    onChange={(e) => setCountryForm({ ...countryForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (Georgian)
                  </label>
                  <textarea
                    rows={2}
                    value={countryForm.descriptionKa}
                    onChange={(e) =>
                      setCountryForm({ ...countryForm, descriptionKa: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={2}
                    value={countryForm.descriptionEn}
                    onChange={(e) =>
                      setCountryForm({ ...countryForm, descriptionEn: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <SingleImageField
                label="Country Image"
                value={countryForm.imageUrl}
                entityType="country"
                onChange={(url) => setCountryForm({ ...countryForm, imageUrl: url })}
              />

              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={countryForm.featured}
                    onChange={(e) => setCountryForm({ ...countryForm, featured: e.target.checked })}
                  />
                  <span>Featured Country</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={countryForm.published}
                    onChange={(e) =>
                      setCountryForm({ ...countryForm, published: e.target.checked })
                    }
                  />
                  <span>Published</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCountryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Country"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* City Modal */}
      {cityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCityId ? "Edit City" : "Add City"}
              </h2>
              <button
                type="button"
                onClick={() => setCityModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveCity} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country *
                  </label>
                  <select
                    required
                    value={cityForm.countryId}
                    onChange={(e) => setCityForm({ ...cityForm, countryId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Select country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn} ({c.nameKa})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Airport Code (optional)
                  </label>
                  <input
                    maxLength={4}
                    value={cityForm.airportCode}
                    onChange={(e) => setCityForm({ ...cityForm, airportCode: e.target.value })}
                    placeholder="TBS"
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City Name (Georgian) *
                  </label>
                  <input
                    required
                    value={cityForm.nameKa}
                    onChange={(e) => setCityForm({ ...cityForm, nameKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City Name (English) *
                  </label>
                  <input
                    required
                    value={cityForm.nameEn}
                    onChange={(e) => setCityForm({ ...cityForm, nameEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (Georgian)
                  </label>
                  <textarea
                    rows={2}
                    value={cityForm.descriptionKa}
                    onChange={(e) => setCityForm({ ...cityForm, descriptionKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={2}
                    value={cityForm.descriptionEn}
                    onChange={(e) => setCityForm({ ...cityForm, descriptionEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <SingleImageField
                label="City Image"
                value={cityForm.imageUrl}
                entityType="city"
                onChange={(url) => setCityForm({ ...cityForm, imageUrl: url })}
              />

              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cityForm.featured}
                    onChange={(e) => setCityForm({ ...cityForm, featured: e.target.checked })}
                  />
                  <span>Featured City</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cityForm.published}
                    onChange={(e) => setCityForm({ ...cityForm, published: e.target.checked })}
                  />
                  <span>Published</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCityModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md cursor-pointer"
                >
                  {saving ? "Saving..." : "Save City"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
