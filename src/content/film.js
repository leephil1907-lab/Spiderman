// Everything on the film sections lives here. Edit freely.
// Facts checked Oct 2026 against official Sony Pictures / Marvel materials.
export const FILM = {
  title: 'Spider-Man: Brand New Day',
  status: 'Now playing · On Digital Oct 6',
  releaseUS: 'July 31, 2026',
  releaseISO: '2026-07-31',
  director: 'Destin Daniel Cretton',
  writers: 'Chris McKenna & Erik Sommers',
  music: 'Michael Giacchino',
  runtime: '2h 25m',
  rating: 'PG-13',
  studios: 'Marvel Studios · Columbia Pictures',
  distributor: 'Sony Pictures',
  boxOffice: '$2.5B+ worldwide',
  boxOfficeValue: 2.5,
  boxOfficeNote: 'reported Sept 29, 2026',
  // Official synopsis, spidermanbrandnewday.movie
  synopsis: [
    'It’s a Brand New Day for Peter Parker. Fighting crime full-time as Spider-Man in a world that doesn’t remember him — and the pressure of seeing his old friends move on without him — sparks a change in Peter he may not have the power to control.',
    'But that transformation might also be the only thing that can stop a shocking new threat to the city and those he loves: a powerful villain no one can even see.',
  ],
  tagline: 'The world may have forgotten Peter Parker, but he hasn’t forgotten them.',
  ratingReason: 'Rated PG-13 for sequences of action/violence and some language.',
  // Official Sony Pictures Entertainment final trailer supplied by the project owner.
  trailerYouTubeId: 'P3uI5sLosKU',
  trailerUrl: 'https://youtu.be/P3uI5sLosKU',
  // The official trailer thumbnail is a real film asset and keeps the hero imagery
  // anchored to the masculine Spider-Man presentation rather than a placeholder plate.
  posterSrc: '/media/bnd-reflection.jpg',
  officialFilmUrl: 'https://www.sonypictures.com/movies/spidermanbrandnewday',
  officialGalleryUrl: 'https://spidermanbrandnewday.movie/gallery/',
  trailerThumbnail: 'https://i.ytimg.com/vi/P3uI5sLosKU/maxresdefault.jpg',
}

// The three official trailers listed on spidermanbrandnewday.movie (newest first)
export const TRAILERS = [
  { id: 'P3uI5sLosKU', title: 'Final Trailer', sub: 'Peter’s Journey' },
  { id: '3gAlCLVpePk', title: 'Official Trailer 2', sub: 'Sony Pictures Entertainment' },
  { id: '8TZMtslA3UY', title: 'Official Trailer', sub: 'Sony Pictures Entertainment' },
]

// Official credits block, spidermanbrandnewday.movie
export const CREDITS = [
  ['Directed by', ['Destin Daniel Cretton']],
  ['Written by', ['Chris McKenna & Erik Sommers']],
  ['Based on the Marvel comic book by', ['Stan Lee and Steve Ditko']],
  ['Produced by', ['Kevin Feige, p.g.a.', 'Amy Pascal, p.g.a.', 'Avi Arad', 'Rachel O’Connor, p.g.a.']],
  ['Executive producers', ['Louis D’Esposito', 'David Cain']],
  ['Music', ['Michael Giacchino']],
  ['Cinematography', ['Brett Pawlak']],
]

