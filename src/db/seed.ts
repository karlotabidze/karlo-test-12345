import { db } from "./index.ts";
import {
  activityLogs,
  cities,
  countries,
  destinations,
  flightRoutes,
  mediaAssets,
  siteContent,
  tours,
} from "./schema.ts";
import toursJson from "../../data/tours.json" with { type: "json" };
import flightsJson from "../../data/flights.json" with { type: "json" };

const HERO_IMAGE = "/src/assets/images/hero_georgia_caucasus_1793733036447.jpg";
const ABOUT_IMAGE = "/src/assets/images/about_svaneti_towers_1793733036501.jpg";
const GEORGIA_COVER = "/src/assets/images/georgia_country_cover_1793733037468.jpg";

const AIRPORT_CITIES: Record<string, { ka: string; en: string }> = {
  TBS: { ka: "თბილისი", en: "Tbilisi" },
  KUT: { ka: "ქუთაისი", en: "Kutaisi" },
  BUS: { ka: "ბათუმი", en: "Batumi" },
  MEP: { ka: "მესტია", en: "Mestia" },
  MST: { ka: "მესტია", en: "Mestia" },
  AMB: { ka: "ამბროლაური", en: "Ambrolauri" },
  TEL: { ka: "თელავი", en: "Telavi" },
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let seedPromise: Promise<void> | null = null;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((err) => {
      seedPromise = null;
      console.error("Database seed check failed:", err);
      throw new Error("Failed to initialize initial database records.", { cause: err });
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  const existing = await db.select({ id: countries.id }).from(countries).limit(1);
  if (existing.length > 0) {
    return;
  }

  // 1. Insert Georgia + destination countries from flights.json
  const [georgia] = await db
    .insert(countries)
    .values({
      code: "GE",
      nameKa: "საქართველო",
      nameEn: "Georgia",
      descriptionKa:
        "კავკასიონის მწვერვალები, შავი ზღვის სანაპირო, უძველესი ღვინის კულტურა და სტუმართმოყვარეობა.",
      descriptionEn:
        "Greater Caucasus peaks, Black Sea coastline, 8,000-year wine heritage, and warm hospitality.",
      imageUrl: GEORGIA_COVER,
      featured: true,
      published: true,
    })
    .returning();

  if (!georgia) {
    throw new Error("Failed to seed primary country record.");
  }

  const seenCountryEn = new Set<string>(["Georgia"]);
  for (const route of flightsJson) {
    const countryEn = route.countryEn.trim();
    if (!countryEn || seenCountryEn.has(countryEn)) continue;
    seenCountryEn.add(countryEn);
    const codeCandidate =
      countryEn
        .replace(/[^A-Za-z]/g, "")
        .slice(0, 3)
        .toUpperCase() + String(seenCountryEn.size);
    await db
      .insert(countries)
      .values({
        code: codeCandidate,
        nameKa: route.country,
        nameEn: countryEn,
        descriptionKa: "",
        descriptionEn: "",
        imageUrl: "",
        featured: false,
        published: true,
      })
      .onConflictDoNothing();
  }

  // 2. Insert Georgian cities from tours.json + domestic airports
  const cityMapByEn: Record<string, number> = {};
  const airportByCityEn: Record<string, string> = {
    Tbilisi: "TBS",
    Batumi: "BUS",
    Kutaisi: "KUT",
    Mestia: "MEP",
    Ambrolauri: "AMB",
    Telavi: "TEL",
  };

  for (const item of toursJson) {
    const cityEn = item.cityEn.trim();
    if (cityMapByEn[cityEn]) continue;
    const [insertedCity] = await db
      .insert(cities)
      .values({
        countryId: georgia.id,
        slug: toSlug(cityEn),
        nameKa: item.city,
        nameEn: cityEn,
        descriptionKa: item.description,
        descriptionEn: item.descriptionEn,
        imageUrl: item.image,
        airportCode: airportByCityEn[cityEn] || "",
        featured: ["Tbilisi", "Batumi", "Kazbegi", "Mestia"].includes(cityEn),
        published: true,
      })
      .returning();
    if (insertedCity) {
      cityMapByEn[cityEn] = insertedCity.id;
    }
  }

  for (const extra of [
    { ka: "ამბროლაური", en: "Ambrolauri", code: "AMB" },
    { ka: "თელავი", en: "Telavi", code: "TEL" },
  ]) {
    if (!cityMapByEn[extra.en]) {
      const [inserted] = await db
        .insert(cities)
        .values({
          countryId: georgia.id,
          slug: toSlug(extra.en),
          nameKa: extra.ka,
          nameEn: extra.en,
          airportCode: extra.code,
          featured: false,
          published: true,
        })
        .returning();
      if (inserted) {
        cityMapByEn[extra.en] = inserted.id;
      }
    }
  }

  // 3. Insert Destinations linked to Georgia & Cities (coordinates left null until chosen via Google Maps API)
  const destMapBySlug: Record<string, number> = {};
  for (const [idx, item] of toursJson.entries()) {
    const cityId = cityMapByEn[item.cityEn] ?? null;
    const destSlug = `${item.id}-destination`;
    const [dest] = await db
      .insert(destinations)
      .values({
        slug: destSlug,
        nameKa: item.city,
        nameEn: item.cityEn,
        descriptionKa: item.description,
        descriptionEn: item.descriptionEn,
        countryId: georgia.id,
        cityId,
        mainImage: item.image,
        gallery: [item.image],
        googlePlaceId: "",
        formattedAddress: "",
        latitude: null,
        longitude: null,
        featured: idx < 4,
        published: true,
      })
      .returning();
    if (dest) {
      destMapBySlug[item.id] = dest.id;
    }
  }

  // 4. Insert all existing Tours from data/tours.json
  for (const [idx, item] of toursJson.entries()) {
    const cityId = cityMapByEn[item.cityEn] ?? null;
    const destinationId = destMapBySlug[item.id] ?? null;
    const [insertedTour] = await db
      .insert(tours)
      .values({
        slug: item.id,
        titleKa: item.title,
        titleEn: item.titleEn,
        descriptionKa: item.description,
        descriptionEn: item.descriptionEn,
        category: item.type,
        categoryKa: item.typeKa,
        countryId: georgia.id,
        cityId,
        destinationId,
        cityNameKa: item.city,
        cityNameEn: item.cityEn,
        mainImage: item.image,
        gallery: [item.image],
        price: item.price,
        discountedPrice: null,
        currency: "GEL",
        durationDays: item.days,
        highlightsKa: item.itinerary.slice(0, 3),
        highlightsEn: item.itineraryEn.slice(0, 3),
        itineraryKa: item.itinerary,
        itineraryEn: item.itineraryEn,
        includedKa: item.included,
        includedEn: item.includedEn,
        excludedKa: ["პირადი ხარჯები"],
        excludedEn: ["Personal expenses"],
        importantInfoKa: "რეკომენდებულია კომფორტული ფეხსაცმელი და სეზონური სამოსი.",
        importantInfoEn: "Comfortable walking shoes and weather-appropriate clothing recommended.",
        departureInfoKa: "გასვლა თბილისიდან დილის 09:00 საათზე",
        departureInfoEn: "Departure from Tbilisi at 09:00 AM",
        returnInfoKa: "დაბრუნება საღამოს საათებში",
        returnInfoEn: "Evening return to departure point",
        availabilityStatus: "available",
        published: true,
        featured: idx < 3,
        partnerBookingUrl: "",
        seoTitleKa: `${item.title} — Saqo Travel`,
        seoTitleEn: `${item.titleEn} — Saqo Travel`,
        seoDescriptionKa: item.description,
        seoDescriptionEn: item.descriptionEn,
      })
      .returning();

    if (insertedTour) {
      await db.insert(mediaAssets).values({
        fileName: `${item.id}.jpg`,
        url: item.image,
        storagePath: "",
        storageProvider: "external",
        mimeType: "image/jpeg",
        sizeBytes: 0,
        entityType: "tour",
        entityId: insertedTour.id,
        altTextKa: item.title,
        altTextEn: item.titleEn,
        descriptionKa: item.description,
        descriptionEn: item.descriptionEn,
        isMain: true,
      });
    }
  }

  // 5. Insert all existing Flight Routes from data/flights.json in batches
  const flightValues = flightsJson.map((route) => {
    const dep = AIRPORT_CITIES[route.from] || { ka: route.from, en: route.from };
    return {
      departureAirport: route.from,
      arrivalAirport: route.to,
      departureCityKa: dep.ka,
      departureCityEn: dep.en,
      arrivalCityKa: route.city,
      arrivalCityEn: route.cityEn,
      arrivalCountryKa: route.country,
      arrivalCountryEn: route.countryEn,
      airlineName: "",
      airlineLogo: "",
      routeDescriptionKa: "პირდაპირი მიმართულება",
      routeDescriptionEn: "Direct route",
      partnerBookingUrl: "",
      price: null,
      currency: "GEL",
      routeImage: "",
      active: true,
      isManual: false,
    };
  });

  if (flightValues.length > 0) {
    await db.insert(flightRoutes).values(flightValues);
  }

  // 6. Seed Editable Website Content (Homepage Hero, About, Contact, SEO)
  await db.insert(siteContent).values({
    sectionKey: "main",
    heroEyebrowKa: "აღმოაჩინე საქართველო ჩვენთან ერთად",
    heroEyebrowEn: "Discover Georgia with us",
    heroTitleKa: "შენი შემდეგი თავგადასავალი\nაქ იწყება.",
    heroTitleEn: "Your next adventure\nstarts here.",
    heroDescriptionKa:
      "მთები, ზღვა, ღვინო და დაუვიწყარი ისტორიები — აღმოაჩინე საქართველო შენს ტემპში.",
    heroDescriptionEn:
      "Mountains, sea, wine and unforgettable stories — discover Georgia at your own pace.",
    heroImageUrl: HERO_IMAGE,
    heroSecondaryImageUrl: GEORGIA_COVER,
    aboutEyebrowKa: "ჩვენი ამბავი",
    aboutEyebrowEn: "Our story",
    aboutTitleKa: "საქართველო უფრო მეტია,\nვიდრე მიმართულება.",
    aboutTitleEn: "Georgia is more\nthan a destination.",
    aboutDescriptionKa:
      "Saqo Travel აერთიანებს ადგილობრივ გამოცდილებას, გამორჩეულ მარშრუტებსა და მარტივ დაგეგმვას. გვჯერა, რომ საუკეთესო მოგზაურობა ადამიანებით, გემოებითა და აღმოჩენებით იქმნება.",
    aboutDescriptionEn:
      "Saqo Travel brings together local expertise, unique routes and easy planning. We believe the best journeys are made of people, flavours and discoveries.",
    aboutImageUrl: ABOUT_IMAGE,
    contactEmail: "saqotravel@gmail.com",
    contactPhone: "557 56 59 97",
    whatsappNumber: "995557565997",
    seoTitleKa: "Saqo Travel — აღმოაჩინე საქართველო",
    seoTitleEn: "Saqo Travel — Discover Georgia",
    seoDescriptionKa:
      "Saqo Travel — აღმოაჩინე საქართველო ტურებით და დაგეგმე შენი შემდეგი მოგზაურობა.",
    seoDescriptionEn:
      "Saqo Travel — Curated tours, destinations, and flight routes across Georgia.",
    updatedByEmail: "system@saqotravel.ge",
  });

  // Register generated site images in media library
  await db.insert(mediaAssets).values([
    {
      fileName: "hero_georgia_caucasus.jpg",
      url: HERO_IMAGE,
      storagePath: "",
      storageProvider: "local",
      mimeType: "image/jpeg",
      sizeBytes: 0,
      entityType: "site",
      entityId: 1,
      altTextKa: "ყაზბეგი და გერგეტის სამება",
      altTextEn: "Mount Kazbek and Gergeti Trinity Church at sunrise",
      descriptionKa: "მთავარი გვერდის ფონური სურათი",
      descriptionEn: "Homepage hero background image",
      isMain: true,
    },
    {
      fileName: "about_svaneti_towers.jpg",
      url: ABOUT_IMAGE,
      storagePath: "",
      storageProvider: "local",
      mimeType: "image/jpeg",
      sizeBytes: 0,
      entityType: "site",
      entityId: 1,
      altTextKa: "სვანეთის კოშკები უშგულში",
      altTextEn: "Medieval Svaneti defensive towers in Ushguli",
      descriptionKa: "ჩვენს შესახებ სექციის სურათი",
      descriptionEn: "About section feature photograph",
      isMain: false,
    },
    {
      fileName: "georgia_country_cover.jpg",
      url: GEORGIA_COVER,
      storagePath: "",
      storageProvider: "local",
      mimeType: "image/jpeg",
      sizeBytes: 0,
      entityType: "country",
      entityId: georgia.id,
      altTextKa: "ძველი თბილისის პანორამა",
      altTextEn: "Panoramic twilight view of Old Tbilisi",
      descriptionKa: "საქართველოს მთავარი სურათი",
      descriptionEn: "Georgia country cover image",
      isMain: true,
    },
  ]);

  await db.insert(activityLogs).values({
    actorUid: "system",
    actorEmail: "system@saqotravel.ge",
    action: "seed",
    entityType: "system",
    entityName: "Initial Repository Migration",
    details: `Imported ${toursJson.length} tours and ${flightsJson.length} flight routes from repository JSON files.`,
  });
}
