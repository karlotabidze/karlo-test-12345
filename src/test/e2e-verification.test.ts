// @vitest-environment node
import { afterAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { JSDOM } from "jsdom";
import { eq } from "drizzle-orm";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Response, NextFunction } from "express";

import { db } from "../db/index.ts";
import { ensureDatabaseSeeded } from "../db/seed.ts";
import {
  cities,
  countries,
  destinations,
  flightRoutes,
  mediaAssets,
  promotions,
  siteContent,
  tours,
  users,
} from "../db/schema.ts";
import {
  AppError,
  createCity,
  createCountry,
  createDestination,
  createFlightRoute,
  createMediaAsset,
  createPromotion,
  createTour,
  deleteCity,
  deleteCountry,
  deleteDestination,
  deleteFlightRoute,
  deleteMediaAssetRecord,
  deletePromotion,
  deleteTour,
  getAdminOverviewData,
  getMainSiteContent,
  getPublicBootstrapData,
  listPriceHistory,
  propagateMediaUrlReplacement,
  updateCity,
  updateFlightRoute,
  updateMediaAsset,
  updateTour,
  upsertMainSiteContent,
} from "../db/repository.ts";
import { adminAuth } from "../lib/firebase-admin.ts";
import { isAllowlistedAdminEmail, requireAuth, type AuthRequest } from "../middleware/auth.ts";
import { removeStoredImage, storeUploadedImage, validateImageUpload } from "../lib/storage.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const uploadsDir = path.join(rootDir, "uploads");
const DEV_SERVER_URL = "http://127.0.0.1:3000";

const createdIds = {
  promotionIds: [] as number[],
  tourIds: [] as number[],
  destinationIds: [] as number[],
  cityIds: [] as number[],
  countryIds: [] as number[],
  flightIds: [] as number[],
  mediaIds: [] as number[],
  userUids: [] as string[],
};

