import express, { type Response, type NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

import { ensureDatabaseSeeded } from "./src/db/seed.ts";
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
  getMediaAssetById,
  getPublicBootstrapData,
  listCities,
  listCountries,
  listDestinations,
  listFlightRoutes,
  listMediaAssets,
  listPriceHistory,
  listPromotions,
  listTours,
  logAdminActivity,
  propagateMediaUrlReplacement,
  updateCity,
  updateCountry,
  updateDestination,
  updateFlightRoute,
  updateMediaAsset,
  updatePromotion,
  updateTour,
  upsertMainSiteContent,
} from "./src/db/repository.ts";
import { createAdminSession, getAdminCookieOptions, COOKIE_NAME, requireAuth, type AuthRequest } from "./src/middleware/auth.ts";
import { MAX_IMAGE_SIZE_BYTES, removeStoredImage, storeUploadedImage } from "./src/lib/storage.ts";

dotenv.config();

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(rootDir, "uploads");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 10,
  },
});

function handleRouteError(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
      dependencies: error.dependencies || [],
    });
    return;
  }
  const message = error instanceof Error ? error.message : fallbackMessage;
  res.status(500).json({ error: message || fallbackMessage });
}

function parseId(param: string | string[] | undefined): number {
  const raw = Array.isArray(param) ? param[0] : param;
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError("Invalid numeric record identifier", 400);
  }
  return num;
}

