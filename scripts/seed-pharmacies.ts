/**
 * Seed script: insert all Niamey pharmacies from lahiya-tech.com
 * Run with: npx tsx scripts/seed-pharmacies.ts
 *
 * - Deduplicates by phone (UNIQUE constraint in DB)
 * - Default coordinates = Niamey center; update via map picker in the admin UI
 * - Skips pharmacies with no phone number
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Commune centroid coordinates (approximate centers of each commune in Niamey)
const COMMUNE_COORDS: Record<string, { lat: number; lng: number }> = {
  'I':   { lat: 13.5250, lng: 2.1050 },
  'II':  { lat: 13.5200, lng: 2.0950 },
  'III': { lat: 13.5050, lng: 2.1200 },
  'IV':  { lat: 13.4850, lng: 2.1400 },
  'V':   { lat: 13.5000, lng: 2.0700 },
}
const DEFAULT_COORDS = { lat: 13.5137, lng: 2.1177 }

const PHARMACIES = [
  { name: "GOROUAL", quartier: "vers centre aéré BCEAO", commune: "I", address: "vers centre aéré BCEAO", phone: "+22796337176" },
  { name: "AS SAMAD", quartier: "route Ouallam", commune: "I", address: "route Ouallam", phone: "+22795840078" },
  { name: "GOBI", quartier: "koirakano en face ceg 14", commune: "I", address: "koirakano en face ceg 14", phone: "+22780063126" },
  { name: "FASSA", quartier: "sonuci koubya", commune: "I", address: "sonuci koubya", phone: "+22791741271" },
  { name: "GAPTCHI", quartier: "sur le goudron de l'école ex bedir", commune: "I", address: "sur le goudron de l'école ex bedir", phone: "+22790096656" },
  { name: "7 THERAPIES", quartier: "koubya Kayna route tillaberi", commune: "I", address: "koubya Kayna sur le goudron route tillaberi", phone: "+22720736858" },
  { name: "PLATEAU 2", quartier: "en face de maternité yantala", commune: "I", address: "en face de maternité yantala", phone: "+22780909760" },
  { name: "DES CAMPS", quartier: "en Face GNN", commune: "I", address: "en Face GNN", phone: "+22720755300" },
  { name: "CHÂTEAU 1", quartier: "plateau château 1", commune: "I", address: "plateau château 1", phone: "+22720722777" },
  { name: "SALBAZ", quartier: "Tchangarey", commune: "I", address: "Tchangarey non loin de chez Haliroubakoye", phone: "+22792703000" },
  { name: "LIBERTE KOIRA TEGUI", quartier: "Gendarmerie", commune: "I", address: "FACE DE LA GRANDE PORTE GENDARMERIE", phone: "+22794240915" },
  { name: "CHOUKR'ALLAH", quartier: "laterite fenifoot", commune: "I", address: "laterite fenifoot face station tamesna", phone: "+22790020480" },
  { name: "CENTRE AERE BCEAO", quartier: "centre aéré BCEAO", commune: "I", address: "face centre aéré BCEAO", phone: "+22780066158" },
  { name: "SIRA", quartier: "koirakano nord", commune: "I", address: "koirakano nord", phone: "+22720373466" },
  { name: "BOBIEL", quartier: "Bobiel", commune: "I", address: "Bobiel", phone: "+22721767062" },
  { name: "RIDWANE DU BIEN-ETRE", quartier: "habou tagui yantala", commune: "I", address: "habou tagui yantala", phone: "+22788538341" },
  { name: "CITE CHINOISE", quartier: "cité chinoise", commune: "I", address: "cité chinoise à cote de l'OPVN", phone: "+22720322343" },
  { name: "RECASEMENT", quartier: "Recasement", commune: "I", address: "1ere latérite recasement", phone: "+22720350388" },
  { name: "NIAMEY NYALA", quartier: "route Niamey nyala", commune: "I", address: "route Niamey nyala", phone: "+22720352788" },
  { name: "AVENIR", quartier: "avenue mauricedelens", commune: "I", address: "avenue mauricedelens", phone: "+22720753869" },
  { name: "MOAGA LOSSO GOUNGOU", quartier: "lossogoungou", commune: "I", address: "lossogoungou", phone: "+22792198096" },
  { name: "SABARA BANGOU", quartier: "cité SATU", commune: "I", address: "cité SATU non loin de GMA", phone: "+22798021792" },
  { name: "3 AOUT", quartier: "echangeur Mali Bero", commune: "I", address: "echangeur Mali Bero", phone: "+22720351818" },
  { name: "ESCADRILLE", quartier: "Mali béro", commune: "I", address: "Boulevard Mali béro a 200m du marche HAMA PATE", phone: "+22792807623" },
  { name: "SOUKO", quartier: "koubia", commune: "I", address: "koubia poste", phone: "+22790001176" },
  { name: "RAYAL", quartier: "Route ouallam", commune: "I", address: "Route ouallam", phone: "+22789666995" },
  { name: "RAWDA", quartier: "hôpital de référence", commune: "I", address: "non loin de l'hôpital de référence", phone: "+22780890313" },
  { name: "MALOU", quartier: "Francophonie", commune: "I", address: "Boulevard Tanimoune Francophonie", phone: "+22720320273" },
  { name: "TAWHID", quartier: "Bobiel", commune: "I", address: "bobiel en face station Sahara", phone: "+22781999906" },
  { name: "CHÂTEAU 8", quartier: "Château 8", commune: "I", address: "Rond point Château 8", phone: "+22720752402" },
  { name: "DINE", quartier: "Ryad", commune: "I", address: "Ryad face alimentation générale route Niamey Nyala", phone: "+22791955024" },
  { name: "ZARA", quartier: "Bobiel", commune: "I", address: "à côté de l'école Barkaleyzé", phone: "+22790583835" },
  { name: "NATION", quartier: "HNN", commune: "I", address: "Non loin de l'HNN", phone: "+22790200147" },
  { name: "GOUDEL", quartier: "Goudel", commune: "I", address: "non loin de l'hôtel les roniers", phone: "+22720065328" },
  { name: "YANTALA", quartier: "Yantala", commune: "I", address: "à coté de la clinique d'Iran", phone: "+22720752439" },
  { name: "IMANE", quartier: "Koira tegui", commune: "I", address: "Koira tegui", phone: "+22798517710" },
  { name: "SAID", quartier: "goudron centre aéré", commune: "I", address: "goudron centre aéré", phone: "+22720351313" },
  { name: "ABDOULKARIM", quartier: "Bobiel", commune: "I", address: "BOBIEL 2E POMPE", phone: "+22720320632" },
  { name: "SONUCI KOUBIA", quartier: "Koubia", commune: "I", address: "Centre des femmes fistuleuses", phone: "+22792656575" },
  { name: "ZAM-ZAM", quartier: "Nord Lazaret", commune: "I", address: "NORD LAZARET", phone: "+22780949909" },
  { name: "ROUTE TILLABERY", quartier: "route Tillabéry", commune: "I", address: "face centrale nigelec route Tillabéry", phone: "+22720350450" },
  { name: "2 EME FORAGE", quartier: "2ème forage", commune: "I", address: "quartier 2ème forage", phone: "+22720752790" },
  { name: "POINT D", quartier: "plateau bas", commune: "I", address: "plateau bas", phone: "+22720724199" },
  { name: "SAYE", quartier: "Dar es Salam", commune: "I", address: "Nouveau pavé Dar es Salam", phone: "+22720352264" },
  { name: "KÂ-TCHOUNE", quartier: "CITE AIRTEL", commune: "I", address: "CITE AIRTEL", phone: "+22791142414" },
  { name: "NIIMA", quartier: "kalley plateau", commune: "I", address: "kalley plateau", phone: "+22782812907" },
  { name: "FRANCOPHONIE", quartier: "Francophonie", commune: "I", address: "village de la francophonie", phone: "+22720322030" },
  { name: "LES JUMELLES", quartier: "Francophonie", commune: "I", address: "Virage a cote de Fenifoot", phone: "+22792021515" },
  { name: "SANTE PLUS", quartier: "Bobiel", commune: "I", address: "Face CSI-Maternité Bobiel — Clinique Alomar", phone: "+22780067825" },
  { name: "SOS", quartier: "orphelinat SOS", commune: "I", address: "à cote de l'orphelinat sos enfants", phone: "+22720351466" },
  { name: "AMINA", quartier: "Recasement", commune: "I", address: "A coté du Rond-Point Pneu", phone: "+22720350880" },
  { name: "CITE RENAISSANCE", quartier: "Cité Renaissance", commune: "I", address: "Non loin de Kokoranta 2", phone: "+22784962187" },
  { name: "ALYA", quartier: "Goudel", commune: "I", address: "CSI Goudel collé de la station Oriba", phone: "+22781872354" },
  { name: "AS SALAM", quartier: "rond point gadafawa", commune: "I", address: "rond point gadafawa", phone: "+22720753125" },
  { name: "HOPITAL DE REFERENCE", quartier: "hôpital de référence", commune: "I", address: "à côté de l'hôpital de référence", phone: "+22796966535" },
  { name: "ROND POINT", quartier: "Plateau", commune: "I", address: "Plateau face nigelec siège", phone: "+22720734283" },
  { name: "VOGUE", quartier: "Stade Seyni Kountché", commune: "I", address: "en face du stade général seyni kountché", phone: "+22720725888" },
  { name: "KARMA", quartier: "Référence", commune: "I", address: "Hôpital de Référence (face Château Vert R14)", phone: "+22797363308" },
  { name: "DES PLAQUES", quartier: "Bobiel", commune: "I", address: "Plaque Wafakoye", phone: "+22781103696" },
  // Commune II
  { name: "SABO", quartier: "Dar es Salam", commune: "II", address: "dar es salam face grande mosquée Ferraille", phone: "+22720350199" },
  { name: "ASKIA", quartier: "Boukoki", commune: "II", address: "Boulevard Kaocen", phone: "+22721315904" },
  { name: "MUTUALISTE", quartier: "Lazaret", commune: "II", address: "En face de Sapeur Pompier Lazaret", phone: "+22721769904" },
  { name: "LAZARET", quartier: "Lazaret", commune: "II", address: "lazaret sur le Goudron face CS laz", phone: "+22790583776" },
  { name: "TOURAKOU", quartier: "Tourakou", commune: "II", address: "Kassouan Dolé", phone: "+22780085451" },
  { name: "DEYZEIBON", quartier: "Katako", commune: "II", address: "Katako deyzebon", phone: "+22720736790" },
  { name: "LAWANERAME", quartier: "Boukoki", commune: "II", address: "Boukoki non loin de Rimbo", phone: "+22790257277" },
  { name: "CONCORDE", quartier: "Plateau", commune: "II", address: "Face Coris Bank Plateau", phone: "+22720352636" },
  { name: "BELLE VUE", quartier: "Tourakou", commune: "II", address: "A coté de Garbado Tourakou", phone: "+22793172158" },
  { name: "AL AFIYA", quartier: "Dan Zama Kouara", commune: "II", address: "Non loin de Chateau Tawey vers la station Babati", phone: "+22788994343" },
  { name: "MALI BERO", quartier: "Plateau", commune: "II", address: "face village chinois", phone: "+22790583801" },
  { name: "BOUMI", quartier: "Lazaret", commune: "II", address: "lazaret", phone: "+22720320340" },
  { name: "MOSSI", quartier: "Liberté", commune: "II", address: "Pas loin du rond point Liberté", phone: "+22796434359" },
  { name: "KASSEYE", quartier: "NIJMA", commune: "II", address: "non loin de NIJMA transport", phone: "+22720736067" },
  { name: "SAHEL", quartier: "cité chinoise", commune: "II", address: "cité chinoise après Niger Télécom", phone: "+22770706041" },
  { name: "KAWSAR", quartier: "Cité Députés", commune: "II", address: "Face Ecole Koirey", phone: "+22799124999" },
  { name: "NOAH", quartier: "djeddah", commune: "II", address: "djeddah sur le goudron Mali Béro", phone: "+22720739310" },
  { name: "CHATEAU BI", quartier: "Kalley-Plateau", commune: "II", address: "Kalley-Plateau", phone: "+22791910429" },
  // Commune III
  { name: "CITE CAISSE", quartier: "Cité Caisse", commune: "III", address: "Marché Cité Caisse", phone: "+22721764837" },
  { name: "REMEDE", quartier: "Banifandou 2", commune: "III", address: "Rond Point Kokorba 1", phone: "+22780065351" },
  { name: "DAN GAO", quartier: "Dan Gao", commune: "III", address: "A côté de la Pâtisserie Marhaba", phone: "+22720740336" },
  { name: "AIR", quartier: "Wadata", commune: "III", address: "face siège alizza wadata", phone: "+22720740129" },
  { name: "CITE FAYCAL", quartier: "Cité Fayçal", commune: "III", address: "A côté du Rond Point Waziri", phone: "+22720741326" },
  { name: "NASSARA", quartier: "Poudrière", commune: "III", address: "Face CHR Poudrière côté Institut Africain de Management", phone: "+22791559990" },
  { name: "ANY KOIRA", quartier: "Any Koira", commune: "III", address: "En face de l'Assurance Leyma SIS dans le Bâtiment Any Koira", phone: "+22720735082" },
  { name: "NOUR", quartier: "Abidjan", commune: "III", address: "A côté de la Station Tilba", phone: "+22720734447" },
  { name: "GRAND MARCHE", quartier: "Grand Marché", commune: "III", address: "A côté de Niamey Store", phone: "+22795044810" },
  { name: "DOM", quartier: "2ème arrondissement", commune: "III", address: "2ème arrondissement", phone: "+22791917116" },
  { name: "EL NASR", quartier: "immeuble El Nasr", commune: "III", address: "immeuble El Nasr", phone: "+22720734772" },
  { name: "AREWA", quartier: "Boukoki", commune: "III", address: "Boukoki", phone: "+22720733505" },
  { name: "ARENES", quartier: "Poudrière", commune: "III", address: "légèrement en face du CHR poudrière", phone: "+22720741611" },
  { name: "TEMPLE", quartier: "kalley sud", commune: "III", address: "kalley sud", phone: "+22720734790" },
  { name: "CARREFOUR 6EME", quartier: "rond point 6ème", commune: "III", address: "rond point 6ème", phone: "+22720741818" },
  { name: "COURONNE NORD", quartier: "Couronne Nord", commune: "III", address: "A côté de Mairie Garage", phone: "+22720364610" },
  { name: "COLLEGE MARIAMA", quartier: "Collège Mariama", commune: "III", address: "Derrière le CEG 4", phone: "+22720741914" },
  { name: "WADATA", quartier: "Wadata", commune: "III", address: "Rond Point Wadata", phone: "+22720742214" },
  { name: "TENERE", quartier: "Nouveau Marché", commune: "III", address: "Face Ecobank Siège", phone: "+22720742898" },
  { name: "INDEPENDANCE", quartier: "Balafon", commune: "III", address: "Face Etablissement Issaka Idrissa Larabou", phone: "+22720330506" },
  { name: "LAKO", quartier: "collège lako", commune: "III", address: "collège lako", phone: "+22720733377" },
  { name: "COMPLEXE", quartier: "hainihabou", commune: "III", address: "hainihabou", phone: "+22720741414" },
  { name: "OUA", quartier: "Poudrière", commune: "III", address: "poudriere", phone: "+22720743146" },
  { name: "NOUVEAU MARCHE", quartier: "Nouveau Marché", commune: "III", address: "face sapeurs pompiers", phone: "+22720741481" },
  { name: "REPUBLIQUE", quartier: "hôtel des postes", commune: "III", address: "face hôtel des postes", phone: "+22720735454" },
  { name: "TERMINUS", quartier: "hôtel terminus", commune: "III", address: "face hôtel terminus", phone: "+22720735838" },
  { name: "RENAISSANCE", quartier: "Banizoumbou", commune: "III", address: "Proche du Rond-Point Baré", phone: "+22720360099" },
  { name: "BONKANEY", quartier: "Madina", commune: "III", address: "Pas loin de STM Siège", phone: "+22720363670" },
  { name: "KALLEY EST", quartier: "Kalley-Est", commune: "III", address: "face grande mosquée", phone: "+22720742999" },
  { name: "ECOLE CANADA", quartier: "face syndicat des douaniers", commune: "III", address: "face syndicat des douaniers", phone: "+22720743369" },
  { name: "MAISON ECONOMIQUE", quartier: "Maison Economique", commune: "III", address: "Pas loin du Centre Djado Sekou", phone: "+22720739051" },
  { name: "VOIE EXPRESS", quartier: "Cité Fayçal", commune: "III", address: "A cote de IMA Automobile – Nigelec Cité Fayçal", phone: "+22790327595" },
  { name: "JANGORZO", quartier: "Jangorzo", commune: "III", address: "Face à la Station Babati 2CV Garage", phone: "+22720340468" },
  { name: "GAMKALLEY", quartier: "Gamkalley", commune: "III", address: "A coté du CSI Gamkalley", phone: "+22720337886" },
  // Commune IV
  { name: "TADJEJE", quartier: "Aéroport", commune: "IV", address: "A côté Alimentation Route Tchanga", phone: "+22721886739" },
  { name: "ZANA", quartier: "Banifandou", commune: "IV", address: "100m du rond point salou djibo banifandou", phone: "+22798268522" },
  { name: "CITE BCEAO", quartier: "Banizoumbou", commune: "IV", address: "banizoumbou", phone: "+22721887968" },
  { name: "POSTE", quartier: "Niamey 2000", commune: "IV", address: "Rond point station oillybia ex telwa menant vers Niamey 2000", phone: "+22780067943" },
  { name: "BANIFANDOU", quartier: "Madina 3", commune: "IV", address: "A coté de Fada Loumbatou", phone: "+22720340240" },
  { name: "ADOUA", quartier: "Talladjé", commune: "IV", address: "A côté du CSI Talladjé sur la voie du Commissariat Talladjé", phone: "+22790899546" },
  { name: "AEROPORT", quartier: "Aéroport", commune: "IV", address: "Non loin du Commissariat Aéroport", phone: "+22796620369" },
  { name: "ROUTE FILLINGUE", quartier: "route filingué", commune: "IV", address: "route filingué", phone: "+22723903730" },
  { name: "TARAN", quartier: "Banizoumbou 2", commune: "IV", address: "banizoumbou 2", phone: "+22720363031" },
  { name: "ESPOIR", quartier: "Banizoumbou 2", commune: "IV", address: "non loin de la station banizoumbou 2", phone: "+22796967582" },
  { name: "TALLADJE EST", quartier: "Talladjé", commune: "IV", address: "talladje", phone: "+22792424692" },
  { name: "CITE ASECNA", quartier: "Aéroport", commune: "IV", address: "Derrière le CEG Repère", phone: "+22796993501" },
  { name: "FLEUVE NIGER", quartier: "Gamkallé", commune: "IV", address: "Gamkallé", phone: "+22782843496" },
  { name: "BASSORA", quartier: "Bassora", commune: "IV", address: "En face de Talladjé Tourakou", phone: "+22790454446" },
  { name: "GAWADO AEROPORT", quartier: "Aéroport", commune: "IV", address: "face ecole falmey", phone: "+22780086752" },
  { name: "REFERENCE NY2000", quartier: "Niamey 2000", commune: "IV", address: "niamey 2000 rond point tagabati", phone: "+22791487503" },
  { name: "MARIAM", quartier: "Niamey 2000", commune: "IV", address: "Face Station OLA en allant vers le Commissariat", phone: "+22790785920" },
  { name: "AR RAHMA", quartier: "Niamey 2000", commune: "IV", address: "Face au CSP Assifa", phone: "+22791010184" },
  { name: "RENOUVEAU", quartier: "Niamey 2000", commune: "IV", address: "Face à la Station Total", phone: "+22780063127" },
  { name: "ALFORMA", quartier: "Niamey 2000", commune: "IV", address: "Rond Point Farkey BI", phone: "+22784734020" },
  { name: "JURIYA", quartier: "Niamey 2000", commune: "IV", address: "Face Station Petroba Niamey 2000, 3è Latérite", phone: "+22793885769" },
  { name: "NIAMEY 2000", quartier: "Niamey 2000", commune: "IV", address: "A côté de la Boulangerie Pâtisserie Youssourra", phone: "+22791249798" },
  { name: "DENDI", quartier: "Bassora", commune: "IV", address: "Bassora Château Korey", phone: "+22789148882" },
  { name: "ROUTE DOSSO", quartier: "Aéroport", commune: "IV", address: "Sur la Route Dosso avant Bienvenue", phone: "+22789744932" },
  { name: "AFZAL", quartier: "Gamkaley", commune: "IV", address: "Avenue des Armées sur le Pavé de Gamkaley", phone: "+22787875787" },
  // Commune V
  { name: "SAGA", quartier: "Saga", commune: "V", address: "Saga", phone: "+22796870299" },
  { name: "HAROBANDA", quartier: "Harobanda", commune: "V", address: "Sur la Route Say face à la Station Bazagor", phone: "+22791267819" },
  { name: "ROUTE TORODI", quartier: "Harobanda", commune: "V", address: "Collée à la Banque Atlantique Harobanda", phone: "+22720317907" },
  { name: "AMANA GAWEYE", quartier: "Gaweye", commune: "V", address: "En face de Maternité Gaweye", phone: "+22721268718" },
  { name: "GALABI", quartier: "Saguia", commune: "V", address: "Après 2è cassis en partant vers Say", phone: "+22796484545" },
  { name: "LIPTAKO", quartier: "Harobanda", commune: "V", address: "Dans l'Immeuble Liptako en face de Caren Assurance", phone: "+22720315120" },
  { name: "SAGUIA", quartier: "Saguia", commune: "V", address: "Au niveau du Rond Point Saguia", phone: "+22780960093" },
  { name: "NORDIRE", quartier: "Nordire", commune: "V", address: "A 100 mètres de la Station Bazagor Nordire", phone: "+22780072773" },
  { name: "RIVE DROITE", quartier: "Harobanda", commune: "V", address: "Sur la Route Say, face à la Station Bazagor", phone: "+22795326404" },
  { name: "KIRKISSOYE", quartier: "Kirkissoye", commune: "V", address: "Non loin du Rond-Point Gnalga", phone: "+22720315140" },
  { name: "LAMORDE", quartier: "Lamorde", commune: "V", address: "Derrière l'Ex CHU Lamorde", phone: "+22792198095" },
]

async function main() {
  console.log(`Inserting ${PHARMACIES.length} pharmacies…`)

  // Fetch existing phones to avoid duplicates
  const { data: existing } = await supabase.from('pharmacies').select('whatsapp_phone')
  const existingPhones = new Set((existing ?? []).map((p) => p.whatsapp_phone))

  const seenPhones = new Set<string>()
  const toInsert = PHARMACIES
    .filter((p) => p.phone && p.phone !== '+227') // skip empty phones
    .filter((p) => !existingPhones.has(p.phone))  // skip already in DB
    .filter((p) => {                              // skip intra-list duplicates
      if (seenPhones.has(p.phone)) return false
      seenPhones.add(p.phone)
      return true
    })
    .map((p) => {
      const coords = COMMUNE_COORDS[p.commune] ?? DEFAULT_COORDS
      return {
        name: p.name,
        whatsapp_phone: p.phone,
        address: p.address || p.quartier || null,
        lat: coords.lat,
        lng: coords.lng,
        is_active: true,
      }
    })

  console.log(`  Already in DB: ${PHARMACIES.length - toInsert.length}`)
  console.log(`  To insert: ${toInsert.length}`)

  if (toInsert.length === 0) {
    console.log('Nothing to insert.')
    return
  }

  // Insert in batches of 50
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50)
    const { error } = await supabase.from('pharmacies').insert(batch)
    if (error) {
      console.error(`Batch ${i / 50 + 1} error:`, error.message)
    } else {
      console.log(`  Batch ${i / 50 + 1}: inserted ${batch.length} pharmacies ✓`)
    }
  }

  console.log('Done.')
}

main().catch(console.error)
