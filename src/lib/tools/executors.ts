// ─── Google Routes API ───────────────────────────────────────────────────────

export async function getDriveTimes(input: {
  origin: string;
  destinations: string[];
  departure_time: string;
}) {
  const apiKey = process.env.GOOGLE_MAPS_KEY;

  if (!apiKey) {
    const DRIVE_TIMES: Record<string, { hours: number; km: number }> = {
      "niagara falls": { hours: 1.5, km: 130 },
      "niagara-on-the-lake": { hours: 1.5, km: 135 },
      "hamilton": { hours: 1.0, km: 70 },
      "barrie": { hours: 1.2, km: 100 },
      "collingwood": { hours: 2.0, km: 150 },
      "blue mountain": { hours: 2.0, km: 155 },
      "kingston": { hours: 2.5, km: 260 },
      "stratford": { hours: 1.8, km: 145 },
      "prince edward county": { hours: 2.2, km: 200 },
      "muskoka": { hours: 2.5, km: 210 },
      "huntsville": { hours: 2.8, km: 220 },
      "ottawa": { hours: 4.5, km: 450 },
      "montreal": { hours: 5.5, km: 540 },
      "quebec city": { hours: 8.0, km: 800 },
      "new york": { hours: 8.5, km: 800 },
      "boston": { hours: 9.0, km: 870 },
      "detroit": { hours: 4.0, km: 380 },
      "windsor": { hours: 3.8, km: 370 },
      "london": { hours: 2.0, km: 190 },
      "tobermory": { hours: 3.5, km: 280 },
      "wasaga beach": { hours: 1.8, km: 145 },
    };
    return input.destinations.map((dest) => {
      const key = dest.toLowerCase().split(",")[0].trim();
      const match = Object.entries(DRIVE_TIMES).find(([k]) => key.includes(k) || k.includes(key));
      const data = match?.[1] ?? { hours: 3.0, km: 250 };
      return { destination: dest, hours: data.hours, km: data.km, status: "MOCK_NO_API_KEY" };
    });
  }

  const body = {
    origins: [{ waypoint: { address: input.origin } }],
    destinations: input.destinations.map((d) => ({ waypoint: { address: d } })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: input.departure_time,
  };

  const res = await fetch(
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "originIndex,destinationIndex,duration,distanceMeters,status",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Google Routes API error: ${res.status} ${await res.text()}`);
  }

  const rows: any[] = await res.json();

  return rows.map((row) => ({
    destination: input.destinations[row.destinationIndex],
    hours: parseFloat((parseInt(row.duration) / 3600).toFixed(1)),
    km: Math.round(row.distanceMeters / 1000),
    status: row.status,
  }));
}

// ─── Kiwi Tequila Flights API ─────────────────────────────────────────────────

export async function searchFlights(input: {
  fly_from: string;
  fly_to: string;
  destination_name: string;
  date_from: string;
  date_to: string;
  max_price?: number;
}) {
  const apiKey = process.env.KIWI_API_KEY;

  if (!apiKey) {
    return {
      destination: input.destination_name,
      found: true,
      price_cad: Math.floor(150 + Math.random() * 200),
      airline: "Mock Air",
      depart: `${input.date_from}T07:00:00`,
      arrive_back: `${input.date_to}T21:00:00`,
      booking_url: "https://www.kiwi.com",
      status: "MOCK_NO_API_KEY",
    };
  }

  const params = new URLSearchParams({
    fly_from: input.fly_from,
    fly_to: input.fly_to,
    date_from: input.date_from,
    date_to: input.date_from, // outbound window
    return_from: input.date_to,
    return_to: input.date_to,
    curr: "CAD",
    limit: "1",
    sort: "price",
    ...(input.max_price ? { price_to: String(input.max_price) } : {}),
  });

  const res = await fetch(`https://api.tequila.kiwi.com/v2/search?${params}`, {
    headers: { apikey: apiKey },
  });

  if (!res.ok) {
    throw new Error(`Kiwi API error: ${res.status}`);
  }

  const data = await res.json();
  const flight = data.data?.[0];

  if (!flight) {
    return { destination: input.destination_name, found: false };
  }

  return {
    destination: input.destination_name,
    found: true,
    price_cad: Math.round(flight.price),
    airline: flight.airlines?.[0] ?? "Unknown",
    depart: flight.local_departure,
    arrive_back: flight.local_arrival,
    booking_url: flight.deep_link,
  };
}

