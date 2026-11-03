const state = {
  tours: [],
  flights: [],
  destinations: [],
  siteContent: null,
  lang: localStorage.getItem("saqo-language") || "ka",
  theme: localStorage.getItem("saqo-theme") || "light",
  selectedTour: null,
};
let emailAddress = "saqotravel@gmail.com";
const translations = {
  ka: {
    navHome: "მთავარი",
    navTours: "შიდა ტურები",
    navFlights: "ფრენები",
    navAbout: "ჩვენს შესახებ",
    navContact: "კონტაქტი",
    planTrip: "დაგეგმე მოგზაურობა",
    heroEyebrow: "აღმოაჩინე საქართველო ჩვენთან ერთად",
    heroTitle: "შენი შემდეგი თავგადასავალი<br>აქ იწყება.",
    heroText: "მთები, ზღვა, ღვინო და დაუვიწყარი ისტორიები — აღმოაჩინე საქართველო შენს ტემპში.",
    exploreTours: "ტურების აღმოჩენა",
    searchFlights: "შიდა და საერთაშორისო ფრენები",
    tabTours: "ტურები",
    tabFlights: "შიდა და საერთაშორისო ფრენები",
    destination: "მიმართულება",
    tourType: "ტურის ტიპი",
    duration: "ხანგრძლივობა",
    findTour: "ტურის ძიება",
    from: "საიდან",
    to: "სად",
    date: "თარიღი",
    passengers: "მგზავრები",
    findFlight: "რეისების ძიება",
    toursEyebrow: "შენი საქართველო",
    toursTitle: "აღმოაჩინე ადგილები,<br>რომლებიც არასდროს დაგავიწყდება.",
    toursIntro:
      "შერჩეული მარშრუტები საქართველოს ყველა კუთხეში — ქალაქური გასეირნებებიდან მთის თავგადასავლებამდე.",
    filterCity: "ქალაქი",
    filterPrice: "მაქს. ფასი",
    filterDuration: "ხანგრძლივობა",
    filterType: "ტურის ტიპი",
    flightEyebrow: "საქართველო ზემოდან",
    flightTitle: "გადაადგილდი მარტივად.",
    flightIntro:
      "აირჩიე საქართველოს აეროპორტი და ნახე პირდაპირი შიდა და საერთაშორისო მიმართულებები.",
    flightHint: "აირჩიე გამგზავრების აეროპორტი, დანიშნულება და თარიღი.",
    flightDisclaimer:
      "მიმართულებები აეროპორტებისა და მარშრუტების საჯარო რუკებზეა დაფუძნებული. სეზონურობა და განრიგი თარიღის მიხედვით გადაამოწმე.",
    aboutEyebrow: "ჩვენი ამბავი",
    aboutTitle: "საქართველო უფრო მეტია,<br>ვიდრე მიმართულება.",
    aboutText:
      "Saqo Travel აერთიანებს ადგილობრივ გამოცდილებას, გამორჩეულ მარშრუტებსა და მარტივ დაგეგმვას. გვჯერა, რომ საუკეთესო მოგზაურობა ადამიანებით, გემოებითა და აღმოჩენებით იქმნება.",
    regions: "რეგიონი",
    local: "ადგილობრივი შთაბეჭდილებები",
    support: "მხარდაჭერა",
    contactEyebrow: "დავგეგმოთ ერთად",
    contactTitle: "მზად ხარ ახალი<br>ისტორიისთვის?",
    contactText:
      "მოგვწერე სასურველი მიმართულება და ჩვენი გუნდი დაგეხმარება მოგზაურობის დაგეგმვაში.",
    yourName: "სახელი",
    yourPhone: "ტელეფონი",
    yourMessage: "შეტყობინება",
    sendRequest: "მოთხოვნის გაგზავნა",
    contactNote: "მოთხოვნა გაიგზავნება პირდაპირ ჩვენს ელფოსტაზე.",
    phoneInvalid:
      "შეიყვანეთ ქართული მობილურის ნომერი, მაგალითად 557 56 59 97 ან +995 557 56 59 97.",
    sendSuccess: "მოთხოვნა წარმატებით გაიგზავნა. მადლობა!",
    sendError: "მოთხოვნის გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით.",
    namePlaceholder: "თქვენი სახელი",
    phonePlaceholder: "557 56 59 97",
    messagePlaceholder: "სად გსურთ მოგზაურობა?",
    themeLight: "ღია რეჟიმი",
    themeDark: "მუქი რეჟიმი",
    allDestinations: "ყველა მიმართულება",
    allTypes: "ყველა ტიპი",
    nature: "ბუნება",
    culture: "კულტურა",
    wine: "ღვინო",
    adventure: "თავგადასავალი",
    anyDuration: "ნებისმიერი",
    oneDay: "1 დღე",
    twoThreeDays: "2–3 დღე",
    fourPlusDays: "4+ დღე",
    allCities: "ყველა ქალაქი",
    upTo100: "100 ₾-მდე",
    upTo200: "200 ₾-მდე",
    upTo400: "400 ₾-მდე",
    rights: "ყველა უფლება დაცულია.",
    backTop: "ზემოთ დაბრუნება ↑",
    bookingTitle: "ტურის მოთხოვნა",
    sendBooking: "მოთხოვნის გაგზავნა",
    details: "დეტალები",
    book: "დაჯავშნის მოთხოვნა",
    partnerBook: "პარტნიორთან დაჯავშნა ↗",
    days: "დღე",
    perPerson: "ერთ ადამიანზე",
    noTours: "მითითებული ფილტრებით ტური ვერ მოიძებნა.",
    highlights: "მთავარი შთაბეჭდილებები",
    included: "ფასში შედის",
    excluded: "ფასში არ შედის",
    importantInfo: "მნიშვნელოვანი ინფორმაცია",
    departureReturn: "გასვლა და დაბრუნება",
    program: "პროგრამა",
    route: "მარშრუტი",
    bookFlight: "დაჯავშნის მოთხოვნა",
    flightNoResults: "ამ აეროპორტიდან მიმართულება ვერ მოიძებნა.",
  },
  en: {
    navHome: "Home",
    navTours: "Georgia tours",
    navFlights: "Flights",
    navAbout: "About us",
    navContact: "Contact",
    planTrip: "Plan your trip",
    heroEyebrow: "Discover Georgia with us",
    heroTitle: "Your next adventure<br>starts here.",
    heroText: "Mountains, sea, wine and unforgettable stories — discover Georgia at your own pace.",
    exploreTours: "Explore tours",
    searchFlights: "Domestic & international flights",
    tabTours: "Tours",
    tabFlights: "Domestic & international flights",
    destination: "Destination",
    tourType: "Tour type",
    duration: "Duration",
    findTour: "Find a tour",
    from: "From",
    to: "To",
    date: "Date",
    passengers: "Passengers",
    findFlight: "Search flights",
    toursEyebrow: "Your Georgia",
    toursTitle: "Discover places<br>you will never forget.",
    toursIntro: "Curated routes across Georgia — from city walks to mountain adventures.",
    filterCity: "City",
    filterPrice: "Max. price",
    filterDuration: "Duration",
    filterType: "Tour type",
    flightEyebrow: "Georgia from above",
    flightTitle: "Travel with ease.",
    flightIntro:
      "Choose a Georgian airport and explore domestic and international direct destinations.",
    flightHint: "Choose a departure airport, destination and date.",
    flightDisclaimer:
      "Destinations are based on public airport route maps. Check seasonal operation and schedules for your travel date.",
    aboutEyebrow: "Our story",
    aboutTitle: "Georgia is more<br>than a destination.",
    aboutText:
      "Saqo Travel brings together local expertise, unique routes and easy planning. We believe the best journeys are made of people, flavours and discoveries.",
    regions: "Regions",
    local: "Local experiences",
    support: "Support",
    contactEyebrow: "Let's plan together",
    contactTitle: "Ready for a new<br>story?",
    contactText: "Tell us where you want to go and our team will help plan your journey.",
    yourName: "Name",
    yourPhone: "Phone",
    yourMessage: "Message",
    sendRequest: "Send request",
    contactNote: "Your request will be sent directly to our email.",
    phoneInvalid: "Enter a Georgian mobile number, e.g. 557 56 59 97 or +995 557 56 59 97.",
    sendSuccess: "Your request was sent successfully. Thank you!",
    sendError: "Could not send your request. Please try again.",
    namePlaceholder: "Your name",
    phonePlaceholder: "557 56 59 97",
    messagePlaceholder: "Where would you like to travel?",
    themeLight: "Light mode",
    themeDark: "Dark mode",
    allDestinations: "All destinations",
    allTypes: "All types",
    nature: "Nature",
    culture: "Culture",
    wine: "Wine",
    adventure: "Adventure",
    anyDuration: "Any duration",
    oneDay: "1 day",
    twoThreeDays: "2–3 days",
    fourPlusDays: "4+ days",
    allCities: "All cities",
    upTo100: "Up to ₾100",
    upTo200: "Up to ₾200",
    upTo400: "Up to ₾400",
    rights: "All rights reserved.",
    backTop: "Back to top ↑",
    bookingTitle: "Tour enquiry",
    sendBooking: "Send enquiry",
    details: "Details",
    book: "Request booking",
    partnerBook: "Book via partner ↗",
    days: "days",
    perPerson: "per person",
    noTours: "No tours match your filters.",
    highlights: "Highlights",
    included: "Included",
    excluded: "Not included",
    importantInfo: "Important information",
    departureReturn: "Departure & return",
    program: "Itinerary",
    route: "Route",
    bookFlight: "Request booking",
    flightNoResults: "No destinations found from this airport.",
  },
};

