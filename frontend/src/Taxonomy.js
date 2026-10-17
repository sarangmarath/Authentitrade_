// Top-level categories. live:true = sellers can post these today (matches Post.jsx).
// Others show in the menu but say "coming soon" until you add them to Post.jsx and the database.

export const TAXONOMY = [
  { id: 'vehicle', label: 'Motors', live: true, subs: ['Car', 'SUV', 'Bike / scooter', 'Commercial / construction', 'Other'] },
  { id: 'luxury', label: 'Luxury', live: true, subs: ['Watch', 'Bag', 'Jewellery', 'Shoes / clothing', 'Other'] },
  { id: 'collectible', label: 'Collectibles', live: true, subs: ['Coins / stamps', 'Comics / books', 'Trading cards', 'Art', 'Memorabilia', 'Other'] },
  { id: 'electronics', label: 'Electronics', subs: ['Phones', 'Laptops', 'Cameras', 'Audio', 'Gaming'] },
  { id: 'home', label: 'Home and garden', subs: ['Furniture', 'Appliances', 'Garden', 'Decor'] },
  { id: 'toys', label: 'Toys', subs: ['Lego', 'Action figures', 'Board games'] },
  { id: 'sports', label: 'Sporting goods', subs: ['Cycling', 'Fitness', 'Cricket', 'Outdoor'] },
  { id: 'business', label: 'Business and industrial', subs: ['Heavy equipment', 'Tools', 'Machinery'] },
]

export const PRICES = [
  ['Any price', 0, Infinity], ['Under ₹50,000', 0, 50000], ['₹50,000 to ₹5 lakh', 50000, 500000],
  ['₹5 to ₹15 lakh', 500000, 1500000], ['Above ₹15 lakh', 1500000, Infinity],
]
export const SORTS = [
  ['new', 'Newest'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'],
  ['year_desc', 'Year: newest'], ['km_asc', 'Kilometres: lowest'],
]
export const DEFAULT_FILTERS = { cat: 'all', sub: '', brand: '', city: '', price: 0, minYear: '', maxKm: '', sort: 'new' }

// Sample listings in Home.jsx have no sub-category or city, so we add them here.
const SAMPLE_META = {
  s1: ['Car', 'Chennai'], s2: ['Bike / scooter', 'Chennai'], s3: ['Watch', 'Mumbai'], s4: ['Comics / books', 'Bengaluru'],
  s5: ['SUV', 'Chennai'], s6: ['Car', 'Chennai'], s7: ['Commercial / construction', 'Hosur'],
}
const BRANDS = ['Honda', 'Hyundai', 'Maruti Suzuki', 'Royal Enfield', 'Omega']

// details is a list of pairs for samples and an object for real listings
export function getDetail(item, ...keys) {
  const d = item.details
  if (!d) return null
  for (const k of keys) {
    const v = Array.isArray(d) ? d.find(([n]) => n === k)?.[1] : d[k]
    if (v) return v
  }
  return null
}
export const subOf = (i) => SAMPLE_META[i.id]?.[0] || getDetail(i, 'Vehicle type', 'Item type', 'Collectible type')
export const cityOf = (i) => {
  const s = (i.location || SAMPLE_META[i.id]?.[1] || '').trim()
  return s && s[0].toUpperCase() + s.slice(1).toLowerCase()
}
export const yearOf = (i) => Number(getDetail(i, 'Year', 'Year purchased')) || null
export const kmOf = (i) => {
  const n = Number(String(getDetail(i, 'Kilometres driven', 'Driven') || '').replace(/\D/g, ''))
  return n || null
}
export const brandOf = (i) =>
  getDetail(i, 'Make', 'Brand') || BRANDS.find((b) => i.title.toLowerCase().includes(b.toLowerCase())) || null

export const isLive = (cat) => TAXONOMY.find((t) => t.id === cat)?.live !== false
export const emptyText = (f) =>
  f.cat === 'saved' ? 'You have not saved anything yet. Tap the heart on a listing.'
  : !isLive(f.cat) ? 'Listings for this category are coming soon.'
  : 'No listings match your filters.'

export function applyFilters(items, f, q = '', saved = []) {
  const [, pmin, pmax] = PRICES[f.price] || PRICES[0]
  const out = items.filter((i) => {
    if (f.cat === 'saved') { if (!saved.includes(i.id)) return false }
    else if (f.cat !== 'all' && i.category !== f.cat) return false
    if (f.sub && subOf(i) !== f.sub) return false
    if (f.brand && brandOf(i) !== f.brand) return false
    if (f.city && cityOf(i) !== f.city) return false
    if (i.price < pmin || i.price > pmax) return false
    if (f.minYear && (yearOf(i) || 0) < Number(f.minYear)) return false
    if (f.maxKm && (kmOf(i) ?? Infinity) > Number(f.maxKm)) return false
    return i.title.toLowerCase().includes(q.toLowerCase())
  })
  const by = {
    price_asc: (a, b) => a.price - b.price, price_desc: (a, b) => b.price - a.price,
    year_desc: (a, b) => (yearOf(b) || 0) - (yearOf(a) || 0), km_asc: (a, b) => (kmOf(a) ?? 1e12) - (kmOf(b) ?? 1e12),
  }
  return by[f.sort] ? [...out].sort(by[f.sort]) : out
}

// Top-level categories. live:true = sellers can post these today (matches Post.jsx).
// Others show in the menu but say "coming soon" until you add them to Post.jsx and the database.
