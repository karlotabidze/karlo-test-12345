import React, { useCallback, useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { adminFetch } from "../api.ts";
import type { SiteContentRecord } from "../types.ts";
import { SingleImageField } from "../components/ImageUploaderField.tsx";

const EMPTY_CONTENT: SiteContentRecord = {
  sectionKey: "main",
  heroEyebrowKa: "",
  heroEyebrowEn: "",
  heroTitleKa: "",
  heroTitleEn: "",
  heroDescriptionKa: "",
  heroDescriptionEn: "",
  heroImageUrl: "",
  heroSecondaryImageUrl: "",
  aboutEyebrowKa: "",
  aboutEyebrowEn: "",
  aboutTitleKa: "",
  aboutTitleEn: "",
  aboutDescriptionKa: "",
  aboutDescriptionEn: "",
  aboutImageUrl: "",
  contactEmail: "",
  contactPhone: "",
  whatsappNumber: "",
  seoTitleKa: "",
  seoTitleEn: "",
  seoDescriptionKa: "",
  seoDescriptionEn: "",
};

export const SiteContentModule: React.FC = () => {
  const [content, setContent] = useState<SiteContentRecord>(EMPTY_CONTENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch<SiteContentRecord>("/api/admin/site-content");
      setContent({ ...EMPTY_CONTENT, ...data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load website content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await adminFetch<SiteContentRecord>("/api/admin/site-content", {
        method: "PUT",
        body: content,
      });
      setContent({ ...EMPTY_CONTENT, ...updated });
      setNotice("Public website hero, about, contact, and SEO content saved and live.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save website content");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">Loading website CMS content...</div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            Website Content & SEO
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Edit homepage hero headlines, imagery, About section copy, contact channels, and search
            metadata in Georgian and English.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold bg-emerald-900 text-white rounded-md hover:bg-emerald-800 disabled:opacity-60 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? "Publishing..." : "Publish Content"}
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

      {/* Homepage Hero */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">Homepage Hero Banner</h2>
          <p className="text-xs text-slate-500">
            Above-the-fold headline, introductory copy, and showcase photography on `/`.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hero Eyebrow (Georgian)
            </label>
            <input
              type="text"
              value={content.heroEyebrowKa}
              onChange={(e) => setContent({ ...content, heroEyebrowKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hero Eyebrow (English)
            </label>
            <input
              type="text"
              value={content.heroEyebrowEn}
              onChange={(e) => setContent({ ...content, heroEyebrowEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hero Main Headline (Georgian)
            </label>
            <input
              type="text"
              value={content.heroTitleKa}
              onChange={(e) => setContent({ ...content, heroTitleKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hero Main Headline (English)
            </label>
            <input
              type="text"
              value={content.heroTitleEn}
              onChange={(e) => setContent({ ...content, heroTitleEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hero Description (Georgian)
            </label>
            <textarea
              rows={3}
              value={content.heroDescriptionKa}
              onChange={(e) => setContent({ ...content, heroDescriptionKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hero Description (English)
            </label>
            <textarea
              rows={3}
              value={content.heroDescriptionEn}
              onChange={(e) => setContent({ ...content, heroDescriptionEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <SingleImageField
            label="Primary Hero Showcase Image"
            value={content.heroImageUrl}
            entityType="site"
            onChange={(url) => setContent({ ...content, heroImageUrl: url })}
          />
          <SingleImageField
            label="Secondary Hero Accent Image"
            value={content.heroSecondaryImageUrl}
            entityType="site"
            onChange={(url) => setContent({ ...content, heroSecondaryImageUrl: url })}
          />
        </div>
      </section>

      {/* About Section */}
      <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-slate-900">About SaqoTravel Section</h2>
          <p className="text-xs text-slate-500">
            Brand story and editorial photography displayed in the `#about` section.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              About Eyebrow (Georgian)
            </label>
            <input
              type="text"
              value={content.aboutEyebrowKa}
              onChange={(e) => setContent({ ...content, aboutEyebrowKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              About Eyebrow (English)
            </label>
            <input
              type="text"
              value={content.aboutEyebrowEn}
              onChange={(e) => setContent({ ...content, aboutEyebrowEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              About Heading (Georgian)
            </label>
            <input
              type="text"
              value={content.aboutTitleKa}
              onChange={(e) => setContent({ ...content, aboutTitleKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              About Heading (English)
            </label>
            <input
              type="text"
              value={content.aboutTitleEn}
              onChange={(e) => setContent({ ...content, aboutTitleEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              About Description (Georgian)
            </label>
            <textarea
              rows={4}
              value={content.aboutDescriptionKa}
              onChange={(e) => setContent({ ...content, aboutDescriptionKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              About Description (English)
            </label>
            <textarea
              rows={4}
              value={content.aboutDescriptionEn}
              onChange={(e) => setContent({ ...content, aboutDescriptionEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <SingleImageField
          label="About Section Editorial Image"
          value={content.aboutImageUrl}
          entityType="site"
          onChange={(url) => setContent({ ...content, aboutImageUrl: url })}
        />
      </section>

      {/* Contact & Global SEO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Contact & Direct Channels</h2>
            <p className="text-xs text-slate-500">
              Email, phone, and WhatsApp links shown in the contact section and tour inquiry modals.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
            <input
              type="email"
              value={content.contactEmail}
              onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
              placeholder="info@saqotravel.ge"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Display Phone Number
            </label>
            <input
              type="text"
              value={content.contactPhone}
              onChange={(e) => setContent({ ...content, contactPhone: e.target.value })}
              placeholder="+995 555 00 00 00"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              WhatsApp Number (international digits)
            </label>
            <input
              type="text"
              value={content.whatsappNumber}
              onChange={(e) => setContent({ ...content, whatsappNumber: e.target.value })}
              placeholder="995555000000"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
        </section>

        <section className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Global SEO Metadata</h2>
            <p className="text-xs text-slate-500">
              Search engine title and meta description dynamically applied per active language.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              SEO Title (Georgian)
            </label>
            <input
              type="text"
              value={content.seoTitleKa}
              onChange={(e) => setContent({ ...content, seoTitleKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              SEO Title (English)
            </label>
            <input
              type="text"
              value={content.seoTitleEn}
              onChange={(e) => setContent({ ...content, seoTitleEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              SEO Meta Description (Georgian)
            </label>
            <textarea
              rows={2}
              value={content.seoDescriptionKa}
              onChange={(e) => setContent({ ...content, seoDescriptionKa: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              SEO Meta Description (English)
            </label>
            <textarea
              rows={2}
              value={content.seoDescriptionEn}
              onChange={(e) => setContent({ ...content, seoDescriptionEn: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </section>
      </div>

      {content.updatedAt && (
        <p className="text-xs text-slate-500 text-right tabular-nums">
          Last updated {new Date(content.updatedAt).toLocaleString()}
          {content.updatedByEmail ? ` by ${content.updatedByEmail}` : ""}
        </p>
      )}
    </form>
  );
};