const t = (key) => translations[state.lang][key] || key;
const currencySymbol = (code) => ({ GEL: "₾", USD: "$", EUR: "€" })[code || "GEL"] || code || "₾";
const money = (value, currency = "GEL") => {
  const formatted = new Intl.NumberFormat(state.lang === "ka" ? "ka-GE" : "en-US").format(value);
  const sym = currencySymbol(currency);
  return currency === "USD" || currency === "EUR" ? sym + formatted : formatted + " " + sym;
};

function safeText(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
}

function normalizeDbTour(row) {
  return {
    id: row.slug || String(row.id),
    city: row.cityNameKa || row.city || "",
    cityEn: row.cityNameEn || row.cityEn || "",
    title: row.titleKa || row.title || "",
    titleEn: row.titleEn || "",
    description: row.descriptionKa || row.description || "",
    descriptionEn: row.descriptionEn || "",
    price: Number(row.effectivePrice ?? row.price ?? 0),
    originalPrice: Number(row.originalPrice ?? row.price ?? 0),
    hasDiscount: Boolean(row.hasDiscount),
    promotionTitleKa: row.promotionTitleKa || null,
    promotionTitleEn: row.promotionTitleEn || null,
    currency: row.currency || "GEL",
    days: Number(row.durationDays ?? row.days ?? 1),
    type: row.category || row.type || "culture",
    typeKa: row.categoryKa || row.typeKa || "კულტურა",
    image: row.mainImage || row.image || "",
    gallery:
      Array.isArray(row.gallery) && row.gallery.length
        ? row.gallery
        : [row.mainImage || row.image].filter(Boolean),
    highlights: Array.isArray(row.highlightsKa) ? row.highlightsKa : [],
    highlightsEn: Array.isArray(row.highlightsEn) ? row.highlightsEn : [],
    itinerary: Array.isArray(row.itineraryKa)
      ? row.itineraryKa
      : Array.isArray(row.itinerary)
        ? row.itinerary
        : [],
    itineraryEn: Array.isArray(row.itineraryEn) ? row.itineraryEn : [],
    included: Array.isArray(row.includedKa)
      ? row.includedKa
      : Array.isArray(row.included)
        ? row.included
        : [],
    includedEn: Array.isArray(row.includedEn) ? row.includedEn : [],
    excluded: Array.isArray(row.excludedKa) ? row.excludedKa : [],
    excludedEn: Array.isArray(row.excludedEn) ? row.excludedEn : [],
    importantInfo: row.importantInfoKa || "",
    importantInfoEn: row.importantInfoEn || "",
    departureInfo: row.departureInfoKa || "",
    departureInfoEn: row.departureInfoEn || "",
    returnInfo: row.returnInfoKa || "",
    returnInfoEn: row.returnInfoEn || "",
    partnerBookingUrl: row.partnerBookingUrl || "",
    featured: Boolean(row.featured),
  };
}

