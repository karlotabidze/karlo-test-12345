export interface CountryRecord {
  id: number;
  code: string;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  imageUrl: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CityRecord {
  id: number;
  countryId: number;
  slug: string;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  imageUrl: string;
  airportCode: string;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationRecord {
  id: number;
  slug: string;
  nameKa: string;
  nameEn: string;
  descriptionKa: string;
  descriptionEn: string;
  countryId: number;
  cityId: number | null;
  mainImage: string;
  gallery: string[];
  googlePlaceId: string;
  formattedAddress: string;
  latitude: number | null;
  longitude: number | null;
  featured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TourRecord {
  id: number;
  slug: string;
  titleKa: string;
  titleEn: string;
  descriptionKa: string;
  descriptionEn: string;
  category: string;
  categoryKa: string;
  countryId: number | null;
  cityId: number | null;
  destinationId: number | null;
  cityNameKa: string;
  cityNameEn: string;
  mainImage: string;
  gallery: string[];
  price: number;
  discountedPrice: number | null;
  effectivePrice?: number;
  originalPrice?: number;
  hasDiscount?: boolean;
  promotionTitleEn?: string | null;
  promotionTitleKa?: string | null;
  currency: string;
  durationDays: number;
  highlightsKa: string[];
  highlightsEn: string[];
  itineraryKa: string[];
  itineraryEn: string[];
  includedKa: string[];
  includedEn: string[];
  excludedKa: string[];
  excludedEn: string[];
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
  createdAt: string;
  updatedAt: string;
}

export interface FlightRouteRecord {
  id: number;
  departureAirport: string;
  arrivalAirport: string;
  departureCityKa: string;
  departureCityEn: string;
  arrivalCityKa: string;
  arrivalCityEn: string;
  arrivalCountryKa: string;
  arrivalCountryEn: string;
  airlineName: string;
  airlineLogo: string;
  routeDescriptionKa: string;
  routeDescriptionEn: string;
  partnerBookingUrl: string;
  price: number | null;
  currency: string;
  routeImage: string;
  active: boolean;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionRecord {
  id: number;
  titleKa: string;
  titleEn: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  currency: string;
  tourId: number | null;
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryRecord {
  id: number;
  tourId: number | null;
  tourTitle: string;
  previousPrice: number | null;
  newPrice: number;
  previousDiscountedPrice: number | null;
  newDiscountedPrice: number | null;
  currency: string;
  changedByEmail: string;
  createdAt: string;
}

export interface MediaAssetRecord {
  id: number;
  fileName: string;
  url: string;
  storagePath: string;
  storageProvider: string;
  mimeType: string;
  sizeBytes: number;
  entityType: string;
  entityId: number | null;
  altTextKa: string;
  altTextEn: string;
  descriptionKa: string;
  descriptionEn: string;
  isMain: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteContentRecord {
  id?: number;
  sectionKey: string;
  heroEyebrowKa: string;
  heroEyebrowEn: string;
  heroTitleKa: string;
  heroTitleEn: string;
  heroDescriptionKa: string;
  heroDescriptionEn: string;
  heroImageUrl: string;
  heroSecondaryImageUrl: string;
  aboutEyebrowKa: string;
  aboutEyebrowEn: string;
  aboutTitleKa: string;
  aboutTitleEn: string;
  aboutDescriptionKa: string;
  aboutDescriptionEn: string;
  aboutImageUrl: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  seoTitleKa: string;
  seoTitleEn: string;
  seoDescriptionKa: string;
  seoDescriptionEn: string;
  updatedByEmail?: string;
  updatedAt?: string;
}

export interface ActivityLogRecord {
  id: number;
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityName: string;
  details: string;
  createdAt: string;
}

export interface OverviewResponse {
  counts: {
    totalDestinations: number;
    totalCountries: number;
    totalCities: number;
    activeTours: number;
    inactiveTours: number;
    totalTours: number;
    totalFlightRoutes: number;
    activeFlightRoutes: number;
  };
  recentTours: TourRecord[];
  recentDestinations: DestinationRecord[];
  recentPriceChanges: PriceHistoryRecord[];
  recentActivities: ActivityLogRecord[];
}
