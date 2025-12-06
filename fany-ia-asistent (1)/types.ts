export interface KnowledgeItem {
  titulo: string;
  contenido: string;
  categoria: string;
  etiquetas: string;
}

export interface KnowledgeBase {
  descripcion_general: string;
  conocimientos: KnowledgeItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: { uri: string; title: string }[];
}

export interface VoiceSettings {
  voiceURI: string | null;
  pitch: number;
  rate: number;
  volume: number;
}

export type TabView = 'search' | 'chat' | 'settings';