function normalizeDbFlight(row) {
  return {
    id: row.id,
    from: row.departureAirport || row.from,
    to: row.arrivalAirport || row.to,
    fromCity: row.departureCityKa || "",
    fromCityEn: row.departureCityEn || "",
    city: row.arrivalCityKa || row.city || "",
    cityEn: row.arrivalCityEn || row.cityEn || "",
    country: row.arrivalCountryKa || row.country || "",
    countryEn: row.arrivalCountryEn || row.countryEn || "",
    airlineName: row.airlineName || "",
    airlineLogo: row.airlineLogo || "",
    routeDescriptionKa: row.routeDescriptionKa || "",
    routeDescriptionEn: row.routeDescriptionEn || "",
    partnerBookingUrl: row.partnerBookingUrl || "",
    price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
    currency: row.currency || "GEL",
    isManual: Boolean(row.isManual),
  };
}

const cityName = (tour) => (state.lang === "en" ? tour.cityEn : tour.city);
const tourName = (tour) => (state.lang === "en" ? tour.titleEn : tour.title);
const tourDescription = (tour) => (state.lang === "en" ? tour.descriptionEn : tour.description);
const tourTypeLabel = (tour) =>
  state.lang === "en"
    ? {
        nature: "Nature",
        culture: "Culture",
        wine: "Wine",
        adventure: "Adventure",
        city: "City",
        gastronomy: "Gastronomy",
      }[tour.type] || tour.type
    : tour.typeKa;

