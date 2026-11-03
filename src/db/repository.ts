import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "./index.ts";
import {
  activityLogs,
  cities,
  countries,
  destinations,
  flightRoutes,
  mediaAssets,
  priceHistory,
  promotions,
  siteContent,
  tours,
  users,
} from "./schema.ts";

export class AppError extends Error {
  statusCode: number;
  dependencies?: string[];

  constructor(message: string, statusCode = 400, dependencies?: string[]) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (dependencies) {
      this.dependencies = dependencies;
    }
  }
}

function wrapDbError(context: string, error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  console.error(`[DB Error] ${context}:`, error);
  throw new Error(`${context}. Please try again.`, { cause: error });
}

export async function upsertUser(uid: string, email: string, displayName = "", grantAdmin = false) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName,
        role: grantAdmin ? "admin" : "viewer",
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName,
          ...(grantAdmin ? { role: "admin" } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    wrapDbError("Failed to synchronize user account", error);
  }
}

export async function logAdminActivity(params: {
  actorUid?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityName: string;
  details?: string;
}) {
  try {
    await db.insert(activityLogs).values({
      actorUid: params.actorUid || "",
      actorEmail: params.actorEmail || "",
      action: params.action,
      entityType: params.entityType,
      entityName: params.entityName,
      details: params.details || "",
    });
  } catch (error) {
    console.error("Failed to record admin activity log:", error);
  }
}

export async function deactivateExpiredPromotions(): Promise<void> {
  try {
    const now = new Date();
    await db
      .update(promotions)
      .set({ active: false, updatedAt: now })
      .where(and(eq(promotions.active, true), lte(promotions.endDate, now)));
  } catch (error) {
    console.error("Failed to deactivate expired promotions:", error);
  }
}

export function computeEffectiveTourPricing(
  tour: typeof tours.$inferSelect,
  activePromos: Array<typeof promotions.$inferSelect>,
): {
  effectivePrice: number;
  originalPrice: number;
  hasDiscount: boolean;
  promotionTitleEn: string | null;
  promotionTitleKa: string | null;
} {
  const now = Date.now();
  let bestPrice = tour.price;
  let promoTitleEn: string | null = null;
  let promoTitleKa: string | null = null;

  if (
    tour.discountedPrice !== null &&
    tour.discountedPrice !== undefined &&
    tour.discountedPrice > 0 &&
    tour.discountedPrice < bestPrice
  ) {
    bestPrice = tour.discountedPrice;
  }

  for (const promo of activePromos) {
    if (!promo.active) continue;
    const startMs = new Date(promo.startDate).getTime();
    const endMs = new Date(promo.endDate).getTime();
    if (now < startMs || now > endMs) continue;
    if (promo.tourId !== null && promo.tourId !== tour.id) continue;
    if (promo.discountType === "fixed" && promo.currency !== tour.currency) continue;

    const candidate =
      promo.discountType === "percentage"
        ? Math.round(tour.price * (1 - promo.discountValue / 100) * 100) / 100
        : Math.round((tour.price - promo.discountValue) * 100) / 100;

    if (candidate > 0 && candidate < bestPrice) {
      bestPrice = candidate;
      promoTitleEn = promo.titleEn;
      promoTitleKa = promo.titleKa;
    }
  }

  return {
    effectivePrice: bestPrice,
    originalPrice: tour.price,
    hasDiscount: bestPrice < tour.price,
    promotionTitleEn: promoTitleEn,
    promotionTitleKa: promoTitleKa,
  };
}