async function startServer() {
  await fs.mkdir(uploadsDir, { recursive: true });

  const app = express();
  app.use(express.json({ limit: "4mb" }));

  // Static media & legacy static assets
  app.use("/uploads", express.static(uploadsDir));
  app.use("/src/assets/images", express.static(path.join(rootDir, "src/assets/images")));
  app.use("/data", express.static(path.join(rootDir, "data")));

  // Ensure initial repository data is seeded lazily on first API request
  app.use("/api", async (req, res, next) => {
    if (req.path === "/admin/login" || req.path === "/admin/logout" || req.path === "/admin/session") {
      next();
      return;
    }
    try {
      await ensureDatabaseSeeded();
      next();
    } catch (error) {
      handleRouteError(res, error, "Database initialization failed");
    }
  });

  // =========================================================================
  // PUBLIC API ENDPOINTS
  // =========================================================================
  app.get("/api/public/bootstrap", async (_req, res) => {
    try {
      const payload = await getPublicBootstrapData();
      res.json(payload);
    } catch (error) {
      handleRouteError(res, error, "Failed to load travel marketplace data");
    }
  });

  // Separate Live Flight API endpoint (never overwrites or confuses manual flight routes)
  app.get("/api/public/flights/live", async (req, res) => {
    const aviationKey = process.env["AVIATIONSTACK_API_KEY"];
    const from = String(req.query["from"] || "").toUpperCase();
    const to = String(req.query["to"] || "").toUpperCase();

    if (!aviationKey || !from || !to) {
      res.json({ liveAvailable: false, flights: [] });
      return;
    }

    try {
      const apiUrl = new URL("http://api.aviationstack.com/v1/flights");
      apiUrl.searchParams.set("access_key", aviationKey);
      apiUrl.searchParams.set("dep_iata", from);
      apiUrl.searchParams.set("arr_iata", to);
      apiUrl.searchParams.set("limit", "10");

      const response = await fetch(apiUrl.toString());
      if (!response.ok) {
        res.json({ liveAvailable: false, flights: [] });
        return;
      }
      const json = (await response.json()) as { data?: unknown[] };
      res.json({
        liveAvailable: true,
        flights: Array.isArray(json.data) ? json.data : [],
      });
    } catch (error) {
      console.error("Live flight lookup error:", error);
      res.json({ liveAvailable: false, flights: [] });
    }
  });

  // =========================================================================
  // ADMIN API ENDPOINTS (password login + signed HttpOnly session cookie)
  // =========================================================================
  app.post("/api/admin/login", (req, res) => {
    const configuredPassword = process.env["ADMIN_PASSWORD"] || "";
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const allowedEmails = String(process.env["ADMIN_EMAILS"] || "karlotabidze@gmail.com")
      .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (!configuredPassword || configuredPassword.length < 12) {
      res.status(503).json({ error: "Admin login is not configured. Set ADMIN_PASSWORD in Render." });
      return;
    }
    const supplied = Buffer.from(password);
    const expected = Buffer.from(configuredPassword);
    const passwordMatches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
    if (!allowedEmails.includes(email) || !passwordMatches) {
      res.status(401).json({ error: "Invalid administrator email or password." });
      return;
    }
    try {
      const token = createAdminSession(email);
      res.cookie(COOKIE_NAME, token, getAdminCookieOptions());
      res.json({ authorized: true, uid: email, email, role: "admin" });
    } catch (error) {
      console.error("Admin session setup error:", error);
      res.status(503).json({ error: "Admin session is not configured. Set ADMIN_SESSION_SECRET in Render." });
    }
  });

  app.post("/api/admin/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env["NODE_ENV"] === "production", sameSite: "strict", path: "/" });
    res.json({ success: true });
  });

  app.use("/api/admin", requireAuth);

  app.get("/api/admin/session", (req: AuthRequest, res) => {
    res.json({
      authorized: true,
      uid: req.user?.uid || "",
      email: req.user?.email || "",
      role: "admin",
    });
  });

  app.get("/api/admin/overview", async (_req: AuthRequest, res) => {
    try {
      const data = await getAdminOverviewData();
      res.json(data);
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch dashboard overview");
    }
  });

  // --- Countries ---
  app.get("/api/admin/countries", async (_req: AuthRequest, res) => {
    try {
      res.json(await listCountries());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch countries");
    }
  });

  app.post("/api/admin/countries", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const code = String(body["code"] || "")
        .trim()
        .toUpperCase();
      const nameKa = String(body["nameKa"] || "").trim();
      const nameEn = String(body["nameEn"] || "").trim();
      if (!code || !nameKa || !nameEn) {
        throw new AppError("Country code, Georgian name, and English name are required.", 400);
      }

      const created = await createCountry({
        code,
        nameKa,
        nameEn,
        descriptionKa: String(body["descriptionKa"] || ""),
        descriptionEn: String(body["descriptionEn"] || ""),
        imageUrl: String(body["imageUrl"] || ""),
        featured: Boolean(body["featured"]),
        published: body["published"] !== false,
      });

      if (created) {
        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "create",
          entityType: "country",
          entityName: created.nameEn,
          details: `Added country (${created.code})`,
        });
      }
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(res, error, "Failed to create country");
    }
  });

  app.put("/api/admin/countries/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const updated = await updateCountry(id, {
        ...(body["code"] !== undefined ? { code: String(body["code"]).trim().toUpperCase() } : {}),
        ...(body["nameKa"] !== undefined ? { nameKa: String(body["nameKa"]).trim() } : {}),
        ...(body["nameEn"] !== undefined ? { nameEn: String(body["nameEn"]).trim() } : {}),
        ...(body["descriptionKa"] !== undefined
          ? { descriptionKa: String(body["descriptionKa"]) }
          : {}),
        ...(body["descriptionEn"] !== undefined
          ? { descriptionEn: String(body["descriptionEn"]) }
          : {}),
        ...(body["imageUrl"] !== undefined ? { imageUrl: String(body["imageUrl"]) } : {}),
        ...(body["featured"] !== undefined ? { featured: Boolean(body["featured"]) } : {}),
        ...(body["published"] !== undefined ? { published: Boolean(body["published"]) } : {}),
      });

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "country",
        entityName: updated.nameEn,
        details: `Updated country (${updated.code})`,
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update country");
    }
  });

  app.delete("/api/admin/countries/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const deleted = await deleteCountry(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "country",
        entityName: deleted.nameEn,
        details: `Deleted country (${deleted.code})`,
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete country");
    }
  });

  // --- Cities ---
  app.get("/api/admin/cities", async (_req: AuthRequest, res) => {
    try {
      res.json(await listCities());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch cities");
    }
  });

  app.post("/api/admin/cities", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const countryId = Number(body["countryId"]);
      const nameKa = String(body["nameKa"] || "").trim();
      const nameEn = String(body["nameEn"] || "").trim();
      const slug =
        String(body["slug"] || nameEn)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `city-${Date.now()}`;

      if (!countryId || !nameKa || !nameEn) {
        throw new AppError("Country, Georgian city name, and English city name are required.", 400);
      }

      const created = await createCity({
        countryId,
        slug,
        nameKa,
        nameEn,
        descriptionKa: String(body["descriptionKa"] || ""),
        descriptionEn: String(body["descriptionEn"] || ""),
        imageUrl: String(body["imageUrl"] || ""),
        airportCode: String(body["airportCode"] || "")
          .trim()
          .toUpperCase(),
        featured: Boolean(body["featured"]),
        published: body["published"] !== false,
      });

      if (created) {
        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "create",
          entityType: "city",
          entityName: created.nameEn,
          details: `Added city (${created.slug})`,
        });
      }
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(res, error, "Failed to create city");
    }
  });

  app.put("/api/admin/cities/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const updated = await updateCity(id, {
        ...(body["countryId"] !== undefined ? { countryId: Number(body["countryId"]) } : {}),
        ...(body["slug"] !== undefined ? { slug: String(body["slug"]).trim() } : {}),
        ...(body["nameKa"] !== undefined ? { nameKa: String(body["nameKa"]).trim() } : {}),
        ...(body["nameEn"] !== undefined ? { nameEn: String(body["nameEn"]).trim() } : {}),
        ...(body["descriptionKa"] !== undefined
          ? { descriptionKa: String(body["descriptionKa"]) }
          : {}),
        ...(body["descriptionEn"] !== undefined
          ? { descriptionEn: String(body["descriptionEn"]) }
          : {}),
        ...(body["imageUrl"] !== undefined ? { imageUrl: String(body["imageUrl"]) } : {}),
        ...(body["airportCode"] !== undefined
          ? { airportCode: String(body["airportCode"]).trim().toUpperCase() }
          : {}),
        ...(body["featured"] !== undefined ? { featured: Boolean(body["featured"]) } : {}),
        ...(body["published"] !== undefined ? { published: Boolean(body["published"]) } : {}),
      });

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "city",
        entityName: updated.nameEn,
        details: `Updated city (${updated.slug})`,
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update city");
    }
  });

  app.delete("/api/admin/cities/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const deleted = await deleteCity(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "city",
        entityName: deleted.nameEn,
        details: `Deleted city (${deleted.slug})`,
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete city");
    }
  });

  // --- Destinations ---
  app.get("/api/admin/destinations", async (_req: AuthRequest, res) => {
    try {
      res.json(await listDestinations());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch destinations");
    }
  });

  app.post("/api/admin/destinations", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const nameKa = String(body["nameKa"] || "").trim();
      const nameEn = String(body["nameEn"] || "").trim();
      const countryId = Number(body["countryId"]);
      const slug =
        String(body["slug"] || nameEn)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `destination-${Date.now()}`;

      if (!nameKa || !nameEn || !countryId) {
        throw new AppError("Georgian name, English name, and Country are required.", 400);
      }

      const lat =
        body["latitude"] !== null && body["latitude"] !== "" && body["latitude"] !== undefined
          ? Number(body["latitude"])
          : null;
      const lng =
        body["longitude"] !== null && body["longitude"] !== "" && body["longitude"] !== undefined
          ? Number(body["longitude"])
          : null;

      const created = await createDestination({
        slug,
        nameKa,
        nameEn,
        descriptionKa: String(body["descriptionKa"] || ""),
        descriptionEn: String(body["descriptionEn"] || ""),
        countryId,
        cityId: body["cityId"] ? Number(body["cityId"]) : null,
        mainImage: String(body["mainImage"] || ""),
        gallery: Array.isArray(body["gallery"]) ? body["gallery"].map(String) : [],
        googlePlaceId: String(body["googlePlaceId"] || ""),
        formattedAddress: String(body["formattedAddress"] || ""),
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lng) ? lng : null,
        featured: Boolean(body["featured"]),
        published: body["published"] !== false,
      });

      if (created) {
        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "create",
          entityType: "destination",
          entityName: created.nameEn,
          details: `Created destination (${created.published ? "published" : "draft"})`,
        });
      }
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(res, error, "Failed to create destination");
    }
  });

  app.put("/api/admin/destinations/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const lat =
        body["latitude"] === null || body["latitude"] === ""
          ? null
          : body["latitude"] !== undefined
            ? Number(body["latitude"])
            : undefined;
      const lng =
        body["longitude"] === null || body["longitude"] === ""
          ? null
          : body["longitude"] !== undefined
            ? Number(body["longitude"])
            : undefined;

      const updated = await updateDestination(id, {
        ...(body["slug"] !== undefined ? { slug: String(body["slug"]).trim() } : {}),
        ...(body["nameKa"] !== undefined ? { nameKa: String(body["nameKa"]).trim() } : {}),
        ...(body["nameEn"] !== undefined ? { nameEn: String(body["nameEn"]).trim() } : {}),
        ...(body["descriptionKa"] !== undefined
          ? { descriptionKa: String(body["descriptionKa"]) }
          : {}),
        ...(body["descriptionEn"] !== undefined
          ? { descriptionEn: String(body["descriptionEn"]) }
          : {}),
        ...(body["countryId"] !== undefined ? { countryId: Number(body["countryId"]) } : {}),
        ...(body["cityId"] !== undefined
          ? { cityId: body["cityId"] ? Number(body["cityId"]) : null }
          : {}),
        ...(body["mainImage"] !== undefined ? { mainImage: String(body["mainImage"]) } : {}),
        ...(Array.isArray(body["gallery"]) ? { gallery: body["gallery"].map(String) } : {}),
        ...(body["googlePlaceId"] !== undefined
          ? { googlePlaceId: String(body["googlePlaceId"]) }
          : {}),
        ...(body["formattedAddress"] !== undefined
          ? { formattedAddress: String(body["formattedAddress"]) }
          : {}),
        ...(lat !== undefined ? { latitude: lat } : {}),
        ...(lng !== undefined ? { longitude: lng } : {}),
        ...(body["featured"] !== undefined ? { featured: Boolean(body["featured"]) } : {}),
        ...(body["published"] !== undefined ? { published: Boolean(body["published"]) } : {}),
      });

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "destination",
        entityName: updated.nameEn,
        details: `Updated destination (${updated.published ? "published" : "unpublished"})`,
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update destination");
    }
  });

  app.delete("/api/admin/destinations/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const deleted = await deleteDestination(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "destination",
        entityName: deleted.nameEn,
        details: "Deleted destination",
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete destination");
    }
  });

  // --- Tours ---
  app.get("/api/admin/tours", async (_req: AuthRequest, res) => {
    try {
      res.json(await listTours());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch tours");
    }
  });

  app.post("/api/admin/tours", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const titleKa = String(body["titleKa"] || "").trim();
      const titleEn = String(body["titleEn"] || "").trim();
      const slug =
        String(body["slug"] || titleEn)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "") || `tour-${Date.now()}`;

      if (!titleKa || !titleEn) {
        throw new AppError("Georgian and English tour titles are required.", 400);
      }

      const categoryMapKa: Record<string, string> = {
        nature: "ბუნება",
        culture: "კულტურა",
        wine: "ღვინო",
        adventure: "თავგადასავალი",
        city: "ქალაქი",
        gastronomy: "გასტრონომია",
      };
      const category = String(body["category"] || "culture");
      const discountedRaw = body["discountedPrice"];
      const discountedPrice =
        discountedRaw !== null && discountedRaw !== "" && discountedRaw !== undefined
          ? Number(discountedRaw)
          : null;

      const created = await createTour(
        {
          slug,
          titleKa,
          titleEn,
          descriptionKa: String(body["descriptionKa"] || ""),
          descriptionEn: String(body["descriptionEn"] || ""),
          category,
          categoryKa: String(body["categoryKa"] || categoryMapKa[category] || "კულტურა"),
          countryId: body["countryId"] ? Number(body["countryId"]) : null,
          cityId: body["cityId"] ? Number(body["cityId"]) : null,
          destinationId: body["destinationId"] ? Number(body["destinationId"]) : null,
          cityNameKa: String(body["cityNameKa"] || "თბილისი"),
          cityNameEn: String(body["cityNameEn"] || "Tbilisi"),
          mainImage: String(body["mainImage"] || ""),
          gallery: Array.isArray(body["gallery"]) ? body["gallery"].map(String) : [],
          price: Number(body["price"]),
          discountedPrice,
          currency: String(body["currency"] || "GEL"),
          durationDays: Math.max(1, Number(body["durationDays"] || 1)),
          highlightsKa: Array.isArray(body["highlightsKa"]) ? body["highlightsKa"].map(String) : [],
          highlightsEn: Array.isArray(body["highlightsEn"]) ? body["highlightsEn"].map(String) : [],
          itineraryKa: Array.isArray(body["itineraryKa"]) ? body["itineraryKa"].map(String) : [],
          itineraryEn: Array.isArray(body["itineraryEn"]) ? body["itineraryEn"].map(String) : [],
          includedKa: Array.isArray(body["includedKa"]) ? body["includedKa"].map(String) : [],
          includedEn: Array.isArray(body["includedEn"]) ? body["includedEn"].map(String) : [],
          excludedKa: Array.isArray(body["excludedKa"]) ? body["excludedKa"].map(String) : [],
          excludedEn: Array.isArray(body["excludedEn"]) ? body["excludedEn"].map(String) : [],
          importantInfoKa: String(body["importantInfoKa"] || ""),
          importantInfoEn: String(body["importantInfoEn"] || ""),
          departureInfoKa: String(body["departureInfoKa"] || ""),
          departureInfoEn: String(body["departureInfoEn"] || ""),
          returnInfoKa: String(body["returnInfoKa"] || ""),
          returnInfoEn: String(body["returnInfoEn"] || ""),
          availabilityStatus: String(body["availabilityStatus"] || "available"),
          published: body["published"] !== false,
          featured: Boolean(body["featured"]),
          partnerBookingUrl: String(body["partnerBookingUrl"] || ""),
          seoTitleKa: String(body["seoTitleKa"] || ""),
          seoTitleEn: String(body["seoTitleEn"] || ""),
          seoDescriptionKa: String(body["seoDescriptionKa"] || ""),
          seoDescriptionEn: String(body["seoDescriptionEn"] || ""),
        },
        req.user?.email || "admin",
      );

      if (created) {
        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "create",
          entityType: "tour",
          entityName: created.titleEn,
          details: `Created tour (${created.price} ${created.currency}, ${created.published ? "published" : "unpublished"})`,
        });
      }
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(res, error, "Failed to create tour");
    }
  });

  app.put("/api/admin/tours/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const categoryMapKa: Record<string, string> = {
        nature: "ბუნება",
        culture: "კულტურა",
        wine: "ღვინო",
        adventure: "თავგადასავალი",
        city: "ქალაქი",
        gastronomy: "გასტრონომია",
      };

      const discountedUpdate =
        body["discountedPrice"] === null || body["discountedPrice"] === ""
          ? { discountedPrice: null }
          : body["discountedPrice"] !== undefined
            ? { discountedPrice: Number(body["discountedPrice"]) }
            : {};

      const categoryVal = body["category"] !== undefined ? String(body["category"]) : undefined;

      const updated = await updateTour(
        id,
        {
          ...(body["slug"] !== undefined ? { slug: String(body["slug"]).trim() } : {}),
          ...(body["titleKa"] !== undefined ? { titleKa: String(body["titleKa"]).trim() } : {}),
          ...(body["titleEn"] !== undefined ? { titleEn: String(body["titleEn"]).trim() } : {}),
          ...(body["descriptionKa"] !== undefined
            ? { descriptionKa: String(body["descriptionKa"]) }
            : {}),
          ...(body["descriptionEn"] !== undefined
            ? { descriptionEn: String(body["descriptionEn"]) }
            : {}),
          ...(categoryVal !== undefined
            ? {
                category: categoryVal,
                categoryKa: String(body["categoryKa"] || categoryMapKa[categoryVal] || "კულტურა"),
              }
            : {}),
          ...(body["countryId"] !== undefined
            ? { countryId: body["countryId"] ? Number(body["countryId"]) : null }
            : {}),
          ...(body["cityId"] !== undefined
            ? { cityId: body["cityId"] ? Number(body["cityId"]) : null }
            : {}),
          ...(body["destinationId"] !== undefined
            ? { destinationId: body["destinationId"] ? Number(body["destinationId"]) : null }
            : {}),
          ...(body["cityNameKa"] !== undefined ? { cityNameKa: String(body["cityNameKa"]) } : {}),
          ...(body["cityNameEn"] !== undefined ? { cityNameEn: String(body["cityNameEn"]) } : {}),
          ...(body["mainImage"] !== undefined ? { mainImage: String(body["mainImage"]) } : {}),
          ...(Array.isArray(body["gallery"]) ? { gallery: body["gallery"].map(String) } : {}),
          ...(body["price"] !== undefined ? { price: Number(body["price"]) } : {}),
          ...discountedUpdate,
          ...(body["currency"] !== undefined ? { currency: String(body["currency"]) } : {}),
          ...(body["durationDays"] !== undefined
            ? { durationDays: Math.max(1, Number(body["durationDays"])) }
            : {}),
          ...(Array.isArray(body["highlightsKa"])
            ? { highlightsKa: body["highlightsKa"].map(String) }
            : {}),
          ...(Array.isArray(body["highlightsEn"])
            ? { highlightsEn: body["highlightsEn"].map(String) }
            : {}),
          ...(Array.isArray(body["itineraryKa"])
            ? { itineraryKa: body["itineraryKa"].map(String) }
            : {}),
          ...(Array.isArray(body["itineraryEn"])
            ? { itineraryEn: body["itineraryEn"].map(String) }
            : {}),
          ...(Array.isArray(body["includedKa"])
            ? { includedKa: body["includedKa"].map(String) }
            : {}),
          ...(Array.isArray(body["includedEn"])
            ? { includedEn: body["includedEn"].map(String) }
            : {}),
          ...(Array.isArray(body["excludedKa"])
            ? { excludedKa: body["excludedKa"].map(String) }
            : {}),
          ...(Array.isArray(body["excludedEn"])
            ? { excludedEn: body["excludedEn"].map(String) }
            : {}),
          ...(body["importantInfoKa"] !== undefined
            ? { importantInfoKa: String(body["importantInfoKa"]) }
            : {}),
          ...(body["importantInfoEn"] !== undefined
            ? { importantInfoEn: String(body["importantInfoEn"]) }
            : {}),
          ...(body["departureInfoKa"] !== undefined
            ? { departureInfoKa: String(body["departureInfoKa"]) }
            : {}),
          ...(body["departureInfoEn"] !== undefined
            ? { departureInfoEn: String(body["departureInfoEn"]) }
            : {}),
          ...(body["returnInfoKa"] !== undefined
            ? { returnInfoKa: String(body["returnInfoKa"]) }
            : {}),
          ...(body["returnInfoEn"] !== undefined
            ? { returnInfoEn: String(body["returnInfoEn"]) }
            : {}),
          ...(body["availabilityStatus"] !== undefined
            ? { availabilityStatus: String(body["availabilityStatus"]) }
            : {}),
          ...(body["published"] !== undefined ? { published: Boolean(body["published"]) } : {}),
          ...(body["featured"] !== undefined ? { featured: Boolean(body["featured"]) } : {}),
          ...(body["partnerBookingUrl"] !== undefined
            ? { partnerBookingUrl: String(body["partnerBookingUrl"]) }
            : {}),
          ...(body["seoTitleKa"] !== undefined ? { seoTitleKa: String(body["seoTitleKa"]) } : {}),
          ...(body["seoTitleEn"] !== undefined ? { seoTitleEn: String(body["seoTitleEn"]) } : {}),
          ...(body["seoDescriptionKa"] !== undefined
            ? { seoDescriptionKa: String(body["seoDescriptionKa"]) }
            : {}),
          ...(body["seoDescriptionEn"] !== undefined
            ? { seoDescriptionEn: String(body["seoDescriptionEn"]) }
            : {}),
        },
        req.user?.email || "admin",
      );

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action:
          body["published"] !== undefined
            ? updated.published
              ? "publish"
              : "unpublish"
            : "update",
        entityType: "tour",
        entityName: updated.titleEn,
        details: `Updated tour (${updated.price} ${updated.currency}, ${updated.published ? "published" : "unpublished"})`,
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update tour");
    }
  });

  app.delete("/api/admin/tours/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const deleted = await deleteTour(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "tour",
        entityName: deleted.titleEn,
        details: "Deleted tour",
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete tour");
    }
  });

  // --- Flight Routes ---
  app.get("/api/admin/flights", async (_req: AuthRequest, res) => {
    try {
      res.json(await listFlightRoutes());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch flight routes");
    }
  });

  app.post("/api/admin/flights", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const departureAirport = String(body["departureAirport"] || "")
        .trim()
        .toUpperCase();
      const arrivalAirport = String(body["arrivalAirport"] || "")
        .trim()
        .toUpperCase();
      const departureCityKa = String(body["departureCityKa"] || "").trim();
      const departureCityEn = String(body["departureCityEn"] || "").trim();
      const arrivalCityKa = String(body["arrivalCityKa"] || "").trim();
      const arrivalCityEn = String(body["arrivalCityEn"] || "").trim();

      if (!departureAirport || !arrivalAirport || !departureCityEn || !arrivalCityEn) {
        throw new AppError("Departure and arrival airports and cities are required.", 400);
      }

      const priceVal =
        body["price"] !== null && body["price"] !== "" && body["price"] !== undefined
          ? Number(body["price"])
          : null;

      const created = await createFlightRoute({
        departureAirport,
        arrivalAirport,
        departureCityKa: departureCityKa || departureCityEn,
        departureCityEn,
        arrivalCityKa: arrivalCityKa || arrivalCityEn,
        arrivalCityEn,
        arrivalCountryKa: String(body["arrivalCountryKa"] || ""),
        arrivalCountryEn: String(body["arrivalCountryEn"] || ""),
        airlineName: String(body["airlineName"] || ""),
        airlineLogo: String(body["airlineLogo"] || ""),
        routeDescriptionKa: String(body["routeDescriptionKa"] || ""),
        routeDescriptionEn: String(body["routeDescriptionEn"] || ""),
        partnerBookingUrl: String(body["partnerBookingUrl"] || ""),
        price: Number.isFinite(priceVal) ? priceVal : null,
        currency: String(body["currency"] || "GEL"),
        routeImage: String(body["routeImage"] || ""),
        active: body["active"] !== false,
        isManual: true,
      });

      if (created) {
        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "create",
          entityType: "flight_route",
          entityName: `${created.departureAirport} → ${created.arrivalAirport}`,
          details: `Added route to ${created.arrivalCityEn}`,
        });
      }
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(res, error, "Failed to create flight route");
    }
  });

  app.put("/api/admin/flights/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const priceUpdate =
        body["price"] === null || body["price"] === ""
          ? { price: null }
          : body["price"] !== undefined
            ? { price: Number(body["price"]) }
            : {};

      const updated = await updateFlightRoute(id, {
        ...(body["departureAirport"] !== undefined
          ? { departureAirport: String(body["departureAirport"]).trim().toUpperCase() }
          : {}),
        ...(body["arrivalAirport"] !== undefined
          ? { arrivalAirport: String(body["arrivalAirport"]).trim().toUpperCase() }
          : {}),
        ...(body["departureCityKa"] !== undefined
          ? { departureCityKa: String(body["departureCityKa"]) }
          : {}),
        ...(body["departureCityEn"] !== undefined
          ? { departureCityEn: String(body["departureCityEn"]) }
          : {}),
        ...(body["arrivalCityKa"] !== undefined
          ? { arrivalCityKa: String(body["arrivalCityKa"]) }
          : {}),
        ...(body["arrivalCityEn"] !== undefined
          ? { arrivalCityEn: String(body["arrivalCityEn"]) }
          : {}),
        ...(body["arrivalCountryKa"] !== undefined
          ? { arrivalCountryKa: String(body["arrivalCountryKa"]) }
          : {}),
        ...(body["arrivalCountryEn"] !== undefined
          ? { arrivalCountryEn: String(body["arrivalCountryEn"]) }
          : {}),
        ...(body["airlineName"] !== undefined ? { airlineName: String(body["airlineName"]) } : {}),
        ...(body["airlineLogo"] !== undefined ? { airlineLogo: String(body["airlineLogo"]) } : {}),
        ...(body["routeDescriptionKa"] !== undefined
          ? { routeDescriptionKa: String(body["routeDescriptionKa"]) }
          : {}),
        ...(body["routeDescriptionEn"] !== undefined
          ? { routeDescriptionEn: String(body["routeDescriptionEn"]) }
          : {}),
        ...(body["partnerBookingUrl"] !== undefined
          ? { partnerBookingUrl: String(body["partnerBookingUrl"]) }
          : {}),
        ...priceUpdate,
        ...(body["currency"] !== undefined ? { currency: String(body["currency"]) } : {}),
        ...(body["routeImage"] !== undefined ? { routeImage: String(body["routeImage"]) } : {}),
        ...(body["active"] !== undefined ? { active: Boolean(body["active"]) } : {}),
      });

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "flight_route",
        entityName: `${updated.departureAirport} → ${updated.arrivalAirport}`,
        details: `Updated flight route (${updated.active ? "active" : "inactive"})`,
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update flight route");
    }
  });

  app.delete("/api/admin/flights/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const deleted = await deleteFlightRoute(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "flight_route",
        entityName: `${deleted.departureAirport} → ${deleted.arrivalAirport}`,
        details: "Deleted flight route",
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete flight route");
    }
  });

  // --- Promotions & Price History ---
  app.get("/api/admin/promotions", async (_req: AuthRequest, res) => {
    try {
      res.json(await listPromotions());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch promotions");
    }
  });

  app.get("/api/admin/price-history", async (_req: AuthRequest, res) => {
    try {
      res.json(await listPriceHistory());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch price history");
    }
  });

  app.post("/api/admin/promotions", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const titleKa = String(body["titleKa"] || "").trim();
      const titleEn = String(body["titleEn"] || "").trim();
      if (!titleKa || !titleEn) {
        throw new AppError("Georgian and English promotion titles are required.", 400);
      }

      const created = await createPromotion({
        titleKa,
        titleEn,
        code: String(body["code"] || "")
          .trim()
          .toUpperCase(),
        discountType: body["discountType"] === "fixed" ? "fixed" : "percentage",
        discountValue: Number(body["discountValue"]),
        currency: String(body["currency"] || "GEL"),
        tourId: body["tourId"] ? Number(body["tourId"]) : null,
        startDate: new Date(String(body["startDate"])),
        endDate: new Date(String(body["endDate"])),
        active: body["active"] !== false,
      });

      if (created) {
        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "create",
          entityType: "promotion",
          entityName: created.titleEn,
          details: `Created ${created.discountValue}${created.discountType === "percentage" ? "%" : ` ${created.currency}`} promotion`,
        });
      }
      res.status(201).json(created);
    } catch (error) {
      handleRouteError(res, error, "Failed to create promotion");
    }
  });

  app.put("/api/admin/promotions/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const updated = await updatePromotion(id, {
        ...(body["titleKa"] !== undefined ? { titleKa: String(body["titleKa"]).trim() } : {}),
        ...(body["titleEn"] !== undefined ? { titleEn: String(body["titleEn"]).trim() } : {}),
        ...(body["code"] !== undefined ? { code: String(body["code"]).trim().toUpperCase() } : {}),
        ...(body["discountType"] !== undefined
          ? { discountType: body["discountType"] === "fixed" ? "fixed" : "percentage" }
          : {}),
        ...(body["discountValue"] !== undefined
          ? { discountValue: Number(body["discountValue"]) }
          : {}),
        ...(body["currency"] !== undefined ? { currency: String(body["currency"]) } : {}),
        ...(body["tourId"] !== undefined
          ? { tourId: body["tourId"] ? Number(body["tourId"]) : null }
          : {}),
        ...(body["startDate"] !== undefined
          ? { startDate: new Date(String(body["startDate"])) }
          : {}),
        ...(body["endDate"] !== undefined ? { endDate: new Date(String(body["endDate"])) } : {}),
        ...(body["active"] !== undefined ? { active: Boolean(body["active"]) } : {}),
      });

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "promotion",
        entityName: updated.titleEn,
        details: `Updated promotion (${updated.active ? "active" : "inactive"})`,
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update promotion");
    }
  });

  app.delete("/api/admin/promotions/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const deleted = await deletePromotion(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "promotion",
        entityName: deleted.titleEn,
        details: "Deleted promotion",
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete promotion");
    }
  });

  // --- Media Assets (Supabase Storage + Managed Local Fallback) ---
  app.get("/api/admin/media", async (_req: AuthRequest, res) => {
    try {
      res.json(await listMediaAssets());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch media library");
    }
  });

  app.post(
    "/api/admin/media/upload",
    upload.array("files", 10),
    async (req: AuthRequest, res: Response) => {
      try {
        const files = (req.files as Express.Multer.File[]) || [];
        if (!files.length) {
          throw new AppError("Please select at least one image file to upload.", 400);
        }

        const body = req.body as Record<string, unknown>;
        const entityType = String(body["entityType"] || "general");
        const entityId = body["entityId"] ? Number(body["entityId"]) : null;
        const altTextKa = String(body["altTextKa"] || "");
        const altTextEn = String(body["altTextEn"] || "");
        const descriptionKa = String(body["descriptionKa"] || "");
        const descriptionEn = String(body["descriptionEn"] || "");
        const isMain = body["isMain"] === "true" || body["isMain"] === true;

        const savedAssets = [];
        for (const [index, file] of files.entries()) {
          const stored = await storeUploadedImage({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            entityType,
            uploadsRootDir: uploadsDir,
          });

          const created = await createMediaAsset({
            fileName: stored.fileName,
            url: stored.url,
            storagePath: stored.storagePath,
            storageProvider: stored.storageProvider,
            mimeType: file.mimetype,
            sizeBytes: file.size,
            entityType,
            entityId,
            altTextKa: altTextKa || file.originalname,
            altTextEn: altTextEn || file.originalname,
            descriptionKa,
            descriptionEn,
            isMain: isMain && index === 0,
          });
          if (created) savedAssets.push(created);
        }

        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "upload",
          entityType: "media",
          entityName: `${savedAssets.length} image(s)`,
          details: `Uploaded to ${entityType}`,
        });

        res.status(201).json(savedAssets);
      } catch (error) {
        handleRouteError(res, error, "Failed to upload media files");
      }
    },
  );

  app.put(
    "/api/admin/media/:id/replace",
    upload.single("file"),
    async (req: AuthRequest, res: Response) => {
      try {
        const id = parseId(req.params["id"]);
        const file = req.file;
        if (!file) {
          throw new AppError("Please choose a replacement image file.", 400);
        }

        const existing = await getMediaAssetById(id);
        if (!existing) {
          throw new AppError("Media asset not found.", 404);
        }

        const stored = await storeUploadedImage({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          entityType: existing.entityType,
          uploadsRootDir: uploadsDir,
        });

        await removeStoredImage({
          storagePath: existing.storagePath,
          storageProvider: existing.storageProvider,
          uploadsRootDir: uploadsDir,
        });

        const updated = await updateMediaAsset(id, {
          fileName: stored.fileName,
          url: stored.url,
          storagePath: stored.storagePath,
          storageProvider: stored.storageProvider,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });

        await propagateMediaUrlReplacement(existing.url, stored.url);

        await logAdminActivity({
          actorUid: req.user?.uid || "",
          actorEmail: req.user?.email || "",
          action: "update",
          entityType: "media",
          entityName: updated.fileName,
          details: "Replaced stored image file",
        });

        res.json(updated);
      } catch (error) {
        handleRouteError(res, error, "Failed to replace image");
      }
    },
  );

  app.put("/api/admin/media/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const body = req.body as Record<string, unknown>;
      const updated = await updateMediaAsset(id, {
        ...(body["entityType"] !== undefined ? { entityType: String(body["entityType"]) } : {}),
        ...(body["entityId"] !== undefined
          ? { entityId: body["entityId"] ? Number(body["entityId"]) : null }
          : {}),
        ...(body["altTextKa"] !== undefined ? { altTextKa: String(body["altTextKa"]) } : {}),
        ...(body["altTextEn"] !== undefined ? { altTextEn: String(body["altTextEn"]) } : {}),
        ...(body["descriptionKa"] !== undefined
          ? { descriptionKa: String(body["descriptionKa"]) }
          : {}),
        ...(body["descriptionEn"] !== undefined
          ? { descriptionEn: String(body["descriptionEn"]) }
          : {}),
        ...(body["isMain"] !== undefined ? { isMain: Boolean(body["isMain"]) } : {}),
      });

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "media",
        entityName: updated.fileName,
        details: "Updated media metadata",
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update media asset");
    }
  });

  app.delete("/api/admin/media/:id", async (req: AuthRequest, res) => {
    try {
      const id = parseId(req.params["id"]);
      const existing = await getMediaAssetById(id);
      if (!existing) {
        throw new AppError("Media asset not found.", 404);
      }
      await removeStoredImage({
        storagePath: existing.storagePath,
        storageProvider: existing.storageProvider,
        uploadsRootDir: uploadsDir,
      });
      const deleted = await deleteMediaAssetRecord(id);
      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "delete",
        entityType: "media",
        entityName: deleted.fileName,
        details: "Deleted media asset",
      });
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, "Failed to delete media asset");
    }
  });

  // --- Website Content CMS ---
  app.get("/api/admin/site-content", async (_req: AuthRequest, res) => {
    try {
      res.json(await getMainSiteContent());
    } catch (error) {
      handleRouteError(res, error, "Failed to fetch website content");
    }
  });

  app.put("/api/admin/site-content", async (req: AuthRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const updated = await upsertMainSiteContent(
        {
          ...(body["heroEyebrowKa"] !== undefined
            ? { heroEyebrowKa: String(body["heroEyebrowKa"]) }
            : {}),
          ...(body["heroEyebrowEn"] !== undefined
            ? { heroEyebrowEn: String(body["heroEyebrowEn"]) }
            : {}),
          ...(body["heroTitleKa"] !== undefined
            ? { heroTitleKa: String(body["heroTitleKa"]) }
            : {}),
          ...(body["heroTitleEn"] !== undefined
            ? { heroTitleEn: String(body["heroTitleEn"]) }
            : {}),
          ...(body["heroDescriptionKa"] !== undefined
            ? { heroDescriptionKa: String(body["heroDescriptionKa"]) }
            : {}),
          ...(body["heroDescriptionEn"] !== undefined
            ? { heroDescriptionEn: String(body["heroDescriptionEn"]) }
            : {}),
          ...(body["heroImageUrl"] !== undefined
            ? { heroImageUrl: String(body["heroImageUrl"]) }
            : {}),
          ...(body["heroSecondaryImageUrl"] !== undefined
            ? { heroSecondaryImageUrl: String(body["heroSecondaryImageUrl"]) }
            : {}),
          ...(body["aboutEyebrowKa"] !== undefined
            ? { aboutEyebrowKa: String(body["aboutEyebrowKa"]) }
            : {}),
          ...(body["aboutEyebrowEn"] !== undefined
            ? { aboutEyebrowEn: String(body["aboutEyebrowEn"]) }
            : {}),
          ...(body["aboutTitleKa"] !== undefined
            ? { aboutTitleKa: String(body["aboutTitleKa"]) }
            : {}),
          ...(body["aboutTitleEn"] !== undefined
            ? { aboutTitleEn: String(body["aboutTitleEn"]) }
            : {}),
          ...(body["aboutDescriptionKa"] !== undefined
            ? { aboutDescriptionKa: String(body["aboutDescriptionKa"]) }
            : {}),
          ...(body["aboutDescriptionEn"] !== undefined
            ? { aboutDescriptionEn: String(body["aboutDescriptionEn"]) }
            : {}),
          ...(body["aboutImageUrl"] !== undefined
            ? { aboutImageUrl: String(body["aboutImageUrl"]) }
            : {}),
          ...(body["contactEmail"] !== undefined
            ? { contactEmail: String(body["contactEmail"]) }
            : {}),
          ...(body["contactPhone"] !== undefined
            ? { contactPhone: String(body["contactPhone"]) }
            : {}),
          ...(body["whatsappNumber"] !== undefined
            ? { whatsappNumber: String(body["whatsappNumber"]) }
            : {}),
          ...(body["seoTitleKa"] !== undefined ? { seoTitleKa: String(body["seoTitleKa"]) } : {}),
          ...(body["seoTitleEn"] !== undefined ? { seoTitleEn: String(body["seoTitleEn"]) } : {}),
          ...(body["seoDescriptionKa"] !== undefined
            ? { seoDescriptionKa: String(body["seoDescriptionKa"]) }
            : {}),
          ...(body["seoDescriptionEn"] !== undefined
            ? { seoDescriptionEn: String(body["seoDescriptionEn"]) }
            : {}),
        },
        req.user?.email || "admin",
      );

      await logAdminActivity({
        actorUid: req.user?.uid || "",
        actorEmail: req.user?.email || "",
        action: "update",
        entityType: "site_content",
        entityName: "Website Content & Hero Sections",
        details: "Updated public homepage/about/contact content",
      });
      res.json(updated);
    } catch (error) {
      handleRouteError(res, error, "Failed to update website content");
    }
  });

  // Multer upload error handler
  app.use((err: unknown, _req: express.Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: `Upload error: ${err.message}` });
      return;
    }
    next(err);
  });

  // =========================================================================
  // FRONTEND SERVING (/ for Public Site, /admin for Admin SPA)
  // =========================================================================
  const isProd = process.env["NODE_ENV"] === "production";

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });

    app.get(["/admin", "/admin/*splat"], async (req, res, next) => {
      try {
        const rawHtml = await fs.readFile(path.join(rootDir, "admin.html"), "utf-8");
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ "Content-Type": "text/html" }).end(transformed);
      } catch (err) {
        next(err);
      }
    });

    app.get("/styles.css", (_req, res) => {
      res.sendFile(path.join(rootDir, "styles.css"));
    });

    app.get("/app.js", (_req, res) => {
      res.sendFile(path.join(rootDir, "app.js"));
    });

    app.use(vite.middlewares);

    app.get("/", (_req, res) => {
      res.sendFile(path.join(rootDir, "index.html"));
    });
  } else {
    const distDir = path.join(rootDir, "dist");
    app.use(express.static(distDir));

    app.get(["/admin", "/admin/*splat"], (_req, res) => {
      res.sendFile(path.join(distDir, "admin.html"));
    });

    app.get("/", (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  const port = Number(process.env["PORT"] || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`SaqoTravel server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start SaqoTravel server:", err);
  process.exit(1);
});