function applySiteContent() {
  const content = state.siteContent;
  if (!content) return;

  const isEn = state.lang === "en";
  const heroEyebrow = isEn ? content.heroEyebrowEn : content.heroEyebrowKa;
  const heroTitle = isEn ? content.heroTitleEn : content.heroTitleKa;
  const heroDesc = isEn ? content.heroDescriptionEn : content.heroDescriptionKa;
  const aboutEyebrow = isEn ? content.aboutEyebrowEn : content.aboutEyebrowKa;
  const aboutTitle = isEn ? content.aboutTitleEn : content.aboutTitleKa;
  const aboutDesc = isEn ? content.aboutDescriptionEn : content.aboutDescriptionKa;

  const eyebrowEl = document.querySelector('[data-i18n="heroEyebrow"]');
  const titleEl = document.querySelector('[data-i18n="heroTitle"]');
  const leadEl = document.querySelector('[data-i18n="heroText"]');
  if (eyebrowEl && heroEyebrow) eyebrowEl.textContent = heroEyebrow;
  if (titleEl && heroTitle) titleEl.innerHTML = safeText(heroTitle).replace(/\n/g, "<br>");
  if (leadEl && heroDesc) leadEl.textContent = heroDesc;

  if (content.heroImageUrl) {
    const heroImg = document.querySelector(".hero-image");
    if (heroImg) {
      const bg =
        'linear-gradient(90deg,rgba(8,27,23,.75),rgba(8,27,23,.2) 70%),linear-gradient(0deg,rgba(8,27,23,.3),transparent 40%),url("' +
        safeText(content.heroImageUrl) +
        '")';
      heroImg.style.backgroundImage = bg;
    }
  }

  const abEyebrowEl = document.querySelector('[data-i18n="aboutEyebrow"]');
  const abTitleEl = document.querySelector('[data-i18n="aboutTitle"]');
  const abTextEl = document.querySelector('[data-i18n="aboutText"]');
  if (abEyebrowEl && aboutEyebrow) abEyebrowEl.textContent = aboutEyebrow;
  if (abTitleEl && aboutTitle) abTitleEl.innerHTML = safeText(aboutTitle).replace(/\n/g, "<br>");
  if (abTextEl && aboutDesc) abTextEl.textContent = aboutDesc;

  if (content.aboutImageUrl) {
    const abPhoto = document.querySelector(".about-photo");
    if (abPhoto) abPhoto.style.backgroundImage = 'url("' + safeText(content.aboutImageUrl) + '")';
  }

  if (content.contactEmail) {
    emailAddress = content.contactEmail;
    const emailEl = document.querySelector(".contact-email");
    if (emailEl) {
      emailEl.textContent = content.contactEmail;
      emailEl.setAttribute("href", "mailto:" + content.contactEmail);
    }
  }

  if (content.contactPhone) {
    const cleanTel = content.contactPhone.replace(/\s+/g, "");
    const telHref = cleanTel.startsWith("+") ? cleanTel : "+995" + cleanTel.replace(/^995/, "");
    const phoneLinks = document.querySelectorAll(".contact-phone a");
    if (phoneLinks[0]) {
      phoneLinks[0].textContent = content.contactPhone;
      phoneLinks[0].setAttribute("href", "tel:" + telHref);
    }
    if (phoneLinks[1]) {
      phoneLinks[1].textContent = content.contactPhone;
      const wa = (content.whatsappNumber || telHref).replace(/[^0-9]/g, "");
      phoneLinks[1].setAttribute("href", "https://wa.me/" + wa);
    }
  }

  const seoTitle = isEn ? content.seoTitleEn : content.seoTitleKa;
  const seoDesc = isEn ? content.seoDescriptionEn : content.seoDescriptionKa;
  if (seoTitle) document.title = seoTitle;
  if (seoDesc) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seoDesc);
  }
}

async function loadData() {
  try {
    const apiRes = await fetch("/api/public/bootstrap");
    if (apiRes.ok) {
      const payload = await apiRes.json();
      state.tours = (payload.tours || []).map(normalizeDbTour);
      state.flights = (payload.flights || []).map(normalizeDbFlight);
      state.destinations = payload.destinations || [];
      state.siteContent = payload.siteContent || null;
      applySiteContent();
      renderTours();
      populateCities();
      populateFlightDestinations();
      return;
    }
  } catch {
    // Fallback to static JSON files if backend API is unavailable
  }

  try {
    const [toursResponse, flightsResponse] = await Promise.all([
      fetch("./data/tours.json"),
      fetch("./data/flights.json"),
    ]);
    if (!toursResponse.ok || !flightsResponse.ok)
      throw new Error("JSON მონაცემების ჩატვირთვა ვერ მოხერხდა");
    const rawTours = await toursResponse.json();
    const rawFlights = await flightsResponse.json();
    state.tours = rawTours.map(normalizeDbTour);
    state.flights = rawFlights.map(normalizeDbFlight);
    renderTours();
    populateCities();
    populateFlightDestinations();
  } catch (error) {
    document.getElementById("tour-grid").innerHTML =
      '<p class="empty-state">მონაცემების ჩატვირთვა ვერ მოხერხდა. შეამოწმეთ data საქაღალდე.</p>';
    console.error(error);
  }
}