export async function getPublicBootstrapData() {
  try {
    await deactivateExpiredPromotions();

    const [
      publishedTours,
      publishedDestinations,
      publishedCountries,
      publishedCities,
      activeFlights,
      activePromos,
      contentRows,
    ] = await Promise.all([
      db
        .select()
        .from(tours)
        .where(eq(tours.published, true))
        .orderBy(desc(tours.featured), tours.id),
      db
        .select()
        .from(destinations)
        .where(eq(destinations.published, true))
        .orderBy(desc(destinations.featured), destinations.id),
      db
        .select()
        .from(countries)
        .where(eq(countries.published, true))
        .orderBy(desc(countries.featured), countries.nameEn),
      db
        .select()
        .from(cities)
        .where(eq(cities.published, true))
        .orderBy(desc(cities.featured), cities.nameEn),
      db
        .select()
        .from(flightRoutes)
        .where(eq(flightRoutes.active, true))
        .orderBy(desc(flightRoutes.isManual), flightRoutes.id),
      db.select().from(promotions).where(eq(promotions.active, true)),
      db.select().from(siteContent).where(eq(siteContent.sectionKey, "main")).limit(1),
    ]);

    const enrichedTours = publishedTours.map((tour) => {
      const pricing = computeEffectiveTourPricing(tour, activePromos);
      return {
        ...tour,
        effectivePrice: pricing.effectivePrice,
        originalPrice: pricing.originalPrice,
        hasDiscount: pricing.hasDiscount,
        promotionTitleEn: pricing.promotionTitleEn,
        promotionTitleKa: pricing.promotionTitleKa,
      };
    });

    return {
      tours: enrichedTours,
      destinations: publishedDestinations,
      countries: publishedCountries,
      cities: publishedCities,
      flights: activeFlights,
      siteContent: contentRows[0] || null,
    };
  } catch (error) {
    wrapDbError("Failed to load public travel data", error);
  }
}

export async function getAdminOverviewData() {
  try {
    await deactivateExpiredPromotions();

    const [
      allDestinations,
      allCountries,
      allCities,
      allTours,
      allFlights,
      recentPriceChanges,
      recentActivities,
    ] = await Promise.all([
      db.select().from(destinations).orderBy(desc(destinations.updatedAt)),
      db.select().from(countries).orderBy(countries.nameEn),
      db.select().from(cities).orderBy(cities.nameEn),
      db.select().from(tours).orderBy(desc(tours.createdAt)),
      db.select().from(flightRoutes),
      db.select().from(priceHistory).orderBy(desc(priceHistory.createdAt)).limit(8),
      db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(12),
    ]);

    const activeToursCount = allTours.filter((t) => t.published).length;
    const inactiveToursCount = allTours.length - activeToursCount;

    return {
      counts: {
        totalDestinations: allDestinations.length,
        totalCountries: allCountries.length,
        totalCities: allCities.length,
        activeTours: activeToursCount,
        inactiveTours: inactiveToursCount,
        totalTours: allTours.length,
        totalFlightRoutes: allFlights.length,
        activeFlightRoutes: allFlights.filter((f) => f.active).length,
      },
      recentTours: allTours.slice(0, 6),
      recentDestinations: allDestinations.slice(0, 6),
      recentPriceChanges,
      recentActivities,
    };
  } catch (error) {
    wrapDbError("Failed to load admin overview statistics", error);
  }
}

// Countries CRUD + Dependency Protection
export async function listCountries() {
  try {
    return await db.select().from(countries).orderBy(desc(countries.featured), countries.nameEn);
  } catch (error) {
    wrapDbError("Failed to list countries", error);
  }
}

export async function createCountry(data: typeof countries.$inferInsert) {
  try {
    const [created] = await db.insert(countries).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to create country (check unique country code)", error);
  }
}

export async function updateCountry(id: number, data: Partial<typeof countries.$inferInsert>) {
  try {
    const [updated] = await db
      .update(countries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(countries.id, id))
      .returning();
    if (!updated) throw new AppError("Country not found", 404);
    return updated;
  } catch (error) {
    wrapDbError("Failed to update country", error);
  }
}

export async function deleteCountry(id: number) {
  try {
    const [depCities, depDestinations, depTours] = await Promise.all([
      db.select({ nameEn: cities.nameEn }).from(cities).where(eq(cities.countryId, id)),
      db
        .select({ nameEn: destinations.nameEn })
        .from(destinations)
        .where(eq(destinations.countryId, id)),
      db.select({ titleEn: tours.titleEn }).from(tours).where(eq(tours.countryId, id)),
    ]);

    const blockers: string[] = [
      ...depCities.map((c) => `City: ${c.nameEn}`),
      ...depDestinations.map((d) => `Destination: ${d.nameEn}`),
      ...depTours.map((t) => `Tour: ${t.titleEn}`),
    ];

    if (blockers.length > 0) {
      throw new AppError(
        `Cannot delete this country because ${blockers.length} record(s) still depend on it.`,
        409,
        blockers,
      );
    }

    const [deleted] = await db.delete(countries).where(eq(countries.id, id)).returning();
    if (!deleted) throw new AppError("Country not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete country", error);
  }
}

