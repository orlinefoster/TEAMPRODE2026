export type UserRole = 'admin' | 'referee' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  completedProde: boolean;
  points: number;
  exactMatchesCount: number; // Aciertos marcadores exactos (3 pts)
  outcomeMatchesCount: number; // Aciertos resultado/ganador (1 pt)
  isGhost?: boolean; // Participante de prueba creado por admin
  tournamentId?: string | null;
}

export interface WhitelistEntry {
  email: string;
  addedBy: string; // uid of admin
  createdAt: number; // Timestamp
  role?: UserRole;
  tournamentId?: string | null;
}

export type MatchStatus = 'pending' | 'played';

export interface Match {
  matchId: string;
  group: string; // 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L'
  homeTeam: string;
  awayTeam: string;
  date: number; // Timestamp
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  stadium?: string;
  city?: string;
  phase?: string;
}

export interface Tournament {
  id: string;
  name: string;
  modality: 'exact' | 'simple';
  refereeId: string;
  createdAt: number;
}

export interface TournamentParticipant {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  points: number;
  exactMatchesCount: number;
  outcomeMatchesCount: number;
  completedProde: boolean;
  joinedAt: number;
}

export interface Prediction {
  predictionId: string; // `${uid}_${matchId}` or custom format
  userId: string;
  matchId: string;
  homePrediction?: number;
  awayPrediction?: number;
  predictionOutcome?: 'home' | 'away' | 'draw';
  pointsEarned?: number;
  calculated?: boolean;
}

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  photoURL: string;
  points: number;
  completedProde: boolean;
  position?: number;
  exactMatchesCount: number;
  outcomeMatchesCount: number;
  isGhost?: boolean;
}


export interface ScenarioMatch extends Match {
  scenarioHomeScore?: number;
  scenarioAwayScore?: number;
}

export interface ScenarioPrediction extends Prediction {
  scenarioPointsEarned?: number;
}
