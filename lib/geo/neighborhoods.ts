// Quartiers de Niamey avec leurs centroïdes GPS
// Source : OpenStreetMap / estimation géographique
export const NIAMEY_NEIGHBORHOODS = [
  { name: 'Plateau', centroid_lat: 13.5137, centroid_lng: 2.1177 },
  { name: 'Nouveau Marché', centroid_lat: 13.5167, centroid_lng: 2.1056 },
  { name: 'Kalley', centroid_lat: 13.5089, centroid_lng: 2.1100 },
  { name: 'Terminus', centroid_lat: 13.5042, centroid_lng: 2.1183 },
  { name: 'Liberté', centroid_lat: 13.5200, centroid_lng: 2.1033 },
  { name: 'Yantala', centroid_lat: 13.5278, centroid_lng: 2.0928 },
  { name: 'Boukoki', centroid_lat: 13.5356, centroid_lng: 2.0861 },
  { name: 'Saga', centroid_lat: 13.4833, centroid_lng: 2.1500 },
  { name: 'Gamkalé', centroid_lat: 13.4778, centroid_lng: 2.1056 },
  { name: 'Banizoumbou', centroid_lat: 13.4933, centroid_lng: 2.0850 },
  { name: 'Koira Kano', centroid_lat: 13.5044, centroid_lng: 2.0722 },
  { name: 'Dar Es Salam', centroid_lat: 13.5178, centroid_lng: 2.0611 },
  { name: 'Talladjé', centroid_lat: 13.5311, centroid_lng: 2.1033 },
  { name: 'Lazaret', centroid_lat: 13.5033, centroid_lng: 2.1389 },
  { name: 'Aéroport', centroid_lat: 13.4811, centroid_lng: 2.1694 },
  { name: 'Pays Bas', centroid_lat: 13.5344, centroid_lng: 2.1172 },
  { name: 'Rive droite', centroid_lat: 13.5222, centroid_lng: 2.1539 },
  { name: 'Recasement', centroid_lat: 13.5067, centroid_lng: 2.0944 },
  { name: 'Saguia', centroid_lat: 13.5389, centroid_lng: 2.0778 },
  { name: 'Goudel', centroid_lat: 13.4944, centroid_lng: 2.1639 },
  { name: 'Niamey Centre', centroid_lat: 13.5117, centroid_lng: 2.1122 },
] as const

export type NeighborhoodName = typeof NIAMEY_NEIGHBORHOODS[number]['name']

// Centroïde de Niamey (fallback si aucun quartier sélectionné)
export const NIAMEY_CENTER = { lat: 13.5137, lng: 2.1177 }