// Cities CRUD + Dependency Protection
export async function listCities() {
  try {
    return await db.select().from(cities).orderBy(desc(cities.featured), cities.nameEn);
  } catch (error) {
    wrapDbError("Failed to list cities", error);
  }
}

export async function createCity(data: typeof cities.$inferInsert) {
  try {
    const [created] = await db.insert(cities).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to create city (check unique slug)", error);
  }
}

export async function updateCity(id: number, data: Partial<typeof cities.$inferInsert>) {
  try {
    const [updated] = await db
      .update(cities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(cities.id, id))
      .returning();
    if (!updated) throw new AppError("City not found", 404);

    // Sync denormalized city names on tours attached to this city
    if (data.nameKa || data.nameEn) {
      await db
        .update(tours)
        .set({
          cityNameKa: updated.nameKa,
          cityNameEn: updated.nameEn,
          updatedAt: new Date(),
        })
        .where(eq(tours.cityId, id));
    }

    return updated;
  } catch (error) {
    wrapDbError("Failed to update city", error);
  }
}

export async function deleteCity(id: number) {
  try {
    const [depDestinations, depTours] = await Promise.all([
      db
        .select({ nameEn: destinations.nameEn })
        .from(destinations)
        .where(eq(destinations.cityId, id)),
      db.select({ titleEn: tours.titleEn }).from(tours).where(eq(tours.cityId, id)),
    ]);

    const blockers: string[] = [
      ...depDestinations.map((d) => `Destination: ${d.nameEn}`),
      ...depTours.map((t) => `Tour: ${t.titleEn}`),
    ];

    if (blockers.length > 0) {
      throw new AppError(
        `Cannot delete this city because ${blockers.length} record(s) still depend on it.`,
        409,
        blockers,
      );
    }

    const [deleted] = await db.delete(cities).where(eq(cities.id, id)).returning();
    if (!deleted) throw new AppError("City not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete city", error);
  }
}

// Destinations CRUD
export async function listDestinations() {
  try {
    return await db
      .select()
      .from(destinations)
      .orderBy(desc(destinations.featured), desc(destinations.updatedAt));
  } catch (error) {
    wrapDbError("Failed to list destinations", error);
  }
}

export async function createDestination(data: typeof destinations.$inferInsert) {
  try {
    const [created] = await db.insert(destinations).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to create destination (check unique slug)", error);
  }
}

export async function updateDestination(
  id: number,
  data: Partial<typeof destinations.$inferInsert>,
) {
  try {
    const [updated] = await db
      .update(destinations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(destinations.id, id))
      .returning();
    if (!updated) throw new AppError("Destination not found", 404);
    return updated;
  } catch (error) {
    wrapDbError("Failed to update destination", error);
  }
}

export async function deleteDestination(id: number) {
  try {
    const [deleted] = await db.delete(destinations).where(eq(destinations.id, id)).returning();
    if (!deleted) throw new AppError("Destination not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete destination", error);
  }
}

// Tours CRUD + Price Validation + History Tracking
export function validateTourPricing(price: number, discountedPrice: number | null | undefined) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new AppError("Tour price must be a positive number greater than zero.", 400);
  }
  if (discountedPrice !== null && discountedPrice !== undefined) {
    if (!Number.isFinite(discountedPrice) || discountedPrice <= 0) {
      throw new AppError("Discounted price must be greater than zero.", 400);
    }
    if (discountedPrice >= price) {
      throw new AppError(
        "Discounted price must be strictly lower than the regular tour price.",
        400,
      );
    }
  }
}

export async function listTours() {
  try {
    await deactivateExpiredPromotions();
    const [allTours, activePromos] = await Promise.all([
      db.select().from(tours).orderBy(desc(tours.featured), desc(tours.updatedAt)),
      db.select().from(promotions).where(eq(promotions.active, true)),
    ]);

    return allTours.map((tour) => ({
      ...tour,
      ...computeEffectiveTourPricing(tour, activePromos),
    }));
  } catch (error) {
    wrapDbError("Failed to list tours", error);
  }
}

