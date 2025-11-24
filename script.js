var map = L.map('map').setView([19.615, 37.216], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

var markers = [];
var geojsonLayer;

// إضافة نقاط افتراضية
var locations = [
  { name: 'Port Sudan', coords: [19.615, 37.216] },
  { name: 'Khartoum', coords: [15.5007, 32.5599] }
];
locations.forEach(function(loc) {
  var marker = L.marker(loc.coords).addTo(map).bindPopup(loc.name);
  markers.push(marker);
});
map.fitBounds(new L.featureGroup(markers).getBounds());

// استيراد الملفات
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  if (file.name.endsWith('.geojson')) {
    reader.onload = function(event) {
      const data = JSON.parse(event.target.result);
      if (geojsonLayer) map.removeLayer(geojsonLayer);
      geojsonLayer = L.geoJSON(data).addTo(map);
      map.fitBounds(geojsonLayer.getBounds());
    };
    reader.readAsText(file);
  } else if (file.name.endsWith('.csv')) {
    reader.onload = function(event) {
      const csvData = Papa.parse(event.target.result, { header: true }).data;
      csvData.forEach(row => {
        if (row.lat && row.lng) {
          L.marker([parseFloat(row.lat), parseFloat(row.lng)]).addTo(map).bindPopup(row.name || 'موقع');
        }
      });
    };
    reader.readAsText(file);
  } else if (file.name.endsWith('.kml')) {
    reader.onload = function(event) {
      const parser = new DOMParser();
      const kml = parser.parseFromString(event.target.result, 'text/xml');
      const geojson = toGeoJSON.kml(kml);
      if (geojsonLayer) map.removeLayer(geojsonLayer);
      geojsonLayer = L.geoJSON(geojson).addTo(map);
      map.fitBounds(geojsonLayer.getBounds());
    };
    reader.readAsText(file);
  }
});

// تصدير GeoJSON
function exportGeoJSON() {
  const features = markers.map(m => ({
    type: 'Feature',
    properties: { name: m.getPopup().getContent() },
    geometry: { type: 'Point', coordinates: [m.getLatLng().lng, m.getLatLng().lat] }
  }));
  const geojson = { type: 'FeatureCollection', features: features };
  downloadFile(JSON.stringify(geojson), 'data.geojson', 'application/json');
}

// تصدير CSV
function exportCSV() {
  const rows = markers.map(m => ({ name: m.getPopup().getContent(), lat: m.getLatLng().lat, lng: m.getLatLng().lng }));
  const csv = Papa.unparse(rows);
  downloadFile(csv, 'data.csv', 'text/csv');
}

// تصدير KML
function exportKML() {
  const kmlHeader = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>';
  const kmlFooter = '</Document></kml>';
  const placemarks = markers.map(m => `<Placemark><name>${m.getPopup().getContent()}</name><Point><coordinates>${m.getLatLng().lng},${m.getLatLng().lat}</coordinates></Point></Placemark>`).join('');
  const kml = kmlHeader + placemarks + kmlFooter;
  downloadFile(kml, 'data.kml', 'application/vnd.google-earth.kml+xml');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
