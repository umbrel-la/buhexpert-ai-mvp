export type Access = "free" | "subscription";
export type Confidence = "low" | "medium" | "high";

export interface Material {
  id: string;
  title: string;
  url: string;
  category: string;
  configuration: string;
  updatedAt: string;
  summary: string;
  content: string;
  tags: string[];
  access: Access;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  category: string;
  updatedAt: string;
}

export interface ChatResponse {
  shortAnswer: string;
  explanation: string[];
  stepsPreview: string[];
  sources: Source[];
  locked: boolean;
  remainingQueries: number;
  confidence: Confidence;
  demoMode: boolean;
  insufficient?: boolean;
}

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  answer?: ChatResponse;
};
