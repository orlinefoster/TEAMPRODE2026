export type UserRole = 'admin' | 'user';

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
}

export interface WhitelistEntry {
  email: string;
  addedBy: string; // uid of admin
  createdAt: number; // Timestamp
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
}

export interface Prediction {
  predictionId: string; // `${uid}_${matchId}`
  userId: string;
  matchId: string;
  homePrediction: number;
  awayPrediction: number;
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
}

export interface ScenarioMatch extends Match {
  scenarioHomeScore?: number;
  scenarioAwayScore?: number;
}

export interface ScenarioPrediction extends Prediction {
  scenarioPointsEarned?: number;
}
