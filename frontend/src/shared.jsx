import { useState } from 'react'

export const CURRENCY = 'INR'

// Buying rules by price. UI only for now: the database will enforce these in the order step.
//   below 10,000        -> pay online only
//   10,000 to 2,00,000  -> pay online or contact the seller
//   above 2,00,000      -> contact the seller only
export const PAY_LIMITS = { onlineOnlyBelow: 10000, contactOnlyAbove: 200000 }
export const payMode = (price) =>
  price < PAY_LIMITS.onlineOnlyBelow ? 'online' : price <= PAY_LIMITS.contactOnlyAbove ? 'both' : 'contact'
export const MODE_LABEL = { online: 'Pay online', both: 'Pay online or contact', contact: 'Contact seller' }

export const CATS = [
  { id: 'all', label: 'All' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'luxury', label: 'Luxury' },
  { id: 'collectible', label: 'Collectibles' },
]
// Same values the Post page saves in "details"
export const SUBS = {
  vehicle: ['Car', 'SUV', 'Bike / scooter', 'Commercial / construction', 'Other'],
  luxury: ['Watch', 'Bag', 'Jewellery', 'Shoes / clothing', 'Other'],
  collectible: ['Coins / stamps', 'Comics / books', 'Trading cards', 'Art', 'Memorabilia', 'Other'],
}

