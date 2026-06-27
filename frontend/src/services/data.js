// src/services/data.js
export async function fetchMarketData() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/global");
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}
