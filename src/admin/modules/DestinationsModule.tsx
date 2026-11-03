import React, { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, X } from "lucide-react";
import { adminFetch } from "../api.ts";
import type { CityRecord, CountryRecord, DestinationRecord } from "../types.ts";
import { GalleryImageField, SingleImageField } from "../components/ImageUploaderField.tsx";
import { GoogleMapLocationPicker } from "../components/GoogleMapLocationPicker.tsx";

interface DestinationFormState {
  slug: string;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  countryId: string;
  cityId: string;
  mainImage: string;
  gallery: string[];
  googlePlaceId: string;
  formattedAddress: string;
  latitude: string;
  longitude: string;
  featured: boolean;
  published: boolean;
}

const EMPTY_DEST_FORM: DestinationFormState = {
  slug: "",
  nameKa: "",
  nameEn: "",
  descriptionKa: "",
  descriptionEn: "",
  countryId: "",
  cityId: "",
  mainImage: "",
  gallery: [],
  googlePlaceId: "",
  formattedAddress: "",
  latitude: "",
  longitude: "",
  featured: false,
  published: true,
};

export const DestinationsModule: React.FC = () => {
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DestinationFormState>(EMPTY_DEST_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [destRes, countryRes, cityRes] = await Promise.all([
        adminFetch<DestinationRecord[]>("/api/admin/destinations"),
        adminFetch<CountryRecord[]>("/api/admin/countries"),
        adminFetch<CityRecord[]>("/api/admin/cities"),
      ]);
      setDestinations(destRes);
      setCountries(countryRes);
      setCities(cityRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load destinations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openCreate = () => {
    const defaultCountry = countries.find((c) => c.code === "GE") || countries[0];
    setEditingId(null);
    setForm({
      ...EMPTY_DEST_FORM,
      countryId: defaultCountry ? String(defaultCountry.id) : "",
    });
    setFormError("");
    setEditorOpen(true);
  };

  const openEdit = (d: DestinationRecord) => {
    setEditingId(d.id);
    setForm({
      slug: d.slug,
      nameKa: d.nameKa,
      nameEn: d.nameEn,
      descriptionKa: d.descriptionKa,
      descriptionEn: d.descriptionEn,
      countryId: String(d.countryId),
      cityId: d.cityId ? String(d.cityId) : "",
      mainImage: d.mainImage,
      gallery: Array.isArray(d.gallery) ? d.gallery : [],
      googlePlaceId: d.googlePlaceId || "",
      formattedAddress: d.formattedAddress || "",
      latitude: d.latitude !== null ? String(d.latitude) : "",
      longitude: d.longitude !== null ? String(d.longitude) : "",
      featured: d.featured,
      published: d.published,
    });
    setFormError("");
    setEditorOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      slug: form.slug.trim(),
      nameKa: form.nameKa.trim(),
      nameEn: form.nameEn.trim(),
      descriptionKa: form.descriptionKa.trim(),
      descriptionEn: form.descriptionEn.trim(),
      countryId: Number(form.countryId),
      cityId: form.cityId ? Number(form.cityId) : null,
      mainImage: form.mainImage.trim(),
      gallery: form.gallery.length ? form.gallery : form.mainImage ? [form.mainImage.trim()] : [],
      googlePlaceId: form.googlePlaceId.trim(),
      formattedAddress: form.formattedAddress.trim(),
      latitude: form.latitude.trim() !== "" ? Number(form.latitude) : null,
      longitude: form.longitude.trim() !== "" ? Number(form.longitude) : null,
      featured: form.featured,
      published: form.published,
    };

    try {
      if (editingId) {
        await adminFetch(`/api/admin/destinations/${editingId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await adminFetch("/api/admin/destinations", {
          method: "POST",
          body: payload,
        });
      }
      setEditorOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save destination");
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = async (d: DestinationRecord, field: "published" | "featured") => {
    try {
      await adminFetch(`/api/admin/destinations/${d.id}`, {
        method: "PUT",
        body: { [field]: !d[field] },
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update destination");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminFetch(`/api/admin/destinations/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete destination");
    }
  };

  const countryNameById: Record<number, string> = {};
  countries.forEach((c) => {
    countryNameById[c.id] = c.nameEn;
  });

  const cityNameById: Record<number, string> = {};
  cities.forEach((c) => {
    cityNameById[c.id] = c.nameEn;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Destinations Management</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage destinations with bilingual descriptions, galleries, and Google Maps Places (New)
            coordinates.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Destination
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading destinations...</div>
        ) : destinations.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">No destinations created yet.</p>
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md cursor-pointer"
            >
              Add First Destination
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Country & City</th>
                <th className="py-3 px-4">Coordinates / Place ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {destinations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {d.mainImage ? (
                        <img
                          src={d.mainImage}
                          alt={d.nameEn}
                          referrerPolicy="no-referrer"
                          className="w-12 h-9 rounded object-cover bg-slate-100 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded bg-slate-100 shrink-0" />
                      )}
                      <div>
                        <div className="font-medium text-slate-900">{d.nameEn}</div>
                        <div className="text-xs text-slate-500">{d.nameKa}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <span>{countryNameById[d.countryId] || "—"}</span>
                    {d.cityId && cityNameById[d.cityId] && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>{cityNameById[d.cityId]}</span>
                      </>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono tabular-nums text-slate-600">
                    {d.latitude !== null && d.longitude !== null ? (
                      <span>
                        {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not pinned yet</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={
                        d.published ? "text-emerald-700 font-medium" : "text-amber-700 font-medium"
                      }
                    >
                      {d.published ? "Published" : "Draft"}
                    </span>
                    {d.featured && (
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
                        onClick={() => void toggleFlag(d, "featured")}
                        className={`p-1.5 rounded border cursor-pointer ${
                          d.featured
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-slate-200 text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${d.featured ? "fill-amber-500" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleFlag(d, "published")}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 cursor-pointer"
                      >
                        {d.published ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === d.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(d.id)}
                            className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(d.id)}
                          className="p-1.5 rounded border border-slate-200 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Destination" : "Add Destination"}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name (Georgian) *
                  </label>
                  <input
                    required
                    value={form.nameKa}
                    onChange={(e) => setForm({ ...form, nameKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Name (English) *
                  </label>
                  <input
                    required
                    value={form.nameEn}
                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Country *
                  </label>
                  <select
                    required
                    value={form.countryId}
                    onChange={(e) => setForm({ ...form, countryId: e.target.value })}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <select
                    value={form.cityId}
                    onChange={(e) => setForm({ ...form, cityId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Optional city</option>
                    {cities
                      .filter((c) => !form.countryId || String(c.countryId) === form.countryId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn} ({c.nameKa})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (Georgian)
                  </label>
                  <textarea
                    rows={3}
                    value={form.descriptionKa}
                    onChange={(e) => setForm({ ...form, descriptionKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={3}
                    value={form.descriptionEn}
                    onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Google Maps JavaScript API + Places API (New) Picker */}
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <h3 className="text-xs font-semibold text-slate-800">
                  Google Maps Location & Coordinates
                </h3>
                <GoogleMapLocationPicker
                  googlePlaceId={form.googlePlaceId}
                  formattedAddress={form.formattedAddress}
                  latitude={form.latitude !== "" ? Number(form.latitude) : null}
                  longitude={form.longitude !== "" ? Number(form.longitude) : null}
                  onChange={(loc) =>
                    setForm((prev) => ({
                      ...prev,
                      googlePlaceId: loc.googlePlaceId || prev.googlePlaceId,
                      formattedAddress: loc.formattedAddress || prev.formattedAddress,
                      latitude: loc.latitude !== null ? String(loc.latitude) : "",
                      longitude: loc.longitude !== null ? String(loc.longitude) : "",
                      nameEn: prev.nameEn || loc.displayName || "",
                    }))
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Google Place ID
                    </label>
                    <input
                      value={form.googlePlaceId}
                      onChange={(e) => setForm({ ...form, googlePlaceId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs font-mono tabular-nums border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4 border-t border-slate-200 pt-4">
                <SingleImageField
                  label="Main Image"
                  value={form.mainImage}
                  entityType="destination"
                  onChange={(url) =>
                    setForm((prev) => ({
                      ...prev,
                      mainImage: url,
                      gallery: prev.gallery.includes(url) ? prev.gallery : [url, ...prev.gallery],
                    }))
                  }
                />
                <GalleryImageField
                  label="Destination Gallery"
                  mainImage={form.mainImage}
                  gallery={form.gallery}
                  entityType="destination"
                  onChangeMain={(url) => setForm((prev) => ({ ...prev, mainImage: url }))}
                  onChangeGallery={(urls) => setForm((prev) => ({ ...prev, gallery: urls }))}
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                  />
                  <span>Published</span>
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />
                  <span>Featured Destination</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Destination"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
