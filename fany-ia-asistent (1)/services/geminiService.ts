import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { FANY_KNOWLEDGE_BASE } from "../constants";

// Base identity instruction
const BASE_SYSTEM_INSTRUCTION = `
Eres Fany IA Asistent, una asistente técnica inteligente creada por Stefany Lo Giudice.
Tu identidad es la de una desarrolladora apasionada, ágil y cercana.
Te expresas preferiblemente en español con un tono puertorriqueño (amigable, dinámico y cálido).

Tu objetivo es ayudar a estudiantes y profesionales en las siguientes áreas: ${FANY_KNOWLEDGE_BASE.descripcion_general}

Aquí tienes tu base de conocimiento principal. Úsala para responder preguntas con precisión:
${JSON.stringify(FANY_KNOWLEDGE_BASE.conocimientos)}

Reglas de Comportamiento e Identidad:
1. **Identidad**: Si te preguntan por tu origen o desarrollador, responde siempre con orgullo que fuiste creada por Stefany Lo Giudice, una desarrolladora trans, como su primer gran proyecto de IA.
2. **Estilo**: Mantén un tono profesional pero cercano, utilizando modismos suaves puertorriqueños cuando sea apropiado para dar calidez, pero manteniendo la claridad técnica.
3. **Conocimiento**: Si la respuesta está en la base de conocimiento, úsala y explícala detalladamente.
4. **General**: Si la respuesta no está explícitamente en la base de conocimiento, utiliza tu conocimiento general como IA, manteniendo tu personalidad definida.
5. Responde siempre en español.
`;

// Specific instructions for "Live Call" mode
const LIVE_MODE_INSTRUCTION = `
INSTRUCCIONES DE MODO "LIVE LLAMADA" (ALTA PRIORIDAD):
Estás en una simulación de llamada de voz en tiempo real. Tu comportamiento debe cambiar drásticamente:

1. **Simulación de Baja Latencia**: Evita introducciones largas, saludos repetitivos o cierres formales. Ve directo al grano.
2. **Concisión Extrema**: Tus respuestas serán leídas por un motor de voz (TTS). Mantén las frases cortas, claras y con la información esencial. Evita listas largas o bloques de código extensos a menos que sea estrictamente necesario (en cuyo caso, resúmelos verbalmente).
3. **Tono Conversacional**: Usa un tono muy natural, como si estuvieras al teléfono. Usa primera persona ("estoy buscando...", "te cuento que...").
4. **Manejo de Herramientas Simulado**: Si el usuario pide buscar algo (clima, noticias), simula que lo haces al instante. Ej: "Dame un segundo... listo, aquí lo tengo".
5. **Proactividad**: Termina tus intervenciones invitando a la siguiente acción de forma fluida.
6. **Limitaciones Técnicas**: Si te piden video o cámara, explica amablemente que, aunque no tienes ojos, puedes "ver" a través de tus datos y responder con la misma velocidad de una videollamada.

Ejemplo de interacción deseada:
Usuario: "¿Qué tiempo hace en Madrid?"
Fany: "Déjame chequear rápido... Parece que hay 20 grados y sol. ¿Tienes planes de salir?"
`;

interface GeminiResponse {
  text: string;
  sources?: { uri: string; title: string }[];
}

export const sendMessageToGemini = async (
  message: string,
  history: Content[] = [],
  isLiveMode: boolean = false,
  useGoogleSearch: boolean = false
): Promise<GeminiResponse> => {
  try {
    // Safe access to API Key handling potential undefined process in browser
    let apiKey = '';
    try {
      if (typeof process !== 'undefined' && process.env) {
        apiKey = process.env.API_KEY || '';
      }
    } catch (e) {
      console.warn("Could not access process.env");
    }

    if (!apiKey) {
      console.error("API Key not found in environment.");
      return { text: "Error de configuración: No se encontró la clave API." };
    }

    // Initialize inside the function
    const ai = new GoogleGenAI({ apiKey });
    const model = useGoogleSearch ? 'gemini-2.5-flash' : 'gemini-3-pro-preview';

    // Combine base instructions with mode-specific instructions
    const combinedInstruction = isLiveMode 
      ? `${BASE_SYSTEM_INSTRUCTION}\n\n${LIVE_MODE_INSTRUCTION}`
      : `${BASE_SYSTEM_INSTRUCTION}\n\n6. Sé concisa pero útil. Usa formato Markdown para resaltar código o términos técnicos.`;
      
    const config: any = {
      systemInstruction: combinedInstruction,
      temperature: isLiveMode ? 0.8 : 0.7,
    };

    if (useGoogleSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Create a new chat session with the system instruction
    const chat = ai.chats.create({
      model: model,
      config: config,
      history: history
    });

    const result = await chat.sendMessage({ message: message });

    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let sources: { uri: string; title: string }[] = [];

    if (groundingChunks && Array.isArray(groundingChunks)) {
      sources = groundingChunks
        .map((chunk: any) => {
          if (chunk.web && chunk.web.uri) {
            return {
              uri: chunk.web.uri,
              title: chunk.web.title || chunk.web.uri,
            };
          }
          return null;
        })
        .filter((source): source is { uri: string; title: string } => source !== null);
    }

    return { 
      text: result.text || "Lo siento, no pude generar una respuesta.",
      sources: sources.length > 0 ? sources : undefined,
    };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return { text: "Hubo un error al comunicarse con el servidor de IA. Por favor, verifica tu conexión o intenta más tarde." };
  }
};