afterAll(async () => {
  for (const id of createdIds.promotionIds) {
    await db
      .delete(promotions)
      .where(eq(promotions.id, id))
      .catch(() => undefined);
  }
  for (const id of createdIds.tourIds) {
    await db
      .delete(tours)
      .where(eq(tours.id, id))
      .catch(() => undefined);
  }
  for (const id of createdIds.destinationIds) {
    await db
      .delete(destinations)
      .where(eq(destinations.id, id))
      .catch(() => undefined);
  }
  for (const id of createdIds.cityIds) {
    await db
      .delete(cities)
      .where(eq(cities.id, id))
      .catch(() => undefined);
  }
  for (const id of createdIds.countryIds) {
    await db
      .delete(countries)
      .where(eq(countries.id, id))
      .catch(() => undefined);
  }
  for (const id of createdIds.flightIds) {
    await db
      .delete(flightRoutes)
      .where(eq(flightRoutes.id, id))
      .catch(() => undefined);
  }
  for (const id of createdIds.mediaIds) {
    await db
      .delete(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .catch(() => undefined);
  }
  for (const uid of createdIds.userUids) {
    await db
      .delete(users)
      .where(eq(users.uid, uid))
      .catch(() => undefined);
  }
});

describe("SaqoTravel Full End-to-End Verification Suite", () => {
  it("1. Connects to PostgreSQL and verifies all seeded tables and relational links", async () => {
    await ensureDatabaseSeeded();
    const overview = await getAdminOverviewData();

    expect(overview.counts.totalTours).toBeGreaterThanOrEqual(8);
    expect(overview.counts.activeTours).toBeGreaterThanOrEqual(8);
    expect(overview.counts.totalFlightRoutes).toBeGreaterThanOrEqual(112);
    expect(overview.counts.totalDestinations).toBeGreaterThanOrEqual(8);
    expect(overview.counts.totalCountries).toBeGreaterThanOrEqual(37);
    expect(overview.counts.totalCities).toBeGreaterThanOrEqual(10);

    const mainContent = await getMainSiteContent();
    expect(mainContent).not.toBeNull();
    expect(mainContent?.sectionKey).toBe("main");
  });

  it("2. Enforces Google Authentication & strict Administrator RBAC (401 & 403)", async () => {
    // Live HTTP checks without token and with invalid token
    const noTokenRes = await fetch(`${DEV_SERVER_URL}/api/admin/overview`);
    expect(noTokenRes.status).toBe(401);

    const badTokenRes = await fetch(`${DEV_SERVER_URL}/api/admin/session`, {
      headers: { Authorization: "Bearer malformed.invalid.token" },
    });
    expect(badTokenRes.status).toBe(401);

    // Allowlist helper checks
    expect(isAllowlistedAdminEmail("karlotabidze@gmail.com")).toBe(true);
    expect(isAllowlistedAdminEmail("KARLOTABIDZE@GMAIL.COM")).toBe(true);
    expect(isAllowlistedAdminEmail("unauthorized.visitor@gmail.com")).toBe(false);

    // Test requireAuth middleware with a valid Firebase token from an UNAUTHORIZED Google account
    const verifySpy = vi.spyOn(adminAuth, "verifyIdToken");
    const strangerUid = `test-stranger-${Date.now()}`;
    createdIds.userUids.push(strangerUid);

    verifySpy.mockResolvedValueOnce({
      uid: strangerUid,
      email: "unauthorized.visitor@gmail.com",
      email_verified: true,
    } as unknown as DecodedIdToken);

    let statusCode = 200;
    let jsonPayload: unknown = null;
    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: unknown) {
        jsonPayload = body;
        return this;
      },
    } as unknown as Response;
    const nextFn = vi.fn() as unknown as NextFunction;

    await requireAuth(
      { headers: { authorization: "Bearer simulated-valid-google-token" } } as AuthRequest,
      mockRes,
      nextFn,
    );

    expect(statusCode).toBe(403);
    expect(nextFn).not.toHaveBeenCalled();
    expect(JSON.stringify(jsonPayload)).toContain("Forbidden");

    // Confirm unauthorized user was stored with role = 'viewer', NOT 'admin'
    const [strangerRow] = await db.select().from(users).where(eq(users.uid, strangerUid));
    expect(strangerRow?.role).toBe("viewer");

    // Test requireAuth with authorized owner account (karlotabidze@gmail.com)
    const ownerUid = `test-owner-${Date.now()}`;
    createdIds.userUids.push(ownerUid);
    verifySpy.mockResolvedValueOnce({
      uid: ownerUid,
      email: "karlotabidze@gmail.com",
      email_verified: true,
    } as unknown as DecodedIdToken);

    const ownerNext = vi.fn() as unknown as NextFunction;
    await requireAuth(
      { headers: { authorization: "Bearer simulated-owner-google-token" } } as AuthRequest,
      mockRes,
      ownerNext,
    );
    expect(ownerNext).toHaveBeenCalledTimes(1);

    const [ownerRow] = await db.select().from(users).where(eq(users.uid, ownerUid));
    expect(ownerRow?.role).toBe("admin");

    verifySpy.mockRestore();
  });

  it("3 & 4. Executes full CRUD across all modules and verifies immediate live sync on /api/public/bootstrap", async () => {
    const suffix = Date.now();

    // A. Country & City CRUD + Referential Integrity Protection
    const country = await createCountry({
      code: `T${String(suffix).slice(-3)}`,
      nameKa: "სატესტო ქვეყანა",
      nameEn: `Test Country ${suffix}`,
      descriptionKa: "აღწერა",
      descriptionEn: "Description",
      imageUrl: "",
      featured: true,
      published: true,
    });
    expect(country).toBeDefined();
    createdIds.countryIds.push(country!.id);

    const city = await createCity({
      countryId: country!.id,
      slug: `test-city-${suffix}`,
      nameKa: "სატესტო ქალაქი",
      nameEn: `Test City ${suffix}`,
      descriptionKa: "",
      descriptionEn: "",
      imageUrl: "",
      airportCode: "TST",
      featured: false,
      published: true,
    });
    expect(city).toBeDefined();
    createdIds.cityIds.push(city!.id);

    // B. Destination CRUD with Google Maps Place ID & Coordinates
    const destination = await createDestination({
      slug: `test-dest-${suffix}`,
      nameKa: "სატესტო მიმართულება",
      nameEn: `Test Destination ${suffix}`,
      descriptionKa: "აღწერა",
      descriptionEn: "Destination description",
      countryId: country!.id,
      cityId: city!.id,
      mainImage: "/src/assets/images/georgia_country_cover_1793733037468.jpg",
      gallery: [],
      googlePlaceId: "ChIJa2JP5tcMREARo5_testPlaceId",
      formattedAddress: "Rustaveli Ave, Tbilisi, Georgia",
      latitude: 41.6938,
      longitude: 44.8015,
      featured: true,
      published: true,
    });
    expect(destination?.googlePlaceId).toBe("ChIJa2JP5tcMREARo5_testPlaceId");
    createdIds.destinationIds.push(destination!.id);

    // Verify accidental deletion of Country & City is blocked with 409 + dependency names
    await expect(deleteCountry(country!.id)).rejects.toMatchObject({
      statusCode: 409,
    });
    try {
      await deleteCity(city!.id);
      expect.fail("Expected deleteCity to throw 409 AppError");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBe(409);
      expect(((err as AppError).dependencies || []).join(" ")).toContain(destination!.nameEn);
    }

    // C. Tour CRUD + Immediate Live Public Visibility
    const tourSlug = `e2e-tour-${suffix}`;
    const tour = await createTour(
      {
        slug: tourSlug,
        titleKa: "სატესტო ტური",
        titleEn: `E2E Verification Tour ${suffix}`,
        descriptionKa: "სატესტო აღწერა",
        descriptionEn: "E2E verification description",
        category: "gastronomy",
        categoryKa: "გასტრონომია",
        countryId: country!.id,
        cityId: city!.id,
        destinationId: destination!.id,
        cityNameKa: city!.nameKa,
        cityNameEn: city!.nameEn,
        mainImage: "/src/assets/images/hero_georgia_caucasus_1793733036447.jpg",
        gallery: ["/src/assets/images/hero_georgia_caucasus_1793733036447.jpg"],
        price: 300,
        discountedPrice: null,
        currency: "GEL",
        durationDays: 3,
        highlightsKa: ["ღვინის დეგუსტაცია"],
        highlightsEn: ["Wine tasting"],
        itineraryKa: ["დღე 1: ჩასვლა"],
        itineraryEn: ["Day 1: Arrival"],
        includedKa: ["ტრანსფერი"],
        includedEn: ["Transfer"],
        excludedKa: ["ფრენა"],
        excludedEn: ["Flights"],
        importantInfoKa: "პასპორტი",
        importantInfoEn: "Valid passport",
        departureInfoKa: "09:00",
        departureInfoEn: "09:00 AM",
        returnInfoKa: "20:00",
        returnInfoEn: "08:00 PM",
        availabilityStatus: "available",
        published: true,
        featured: true,
        partnerBookingUrl: "https://example.com/book",
        seoTitleKa: "SEO KA",
        seoTitleEn: "SEO EN",
        seoDescriptionKa: "SEO Desc KA",
        seoDescriptionEn: "SEO Desc EN",
      },
      "karlotabidze@gmail.com",
    );
    expect(tour).toBeDefined();
    createdIds.tourIds.push(tour!.id);

    // Fetch live /api/public/bootstrap over HTTP -> tour & destination MUST appear immediately
    const pubRes1 = await fetch(`${DEV_SERVER_URL}/api/public/bootstrap`);
    expect(pubRes1.status).toBe(200);
    const pubData1 = (await pubRes1.json()) as {
      tours: Array<{ slug: string; effectivePrice: number; cityNameEn: string }>;
      destinations: Array<{ slug: string }>;
      countries: Array<{ id: number }>;
      cities: Array<{ id: number }>;
      flights: Array<{ id: number; arrivalAirport: string }>;
    };
    expect(pubData1.tours.some((t) => t.slug === tourSlug)).toBe(true);
    expect(pubData1.destinations.some((d) => d.slug === destination!.slug)).toBe(true);
    expect(pubData1.countries.some((c) => c.id === country!.id)).toBe(true);
    expect(pubData1.cities.some((c) => c.id === city!.id)).toBe(true);

    // Rename City -> verify denormalized cityNameEn on Tour syncs automatically
    await updateCity(city!.id, { nameEn: `Renamed City ${suffix}` });
    const pubAfterCityRename = await getPublicBootstrapData();
    const syncedTour = pubAfterCityRename.tours.find((t) => t.slug === tourSlug);
    expect(syncedTour?.cityNameEn).toBe(`Renamed City ${suffix}`);

    // Unpublish Tour -> MUST immediately disappear from public bootstrap
    await updateTour(tour!.id, { published: false }, "karlotabidze@gmail.com");
    const pubResUnpub = await fetch(`${DEV_SERVER_URL}/api/public/bootstrap`);
    const pubDataUnpub = (await pubResUnpub.json()) as { tours: Array<{ slug: string }> };
    expect(pubDataUnpub.tours.some((t) => t.slug === tourSlug)).toBe(false);

    // Re-publish Tour
    await updateTour(tour!.id, { published: true }, "karlotabidze@gmail.com");

    // D. Pricing Validation, Promotions & Auto-Expiration + Price Audit History
    await expect(
      updateTour(tour!.id, { price: -20 }, "karlotabidze@gmail.com"),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      updateTour(tour!.id, { discountedPrice: 350 }, "karlotabidze@gmail.com"),
    ).rejects.toMatchObject({ statusCode: 400 });

    await updateTour(tour!.id, { discountedPrice: 260 }, "karlotabidze@gmail.com");
    const historyRows = await listPriceHistory();
    expect(historyRows.some((h) => h.tourId === tour!.id && h.newDiscountedPrice === 260)).toBe(
      true,
    );

    // Create 20% promotion -> effectivePrice becomes 240 (20% off 300 < 260)
    const now = Date.now();
    const promo = await createPromotion({
      titleKa: "20% აქცია",
      titleEn: "20% Flash Promo",
      code: "FLASH20",
      discountType: "percentage",
      discountValue: 20,
      currency: "GEL",
      tourId: tour!.id,
      startDate: new Date(now - 60_000),
      endDate: new Date(now + 3600_000),
      active: true,
    });
    createdIds.promotionIds.push(promo!.id);

    const pubResPromo = await fetch(`${DEV_SERVER_URL}/api/public/bootstrap`);
    const pubDataPromo = (await pubResPromo.json()) as {
      tours: Array<{
        slug: string;
        effectivePrice: number;
        hasDiscount: boolean;
        promotionTitleEn: string | null;
      }>;
    };
    const promoTour = pubDataPromo.tours.find((t) => t.slug === tourSlug);
    expect(promoTour?.effectivePrice).toBe(240);
    expect(promoTour?.hasDiscount).toBe(true);
    expect(promoTour?.promotionTitleEn).toBe("20% Flash Promo");

    // Simulate promotion expiration -> auto-deactivates on public fetch and reverts to 260
    await db
      .update(promotions)
      .set({ endDate: new Date(now - 5_000) })
      .where(eq(promotions.id, promo!.id));

    const pubAfterExpiry = await getPublicBootstrapData();
    const revertedTour = pubAfterExpiry.tours.find((t) => t.slug === tourSlug);
    expect(revertedTour?.effectivePrice).toBe(260);
    const [expiredPromoRow] = await db
      .select()
      .from(promotions)
      .where(eq(promotions.id, promo!.id));
    expect(expiredPromoRow?.active).toBe(false);

    // E. Flight Route CRUD + Active/Inactive Sync + Live Flight Separation
    const flight = await createFlightRoute({
      departureAirport: "TBS",
      arrivalAirport: "ZRH",
      departureCityKa: "თბილისი",
      departureCityEn: "Tbilisi",
      arrivalCityKa: "ციურიხი",
      arrivalCityEn: "Zurich",
      arrivalCountryKa: "შვეიცარია",
      arrivalCountryEn: "Switzerland",
      airlineName: "Swiss",
      airlineLogo: "",
      routeDescriptionKa: "პირდაპირი",
      routeDescriptionEn: "Direct",
      partnerBookingUrl: "https://swiss.com",
      price: 195,
      currency: "EUR",
      routeImage: "",
      active: true,
      isManual: true,
    });
    createdIds.flightIds.push(flight!.id);

    const pubWithFlight = await getPublicBootstrapData();
    expect(pubWithFlight.flights.some((f) => f.id === flight!.id)).toBe(true);

    await updateFlightRoute(flight!.id, { active: false });
    const pubWithoutFlight = await getPublicBootstrapData();
    expect(pubWithoutFlight.flights.some((f) => f.id === flight!.id)).toBe(false);

    const liveFlightRes = await fetch(`${DEV_SERVER_URL}/api/public/flights/live?from=TBS&to=ZRH`);
    expect(liveFlightRes.status).toBe(200);
    const liveFlightJson = (await liveFlightRes.json()) as { liveAvailable: boolean };
    expect(typeof liveFlightJson.liveAvailable).toBe("boolean");

    // F. Website Content CMS update & restore
    const originalContent = await getMainSiteContent();
    expect(originalContent).not.toBeNull();
    await upsertMainSiteContent(
      { heroEyebrowEn: "Verified Live CMS Eyebrow" },
      "karlotabidze@gmail.com",
    );
    const pubWithCms = await fetch(`${DEV_SERVER_URL}/api/public/bootstrap`).then((r) => r.json());
    expect(pubWithCms.siteContent.heroEyebrowEn).toBe("Verified Live CMS Eyebrow");

    // Restore original heroEyebrowEn
    await upsertMainSiteContent(
      { heroEyebrowEn: originalContent!.heroEyebrowEn },
      originalContent!.updatedByEmail || "system",
    );

    // G. Clean orderly deletion
    await deletePromotion(promo!.id);
    createdIds.promotionIds = createdIds.promotionIds.filter((id) => id !== promo!.id);
    await deleteFlightRoute(flight!.id);
    createdIds.flightIds = createdIds.flightIds.filter((id) => id !== flight!.id);
    await deleteTour(tour!.id);
    createdIds.tourIds = createdIds.tourIds.filter((id) => id !== tour!.id);
    await deleteDestination(destination!.id);
    createdIds.destinationIds = createdIds.destinationIds.filter((id) => id !== destination!.id);
    await deleteCity(city!.id);
    createdIds.cityIds = createdIds.cityIds.filter((id) => id !== city!.id);
    await deleteCountry(country!.id);
    createdIds.countryIds = createdIds.countryIds.filter((id) => id !== country!.id);
  });

  it("5. Validates image uploads, local/Supabase storage handling, and URL replacement propagation", async () => {
    // Reject non-image MIME and >8MB size
    expect(() => validateImageUpload("application/pdf", 1024)).toThrow();
    expect(() => validateImageUpload("image/png", 9 * 1024 * 1024)).toThrow();

    // Valid 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );

    const stored1 = await storeUploadedImage({
      buffer: pngBuffer,
      originalName: "test-cover.png",
      mimeType: "image/png",
      entityType: "tour",
      uploadsRootDir: uploadsDir,
    });
    expect(stored1.url).toMatch(/^\/uploads\/tour\/test-cover-.*\.png$/);

    // Confirm static Express route serves the uploaded image with HTTP 200
    const imgHttp1 = await fetch(`${DEV_SERVER_URL}${stored1.url}`);
    expect(imgHttp1.status).toBe(200);
    expect(imgHttp1.headers.get("content-type")).toContain("image/png");

    const mediaRow = await createMediaAsset({
      fileName: stored1.fileName,
      url: stored1.url,
      storagePath: stored1.storagePath,
      storageProvider: stored1.storageProvider,
      mimeType: "image/png",
      sizeBytes: pngBuffer.byteLength,
      entityType: "tour",
      altTextKa: "ტესტ ფოტო",
      altTextEn: "Test Photo",
      isMain: true,
    });
    createdIds.mediaIds.push(mediaRow!.id);

    // Attach this image URL to a temporary tour and test replacement propagation
    const tempTour = await createTour(
      {
        slug: `media-prop-tour-${Date.now()}`,
        titleKa: "ფოტოს ტესტი",
        titleEn: "Media Propagation Tour",
        descriptionKa: "აღწერა",
        descriptionEn: "Desc",
        cityNameKa: "თბილისი",
        cityNameEn: "Tbilisi",
        mainImage: stored1.url,
        gallery: [stored1.url],
        price: 150,
        currency: "GEL",
        durationDays: 1,
        published: false,
      },
      "karlotabidze@gmail.com",
    );
    createdIds.tourIds.push(tempTour!.id);

    // Replace stored image file
    const stored2 = await storeUploadedImage({
      buffer: pngBuffer,
      originalName: "replaced-cover.png",
      mimeType: "image/png",
      entityType: "tour",
      uploadsRootDir: uploadsDir,
    });
    await removeStoredImage({
      storagePath: stored1.storagePath,
      storageProvider: stored1.storageProvider,
      uploadsRootDir: uploadsDir,
    });
    await updateMediaAsset(mediaRow!.id, {
      fileName: stored2.fileName,
      url: stored2.url,
      storagePath: stored2.storagePath,
      storageProvider: stored2.storageProvider,
    });
    await propagateMediaUrlReplacement(stored1.url, stored2.url);

    // Old URL returns 404, new URL returns 200, and Tour mainImage + gallery updated automatically!
    const oldImgRes = await fetch(`${DEV_SERVER_URL}${stored1.url}`);
    expect(oldImgRes.status).toBe(404);
    const newImgRes = await fetch(`${DEV_SERVER_URL}${stored2.url}`);
    expect(newImgRes.status).toBe(200);

    const [updatedTourRow] = await db.select().from(tours).where(eq(tours.id, tempTour!.id));
    expect(updatedTourRow?.mainImage).toBe(stored2.url);
    expect(updatedTourRow?.gallery[0]).toBe(stored2.url);

    // Clean up temporary tour & media file
    await deleteTour(tempTour!.id);
    createdIds.tourIds = createdIds.tourIds.filter((id) => id !== tempTour!.id);
    await removeStoredImage({
      storagePath: stored2.storagePath,
      storageProvider: stored2.storageProvider,
      uploadsRootDir: uploadsDir,
    });
    await deleteMediaAssetRecord(mediaRow!.id);
    createdIds.mediaIds = createdIds.mediaIds.filter((id) => id !== mediaRow!.id);
  });

  it("6. Verifies Google Maps JavaScript API & Places API (New) compliance and Demo Key wiring", async () => {
    const pickerSource = await fs.readFile(
      path.join(rootDir, "src/admin/components/GoogleMapLocationPicker.tsx"),
      "utf-8",
    );
    const adminAppSource = await fs.readFile(path.join(rootDir, "src/admin/AdminApp.tsx"), "utf-8");
    const mainSource = await fs.readFile(path.join(rootDir, "src/admin/main.tsx"), "utf-8");

    // Modern SDK & Places API (New) checks
    expect(pickerSource).toContain("@vis.gl/react-google-maps");
    expect(pickerSource).toContain("AutocompleteSuggestion.fetchAutocompleteSuggestions");
    expect(pickerSource).toContain("AutocompleteSessionToken");
    expect(pickerSource).toContain("place.fetchFields");
    expect(pickerSource).toContain('mapId="DEMO_MAP_ID"');
    expect(pickerSource).toContain(
      'internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}',
    );

    // Prohibited legacy APIs must NOT appear
    expect(pickerSource).not.toContain("PlacesService");
    expect(pickerSource).not.toContain("DirectionsService");
    expect(pickerSource).not.toContain("new google.maps.Marker");

    // Two-tier Demo Key Quota Defense checks
    expect(mainSource).toContain("gm_authFailure");
    expect(mainSource).toContain("OverQuotaMapError");
    expect(adminAppSource).toContain("gmp-quota-exceeded");
  });

  it("8. Verifies public Georgian/English storefront, filters, flight search, and phone inquiry validation", async () => {
    const html = await fs.readFile(path.join(rootDir, "index.html"), "utf-8");
    const appJs = await fs.readFile(path.join(rootDir, "app.js"), "utf-8");
    const bootstrapRes = await fetch(`${DEV_SERVER_URL}/api/public/bootstrap`);
    const bootstrapPayload = await bootstrapRes.json();

    const dom = new JSDOM(html, {
      url: `${DEV_SERVER_URL}/`,
      runScripts: "outside-only",
    });

    // Mock fetch & scrollIntoView inside JSDOM window
    dom.window.HTMLElement.prototype.scrollIntoView = () => undefined;
    (dom.window as unknown as Record<string, unknown>)["fetch"] = async (input: string) => {
      if (String(input).includes("/api/public/bootstrap")) {
        return {
          ok: true,
          json: async () => bootstrapPayload,
        };
      }
      return { ok: false, json: async () => ({}) };
    };

    dom.window.eval(appJs);
    await new Promise((r) => setTimeout(r, 80));

    const doc = dom.window.document;
    expect(doc.documentElement.lang).toBe("ka");
    const initialCards = doc.querySelectorAll(".tour-card");
    expect(initialCards.length).toBe(8);

    // Switch to English
    (doc.getElementById("language-switch") as HTMLButtonElement).click();
    expect(doc.documentElement.lang).toBe("en");
    expect(doc.querySelector('[data-i18n="navTours"]')?.textContent).toBe("Georgia tours");
    expect(doc.querySelector('#filter-type option[value="gastronomy"]')?.textContent).toBe(
      "Gastronomy",
    );

    // Filter by Wine category
    const filterType = doc.getElementById("filter-type") as HTMLSelectElement;
    filterType.value = "wine";
    filterType.dispatchEvent(new dom.window.Event("change"));
    const wineCards = doc.querySelectorAll(".tour-card");
    expect(wineCards.length).toBeGreaterThan(0);
    expect(wineCards.length).toBeLessThan(8);

    // Reset filter & test Flight Search
    filterType.value = "";
    filterType.dispatchEvent(new dom.window.Event("change"));
    const flightFrom = doc.getElementById("flight-from") as HTMLSelectElement;
    const flightTo = doc.getElementById("flight-to") as HTMLSelectElement;
    expect(flightFrom.options.length).toBeGreaterThanOrEqual(3);
    expect(flightTo.options.length).toBeGreaterThan(0);

    // Test Georgian phone validation helper exposed in window scope
    const validFn = dom.window.eval("validGeorgianPhone") as (v: string) => boolean;
    expect(validFn("557 56 59 97")).toBe(true);
    expect(validFn("+995 557 56 59 97")).toBe(true);
    expect(validFn("12345")).toBe(false);
  });

  it("9. Verifies production build artifacts and NODE_ENV=production node server.ts startup", async () => {
    // Check compiled dist artifacts
    await expect(fs.access(path.join(rootDir, "dist/index.html"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, "dist/admin.html"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, "dist/app.js"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rootDir, "dist/styles.css"))).resolves.toBeUndefined();

    // Boot production server (`node server.ts`) on port 3099
    const prodPort = 3099;
    const proc = spawn("node", ["server.ts"], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: "production", PORT: String(prodPort) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timed out waiting for production server on 3099")),
          8000,
        );
        proc.stdout.on("data", (chunk: Buffer) => {
          if (chunk.toString().includes(`:${prodPort}`)) {
            clearTimeout(timeout);
            resolve();
          }
        });
        proc.stderr.on("data", (chunk: Buffer) => {
          const errStr = chunk.toString();
          if (errStr.includes("Error:")) {
            clearTimeout(timeout);
            reject(new Error(errStr));
          }
        });
      });

      const homeRes = await fetch(`http://127.0.0.1:${prodPort}/`);
      expect(homeRes.status).toBe(200);
      const adminRes = await fetch(`http://127.0.0.1:${prodPort}/admin`);
      expect(adminRes.status).toBe(200);
      const adminHtml = await adminRes.text();
      expect(adminHtml).toContain("/assets/admin-");
      const guardRes = await fetch(`http://127.0.0.1:${prodPort}/api/admin/overview`);
      expect(guardRes.status).toBe(401);
    } finally {
      proc.kill("SIGTERM");
    }
  }, 15000);
});
