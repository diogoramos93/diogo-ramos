
export interface EventData {
  id: string;
  name: string;
  date: string;
  coverImage: string;
  password?: string;
  createdAt: number;
  createdBy?: string;
}

export interface PhotoData {
  id: string;
  eventId: string;
  src: string;
  original?: Blob | string;
  createdAt: number;
}

export interface UserData {
  id: string;
  username: string;
  password?: string;
  name: string;
  createdAt: number;
}

export interface FaceMatchResult {
  photoId: string;
  distance: number;
}

export type ViewMode = 'browse' | 'search';

export type AIProvider = 'browser' | 'compre-face';

export interface AIConfig {
  provider: AIProvider;
  apiUrl?: string;
  apiKey?: string;
}
