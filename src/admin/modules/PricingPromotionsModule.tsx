import React, { useCallback, useEffect, useState } from "react";
import { Plus, Save, Trash2, Pencil, X, Power, Tag, History } from "lucide-react";
import { adminFetch } from "../api.ts";
import type { PriceHistoryRecord, PromotionRecord, TourRecord } from "../types.ts";

interface QuickPriceDraft {
  price: string;
  discountedPrice: string;
  currency: string;
}

interface PromotionFormState {
  titleKa: string;
  titleEn: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  currency: string;
  tourId: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

function toInputDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

export const PricingPromotionsModule: React.FC = () => {
  const [tours, setTours] = useState<TourRecord[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<number, QuickPriceDraft>>({});

  const [loading, setLoading] = useState(true);
  const [savingTourId, setSavingTourId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoFormError, setPromoFormError] = useState("");
  const [promoForm, setPromoForm] = useState<PromotionFormState>({
    titleKa: "",
    titleEn: "",
    code: "",
    discountType: "percentage",
    discountValue: "10",
    currency: "GEL",
    tourId: "",
    startDate: toInputDate(),
    endDate: defaultEndDate(),
    active: true,
  });

  const [deletePromoTarget, setDeletePromoTarget] = useState<PromotionRecord | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [toursData, promosData, historyData] = await Promise.all([
        adminFetch<TourRecord[]>("/api/admin/tours"),
        adminFetch<PromotionRecord[]>("/api/admin/promotions"),
        adminFetch<PriceHistoryRecord[]>("/api/admin/price-history"),
      ]);
      setTours(toursData);
      setPromotions(promosData);
      setHistory(historyData);

      const initialDrafts: Record<number, QuickPriceDraft> = {};
      for (const t of toursData) {
        initialDrafts[t.id] = {
          price: String(t.price),
          discountedPrice: t.discountedPrice !== null ? String(t.discountedPrice) : "",
          currency: t.currency || "GEL",
        };
      }
      setDrafts(initialDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pricing and promotions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSaveTourPrice = async (tour: TourRecord) => {
    const draft = drafts[tour.id];
    if (!draft) return;

    setError("");
    const basePrice = Number(draft.price);
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      setError(`Invalid base price for "${tour.titleEn}": price must be greater than 0.`);
      return;
    }

    let discountedPrice: number | null = null;
    if (draft.discountedPrice.trim() !== "") {
      discountedPrice = Number(draft.discountedPrice);
      if (!Number.isFinite(discountedPrice) || discountedPrice <= 0) {
        setError(`Discounted price for "${tour.titleEn}" must be greater than 0.`);
        return;
      }
      if (discountedPrice >= basePrice) {
        setError(
          `Discounted price (${discountedPrice}) for "${tour.titleEn}" must be strictly lower than base price (${basePrice}).`,
        );
        return;
      }
    }

    setSavingTourId(tour.id);
    try {
      await adminFetch(`/api/admin/tours/${tour.id}`, {
        method: "PUT",
        body: {
          price: basePrice,
          discountedPrice,
          currency: draft.currency,
        },
      });
      setNotice(`Updated live pricing for "${tour.titleEn}".`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tour price");
    } finally {
      setSavingTourId(null);
    }
  };

  const openCreatePromo = () => {
    setEditingPromoId(null);
    setPromoForm({
      titleKa: "",
      titleEn: "",
      code: "",
      discountType: "percentage",
      discountValue: "10",
      currency: "GEL",
      tourId: "",
      startDate: toInputDate(),
      endDate: defaultEndDate(),
      active: true,
    });
    setPromoFormError("");
    setPromoModalOpen(true);
  };

  const openEditPromo = (promo: PromotionRecord) => {
    setEditingPromoId(promo.id);
    setPromoForm({
      titleKa: promo.titleKa,
      titleEn: promo.titleEn,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      currency: promo.currency || "GEL",
      tourId: promo.tourId ? String(promo.tourId) : "",
      startDate: toInputDate(promo.startDate),
      endDate: toInputDate(promo.endDate),
      active: promo.active,
    });
    setPromoFormError("");
    setPromoModalOpen(true);
  };

  const handleSavePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoFormError("");

    const val = Number(promoForm.discountValue);
    if (!Number.isFinite(val) || val <= 0) {
      setPromoFormError("Discount value must be greater than zero.");
      return;
    }
    if (promoForm.discountType === "percentage" && val > 90) {
      setPromoFormError("Percentage discount cannot exceed 90%.");
      return;
    }
    const start = new Date(`${promoForm.startDate}T00:00:00.000Z`);
    const end = new Date(`${promoForm.endDate}T23:59:59.000Z`);
    if (end <= start) {
      setPromoFormError("Promotion end date must be on or after the start date.");
      return;
    }

    setPromoSaving(true);
    try {
      const payload = {
        titleKa: promoForm.titleKa.trim(),
        titleEn: promoForm.titleEn.trim(),
        code: promoForm.code.trim().toUpperCase(),
        discountType: promoForm.discountType,
        discountValue: val,
        currency: promoForm.currency,
        tourId: promoForm.tourId ? Number(promoForm.tourId) : null,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        active: promoForm.active,
      };

      if (editingPromoId) {
        await adminFetch(`/api/admin/promotions/${editingPromoId}`, {
          method: "PUT",
          body: payload,
        });
        setNotice("Promotion updated.");
      } else {
        await adminFetch("/api/admin/promotions", {
          method: "POST",
          body: payload,
        });
        setNotice("Promotional offer created.");
      }
      setPromoModalOpen(false);
      await loadAll();
    } catch (err) {
      setPromoFormError(err instanceof Error ? err.message : "Failed to save promotion");
    } finally {
      setPromoSaving(false);
    }
  };

  const handleTogglePromo = async (promo: PromotionRecord) => {
    try {
      await adminFetch(`/api/admin/promotions/${promo.id}`, {
        method: "PUT",
        body: { active: !promo.active },
      });
      setNotice(`Promotion "${promo.titleEn}" ${!promo.active ? "activated" : "deactivated"}.`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle promotion");
    }
  };

  const confirmDeletePromo = async () => {
    if (!deletePromoTarget) return;
    try {
      await adminFetch(`/api/admin/promotions/${deletePromoTarget.id}`, {
        method: "DELETE",
      });
      setNotice(`Deleted promotion "${deletePromoTarget.titleEn}".`);
      setDeletePromoTarget(null);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete promotion");
    }
  };

  const getPromoLifecycle = (promo: PromotionRecord) => {
    const now = Date.now();
    const start = new Date(promo.startDate).getTime();
    const end = new Date(promo.endDate).getTime();
    if (end < now) return { label: "Expired", color: "text-amber-700", dot: "bg-amber-500" };
    if (!promo.active) return { label: "Inactive", color: "text-slate-500", dot: "bg-slate-400" };
    if (start > now) return { label: "Scheduled", color: "text-sky-700", dot: "bg-sky-500" };
    return { label: "Live Offer", color: "text-emerald-800", dot: "bg-emerald-600" };
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading pricing matrix, promotions, and audit logs...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Pricing & Promotional Offers
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Update tour prices, currencies, and time-boxed percentage or fixed-amount promotions
            with automatic expiration.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreatePromo}
          className="px-4 py-2 text-sm font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Promotion
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

      {/* Section 1: Promotional Offers */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-800" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Promotional Campaigns ({promotions.length})
          </h2>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {promotions.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No promotional campaigns created yet. Click &ldquo;New Promotion&rdquo; to launch a
              percentage or fixed discount.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Scope</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {promotions.map((promo) => {
                    const status = getPromoLifecycle(promo);
                    const targetTour = promo.tourId
                      ? tours.find((t) => t.id === promo.tourId)
                      : null;
                    return (
                      <tr key={promo.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{promo.titleEn}</div>
                          <div className="text-xs text-slate-500">
                            {promo.titleKa}
                            {promo.code ? ` · Code: ${promo.code}` : ""}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-700">
                          {targetTour ? targetTour.titleEn : "All Published Tours"}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-900 tabular-nums whitespace-nowrap">
                          {promo.discountType === "percentage"
                            ? `-${promo.discountValue}%`
                            : `-${promo.discountValue} ${promo.currency}`}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {toInputDate(promo.startDate)} → {toInputDate(promo.endDate)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium ${status.color}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleTogglePromo(promo)}
                              title={promo.active ? "Deactivate" : "Activate"}
                              className="p-1.5 text-slate-500 hover:text-emerald-800 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditPromo(promo)}
                              title="Edit promotion"
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletePromoTarget(promo)}
                              title="Delete promotion"
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Quick Tour Price Matrix */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
          Direct Tour Price & Currency Matrix
        </h2>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Tour</th>
                  <th className="py-3 px-4">Base Price</th>
                  <th className="py-3 px-4">Direct Discount Price</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4 text-right">Live Public Price</th>
                  <th className="py-3 px-4 text-right">Save</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {tours.map((tour) => {
                  const draft = drafts[tour.id] || {
                    price: String(tour.price),
                    discountedPrice:
                      tour.discountedPrice !== null ? String(tour.discountedPrice) : "",
                    currency: tour.currency,
                  };
                  const effective = tour.effectivePrice ?? tour.discountedPrice ?? tour.price;
                  return (
                    <tr key={tour.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{tour.titleEn}</div>
                        <div className="text-xs text-slate-500">
                          {tour.titleKa} · {tour.published ? "Published" : "Draft"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draft.price}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [tour.id]: { ...draft, price: e.target.value },
                            }))
                          }
                          className="w-28 px-2.5 py-1.5 text-sm border border-slate-300 rounded-md tabular-nums"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draft.discountedPrice}
                          placeholder="Optional"
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [tour.id]: { ...draft, discountedPrice: e.target.value },
                            }))
                          }
                          className="w-28 px-2.5 py-1.5 text-sm border border-slate-300 rounded-md tabular-nums"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={draft.currency}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [tour.id]: { ...draft, currency: e.target.value },
                            }))
                          }
                          className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                        >
                          <option value="GEL">GEL</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {effective} {tour.currency}
                        </span>
                        {effective < tour.price && (
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            {tour.price}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={savingTourId === tour.id}
                          onClick={() => void handleSaveTourPrice(tour)}
                          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {savingTourId === tour.id ? "Saving..." : "Update"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Price Change History */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Recent Price Audit History
          </h2>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No price modifications logged yet. Updates above are automatically recorded here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-4">Tour</th>
                    <th className="py-2.5 px-4 text-right">Base Price Change</th>
                    <th className="py-2.5 px-4 text-right">Discounted Price</th>
                    <th className="py-2.5 px-4">Updated By</th>
                    <th className="py-2.5 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {history.slice(0, 15).map((item) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{item.tourTitle}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-700">
                        {item.previousPrice !== null ? `${item.previousPrice} → ` : ""}
                        <strong className="text-slate-900">
                          {item.newPrice} {item.currency}
                        </strong>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums text-slate-600">
                        {item.newDiscountedPrice !== null
                          ? `${item.newDiscountedPrice} ${item.currency}`
                          : "None"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {item.changedByEmail || "admin"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-500 tabular-nums">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Promotion Modal */}
      {promoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingPromoId ? "Edit Promotional Campaign" : "Create Promotional Campaign"}
              </h3>
              <button
                type="button"
                onClick={() => setPromoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {promoFormError && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {promoFormError}
              </div>
            )}

            <form onSubmit={handleSavePromotion} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Title (Georgian) *
                  </label>
                  <input
                    type="text"
                    value={promoForm.titleKa}
                    onChange={(e) => setPromoForm({ ...promoForm, titleKa: e.target.value })}
                    placeholder="საზაფხულო აქცია"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Title (English) *
                  </label>
                  <input
                    type="text"
                    value={promoForm.titleEn}
                    onChange={(e) => setPromoForm({ ...promoForm, titleEn: e.target.value })}
                    placeholder="Summer Early Bird"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        discountType: e.target.value === "fixed" ? "fixed" : "percentage",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={promoForm.code}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })
                    }
                    placeholder="SAQO15"
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applies To
                  </label>
                  <select
                    value={promoForm.tourId}
                    onChange={(e) => setPromoForm({ ...promoForm, tourId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">All Published Tours</option>
                    {tours.map((t) => (
                      <option key={t.id} value={String(t.id)}>
                        {t.titleEn} ({t.price} {t.currency})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency (for fixed discount)
                  </label>
                  <select
                    value={promoForm.currency}
                    onChange={(e) => setPromoForm({ ...promoForm, currency: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="GEL">GEL</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={promoForm.startDate}
                    onChange={(e) => setPromoForm({ ...promoForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date (Auto-expires) *
                  </label>
                  <input
                    type="date"
                    value={promoForm.endDate}
                    onChange={(e) => setPromoForm({ ...promoForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoForm.active}
                  onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-900"
                />
                Campaign active immediately within scheduled window
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPromoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={promoSaving}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                >
                  {promoSaving ? "Saving..." : editingPromoId ? "Save Changes" : "Create Campaign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Promo Confirmation */}
      {deletePromoTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete Promotional Campaign?</h3>
            <p className="text-sm text-slate-600">
              Remove <strong>{deletePromoTarget.titleEn}</strong>? Affected tours will immediately
              revert to their standard or direct discounted price.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletePromoTarget(null)}
                className="px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeletePromo()}
                className="px-3.5 py-2 text-xs font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 cursor-pointer"
              >
                Delete Promotion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