function populateCities() {
  const cities = [...new Set(state.tours.map((tour) => tour.city).filter(Boolean))];
  ["quick-city", "filter-city"].forEach((id) => {
    const select = document.getElementById(id);
    const current = select.value;
    select.querySelectorAll("option:not(:first-child)").forEach((option) => option.remove());
    cities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      const tour = state.tours.find((item) => item.city === city);
      option.textContent = state.lang === "en" && tour ? tour.cityEn : city;
      select.append(option);
    });
    if (cities.includes(current)) select.value = current;
  });
}

function renderTours() {
  const city = document.getElementById("filter-city").value;
  const price = Number(document.getElementById("filter-price").value || 0);
  const duration = document.getElementById("filter-duration").value;
  const type = document.getElementById("filter-type").value;
  const list = state.tours.filter(
    (tour) =>
      (!city || tour.city === city) &&
      (!price || tour.price <= price) &&
      (!type || tour.type === type) &&
      (!duration ||
        (duration === "1"
          ? tour.days === 1
          : duration === "2"
            ? tour.days >= 2 && tour.days <= 3
            : tour.days >= 4)),
  );
  const grid = document.getElementById("tour-grid");
  if (!list.length) {
    grid.innerHTML = '<p class="empty-state">' + t("noTours") + "</p>";
    return;
  }
  grid.innerHTML = list
    .map((tour) => {
      const promoLabel = state.lang === "en" ? tour.promotionTitleEn : tour.promotionTitleKa;
      const priceHtml = tour.hasDiscount
        ? '<span class="tour-price"><span class="tour-old-price">' +
          money(tour.originalPrice, tour.currency) +
          "</span>" +
          money(tour.price, tour.currency) +
          " <small>" +
          t("perPerson") +
          "</small>" +
          (promoLabel ? '<span class="tour-promo-note">' + safeText(promoLabel) + "</span>" : "") +
          "</span>"
        : '<span class="tour-price">' +
          money(tour.price, tour.currency) +
          " <small>" +
          t("perPerson") +
          "</small></span>";
      return (
        '<article class="tour-card"><div class="tour-image" style="background-image:url(\'' +
        safeText(tour.image) +
        '\')"><span class="tour-tag">' +
        safeText(tourTypeLabel(tour)) +
        '</span></div><div class="tour-card-body"><div class="tour-meta"><span>⌖ ' +
        safeText(cityName(tour)) +
        "</span><span>" +
        tour.days +
        " " +
        t("days") +
        "</span></div><h3>" +
        safeText(tourName(tour)) +
        "</h3><p>" +
        safeText(tourDescription(tour)) +
        '</p><div class="tour-card-bottom">' +
        priceHtml +
        '<button class="text-button" data-details="' +
        safeText(tour.id) +
        '">' +
        t("details") +
        " ↗</button></div></div></article>"
      );
    })
    .join("");
  grid
    .querySelectorAll("[data-details]")
    .forEach((button) => button.addEventListener("click", () => openTour(button.dataset.details)));
}

