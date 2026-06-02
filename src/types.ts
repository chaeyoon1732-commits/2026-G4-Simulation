export type Division = '영업' | '서비스';

export interface Persona {
  id: string;
  name: string;
  role: string;
  age: number;
  trait: string;
  mbti: string;
  style: string;
  division: Division;
}

export interface Scenario {
  id: string;
  category: string;
  title: string;
  description: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  timestamp?: number;
}

export interface SimulationReport {
  overall: string;
  psychology: string;
  leadership: string;
  needs: string;
  strengths: string;
  improvements: string;
  actionPlan: {
    quote: string;
    interviewSkill?: string;
    negativePatterns?: {
      pattern: string;
      actualQuote: string;
      impact: string;
      replacementScripts: string[];
    }[];
    practiceScripts?: string[];
    guidelines: string[];
    risk: string;
  };
}

export interface SimulationRecord {
  id?: string;
  userId: string;
  userEmail: string;
  userName: string;
  userGroup?: string;
  userAffiliation?: string;
  personaId: string;
  personaName: string;
  scenarioId: string;
  scenarioTitle: string;
  messages: Message[];
  finalEmotion: string;
  metrics: {
    rapport: number;
    analysis: number;
    solution: number;
    engagement: number;
  };
  turnCount: number;
  isCompleted: boolean;
  timestamp: any; // Firestore Timestamp
  evaluation?: SimulationReport;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
  entryCode?: string;
  group?: string;
  affiliation?: string;
}
