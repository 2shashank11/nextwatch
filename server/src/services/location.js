import NodeGeocoder from "node-geocoder";

const options = {
  provider: "openstreetmap"
};

const geocoder = NodeGeocoder(options);

export async function reverseGeocode(lat, lng) {
  try {
    const res = await geocoder.reverse({ lat, lon: lng });
    if (res && res.length > 0) {
      const location = res[0];
      
      const city = location.city || location.town || location.village || location.county || location.state || "Unknown City";
      const zone = location.neighbourhood || location.suburb || location.district || location.streetName || "General Zone";
      
      return { city, zone };
    }
  } catch (err) {
    console.error("Geocoding error:", err);
  }
  
  return { city: "Unknown", zone: "General Zone" };
}

export async function geocode(address) {
  try {
    const res = await geocoder.geocode(address);
    if (res && res.length > 0) {
      const location = res[0];
      
      const city = location.city || location.town || location.village || location.county || location.state || "Unknown City";
      const zone = location.neighbourhood || location.suburb || location.district || location.streetName || "General Zone";
      
      return { city, zone, lat: location.latitude, lng: location.longitude };
    }
  } catch (err) {
    console.error("Geocoding address error:", err);
  }
  
  return { city: "Unknown", zone: "General Zone", lat: null, lng: null };
}