function openTour(id) {
  const tour = state.tours.find((item) => item.id === id);
  if (!tour) return;
  state.selectedTour = tour;
  const isEn = state.lang === "en";
  const title = tourName(tour);
  const highlights = isEn ? tour.highlightsEn : tour.highlights;
  const included = isEn ? tour.includedEn : tour.included;
  const excluded = isEn ? tour.excludedEn : tour.excluded;
  const itinerary = isEn ? tour.itineraryEn : tour.itinerary;
  const importantInfo = isEn ? tour.importantInfoEn : tour.importantInfo;
  const departureInfo = isEn ? tour.departureInfoEn : tour.departureInfo;
  const returnInfo = isEn ? tour.returnInfoEn : tour.returnInfo;

  const galleryHtml =
    tour.gallery && tour.gallery.length > 1
      ? '<div class="detail-gallery">' +
        tour.gallery
          .map(
            (imgUrl) =>
              '<img src="' +
              safeText(imgUrl) +
              '" alt="' +
              safeText(title) +
              '" referrerpolicy="no-referrer" data-gallery-img="' +
              safeText(imgUrl) +
              '">',
          )
          .join("") +
        "</div>"
      : "";

  const highlightsHtml =
    highlights && highlights.length
      ? "<h3>" +
        t("highlights") +
        "</h3><ul>" +
        highlights.map((item) => "<li>" + safeText(item) + "</li>").join("") +
        "</ul>"
      : "";

  const excludedHtml =
    excluded && excluded.length
      ? "<h3>" +
        t("excluded") +
        "</h3><ul>" +
        excluded.map((item) => "<li>" + safeText(item) + "</li>").join("") +
        "</ul>"
      : "";

  const depRetParts = [departureInfo, returnInfo].filter(Boolean);
  const depRetHtml = depRetParts.length
    ? "<h3>" + t("departureReturn") + "</h3><p>" + depRetParts.map(safeText).join(" · ") + "</p>"
    : "";

  const importantHtml = importantInfo
    ? "<h3>" + t("importantInfo") + "</h3><p>" + safeText(importantInfo) + "</p>"
    : "";

  const priceBlock = tour.hasDiscount
    ? '<p><span class="tour-old-price">' +
      money(tour.originalPrice, tour.currency) +
      "</span><strong>" +
      money(tour.price, tour.currency) +
      "</strong> · " +
      t("perPerson") +
      "</p>"
    : "<p><strong>" + money(tour.price, tour.currency) + "</strong> · " + t("perPerson") + "</p>";

  const partnerBtn = tour.partnerBookingUrl
    ? '<a class="button button-primary detail-book" href="' +
      safeText(tour.partnerBookingUrl) +
      '" target="_blank" rel="noopener noreferrer">' +
      t("partnerBook") +
      "</a>"
    : "";

  document.getElementById("tour-detail").innerHTML =
    '<div class="detail-image" id="detail-main-image" style="background-image:url(\'' +
    safeText(tour.image) +
    "')\"></div>" +
    '<div class="detail-content">' +
    '<p class="eyebrow">' +
    safeText(cityName(tour)) +
    " · " +
    tour.days +
    " " +
    t("days") +
    "</p>" +
    "<h2>" +
    safeText(title) +
    "</h2>" +
    "<p>" +
    safeText(tourDescription(tour)) +
    "</p>" +
    galleryHtml +
    highlightsHtml +
    (itinerary && itinerary.length
      ? "<h3>" +
        t("program") +
        "</h3><ul>" +
        itinerary.map((item) => "<li>" + safeText(item) + "</li>").join("") +
        "</ul>"
      : "") +
    (included && included.length
      ? "<h3>" +
        t("included") +
        "</h3><ul>" +
        included.map((item) => "<li>" + safeText(item) + "</li>").join("") +
        "</ul>"
      : "") +
    excludedHtml +
    depRetHtml +
    importantHtml +
    priceBlock +
    '<div class="detail-actions"><button class="button button-dark detail-book" id="open-booking">' +
    t("book") +
    "</button>" +
    partnerBtn +
    "</div>" +
    "</div>";

  document.querySelectorAll("[data-gallery-img]").forEach((imgEl) => {
    imgEl.addEventListener("click", () => {
      const mainImg = document.getElementById("detail-main-image");
      if (mainImg)
        mainImg.style.backgroundImage = "url('" + safeText(imgEl.dataset.galleryImg) + "')";
    });
  });

  document.getElementById("tour-dialog").showModal();
  document.getElementById("open-booking").addEventListener("click", () => {
    document.getElementById("tour-dialog").close();
    openBooking(tour);
  });
}

function openBooking(tour) {
  const form = document.getElementById("booking-form");
  form.elements.tour.value = tourName(tour);
  document.getElementById("booking-dialog").showModal();
}

function airportLabel(code) {
  const names = {
    TBS: ["თბილისი", "Tbilisi"],
    KUT: ["ქუთაისი", "Kutaisi"],
    BUS: ["ბათუმი", "Batumi"],
    MEP: ["მესტია", "Mestia"],
    MST: ["მესტია", "Mestia"],
    AMB: ["ამბროლაური", "Ambrolauri"],
    TEL: ["თელავი", "Telavi"],
  };
  if (names[code]) {
    return names[code][state.lang === "en" ? 1 : 0] + " · " + code;
  }
  const match = state.flights.find((r) => r.from === code);
  if (match && (match.fromCity || match.fromCityEn)) {
    return (
      (state.lang === "en"
        ? match.fromCityEn || match.fromCity
        : match.fromCity || match.fromCityEn) +
      " · " +
      code
    );
  }
  return code;
}

