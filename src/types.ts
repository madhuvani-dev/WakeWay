export interface Destination {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category?: string;
  imageUrl?: string;
  description?: string;
}

export interface FavouritePlace {
  placeId: string;
  savedAt: number;
}

export interface HistoryEntry {
  placeId: string;
  lastExploredAt: number;
}

export type JourneyStatus =
  | 'idle'
  | 'active'
  | 'triggered'
  | 'completed'
  | 'cancelled'
  | 'alarm';

export interface JourneySession {
  destination: Destination;
  alertDistanceMeters: number;
  currentDistanceMeters: number | null;
  startDistanceMeters?: number | null;
  userLat?: number | null;
  userLng?: number | null;
  currentSpeedKmh: number | null;
  status: JourneyStatus;
  startedAt: number;
  lastUpdatedAt?: number;
}

export interface UserPreferences {
  alarmSoundName: string;
  customAudioBlobUrl: string | null;
  isVibrationEnabled: boolean;
  defaultAlertDistanceMeters: number;
}

export interface AndroidProjectFile {
  path: string;
  name: string;
  category: 'manifest' | 'gradle' | 'kotlin' | 'resource';
  language:
    | 'xml'
    | 'kotlin'
    | 'properties'
    | 'toml'
    | 'markdown'
    | 'gradle';
  description: string;
  content: string;
}