// Sony Pictures Home Entertainment announcement, Sept 29, 2026
export const HOME_RELEASE = {
  digitalISO: '2026-10-06T07:00:00Z',
  discISO: '2026-12-15T08:00:00Z',
  digital: 'October 6, 2026',
  disc: 'December 15, 2026',
  buyUrl: 'https://www.sonypictures.com/movies/spidermanbrandnewday',
  editions: [
    { name: '4K UHD + Blu-ray Combo SteelBook', note: 'Collectible limited edition' },
    { name: 'Limited Collector’s Edition SteelBook', note: 'Magnetic lenticular cover, a relic card with an authentic piece of production wardrobe, an all-new comic book, art cards, and reproductions of Peter’s letter to MJ and MJ’s drawing' },
    { name: '4K Ultra HD · Blu-ray · DVD', note: 'Standard editions, December 15' },
  ],
  extras: [
    { title: 'Goofs, Gaffes and Gags', kind: 'Outtakes', note: 'The on-set hi-jinx caught on camera.' },
    { title: 'Tom Holland: Evolving Spider', kind: 'Featurette', note: 'Holland’s many roles in front of and behind the camera.' },
    { title: 'Brand New Direction', kind: 'Featurette', note: 'Destin Daniel Cretton on a more mature Spider-Man.' },
    { title: 'Secret Sources and Hidden Spider Eggs', kind: 'Featurette', note: 'Hidden references to the Marvel universe and beyond.' },
    { title: 'Possession!', kind: 'Featurette', note: 'The practical performances behind the villain’s mental powers.' },
    { title: 'Peter and The Punisher', kind: 'Featurette', note: 'Tom Holland and Jon Bernthal on their on-screen chemistry.' },
    { title: 'Live-Action Comics', kind: 'Featurette', note: 'Recreating iconic comic covers on camera.' },
    { title: 'Friends and Foes', kind: 'Featurette', note: 'Zendaya, Sadie Sink, Mark Ruffalo, Jacob Batalon and the ensemble.' },
    { title: 'Webs, Wires and Runaway Tanks', kind: 'Featurette', note: 'Stunt coordinator Peng Zhang on the practical action.' },
    { title: 'Scorpions, Ninjas, and the Spider-Suit', kind: 'Featurette', note: 'Designing the costumes and reinventing the suit.' },
    { title: 'Lost Memories from Set: Camera Roll', kind: 'Featurette', note: 'Behind-the-scenes memories from set.' },
  ],
}

// Earlier Tom Holland films — official Sony "Get it now" pages
export const SAGA_LINKS = {
  homecoming: 'https://www.sonypictures.com/movies/spidermanhomecoming',
  'far-from-home': 'https://www.sonypictures.com/movies/spidermanfarfromhome',
  'no-way-home': 'https://www.sonypictures.com/movies/spidermannowayhome',
}

export const CAST = [
  { name: 'Tom Holland', role: 'Peter Parker / Spider-Man' },
  { name: 'Zendaya', role: 'MJ' },
  { name: 'Jacob Batalon', role: 'Ned Leeds' },
  { name: 'Jon Bernthal', role: 'Frank Castle / The Punisher' },
  { name: 'Mark Ruffalo', role: 'Bruce Banner / Hulk' },
  { name: 'Sadie Sink', role: 'Jean Grey', reveal: true },
  { name: 'Tramell Tillman', role: 'Bill Metzger' },
  { name: 'Michael Mando', role: 'Mac Gargan / Scorpion' },
  { name: 'Marvin Jones III', role: 'Tombstone' },
  { name: 'Liza Colón-Zayas', role: 'Det. Jean DeWolff' },
  { name: 'Florence Pugh', role: 'Yelena Belova', reveal: true },
]

export const TIMELINE = [
  { year: 2016, title: 'Captain America: Civil War', note: 'Debut. A kid from Queens gets a call from Tony Stark.' },
  { year: 2017, title: 'Spider-Man: Homecoming', note: 'Learning what the suit is for.' },
  { year: 2019, title: 'Spider-Man: Far From Home', note: 'The world learns who is under the mask.' },
  { year: 2021, title: 'Spider-Man: No Way Home', note: 'A spell, a sacrifice, and everyone forgets.' },
  { year: 2026, title: 'Spider-Man: Brand New Day', note: 'Four years on. Nobody remembers. He does.' },
]