// ─── Amadeus Hotels API ───────────────────────────────────────────────────────

let amadeusToken: { token: string; expires: number } | null = null;

async function getAmadeusToken() {
  if (amadeusToken && Date.now() < amadeusToken.expires) {
    return amadeusToken.token;
  }

  const res = await fetch(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.AMADEUS_CLIENT_ID!,
        client_secret: process.env.AMADEUS_CLIENT_SECRET!,
      }),
    }
  );

  const data = await res.json();
  amadeusToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return amadeusToken.token;
}

export async function searchHotels(input: {
  city_code: string;
  destination_name: string;
  check_in: string;
  check_out: string;
  max_rate?: number;
}) {
  const clientId = process.env.AMADEUS_CLIENT_ID;

  if (!clientId) {
    const mockHotels: Record<string, string> = {
      kingston: "Residence Inn Kingston Water's Edge",
      niagara: "Sheraton on the Falls",
      "niagara-on-the-lake": "Prince of Wales Hotel",
      collingwood: "The Living Water Resort",
      muskoka: "Taboo Muskoka Resort",
      "prince edward county": "The Drake Devonshire",
      ottawa: "Fairmont Château Laurier",
      "blue mountain": "Blue Mountain Resort",
      stratford: "Foster's Inn",
      hamilton: "Sheraton Hamilton Hotel",
    };
    const key = input.destination_name.toLowerCase().split(",")[0].trim();
    const hotelName =
      Object.entries(mockHotels).find(([k]) => key.includes(k))?.[1] ??
      `${input.destination_name.split(",")[0]} Inn & Suites`;

    return {
      destination: input.destination_name,
      found: true,
      hotel_name: hotelName,
      price_per_night_cad: Math.floor(120 + Math.random() * 160),
      availability: "high",
      stars: 3,
      booking_url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(input.destination_name)}`,
      status: "MOCK_NO_API_KEY",
    };
  }

  try {
    const token = await getAmadeusToken();

    // Step 1: get hotel IDs for the city
    const hotelRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${input.city_code}&radius=5&radiusUnit=KM&ratings=3,4,5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const hotelData = await hotelRes.json();
    const hotelIds = hotelData.data
      ?.slice(0, 5)
      .map((h: any) => h.hotelId)
      .join(",");

    if (!hotelIds) return { destination: input.destination_name, found: false };

    // Step 2: get offers for those hotels
    const offerParams = new URLSearchParams({
      hotelIds,
      checkInDate: input.check_in,
      checkOutDate: input.check_out,
      currency: "CAD",
      bestRateOnly: "true",
    });

    const offersRes = await fetch(
      `https://test.api.amadeus.com/v3/shopping/hotel-offers?${offerParams}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const offersData = await offersRes.json();
    const offer = offersData.data?.[0];

    if (!offer) return { destination: input.destination_name, found: false };

    const price = parseFloat(offer.offers[0].price.total);
    const nights =
      (new Date(input.check_out).getTime() -
        new Date(input.check_in).getTime()) /
      86400000;

    return {
      destination: input.destination_name,
      found: true,
      hotel_name: offer.hotel.name,
      price_per_night_cad: Math.round(price / nights),
      availability:
        offersData.data.length > 3 ? "high" : "low",
      stars: offer.hotel.rating ?? 3,
      booking_url: `https://www.amadeus.com`,
    };
  } catch (e: any) {
    return { destination: input.destination_name, found: false, error: e.message };
  }
}
