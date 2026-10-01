// Single source of truth for membership — imported by BOTH the API and the UI.
// Prices are US dollars. Yearly = roughly two months free.
export const INTERVALS = ['month', 'year']

export const TIERS = [
  {
    id: 'free',
    name: 'Friendly Neighborhood',
    level: 'Tier 1',
    rank: 0,
    price: { month: 0, year: 0 },
    tagline: 'Join the club. Your digital member card is included.',
    perks: ['Digital member card', 'Fan Theory Board (read + post)', 'Trivia challenge + global leaderboard', 'Personal dashboard', 'Club newsletter'],
  },
  {
    id: 'webslinger',
    name: 'Web-Slinger',
    level: 'Tier 2',
    rank: 1,
    price: { month: 4.99, year: 49.99 },
    tagline: 'For the ones who stay for the post-credits.',
    perks: ['Everything in Friendly Neighborhood', 'Members-only watch parties worldwide', 'HD wallpaper pack', 'Web-Slinger badge on your posts'],
  },
  {
    id: 'spidersense',
    name: 'Spider-Sense',
    level: 'Tier 3',
    rank: 2,
    price: { month: 9.99, year: 99.99 },
    tagline: 'All access. You felt this coming.',
    perks: ['Everything in Web-Slinger', 'Spoiler Vault: deep-dives + breakdowns', 'Private screenings + Q&A', 'Spider-Sense badge on your posts'],
    featured: true,
  },
  {
    id: 'multiverse',
    name: 'Multiverse',
    level: 'Tier 4',
    rank: 3,
    price: { month: 19.99, year: 199.99 },
    tagline: 'Every door, every universe. The full club.',
    perks: ['Everything in Spider-Sense', 'Multiverse Lounge: monthly live Q&A + replays', 'Exclusive digital collectible drops', 'Priority live-chat support', 'Multiverse badge on your posts'],
  },
]

// What each tier unlocks, grouped by section (drives the comparison table).
export const FEATURES = [
  { group: 'Community', rows: [
    ['Digital member card + personal dashboard', 'free'],
    ['Fan Theory Board (read + post)', 'free'],
    ['Trivia challenge + global leaderboard', 'free'],
    ['Badge on your posts', 'webslinger'],
  ] },
  { group: 'Content', rows: [
    ['HD wallpaper pack', 'webslinger'],
    ['Spoiler Vault: deep-dives + breakdowns', 'spidersense'],
    ['Exclusive digital collectible drops', 'multiverse'],
  ] },
  { group: 'Events', rows: [
    ['Members-only watch parties worldwide', 'webslinger'],
    ['Private screenings + Q&A', 'spidersense'],
    ['Multiverse Lounge: monthly live Q&A + replays', 'multiverse'],
  ] },
  { group: 'Support', rows: [
    ['Help centre + chat assistant', 'free'],
    ['Live-chat with the club team', 'free'],
    ['Priority live-chat support', 'multiverse'],
  ] },
]

export const tierById = (id) => TIERS.find((t) => t.id === id) || TIERS[0]
export const hasTier = (userTier, needed) => tierById(userTier).rank >= tierById(needed).rank
export const isInterval = (i) => INTERVALS.includes(i)
export const priceOf = (tierId, interval = 'month') => tierById(tierId).price[isInterval(interval) ? interval : 'month']
/** yearly saving vs 12 × monthly, in whole percent */
export const yearlySaving = (tierId) => {
  const t = tierById(tierId)
  return t.price.month ? Math.round((1 - t.price.year / (t.price.month * 12)) * 100) : 0
}