export async function createTour(data: typeof tours.$inferInsert, actorEmail: string) {
  try {
    validateTourPricing(data.price, data.discountedPrice);
    const [created] = await db.insert(tours).values(data).returning();
    if (created) {
      await db.insert(priceHistory).values({
        tourId: created.id,
        tourTitle: created.titleEn,
        previousPrice: null,
        newPrice: created.price,
        previousDiscountedPrice: null,
        newDiscountedPrice: created.discountedPrice ?? null,
        currency: created.currency || "GEL",
        changedByEmail: actorEmail,
      });
    }
    return created;
  } catch (error) {
    wrapDbError("Failed to create tour (ensure slug is unique)", error);
  }
}

export async function updateTour(
  id: number,
  data: Partial<typeof tours.$inferInsert>,
  actorEmail: string,
) {
  try {
    const existingRows = await db.select().from(tours).where(eq(tours.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing) throw new AppError("Tour not found", 404);

    const nextPrice = data.price !== undefined ? data.price : existing.price;
    const nextDiscounted =
      data.discountedPrice !== undefined ? data.discountedPrice : existing.discountedPrice;
    validateTourPricing(nextPrice, nextDiscounted);

    const [updated] = await db
      .update(tours)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tours.id, id))
      .returning();

    if (!updated) throw new AppError("Tour not found", 404);

    const priceChanged =
      existing.price !== updated.price ||
      existing.discountedPrice !== updated.discountedPrice ||
      existing.currency !== updated.currency;

    if (priceChanged) {
      await db.insert(priceHistory).values({
        tourId: updated.id,
        tourTitle: updated.titleEn,
        previousPrice: existing.price,
        newPrice: updated.price,
        previousDiscountedPrice: existing.discountedPrice ?? null,
        newDiscountedPrice: updated.discountedPrice ?? null,
        currency: updated.currency,
        changedByEmail: actorEmail,
      });
    }

    return updated;
  } catch (error) {
    wrapDbError("Failed to update tour", error);
  }
}

export async function deleteTour(id: number) {
  try {
    const [deleted] = await db.delete(tours).where(eq(tours.id, id)).returning();
    if (!deleted) throw new AppError("Tour not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete tour", error);
  }
}

// Flight Routes CRUD
export async function listFlightRoutes() {
  try {
    return await db
      .select()
      .from(flightRoutes)
      .orderBy(desc(flightRoutes.isManual), desc(flightRoutes.updatedAt), flightRoutes.id);
  } catch (error) {
    wrapDbError("Failed to list flight routes", error);
  }
}

export async function createFlightRoute(data: typeof flightRoutes.$inferInsert) {
  try {
    if (data.price !== null && data.price !== undefined && data.price < 0) {
      throw new AppError("Flight route price cannot be negative.", 400);
    }
    const [created] = await db
      .insert(flightRoutes)
      .values({ ...data, isManual: true })
      .returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to create flight route", error);
  }
}

export async function updateFlightRoute(
  id: number,
  data: Partial<typeof flightRoutes.$inferInsert>,
) {
  try {
    if (data.price !== null && data.price !== undefined && data.price < 0) {
      throw new AppError("Flight route price cannot be negative.", 400);
    }
    const [updated] = await db
      .update(flightRoutes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(flightRoutes.id, id))
      .returning();
    if (!updated) throw new AppError("Flight route not found", 404);
    return updated;
  } catch (error) {
    wrapDbError("Failed to update flight route", error);
  }
}

export async function deleteFlightRoute(id: number) {
  try {
    const [deleted] = await db.delete(flightRoutes).where(eq(flightRoutes.id, id)).returning();
    if (!deleted) throw new AppError("Flight route not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete flight route", error);
  }
}