function populateFlightDestinations() {
  const fromSelect = document.getElementById("flight-from");
  const toSelect = document.getElementById("flight-to");
  const currentFrom = fromSelect.value || "TBS";
  const baseAirports = ["TBS", "KUT", "BUS", "MEP", "AMB", "TEL"];
  const dynamicAirports = [...new Set(state.flights.map((r) => r.from).filter(Boolean))];
  const airports = [...new Set([...baseAirports, ...dynamicAirports])];
  fromSelect.innerHTML = airports
    .map(
      (code) =>
        '<option value="' + safeText(code) + '">' + safeText(airportLabel(code)) + "</option>",
    )
    .join("");
  fromSelect.value = airports.includes(currentFrom) ? currentFrom : airports[0] || "TBS";

  const from = fromSelect.value;
  const options = state.flights.filter((route) => route.from === from);
  const uniqueByTo = [];
  const seenTo = new Set();
  for (const route of options) {
    if (seenTo.has(route.to)) continue;
    seenTo.add(route.to);
    uniqueByTo.push(route);
  }
  toSelect.innerHTML = uniqueByTo.length
    ? uniqueByTo
        .map(
          (route) =>
            '<option value="' +
            safeText(route.to) +
            '">' +
            safeText(
              (state.lang === "en" ? route.cityEn : route.city) +
                " · " +
                route.to +
                (route.country || route.countryEn
                  ? " (" + (state.lang === "en" ? route.countryEn : route.country) + ")"
                  : ""),
            ) +
            "</option>",
        )
        .join("")
    : '<option value="">' +
      (state.lang === "en" ? "No listed direct routes" : "პირდაპირი მარშრუტი მითითებული არ არის") +
      "</option>";
  if (!uniqueByTo.some((route) => route.to === toSelect.dataset.selected))
    toSelect.selectedIndex = 0;
  else toSelect.value = toSelect.dataset.selected;
}

