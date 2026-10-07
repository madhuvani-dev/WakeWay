import { Destination } from '../types';

export const DEFAULT_PLACES: Destination[] = [
  {
    id: 'dest-secunderabad',
    name: 'Secunderabad Junction Railway Station',
    address: 'Station Road, Secunderabad, Telangana, India',
    latitude: 17.4344,
    longitude: 78.5015,
    category: 'Major Railway Junction',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80',
    description: 'Major South Central Railway hub connecting northern and southern Indian passenger express corridors.'
  },
  {
    id: 'dest-grand-central',
    name: 'Grand Central Terminal',
    address: '89 E 42nd St, New York, NY 10017, USA',
    latitude: 40.7527,
    longitude: -73.9772,
    category: 'Historic Transit Terminal',
    imageUrl: 'https://images.unsplash.com/photo-1556983852-43bf21186b2a?w=800&auto=format&fit=crop&q=80',
    description: 'Iconic Beaux-Arts architectural landmark and high-frequency commuter rail hub in Midtown Manhattan.'
  },
  {
    id: 'dest-kings-cross',
    name: 'London King’s Cross Station',
    address: 'Euston Rd, London N1 9AL, United Kingdom',
    latitude: 51.5308,
    longitude: -0.1238,
    category: 'Intercity Passenger Terminal',
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
    description: 'Central London rail terminus connecting the East Coast Main Line to Scotland and northern England.'
  },
  {
    id: 'dest-tokyo-station',
    name: 'Tokyo Station',
    address: '1 Chome Marunouchi, Chiyoda City, Tokyo, Japan',
    latitude: 35.6812,
    longitude: 139.7671,
    category: 'Shinkansen Bullet Train Hub',
    imageUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&auto=format&fit=crop&q=80',
    description: 'The historic red-brick central rail terminal serving all high-speed Shinkansen lines and urban transit.'
  },
  {
    id: 'dest-zurich-hb',
    name: 'Zürich Hauptbahnhof',
    address: 'Bahnhofpl., 8001 Zürich, Switzerland',
    latitude: 47.3779,
    longitude: 8.5402,
    category: 'Alpine High-Speed Hub',
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    description: 'Switzerland’s largest transit gateway linking scenic alpine rail routes to France, Germany, and Italy.'
  },
  {
    id: 'dest-gare-du-nord',
    name: 'Gare du Nord',
    address: '18 Rue de Dunkerque, 75010 Paris, France',
    latitude: 48.8809,
    longitude: 2.3553,
    category: 'International Rail Gateway',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&auto=format&fit=crop&q=80',
    description: 'The busiest railway station in Europe, serving Eurostar cross-channel trains, Thalys, and regional lines.'
  }
];

export function getPlaceId(dest: Destination): string {
  if (dest.id && dest.id.trim().length > 0) {
    return dest.id;
  }
  const cleanName = dest.name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 24);
  const latStr = dest.latitude.toFixed(3).replace('.', '_');
  const lngStr = dest.longitude.toFixed(3).replace('.', '_');
  return `place_${cleanName}_${latStr}_${lngStr}`;
}

export function findPlaceById(
  id: string,
  customPlaces: Record<string, Destination> = {}
): Destination | null {
  if (customPlaces[id]) {
    return customPlaces[id];
  }
  const found = DEFAULT_PLACES.find((p) => p.id === id || getPlaceId(p) === id);
  return found || null;
}