// Promotions CRUD + Validation
export function validatePromotionInput(params: {
  discountType: string;
  discountValue: number;
  startDate: Date;
  endDate: Date;
}) {
  if (!Number.isFinite(params.discountValue) || params.discountValue <= 0) {
    throw new AppError("Promotion discount value must be greater than zero.", 400);
  }
  if (params.discountType === "percentage" && params.discountValue > 95) {
    throw new AppError("Percentage discount cannot exceed 95%.", 400);
  }
  if (
    Number.isNaN(params.startDate.getTime()) ||
    Number.isNaN(params.endDate.getTime()) ||
    params.endDate.getTime() <= params.startDate.getTime()
  ) {
    throw new AppError("Promotion end date must be after the start date.", 400);
  }
}

export async function listPromotions() {
  try {
    await deactivateExpiredPromotions();
    return await db.select().from(promotions).orderBy(desc(promotions.createdAt));
  } catch (error) {
    wrapDbError("Failed to list promotions", error);
  }
}

export async function listPriceHistory() {
  try {
    return await db.select().from(priceHistory).orderBy(desc(priceHistory.createdAt)).limit(30);
  } catch (error) {
    wrapDbError("Failed to list price change history", error);
  }
}

export async function createPromotion(data: typeof promotions.$inferInsert) {
  try {
    validatePromotionInput({
      discountType: data.discountType || "percentage",
      discountValue: data.discountValue,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });
    const [created] = await db.insert(promotions).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to create promotion", error);
  }
}

export async function updatePromotion(id: number, data: Partial<typeof promotions.$inferInsert>) {
  try {
    const existingRows = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing) throw new AppError("Promotion not found", 404);

    validatePromotionInput({
      discountType: data.discountType ?? existing.discountType,
      discountValue: data.discountValue ?? existing.discountValue,
      startDate: data.startDate ? new Date(data.startDate) : new Date(existing.startDate),
      endDate: data.endDate ? new Date(data.endDate) : new Date(existing.endDate),
    });

    const [updated] = await db
      .update(promotions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(promotions.id, id))
      .returning();
    if (!updated) throw new AppError("Promotion not found", 404);
    return updated;
  } catch (error) {
    wrapDbError("Failed to update promotion", error);
  }
}

export async function deletePromotion(id: number) {
  try {
    const [deleted] = await db.delete(promotions).where(eq(promotions.id, id)).returning();
    if (!deleted) throw new AppError("Promotion not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete promotion", error);
  }
}

// Media Assets CRUD
export async function listMediaAssets() {
  try {
    return await db
      .select()
      .from(mediaAssets)
      .orderBy(desc(mediaAssets.isMain), desc(mediaAssets.createdAt));
  } catch (error) {
    wrapDbError("Failed to list media assets", error);
  }
}

export async function createMediaAsset(data: typeof mediaAssets.$inferInsert) {
  try {
    if (data.isMain && data.entityType && data.entityId) {
      await db
        .update(mediaAssets)
        .set({ isMain: false, updatedAt: new Date() })
        .where(
          and(eq(mediaAssets.entityType, data.entityType), eq(mediaAssets.entityId, data.entityId)),
        );
    }
    const [created] = await db.insert(mediaAssets).values(data).returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to save media asset", error);
  }
}

export async function updateMediaAsset(id: number, data: Partial<typeof mediaAssets.$inferInsert>) {
  try {
    const existingRows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    const existing = existingRows[0];
    if (!existing) throw new AppError("Media asset not found", 404);

    const targetEntityType = data.entityType ?? existing.entityType;
    const targetEntityId = data.entityId !== undefined ? data.entityId : existing.entityId;

    if (data.isMain && targetEntityType && targetEntityId) {
      await db
        .update(mediaAssets)
        .set({ isMain: false, updatedAt: new Date() })
        .where(
          and(
            eq(mediaAssets.entityType, targetEntityType),
            eq(mediaAssets.entityId, targetEntityId),
          ),
        );
    }

    const [updated] = await db
      .update(mediaAssets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(mediaAssets.id, id))
      .returning();
    if (!updated) throw new AppError("Media asset not found", 404);
    return updated;
  } catch (error) {
    wrapDbError("Failed to update media asset", error);
  }
}

export async function getMediaAssetById(id: number) {
  try {
    const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return rows[0] || null;
  } catch (error) {
    wrapDbError("Failed to look up media asset", error);
  }
}

