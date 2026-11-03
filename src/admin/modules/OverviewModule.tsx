import React, { useCallback, useEffect, useState } from "react";
import { RefreshCw, ArrowUpRight, Plus } from "lucide-react";
import { adminFetch } from "../api.ts";
import type { OverviewResponse } from "../types.ts";

interface OverviewModuleProps {
  onNavigate: (tab: string) => void;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const OverviewModule: React.FC<OverviewModuleProps> = ({ onNavigate }) => {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch<OverviewResponse>("/api/admin/overview");
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white border border-slate-200 rounded-lg animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
          <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-lg space-y-3">
        <p className="text-sm font-medium text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: "Total Destinations",
      value: data.counts.totalDestinations,
      target: "destinations",
      sub: "Curated places",
    },
    {
      label: "Total Countries",
      value: data.counts.totalCountries,
      target: "locations",
      sub: "Connected markets",
    },
    {
      label: "Total Cities",
      value: data.counts.totalCities,
      target: "locations",
      sub: "Mapped hubs",
    },
    {
      label: "Active Tours",
      value: data.counts.activeTours,
      target: "tours",
      sub: "Live on website",
    },
    {
      label: "Inactive Tours",
      value: data.counts.inactiveTours,
      target: "tours",
      sub: "Unpublished / draft",
    },
    {
      label: "Flight Routes",
      value: data.counts.totalFlightRoutes,
      target: "flights",
      sub: `${data.counts.activeFlightRoutes} active`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Marketplace Overview</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Live database statistics, pricing updates, and administrative audit activity.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadOverview()}
            className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => onNavigate("tours")}
            className="px-4 py-2 text-xs font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Manage Tours
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.target)}
            className="text-left p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span className="truncate">{item.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900">
              {item.value}
            </div>
            <div className="mt-1 text-xs text-slate-500 tabular-nums">{item.sub}</div>
          </button>
        ))}
      </div>

      {/* Recently Added Tours & Recently Updated Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recently Added Tours</h2>
            <button
              type="button"
              onClick={() => onNavigate("tours")}
              className="text-xs font-semibold text-emerald-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View all
            </button>
          </div>
          {data.recentTours.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No tours in database yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentTours.map((tour) => (
                <div
                  key={tour.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {tour.titleEn}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      <span>{tour.cityNameEn}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{tour.category}</span>
                      <span aria-hidden="true"> · </span>
                      <span className={tour.published ? "text-emerald-700" : "text-amber-700"}>
                        {tour.published ? "Published" : "Unpublished"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums text-xs shrink-0">
                    <div className="font-semibold text-slate-900">
                      {tour.price} {tour.currency}
                    </div>
                    <div className="text-slate-400">{tour.durationDays}d</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recently Updated Destinations</h2>
            <button
              type="button"
              onClick={() => onNavigate("destinations")}
              className="text-xs font-semibold text-emerald-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              View all
            </button>
          </div>
          {data.recentDestinations.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No destinations recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentDestinations.map((dest) => (
                <div
                  key={dest.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {dest.nameEn}{" "}
                      <span className="text-slate-400 font-normal">/ {dest.nameKa}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      <span>{dest.published ? "Published" : "Draft"}</span>
                      {dest.featured && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>Featured</span>
                        </>
                      )}
                      {dest.latitude !== null && dest.longitude !== null && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {dest.latitude.toFixed(3)}, {dest.longitude.toFixed(3)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums shrink-0">
                    {formatShortDate(dest.updatedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recently Changed Prices & Latest Administrative Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recently Changed Prices</h2>
            <button
              type="button"
              onClick={() => onNavigate("pricing")}
              className="text-xs font-semibold text-emerald-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Pricing & Promotions
            </button>
          </div>
          {data.recentPriceChanges.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No price changes logged yet. Update a tour price in Pricing or Tours to track history.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentPriceChanges.map((entry) => (
                <div
                  key={entry.id}
                  className="px-5 py-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {entry.tourTitle}
                    </div>
                    <div className="text-slate-500 truncate">
                      <span>{entry.changedByEmail || "Admin"}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">
                        {formatShortDate(entry.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums shrink-0">
                    <span className="text-slate-400">
                      {entry.previousPrice !== null ? `${entry.previousPrice} → ` : ""}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {entry.newPrice} {entry.currency}
                    </span>
                    {entry.newDiscountedPrice !== null && (
                      <div className="text-emerald-700">
                        Promo: {entry.newDiscountedPrice} {entry.currency}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Latest Administrative Activities
            </h2>
          </div>
          {data.recentActivities.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No administrative actions logged yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="px-5 py-3 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="min-w-0">
                    <div className="text-slate-900 font-medium truncate">
                      <span className="capitalize">{act.action}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{act.entityName}</span>
                    </div>
                    <div className="text-slate-500 truncate">
                      <span>{act.details || act.entityType}</span>
                      {act.actorEmail && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{act.actorEmail}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-slate-400 font-mono tabular-nums shrink-0">
                    {formatShortDate(act.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
