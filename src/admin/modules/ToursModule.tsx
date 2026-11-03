import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Star, Eye, EyeOff, X } from "lucide-react";
import { adminFetch } from "../api.ts";
import type { CityRecord, CountryRecord, DestinationRecord, TourRecord } from "../types.ts";
import { GalleryImageField, SingleImageField } from "../components/ImageUploaderField.tsx";

interface TourFormState {
  slug: string;
  titleKa: string;
  titleEn: string;
  descriptionKa: string;
  descriptionEn: string;
  category: string;
  countryId: string;
  cityId: string;
  destinationId: string;
  cityNameKa: string;
  cityNameEn: string;
  mainImage: string;
  gallery: string[];
  price: string;
  discountedPrice: string;
  currency: string;
  durationDays: string;
  highlightsKaText: string;
  highlightsEnText: string;
  itineraryKaText: string;
  itineraryEnText: string;
  includedKaText: string;
  includedEnText: string;
  excludedKaText: string;
  excludedEnText: string;
  importantInfoKa: string;
  importantInfoEn: string;
  departureInfoKa: string;
  departureInfoEn: string;
  returnInfoKa: string;
  returnInfoEn: string;
  availabilityStatus: string;
  published: boolean;
  featured: boolean;
  partnerBookingUrl: string;
  seoTitleKa: string;
  seoTitleEn: string;
  seoDescriptionKa: string;
  seoDescriptionEn: string;
}