export async function deleteMediaAssetRecord(id: number) {
  try {
    const [deleted] = await db.delete(mediaAssets).where(eq(mediaAssets.id, id)).returning();
    if (!deleted) throw new AppError("Media asset not found", 404);
    return deleted;
  } catch (error) {
    wrapDbError("Failed to delete media asset", error);
  }
}

export async function propagateMediaUrlReplacement(oldUrl: string, newUrl: string) {
  if (!oldUrl || !newUrl || oldUrl === newUrl) return;
  try {
    const now = new Date();
    await Promise.all([
      db
        .update(countries)
        .set({ imageUrl: newUrl, updatedAt: now })
        .where(eq(countries.imageUrl, oldUrl)),
      db
        .update(cities)
        .set({ imageUrl: newUrl, updatedAt: now })
        .where(eq(cities.imageUrl, oldUrl)),
      db
        .update(flightRoutes)
        .set({ airlineLogo: newUrl, updatedAt: now })
        .where(eq(flightRoutes.airlineLogo, oldUrl)),
      db
        .update(flightRoutes)
        .set({ routeImage: newUrl, updatedAt: now })
        .where(eq(flightRoutes.routeImage, oldUrl)),
      db
        .update(siteContent)
        .set({ heroImageUrl: newUrl, updatedAt: now })
        .where(eq(siteContent.heroImageUrl, oldUrl)),
      db
        .update(siteContent)
        .set({ heroSecondaryImageUrl: newUrl, updatedAt: now })
        .where(eq(siteContent.heroSecondaryImageUrl, oldUrl)),
      db
        .update(siteContent)
        .set({ aboutImageUrl: newUrl, updatedAt: now })
        .where(eq(siteContent.aboutImageUrl, oldUrl)),
    ]);

    const [allTours, allDestinations] = await Promise.all([
      db.select({ id: tours.id, mainImage: tours.mainImage, gallery: tours.gallery }).from(tours),
      db
        .select({
          id: destinations.id,
          mainImage: destinations.mainImage,
          gallery: destinations.gallery,
        })
        .from(destinations),
    ]);

    for (const tour of allTours) {
      const nextMain = tour.mainImage === oldUrl ? newUrl : tour.mainImage;
      const nextGallery = Array.isArray(tour.gallery)
        ? tour.gallery.map((u) => (u === oldUrl ? newUrl : u))
        : [];
      if (nextMain !== tour.mainImage || nextGallery.some((u, idx) => u !== tour.gallery[idx])) {
        await db
          .update(tours)
          .set({ mainImage: nextMain, gallery: nextGallery, updatedAt: now })
          .where(eq(tours.id, tour.id));
      }
    }

    for (const dest of allDestinations) {
      const nextMain = dest.mainImage === oldUrl ? newUrl : dest.mainImage;
      const nextGallery = Array.isArray(dest.gallery)
        ? dest.gallery.map((u) => (u === oldUrl ? newUrl : u))
        : [];
      if (nextMain !== dest.mainImage || nextGallery.some((u, idx) => u !== dest.gallery[idx])) {
        await db
          .update(destinations)
          .set({ mainImage: nextMain, gallery: nextGallery, updatedAt: now })
          .where(eq(destinations.id, dest.id));
      }
    }
  } catch (error) {
    console.error("Failed to propagate replaced media URL across records:", error);
  }
}

// Website Content CMS
export async function getMainSiteContent() {
  try {
    const rows = await db
      .select()
      .from(siteContent)
      .where(eq(siteContent.sectionKey, "main"))
      .limit(1);
    return rows[0] || null;
  } catch (error) {
    wrapDbError("Failed to load website content", error);
  }
}

export async function upsertMainSiteContent(
  data: Partial<typeof siteContent.$inferInsert>,
  actorEmail: string,
) {
  try {
    const existing = await getMainSiteContent();
    if (existing) {
      const [updated] = await db
        .update(siteContent)
        .set({
          ...data,
          updatedByEmail: actorEmail,
          updatedAt: new Date(),
        })
        .where(eq(siteContent.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(siteContent)
      .values({
        sectionKey: "main",
        ...data,
        updatedByEmail: actorEmail,
      })
      .returning();
    return created;
  } catch (error) {
    wrapDbError("Failed to save website content", error);
  }
}