export const EXTS = ['jpg', 'jpeg', 'png', 'webp']
export const SAMPLES = [
  { id: 's1', file: 'sample-honda-city', title: 'Honda City VX, 2019', price: 950000, category: 'vehicle', sub: 'Car', location: 'Chennai',
    description: 'Well-kept sedan with full service history, single owner, and no accidents. Smooth automatic gearbox, ideal for city and highway use.',
    details: [['Year', '2019'], ['Fuel', 'Petrol'], ['Transmission', 'Automatic'], ['Driven', '42,000 km'], ['Owners', '1st owner']] },
  { id: 's2', file: 'sample-royal-enfield', title: 'Royal Enfield Classic 350', price: 165000, category: 'vehicle', sub: 'Bike / scooter', location: 'Chennai',
    description: 'Classic cruiser in great condition with original paint and recent service. Papers and insurance up to date.',
    details: [['Year', '2021'], ['Fuel', 'Petrol'], ['Engine', '349 cc'], ['Driven', '12,000 km'], ['Owners', '1st owner']] },
  { id: 's3', file: 'sample-omega-seamaster', title: 'Vintage Omega Seamaster', price: 185000, category: 'luxury', sub: 'Watch', location: 'Mumbai',
    description: 'Pre-owned automatic dive watch on a mesh bracelet. Keeps good time and comes with its original box.',
    details: [['Condition', 'Pre-owned'], ['Movement', 'Automatic'], ['Bracelet', 'Steel mesh'], ['Includes', 'Original box']] },
  { id: 's4', file: 'sample-comic-set', title: 'First-edition comic set', price: 42000, category: 'collectible', sub: 'Comics / books', location: 'Bengaluru',
    description: 'Collector set kept in protective sleeves, with minimal wear on the covers. A great addition to any collection.',
    details: [['Condition', 'Very good'], ['Storage', 'Bagged and boarded'], ['Type', 'Hardcover collection']] },
  { id: 's5', file: 'sample-hyundai-creta', title: 'Hyundai Creta SUV', price: 1150000, category: 'vehicle', sub: 'SUV', location: 'Chennai',
    description: 'Comfortable family SUV with a clean interior, regular servicing and a strong diesel engine.',
    details: [['Year', '2020'], ['Fuel', 'Diesel'], ['Transmission', 'Manual'], ['Driven', '55,000 km'], ['Owners', '1st owner']] },
  { id: 's6', file: 'sample-rental-swift', title: 'Maruti Suzuki Swift, ex-rental', price: 480000, category: 'vehicle', sub: 'Car', location: 'Chennai',
    description: 'Fuel-efficient hatchback retired from a rental fleet. Fully serviced and ready to drive.',
    details: [['Year', '2018'], ['Fuel', 'Petrol'], ['Transmission', 'Manual'], ['Driven', '68,000 km'], ['Owners', '2nd owner']] },
  { id: 's7', file: 'sample-backhoe-loader', title: 'Backhoe loader, low hours', price: 2400000, category: 'vehicle', sub: 'Commercial / construction', location: 'Hosur',
    description: 'Working backhoe loader with low hours, regularly maintained, suitable for construction and earthmoving.',
    details: [['Year', '2017'], ['Hours', '3,200 hrs'], ['Fuel', 'Diesel'], ['Owners', '1st owner']] },
  // Add public/sample-stamp-album.jpg to show a photo. Without it the card says "No photo".
  { id: 's8', file: 'sample-stamp-album', title: 'Vintage postage stamp album', price: 6500, category: 'collectible', sub: 'Coins / stamps', location: 'Kolkata',
    description: 'Album of mixed postage stamps from the 1950s to the 1980s, neatly mounted, with a few duplicates.',
    details: [['Condition', 'Good'], ['Era', '1950s to 1980s'], ['Pages', '40']] },
]
export const SAMPLE_EXTRA = {
  s1: { highlights: ['Single owner', 'Full service history', 'No accidents', 'Automatic'], specs: [['Colour', 'Platinum white'], ['Insurance', 'Comprehensive, valid'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s2: { highlights: ['Original paint', 'Recent service', 'Papers up to date', '349 cc'], specs: [['Colour', 'Stealth black'], ['Insurance', 'Valid for 1 year'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s3: { highlights: ['Automatic movement', 'Original box', 'Keeps good time', 'Steel mesh bracelet'], specs: [['Case size', '41 mm'], ['Water resistance', '300 m'], ['Papers', 'Not included'], ['Location', 'Mumbai']] },
  s4: { highlights: ['Protective sleeves', 'Minimal cover wear', 'Complete set'], specs: [['Era', 'Silver Age'], ['Items', '12 issues'], ['Grading', 'Ungraded'], ['Location', 'Bengaluru']] },
  s5: { highlights: ['Family SUV', 'Diesel engine', 'Regular servicing', 'Clean interior'], specs: [['Colour', 'Polar white'], ['Insurance', 'Comprehensive, valid'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s6: { highlights: ['Fuel efficient', 'Fully serviced', 'Ex-rental fleet'], specs: [['Colour', 'Silver'], ['Insurance', 'Third-party, valid'], ['Registration', 'TN (Chennai)'], ['Location', 'Chennai']] },
  s7: { highlights: ['Low hours', 'Regularly maintained', 'Diesel', 'Single owner'], specs: [['Bucket', 'Standard'], ['Service', 'Every 250 hrs'], ['Location', 'Hosur']] },
  s8: { highlights: ['Mounted neatly', 'Mixed decades', '40 pages'], specs: [['Duplicates', 'A few'], ['Location', 'Kolkata']] },
}

// Only checks an admin actually ticked are shown to buyers. Keys must match Admin.jsx.
export const CHECK_LABELS = {
  id_checked: 'Seller photo ID checked',
  docs_checked: 'Ownership documents checked',
  vin_matched: 'VIN / chassis number matched to the RC',
  photos_reviewed: 'Item photos reviewed',
}

export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 }).format(n)
export const label = (c) => CATS.find((x) => x.id === c)?.label || c

export const candsFor = (item) =>
  item.file ? EXTS.map((e) => `/${item.file}.${e}`) : item.image_urls?.[0] ? [item.image_urls[0]] : []

/* Reads a detail by name, whether details is a list of pairs (samples) or an object (real listings) */
export function getDetail(item, ...keys) {
  const d = item.details
  if (!d) return null
  for (const k of keys) {
    if (Array.isArray(d)) {
      const hit = d.find(([name]) => name === k)
      if (hit) return hit[1]
    } else if (d[k]) return d[k]
  }
  return null
}
export const subOf = (item) => item.sub || getDetail(item, 'Vehicle type', 'Item type', 'Collectible type')
export const yearOf = (item) => Number(getDetail(item, 'Year')) || null
export const kmOf = (item) => {
  const v = getDetail(item, 'Kilometres driven', 'Driven')
  if (!v) return null
  const n = Number(String(v).replace(/[^\d]/g, ''))
  return Number.isFinite(n) ? n : null
}

const KEY_SPECS = {
  vehicle: ['Year', 'Kilometres driven', 'Driven', 'Fuel', 'Transmission'],
  luxury: ['Brand', 'Condition', 'Year purchased', 'Box and papers'],
  collectible: ['Collectible type', 'Condition', 'Era or year', 'Edition / grade'],
}
export const fmtSpec = (k, v) =>
  /kilometres/i.test(k) && /^\d+$/.test(String(v)) ? `${Number(v).toLocaleString('en-IN')} km` : String(v)
/* Up to 4 short facts shown on cards and under the title */
export function keySpecs(item) {
  const out = []
  for (const k of KEY_SPECS[item.category] || []) {
    const v = getDetail(item, k)
    if (v && !(k === 'Driven' && out.some(([x]) => x === 'Kilometres driven'))) out.push([k, fmtSpec(k, v)])
    if (out.length === 4) break
  }
  return out
}

export function Pic({ cands, alt, className }) {
  const [n, setN] = useState(0)
  const src = cands[n]
  if (!src) return <div className="grid h-full w-full place-items-center text-xs text-[#6B6B62]">No photo</div>
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setN(n + 1)} className={className} />
}

export function PayBadge({ price }) {
  const m = payMode(price)
  const cls = m === 'contact' ? 'border border-[#E4DED4] bg-white text-[#6B6B62]' : 'bg-[#E4EFE8] text-[#3D5A4D]'
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>{MODE_LABEL[m]}</span>
}
