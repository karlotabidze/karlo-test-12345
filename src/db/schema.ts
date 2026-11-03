import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").default("").notNull(),
  role: text("role").default("admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameKa: text("name_ka").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionKa: text("description_ka").default("").notNull(),
  descriptionEn: text("description_en").default("").notNull(),
  imageUrl: text("image_url").default("").notNull(),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cities = pgTable("cities", {
  id: serial("id").primaryKey(),
  countryId: integer("country_id")
    .references(() => countries.id, { onDelete: "restrict" })
    .notNull(),
  slug: text("slug").notNull().unique(),
  nameKa: text("name_ka").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionKa: text("description_ka").default("").notNull(),
  descriptionEn: text("description_en").default("").notNull(),
  imageUrl: text("image_url").default("").notNull(),
  airportCode: text("airport_code").default("").notNull(),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const destinations = pgTable("destinations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameKa: text("name_ka").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionKa: text("description_ka").default("").notNull(),
  descriptionEn: text("description_en").default("").notNull(),
  countryId: integer("country_id")
    .references(() => countries.id, { onDelete: "restrict" })
    .notNull(),
  cityId: integer("city_id").references(() => cities.id, { onDelete: "restrict" }),
  mainImage: text("main_image").default("").notNull(),
  gallery: jsonb("gallery").$type<string[]>().default([]).notNull(),
  googlePlaceId: text("google_place_id").default("").notNull(),
  formattedAddress: text("formatted_address").default("").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  featured: boolean("featured").default(false).notNull(),
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tours = pgTable("tours", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  titleKa: text("title_ka").notNull(),
  titleEn: text("title_en").notNull(),
  descriptionKa: text("description_ka").notNull(),
  descriptionEn: text("description_en").notNull(),
  category: text("category").default("culture").notNull(),
  categoryKa: text("category_ka").default("კულტურა").notNull(),
  countryId: integer("country_id").references(() => countries.id, { onDelete: "restrict" }),
  cityId: integer("city_id").references(() => cities.id, { onDelete: "restrict" }),
  destinationId: integer("destination_id").references(() => destinations.id, {
    onDelete: "set null",
  }),
  cityNameKa: text("city_name_ka").notNull(),
  cityNameEn: text("city_name_en").notNull(),
  mainImage: text("main_image").notNull(),
  gallery: jsonb("gallery").$type<string[]>().default([]).notNull(),
  price: doublePrecision("price").notNull(),
  discountedPrice: doublePrecision("discounted_price"),
  currency: text("currency").default("GEL").notNull(),
  durationDays: integer("duration_days").default(1).notNull(),
  highlightsKa: jsonb("highlights_ka").$type<string[]>().default([]).notNull(),
  highlightsEn: jsonb("highlights_en").$type<string[]>().default([]).notNull(),
  itineraryKa: jsonb("itinerary_ka").$type<string[]>().default([]).notNull(),
  itineraryEn: jsonb("itinerary_en").$type<string[]>().default([]).notNull(),
  includedKa: jsonb("included_ka").$type<string[]>().default([]).notNull(),
  includedEn: jsonb("included_en").$type<string[]>().default([]).notNull(),
  excludedKa: jsonb("excluded_ka").$type<string[]>().default([]).notNull(),
  excludedEn: jsonb("excluded_en").$type<string[]>().default([]).notNull(),
  importantInfoKa: text("important_info_ka").default("").notNull(),
  importantInfoEn: text("important_info_en").default("").notNull(),
  departureInfoKa: text("departure_info_ka").default("").notNull(),
  departureInfoEn: text("departure_info_en").default("").notNull(),
  returnInfoKa: text("return_info_ka").default("").notNull(),
  returnInfoEn: text("return_info_en").default("").notNull(),
  availabilityStatus: text("availability_status").default("available").notNull(),
  published: boolean("published").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  partnerBookingUrl: text("partner_booking_url").default("").notNull(),
  seoTitleKa: text("seo_title_ka").default("").notNull(),
  seoTitleEn: text("seo_title_en").default("").notNull(),
  seoDescriptionKa: text("seo_description_ka").default("").notNull(),
  seoDescriptionEn: text("seo_description_en").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const flightRoutes = pgTable("flight_routes", {
  id: serial("id").primaryKey(),
  departureAirport: text("departure_airport").notNull(),
  arrivalAirport: text("arrival_airport").notNull(),
  departureCityKa: text("departure_city_ka").notNull(),
  departureCityEn: text("departure_city_en").notNull(),
  arrivalCityKa: text("arrival_city_ka").notNull(),
  arrivalCityEn: text("arrival_city_en").notNull(),
  arrivalCountryKa: text("arrival_country_ka").default("").notNull(),
  arrivalCountryEn: text("arrival_country_en").default("").notNull(),
  airlineName: text("airline_name").default("").notNull(),
  airlineLogo: text("airline_logo").default("").notNull(),
  routeDescriptionKa: text("route_description_ka").default("").notNull(),
  routeDescriptionEn: text("route_description_en").default("").notNull(),
  partnerBookingUrl: text("partner_booking_url").default("").notNull(),
  price: doublePrecision("price"),
  currency: text("currency").default("GEL").notNull(),
  routeImage: text("route_image").default("").notNull(),
  active: boolean("active").default(true).notNull(),
  isManual: boolean("is_manual").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  titleKa: text("title_ka").notNull(),
  titleEn: text("title_en").notNull(),
  code: text("code").default("").notNull(),
  discountType: text("discount_type").default("percentage").notNull(),
  discountValue: doublePrecision("discount_value").notNull(),
  currency: text("currency").default("GEL").notNull(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: "cascade" }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id").references(() => tours.id, { onDelete: "cascade" }),
  tourTitle: text("tour_title").notNull(),
  previousPrice: doublePrecision("previous_price"),
  newPrice: doublePrecision("new_price").notNull(),
  previousDiscountedPrice: doublePrecision("previous_discounted_price"),
  newDiscountedPrice: doublePrecision("new_discounted_price"),
  currency: text("currency").default("GEL").notNull(),
  changedByEmail: text("changed_by_email").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  url: text("url").notNull(),
  storagePath: text("storage_path").notNull(),
  storageProvider: text("storage_provider").default("local").notNull(),
  mimeType: text("mime_type").default("image/jpeg").notNull(),
  sizeBytes: integer("size_bytes").default(0).notNull(),
  entityType: text("entity_type").default("general").notNull(),
  entityId: integer("entity_id"),
  altTextKa: text("alt_text_ka").default("").notNull(),
  altTextEn: text("alt_text_en").default("").notNull(),
  descriptionKa: text("description_ka").default("").notNull(),
  descriptionEn: text("description_en").default("").notNull(),
  isMain: boolean("is_main").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  sectionKey: text("section_key").notNull().unique(),
  heroEyebrowKa: text("hero_eyebrow_ka").default("").notNull(),
  heroEyebrowEn: text("hero_eyebrow_en").default("").notNull(),
  heroTitleKa: text("hero_title_ka").default("").notNull(),
  heroTitleEn: text("hero_title_en").default("").notNull(),
  heroDescriptionKa: text("hero_description_ka").default("").notNull(),
  heroDescriptionEn: text("hero_description_en").default("").notNull(),
  heroImageUrl: text("hero_image_url").default("").notNull(),
  heroSecondaryImageUrl: text("hero_secondary_image_url").default("").notNull(),
  aboutEyebrowKa: text("about_eyebrow_ka").default("").notNull(),
  aboutEyebrowEn: text("about_eyebrow_en").default("").notNull(),
  aboutTitleKa: text("about_title_ka").default("").notNull(),
  aboutTitleEn: text("about_title_en").default("").notNull(),
  aboutDescriptionKa: text("about_description_ka").default("").notNull(),
  aboutDescriptionEn: text("about_description_en").default("").notNull(),
  aboutImageUrl: text("about_image_url").default("").notNull(),
  contactEmail: text("contact_email").default("saqotravel@gmail.com").notNull(),
  contactPhone: text("contact_phone").default("557 56 59 97").notNull(),
  whatsappNumber: text("whatsapp_number").default("995557565997").notNull(),
  seoTitleKa: text("seo_title_ka").default("").notNull(),
  seoTitleEn: text("seo_title_en").default("").notNull(),
  seoDescriptionKa: text("seo_description_ka").default("").notNull(),
  seoDescriptionEn: text("seo_description_en").default("").notNull(),
  updatedByEmail: text("updated_by_email").default("").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  actorUid: text("actor_uid").default("").notNull(),
  actorEmail: text("actor_email").default("").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityName: text("entity_name").notNull(),
  details: text("details").default("").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const countriesRelations = relations(countries, ({ many }) => ({
  cities: many(cities),
  destinations: many(destinations),
  tours: many(tours),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  country: one(countries, {
    fields: [cities.countryId],
    references: [countries.id],
  }),
  destinations: many(destinations),
  tours: many(tours),
}));

export const destinationsRelations = relations(destinations, ({ one, many }) => ({
  country: one(countries, {
    fields: [destinations.countryId],
    references: [countries.id],
  }),
  city: one(cities, {
    fields: [destinations.cityId],
    references: [cities.id],
  }),
  tours: many(tours),
}));

export const toursRelations = relations(tours, ({ one, many }) => ({
  country: one(countries, {
    fields: [tours.countryId],
    references: [countries.id],
  }),
  city: one(cities, {
    fields: [tours.cityId],
    references: [cities.id],
  }),
  destination: one(destinations, {
    fields: [tours.destinationId],
    references: [destinations.id],
  }),
  promotions: many(promotions),
}));

export const promotionsRelations = relations(promotions, ({ one }) => ({
  tour: one(tours, {
    fields: [promotions.tourId],
    references: [tours.id],
  }),
}));