export const CINEMA_REGIONS = [
  { id: 'na', name: 'North America', countries: ['US', 'CA'], chains: [
    { name: 'AMC Theatres', url: 'https://www.amctheatres.com' }, { name: 'Regal', url: 'https://www.regmovies.com' },
    { name: 'Cinemark', url: 'https://www.cinemark.com' }, { name: 'Fandango', url: 'https://www.fandango.com' }, { name: 'Cineplex', url: 'https://www.cineplex.com' } ] },
  { id: 'eu', name: 'UK & Europe', countries: ['GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'AT', 'SE', 'DK', 'NO', 'FI', 'PL'], chains: [
    { name: 'ODEON', url: 'https://www.odeon.co.uk' }, { name: 'Cineworld', url: 'https://www.cineworld.co.uk' },
    { name: 'Vue', url: 'https://www.myvue.com' }, { name: 'Pathé', url: 'https://www.pathe.fr' }, { name: 'Kinepolis', url: 'https://kinepolis.com' } ] },
  { id: 'latam', name: 'Latin America', countries: ['MX', 'BR', 'AR', 'CO', 'CL', 'PE'], chains: [
    { name: 'Cinépolis', url: 'https://cinepolis.com' }, { name: 'Cinemex', url: 'https://cinemex.com' }, { name: 'Cinemark', url: 'https://www.cinemark.com' } ] },
  { id: 'mea', name: 'Middle East & Africa', countries: ['AE', 'SA', 'QA', 'EG', 'NG', 'GH', 'KE', 'ZA'], chains: [
    { name: 'VOX Cinemas', url: 'https://uae.voxcinemas.com' }, { name: 'Filmhouse', url: 'https://filmhouseng.com' },
    { name: 'Genesis Cinemas', url: 'https://genesiscinemas.com' }, { name: 'Ster-Kinekor', url: 'https://www.sterkinekor.co.za' } ] },
  { id: 'apac', name: 'Asia Pacific', countries: ['JP', 'KR', 'IN', 'AU', 'NZ', 'SG', 'PH', 'ID', 'MY', 'TH'], chains: [
    { name: 'Event Cinemas', url: 'https://www.eventcinemas.com.au' }, { name: 'TOHO Cinemas', url: 'https://www.tohotheater.jp' },
    { name: 'CGV', url: 'https://www.cgv.co.kr' }, { name: 'PVR INOX', url: 'https://www.pvrcinemas.com' } ] },
]
export const IMAX = { name: 'Find an IMAX screen', url: 'https://www.imax.com/theatres' }
export const regionForCountry = (cc) => CINEMA_REGIONS.find((r) => r.countries.includes(cc))?.id || 'na'

export const SOCIAL = [
  { name: 'facebook', label: 'Spider-Man on Facebook', url: 'https://www.facebook.com/SpiderManMovie' },
  { name: 'instagram', label: 'Spider-Man on Instagram', url: 'https://www.instagram.com/spidermanmovie/' },
  { name: 'x', label: 'Spider-Man on X', url: 'https://x.com/SpiderManMovie' },
  { name: 'tiktok', label: 'Spider-Man on TikTok', url: 'https://www.tiktok.com/@spidermanmovie' },
  { name: 'youtube', label: 'Sony Pictures on YouTube', url: 'https://www.youtube.com/@SonyPictures' },
  { name: 'discord', label: 'Club Discord', url: '' },
]

export const QUIZ = [
  { q: 'Who directed Spider-Man: Brand New Day?', a: ['Destin Daniel Cretton', 'Jon Watts', 'Sam Raimi', 'Ryan Coogler'], c: 0 },
  { q: 'When did the film open in US cinemas?', a: ['July 24, 2026', 'July 31, 2026', 'May 1, 2026', 'December 18, 2026'], c: 1 },
  { q: 'Which film was Tom Holland’s first appearance as Spider-Man?', a: ['Spider-Man: Homecoming', 'Avengers: Infinity War', 'Captain America: Civil War', 'Iron Man 3'], c: 2 },
  { q: 'Who composed the score?', a: ['Hans Zimmer', 'Ludwig Göransson', 'Alan Silvestri', 'Michael Giacchino'], c: 3 },
  { q: 'Who plays Frank Castle?', a: ['Jon Bernthal', 'Tramell Tillman', 'Michael Mando', 'Mark Ruffalo'], c: 0 },
  { q: 'How long after No Way Home is the story set?', a: ['One year', 'Four years', 'Ten years', 'The same summer'], c: 1 },
  { q: 'Who plays Ned Leeds?', a: ['Tony Revolori', 'Jacob Batalon', 'Angourie Rice', 'Jacob Elordi'], c: 1 },
  { q: 'What is the film’s runtime?', a: ['1h 58m', '2h 10m', '2h 25m', '2h 49m'], c: 2 },
  { q: 'Which studio distributes the film?', a: ['Warner Bros.', 'Universal', 'Disney', 'Sony Pictures'], c: 3 },
  { q: 'Who co-wrote it with Erik Sommers?', a: ['Chris McKenna', 'Christopher Markus', 'Jeff Loveness', 'Kevin Feige'], c: 0 },
]

export const COMPANY = {
  name: 'BND Fan Club',
  legalName: '[Registered company name]',
  address: '[Registered business address]',
  supportEmail: 'support@bndfanclub.com',
  privacyEmail: 'privacy@bndfanclub.com',
  hours: 'Assistant 24/7 · Team replies within 24 hours',
}