const EMPTY_TOUR_FORM: TourFormState = {
  slug: "",
  titleKa: "",
  titleEn: "",
  descriptionKa: "",
  descriptionEn: "",
  category: "culture",
  countryId: "",
  cityId: "",
  destinationId: "",
  cityNameKa: "თბილისი",
  cityNameEn: "Tbilisi",
  mainImage: "",
  gallery: [],
  price: "120",
  discountedPrice: "",
  currency: "GEL",
  durationDays: "1",
  highlightsKaText: "",
  highlightsEnText: "",
  itineraryKaText: "",
  itineraryEnText: "",
  includedKaText: "",
  includedEnText: "",
  excludedKaText: "",
  excludedEnText: "",
  importantInfoKa: "",
  importantInfoEn: "",
  departureInfoKa: "",
  departureInfoEn: "",
  returnInfoKa: "",
  returnInfoEn: "",
  availabilityStatus: "available",
  published: true,
  featured: false,
  partnerBookingUrl: "",
  seoTitleKa: "",
  seoTitleEn: "",
  seoDescriptionKa: "",
  seoDescriptionEn: "",
};

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export const ToursModule: React.FC = () => {
  const [tours, setTours] = useState<TourRecord[]>([]);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "unpublished">("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<TourFormState>(EMPTY_TOUR_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [toursRes, countriesRes, citiesRes, destRes] = await Promise.all([
        adminFetch<TourRecord[]>("/api/admin/tours"),
        adminFetch<CountryRecord[]>("/api/admin/countries"),
        adminFetch<CityRecord[]>("/api/admin/cities"),
        adminFetch<DestinationRecord[]>("/api/admin/destinations"),
      ]);
      setTours(toursRes);
      setCountries(countriesRes);
      setCities(citiesRes);
      setDestinations(destRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tours");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredTours = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tours.filter((t) => {
      if (statusFilter === "published" && !t.published) return false;
      if (statusFilter === "unpublished" && t.published) return false;
      if (categoryFilter && t.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        t.titleEn.toLowerCase().includes(q) ||
        t.titleKa.toLowerCase().includes(q) ||
        t.cityNameEn.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      );
    });
  }, [tours, search, statusFilter, categoryFilter]);

  const openCreate = () => {
    const defaultCountry = countries.find((c) => c.code === "GE") || countries[0];
    const defaultCity = cities[0];
    setEditingId(null);
    setForm({
      ...EMPTY_TOUR_FORM,
      countryId: defaultCountry ? String(defaultCountry.id) : "",
      cityId: defaultCity ? String(defaultCity.id) : "",
      cityNameKa: defaultCity ? defaultCity.nameKa : "თბილისი",
      cityNameEn: defaultCity ? defaultCity.nameEn : "Tbilisi",
    });
    setFormError("");
    setEditorOpen(true);
  };

  const openEdit = (tour: TourRecord) => {
    setEditingId(tour.id);
    setForm({
      slug: tour.slug,
      titleKa: tour.titleKa,
      titleEn: tour.titleEn,
      descriptionKa: tour.descriptionKa,
      descriptionEn: tour.descriptionEn,
      category: tour.category,
      countryId: tour.countryId ? String(tour.countryId) : "",
      cityId: tour.cityId ? String(tour.cityId) : "",
      destinationId: tour.destinationId ? String(tour.destinationId) : "",
      cityNameKa: tour.cityNameKa,
      cityNameEn: tour.cityNameEn,
      mainImage: tour.mainImage,
      gallery: Array.isArray(tour.gallery) ? tour.gallery : [],
      price: String(tour.price),
      discountedPrice: tour.discountedPrice !== null ? String(tour.discountedPrice) : "",
      currency: tour.currency,
      durationDays: String(tour.durationDays),
      highlightsKaText: (tour.highlightsKa || []).join("\n"),
      highlightsEnText: (tour.highlightsEn || []).join("\n"),
      itineraryKaText: (tour.itineraryKa || []).join("\n"),
      itineraryEnText: (tour.itineraryEn || []).join("\n"),
      includedKaText: (tour.includedKa || []).join("\n"),
      includedEnText: (tour.includedEn || []).join("\n"),
      excludedKaText: (tour.excludedKa || []).join("\n"),
      excludedEnText: (tour.excludedEn || []).join("\n"),
      importantInfoKa: tour.importantInfoKa || "",
      importantInfoEn: tour.importantInfoEn || "",
      departureInfoKa: tour.departureInfoKa || "",
      departureInfoEn: tour.departureInfoEn || "",
      returnInfoKa: tour.returnInfoKa || "",
      returnInfoEn: tour.returnInfoEn || "",
      availabilityStatus: tour.availabilityStatus || "available",
      published: tour.published,
      featured: tour.featured,
      partnerBookingUrl: tour.partnerBookingUrl || "",
      seoTitleKa: tour.seoTitleKa || "",
      seoTitleEn: tour.seoTitleEn || "",
      seoDescriptionKa: tour.seoDescriptionKa || "",
      seoDescriptionEn: tour.seoDescriptionEn || "",
    });
    setFormError("");
    setEditorOpen(true);
  };

  const handleCitySelect = (cityIdStr: string) => {
    const found = cities.find((c) => String(c.id) === cityIdStr);
    setForm((prev) => ({
      ...prev,
      cityId: cityIdStr,
      ...(found
        ? {
            cityNameKa: found.nameKa,
            cityNameEn: found.nameEn,
            countryId: String(found.countryId),
          }
        : {}),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      slug: form.slug.trim(),
      titleKa: form.titleKa.trim(),
      titleEn: form.titleEn.trim(),
      descriptionKa: form.descriptionKa.trim(),
      descriptionEn: form.descriptionEn.trim(),
      category: form.category,
      countryId: form.countryId ? Number(form.countryId) : null,
      cityId: form.cityId ? Number(form.cityId) : null,
      destinationId: form.destinationId ? Number(form.destinationId) : null,
      cityNameKa: form.cityNameKa.trim() || "თბილისი",
      cityNameEn: form.cityNameEn.trim() || "Tbilisi",
      mainImage: form.mainImage.trim(),
      gallery: form.gallery.length ? form.gallery : form.mainImage ? [form.mainImage.trim()] : [],
      price: Number(form.price),
      discountedPrice: form.discountedPrice.trim() ? Number(form.discountedPrice) : null,
      currency: form.currency,
      durationDays: Number(form.durationDays || 1),
      highlightsKa: linesToArray(form.highlightsKaText),
      highlightsEn: linesToArray(form.highlightsEnText),
      itineraryKa: linesToArray(form.itineraryKaText),
      itineraryEn: linesToArray(form.itineraryEnText),
      includedKa: linesToArray(form.includedKaText),
      includedEn: linesToArray(form.includedEnText),
      excludedKa: linesToArray(form.excludedKaText),
      excludedEn: linesToArray(form.excludedEnText),
      importantInfoKa: form.importantInfoKa.trim(),
      importantInfoEn: form.importantInfoEn.trim(),
      departureInfoKa: form.departureInfoKa.trim(),
      departureInfoEn: form.departureInfoEn.trim(),
      returnInfoKa: form.returnInfoKa.trim(),
      returnInfoEn: form.returnInfoEn.trim(),
      availabilityStatus: form.availabilityStatus,
      published: form.published,
      featured: form.featured,
      partnerBookingUrl: form.partnerBookingUrl.trim(),
      seoTitleKa: form.seoTitleKa.trim(),
      seoTitleEn: form.seoTitleEn.trim(),
      seoDescriptionKa: form.seoDescriptionKa.trim(),
      seoDescriptionEn: form.seoDescriptionEn.trim(),
    };

    try {
      if (editingId) {
        await adminFetch(`/api/admin/tours/${editingId}`, {
          method: "PUT",
          body: payload,
        });
      } else {
        await adminFetch("/api/admin/tours", {
          method: "POST",
          body: payload,
        });
      }
      setEditorOpen(false);
      await loadAll();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save tour");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (tour: TourRecord) => {
    try {
      await adminFetch(`/api/admin/tours/${tour.id}`, {
        method: "PUT",
        body: { published: !tour.published },
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update publication status");
    }
  };

  const toggleFeatured = async (tour: TourRecord) => {
    try {
      await adminFetch(`/api/admin/tours/${tour.id}`, {
        method: "PUT",
        body: { featured: !tour.featured },
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update featured flag");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminFetch(`/api/admin/tours/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tour");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tours Management</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Create, edit, publish, feature, and manage bilingual itineraries, galleries, and
            pricing.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Tour
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-lg">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Georgian/English title, city, or slug..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-emerald-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
            {(["all", "published", "unpublished"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStatusFilter(mode)}
                className={`px-2.5 py-1 text-xs font-medium rounded capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === mode
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-slate-700"
          >
            <option value="">All Categories</option>
            <option value="nature">Nature</option>
            <option value="culture">Culture</option>
            <option value="wine">Wine</option>
            <option value="adventure">Adventure</option>
            <option value="city">City</option>
            <option value="gastronomy">Gastronomy</option>
          </select>
        </div>
      </div>

      {/* Tours Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading tours...</div>
        ) : filteredTours.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600">No tours match your current filters.</p>
            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 cursor-pointer"
            >
              Create First Tour
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 bg-slate-50/70">
                <th className="py-3 px-4">Tour</th>
                <th className="py-3 px-4">Location & Category</th>
                <th className="py-3 px-4 text-right">Duration</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredTours.map((tour) => (
                <tr key={tour.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={tour.mainImage}
                        alt={tour.titleEn}
                        referrerPolicy="no-referrer"
                        className="w-12 h-9 rounded object-cover bg-slate-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate max-w-xs">
                          {tour.titleEn}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-xs">
                          {tour.titleKa} · <span className="font-mono">{tour.slug}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    <span>{tour.cityNameEn}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="capitalize">{tour.category}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700">
                    {tour.durationDays}d
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                    {tour.hasDiscount && tour.effectivePrice !== undefined ? (
                      <div>
                        <span className="line-through text-slate-400 mr-1.5">{tour.price}</span>
                        <span className="font-semibold text-emerald-800">
                          {tour.effectivePrice} {tour.currency}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {tour.price} {tour.currency}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={
                        tour.published
                          ? "text-emerald-700 font-medium"
                          : "text-amber-700 font-medium"
                      }
                    >
                      {tour.published ? "Published" : "Unpublished"}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="text-slate-500 capitalize">{tour.availabilityStatus}</span>
                    {tour.featured && (
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
                        onClick={() => void toggleFeatured(tour)}
                        title={tour.featured ? "Unmark featured" : "Mark featured"}
                        className={`p-1.5 rounded border cursor-pointer ${
                          tour.featured
                            ? "border-amber-300 bg-amber-50 text-amber-700"
                            : "border-slate-200 text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${tour.featured ? "fill-amber-500" : ""}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void togglePublish(tour)}
                        title={tour.published ? "Unpublish tour" : "Publish tour"}
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {tour.published ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(tour)}
                        title="Edit tour"
                        className="p-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === tour.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(tour.id)}
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
                          onClick={() => setConfirmDeleteId(tour.id)}
                          title="Delete tour"
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

      {/* Tour Create/Edit Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Tour" : "Add New Tour"}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                  {formError}
                </div>
              )}

              {/* Basic Titles & Slug */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Title (Georgian) *
                  </label>
                  <input
                    required
                    value={form.titleKa}
                    onChange={(e) => setForm({ ...form, titleKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Title (English) *
                  </label>
                  <input
                    required
                    value={form.titleEn}
                    onChange={(e) => setForm({ ...form, titleEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unique Slug (auto if blank)
                  </label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="e.g. kazbegi-alpine-tour"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Location & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <select
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
                    onChange={(e) => handleCitySelect(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Custom / Select city</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameEn} ({c.nameKa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Destination
                  </label>
                  <select
                    value={form.destinationId}
                    onChange={(e) => setForm({ ...form, destinationId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">None</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="nature">Nature (ბუნება)</option>
                    <option value="culture">Culture (კულტურა)</option>
                    <option value="wine">Wine (ღვინო)</option>
                    <option value="adventure">Adventure (თავგადასავალი)</option>
                    <option value="city">City (ქალაქი)</option>
                    <option value="gastronomy">Gastronomy (გასტრონომია)</option>
                  </select>
                </div>
              </div>

              {/* Display City Names Override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display City / Region (Georgian) *
                  </label>
                  <input
                    required
                    value={form.cityNameKa}
                    onChange={(e) => setForm({ ...form, cityNameKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display City / Region (English) *
                  </label>
                  <input
                    required
                    value={form.cityNameEn}
                    onChange={(e) => setForm({ ...form, cityNameEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Pricing, Currency, Duration & Status */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Regular Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discounted Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.discountedPrice}
                    onChange={(e) => setForm({ ...form, discountedPrice: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md bg-white"
                  >
                    <option value="GEL">GEL (₾)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={form.durationDays}
                    onChange={(e) => setForm({ ...form, durationDays: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Availability
                  </label>
                  <select
                    value={form.availabilityStatus}
                    onChange={(e) => setForm({ ...form, availabilityStatus: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="available">Available</option>
                    <option value="limited">Limited Spots</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (Georgian) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.descriptionKa}
                    onChange={(e) => setForm({ ...form, descriptionKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description (English) *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.descriptionEn}
                    onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Cover & Gallery Images */}
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <SingleImageField
                  label="Main Cover Image *"
                  value={form.mainImage}
                  entityType="tour"
                  onChange={(url) =>
                    setForm((prev) => ({
                      ...prev,
                      mainImage: url,
                      gallery: prev.gallery.includes(url) ? prev.gallery : [url, ...prev.gallery],
                    }))
                  }
                />
                <GalleryImageField
                  label="Tour Image Gallery (click 'Set Cover' on any photo to make it main)"
                  mainImage={form.mainImage}
                  gallery={form.gallery}
                  entityType="tour"
                  onChangeMain={(url) => setForm((prev) => ({ ...prev, mainImage: url }))}
                  onChangeGallery={(urls) => setForm((prev) => ({ ...prev, gallery: urls }))}
                />
              </div>

              {/* Highlights & Daily Itinerary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tour Highlights — Georgian (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={form.highlightsKaText}
                    onChange={(e) => setForm({ ...form, highlightsKaText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tour Highlights — English (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={form.highlightsEnText}
                    onChange={(e) => setForm({ ...form, highlightsEnText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Itinerary — Georgian (one activity/day per line)
                  </label>
                  <textarea
                    rows={4}
                    value={form.itineraryKaText}
                    onChange={(e) => setForm({ ...form, itineraryKaText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Itinerary — English (one activity/day per line)
                  </label>
                  <textarea
                    rows={4}
                    value={form.itineraryEnText}
                    onChange={(e) => setForm({ ...form, itineraryEnText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Included & Excluded Services */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Included Services — Georgian (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={form.includedKaText}
                    onChange={(e) => setForm({ ...form, includedKaText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Included Services — English (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={form.includedEnText}
                    onChange={(e) => setForm({ ...form, includedEnText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Excluded Services — Georgian (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={form.excludedKaText}
                    onChange={(e) => setForm({ ...form, excludedKaText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Excluded Services — English (one per line)
                  </label>
                  <textarea
                    rows={2}
                    value={form.excludedEnText}
                    onChange={(e) => setForm({ ...form, excludedEnText: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Departure, Return, Important Info & Partner Booking */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure Info (Georgian)
                  </label>
                  <input
                    value={form.departureInfoKa}
                    onChange={(e) => setForm({ ...form, departureInfoKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departure Info (English)
                  </label>
                  <input
                    value={form.departureInfoEn}
                    onChange={(e) => setForm({ ...form, departureInfoEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Return Info (Georgian)
                  </label>
                  <input
                    value={form.returnInfoKa}
                    onChange={(e) => setForm({ ...form, returnInfoKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Return Info (English)
                  </label>
                  <input
                    value={form.returnInfoEn}
                    onChange={(e) => setForm({ ...form, returnInfoEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Important Traveler Information (Georgian)
                  </label>
                  <textarea
                    rows={2}
                    value={form.importantInfoKa}
                    onChange={(e) => setForm({ ...form, importantInfoKa: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Important Traveler Information (English)
                  </label>
                  <textarea
                    rows={2}
                    value={form.importantInfoEn}
                    onChange={(e) => setForm({ ...form, importantInfoEn: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              {/* Partner URL & SEO */}
              <div className="space-y-4 border-t border-slate-200 pt-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partner Booking URL (optional)
                  </label>
                  <input
                    type="url"
                    value={form.partnerBookingUrl}
                    onChange={(e) => setForm({ ...form, partnerBookingUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SEO Title (Georgian)
                    </label>
                    <input
                      value={form.seoTitleKa}
                      onChange={(e) => setForm({ ...form, seoTitleKa: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SEO Title (English)
                    </label>
                    <input
                      value={form.seoTitleEn}
                      onChange={(e) => setForm({ ...form, seoTitleEn: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SEO Description (Georgian)
                    </label>
                    <textarea
                      rows={2}
                      value={form.seoDescriptionKa}
                      onChange={(e) => setForm({ ...form, seoDescriptionKa: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      SEO Description (English)
                    </label>
                    <textarea
                      rows={2}
                      value={form.seoDescriptionEn}
                      onChange={(e) => setForm({ ...form, seoDescriptionEn: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(e) => setForm({ ...form, published: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span>Publish immediately on public website</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span>Mark as Featured Tour</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Tour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