async function renderFlights(from, to, date) {
  const results = state.flights.filter((route) => route.from === from && route.to === to);
  const container = document.getElementById("flight-results");
  if (!results.length) {
    container.innerHTML = '<p class="flight-placeholder">' + t("flightNoResults") + "</p>";
    return;
  }

  const cardsHtml = results
    .map((route) => {
      const fromName = airportLabel(route.from);
      const toName = (state.lang === "en" ? route.cityEn : route.city) + " · " + route.to;
      const query = "Flights from " + route.from + " to " + route.to + (date ? " on " + date : "");
      const targetUrl =
        route.partnerBookingUrl ||
        "https://www.google.com/travel/flights?q=" + encodeURIComponent(query);
      const desc =
        state.lang === "en"
          ? route.routeDescriptionEn || "Direct route"
          : route.routeDescriptionKa || "პირდაპირი მიმართულება";
      const priceText =
        route.price !== null && route.price !== undefined
          ? '<div class="flight-price">' + money(route.price, route.currency) + "</div>"
          : '<div class="route-type">' + safeText(desc) + "</div>";
      const airlineHeader = route.airlineName
        ? '<div class="flight-airline-row">' +
          (route.airlineLogo
            ? '<img class="flight-airline-logo" src="' +
              safeText(route.airlineLogo) +
              '" alt="' +
              safeText(route.airlineName) +
              '" referrerpolicy="no-referrer">'
            : "") +
          "<div><strong>" +
          safeText(route.airlineName) +
          "</strong><span>" +
          safeText(toName) +
          "</span></div></div>"
        : '<div class="flight-airline"><strong>' +
          safeText(toName) +
          "</strong><span>" +
          safeText(state.lang === "en" ? route.countryEn : route.country) +
          "</span></div>";

      return (
        '<article class="flight-card route-card">' +
        airlineHeader +
        '<div class="flight-time"><strong>' +
        safeText(fromName) +
        "</strong><br><small>" +
        safeText(route.from) +
        "</small></div>" +
        '<div class="flight-time"><strong>' +
        safeText(toName) +
        "</strong><br><small>" +
        safeText(route.to) +
        "</small></div>" +
        priceText +
        '<a class="button" href="' +
        safeText(targetUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        (state.lang === "en" ? "View flights" : "ფრენების ნახვა") +
        "</a>" +
        "</article>"
      );
    })
    .join("");

  container.innerHTML = cardsHtml;
}

function applyLanguage() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value.includes("<br>")) element.innerHTML = value;
    else element.textContent = value;
  });
  document.getElementById("language-switch").textContent = state.lang === "ka" ? "EN" : "KA";
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  localStorage.setItem("saqo-language", state.lang);
  applySiteContent();
  renderTours();
  populateCities();
  populateFlightDestinations();
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const button = document.getElementById("theme-switch");
  button.textContent = state.theme === "dark" ? "☀" : "☾";
  button.setAttribute("aria-label", t(state.theme === "dark" ? "themeLight" : "themeDark"));
  localStorage.setItem("saqo-theme", state.theme);
}
function validGeorgianPhone(value) {
  return /^(?:\+?995)?5\d{8}$/.test(value.replace(/[\s()-]/g, ""));
}
function setupPhoneValidation(form) {
  const input = form.querySelector('input[name="phone"]');
  if (!input) return;
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9+]/g, "");
    input.setCustomValidity("");
  });
}
function setupEvents() {
  ["filter-city", "filter-price", "filter-duration", "filter-type"].forEach((id) =>
    document.getElementById(id).addEventListener("change", renderTours),
  );
  document
    .getElementById("flight-from")
    .addEventListener("change", () => populateFlightDestinations());
  document.getElementById("tour-search").addEventListener("submit", (event) => {
    event.preventDefault();
    document.getElementById("filter-city").value = document.getElementById("quick-city").value;
    document.getElementById("filter-type").value = document.getElementById("quick-type").value;
    document.getElementById("filter-duration").value =
      document.getElementById("quick-duration").value;
    renderTours();
    document.getElementById("tours").scrollIntoView({ behavior: "smooth" });
  });
  document.querySelectorAll(".search-tab").forEach((tab) =>
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".search-tab")
        .forEach((item) => item.classList.toggle("active", item === tab));
      document
        .getElementById("tour-search")
        .classList.toggle("hidden", tab.dataset.tab !== "tour-search");
      document
        .getElementById("flight-search")
        .classList.toggle("hidden", tab.dataset.tab !== "flight-search");
    }),
  );
  document.getElementById("flight-search").addEventListener("submit", (event) => {
    event.preventDefault();
    const from = document.getElementById("flight-from").value;
    const to = document.getElementById("flight-to").value;
    if (from === to) {
      document.getElementById("flight-results").innerHTML =
        '<p class="flight-placeholder">' +
        safeText(
          state.lang === "en" ? "Choose a different airport." : "აირჩიეთ განსხვავებული აეროპორტი.",
        ) +
        "</p>";
      document.getElementById("flights").scrollIntoView({ behavior: "smooth" });
      return;
    }
    void renderFlights(from, to, document.getElementById("flight-date").value);
    document.getElementById("flights").scrollIntoView({ behavior: "smooth" });
  });
  document.getElementById("language-switch").addEventListener("click", () => {
    state.lang = state.lang === "ka" ? "en" : "ka";
    applyLanguage();
    applyTheme();
  });
  document.getElementById("theme-switch").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();
  });
  document.getElementById("menu-toggle").addEventListener("click", () => {
    const nav = document.getElementById("main-nav");
    const open = nav.classList.toggle("open");
    document.getElementById("menu-toggle").setAttribute("aria-expanded", String(open));
  });
  document
    .querySelectorAll("#main-nav a")
    .forEach((link) =>
      link.addEventListener("click", () =>
        document.getElementById("main-nav").classList.remove("open"),
      ),
    );
  document
    .getElementById("dialog-close")
    .addEventListener("click", () => document.getElementById("tour-dialog").close());
  document
    .getElementById("booking-close")
    .addEventListener("click", () => document.getElementById("booking-dialog").close());
  document.getElementById("booking-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body =
      "ტურის მოთხოვნა\nტური: " +
      data.get("tour") +
      "\nსახელი: " +
      data.get("name") +
      "\nტელეფონი: " +
      data.get("phone") +
      "\nთარიღი: " +
      data.get("date") +
      "\nადამიანები: " +
      data.get("people");
    window.location.href =
      "mailto:" +
      emailAddress +
      "?subject=" +
      encodeURIComponent("Saqo Travel — ტურის მოთხოვნა") +
      "&body=" +
      encodeURIComponent(body);
  });
  const contactForm = document.getElementById("contact-form");
  setupPhoneValidation(contactForm);
  setupPhoneValidation(document.getElementById("booking-form"));
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const phone = form.elements.phone;
    if (!validGeorgianPhone(phone.value)) {
      phone.setCustomValidity(t("phoneInvalid"));
      phone.reportValidity();
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const note = form.querySelector(".form-note");
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = state.lang === "ka" ? "იგზავნება..." : "Sending...";
    try {
      const response = await fetch("https://formsubmit.co/ajax/" + emailAddress, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.elements.name.value.trim(),
          phone: phone.value.trim(),
          message: form.elements.message.value.trim(),
          _subject: "Saqo Travel — ახალი მოთხოვნა",
          _template: "table",
          _captcha: "false",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.success !== "true")
        throw new Error(result.message || "Email delivery failed");
      note.textContent = t("sendSuccess");
      note.classList.add("form-success");
      form.reset();
    } catch (error) {
      console.error(error);
      note.textContent = t("sendError") + " " + emailAddress;
      note.classList.remove("form-success");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}
document.getElementById("year").textContent = new Date().getFullYear();
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
document.getElementById("flight-date").min = today.toISOString().slice(0, 10);
document.getElementById("flight-date").value = today.toISOString().slice(0, 10);
applyLanguage();
applyTheme();
populateFlightDestinations();
setupEvents();
loadData();
