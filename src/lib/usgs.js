const feeds = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
};

export async function fetchQuakes(windowKey) {
  const url = feeds[windowKey] || feeds.day;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch USGS feed');
  return res.json();
}

export async function fetchQuakesRangeUTC(startIso, endIso) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&orderby=time&starttime=${encodeURIComponent(startIso)}&endtime=${encodeURIComponent(endIso)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch USGS range');
  return res.json();
}
