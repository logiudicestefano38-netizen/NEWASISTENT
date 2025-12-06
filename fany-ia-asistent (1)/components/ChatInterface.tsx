import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, VoiceSettings } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import type { Content } from '@google/genai';

// Extend window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const STORAGE_KEY = 'fany_chat_history';
const VOICE_SETTINGS_KEY = 'fany_voice_settings';

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: '¡Hola! Soy Fany IA. ¿En qué puedo ayudarte hoy?',
  timestamp: new Date() // Placeholder, will be refreshed on init
};

const ChatInterface: React.FC = () => {
  // Initialize state from localStorage if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }));
          }
        }
      } catch (error) {
        console.error("Error cargando historial:", error);
      }
    }
    return [{ ...INITIAL_MESSAGE, timestamp: new Date() }];
  });

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Function to handle Text-to-Speech
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any current speech
    window.speechSynthesis.cancel();

    const settings: VoiceSettings = JSON.parse(
      localStorage.getItem(VOICE_SETTINGS_KEY) || 
      '{"pitch": 1.0, "rate": 1.0, "volume": 1.0, "voiceURI": null}'
    );

    // Strip markdown characters for better speech (simple regex)
    const cleanText = text.replace(/[*#`_]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    utterance.volume = settings.volume;

    if (settings.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas borrar todo el historial de chat?')) {
      const resetState = [{ ...INITIAL_MESSAGE, timestamp: new Date() }];
      setMessages(resetState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resetState));
      window.speechSynthesis.cancel();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz nativo. Por favor, usa Google Chrome o Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(prev => {
        // Append text with space if needed
        const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
        return prev + space + transcript;
      });
    };

    recognition.onerror = (event: any) => {
      // "no-speech" is common if user doesn't speak immediately; treat it gently.
      if (event.error === 'no-speech') {
        console.warn("Reconocimiento de voz: No se detectó audio.");
      } else if (event.error === 'not-allowed') {
        alert("Permiso de micrófono denegado. Por favor verifica la configuración de tu navegador.");
        console.error("Error reconocimiento voz:", event.error);
      } else {
        console.error("Error reconocimiento voz:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');
    
    // Add User Message
    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Prepare history for Gemini
      const history: Content[] = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      // Get response passing flags
      const { text: responseText, sources: responseSources } = await sendMessageToGemini(userText, history, isLiveMode, useGoogleSearch);

      const newModelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        sources: responseSources,
      };

      setMessages(prev => [...prev, newModelMsg]);

      // Automatically speak in Live Mode
      if (isLiveMode) {
        speakText(responseText);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Lo siento, hubo un error procesando tu solicitud.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className={`p-4 text-white flex items-center justify-between transition-colors duration-500 ${isLiveMode ? 'bg-gradient-to-r from-red-600 to-rose-500' : 'bg-brand-600 dark:bg-brand-700'}`}>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
               {isLiveMode ? <i className="fas fa-headset text-xl"></i> : <i className="fas fa-robot text-xl"></i>}
            </div>
            {isLiveMode && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 border-2 border-red-600"></span>
              </span>
            )}
          </div>
          <div>
            <h3 className="font-bold flex items-center gap-2">
              Fany IA Chat
              {isLiveMode && <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Live</span>}
            </h3>
            <p className="text-white/80 text-xs flex items-center">
              {isLiveMode ? 'Modo Llamada Activo' : 'Asistente Técnico'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live Mode Toggle */}
          <div className="flex items-center gap-2 mr-2 bg-black/10 px-3 py-1.5 rounded-full">
            <span className="text-xs font-medium hidden sm:inline">{isLiveMode ? 'ON AIR' : 'Modo Live'}</span>
            <button 
              onClick={() => {
                const newMode = !isLiveMode;
                setIsLiveMode(newMode);
                if (!newMode) window.speechSynthesis.cancel();
              }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isLiveMode ? 'bg-green-400' : 'bg-gray-400/50'}`}
              title="Activar modo llamada (Respuestas rápidas y voz)"
            >
              <span
                className={`${
                  isLiveMode ? 'translate-x-5' : 'translate-x-1'
                } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>

          <button 
            onClick={handleClearHistory}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors text-sm"
            title="Borrar historial"
          >
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm transition-colors ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-none'
              }`}
            >
               {msg.role === 'model' ? (
                   <div className="markdown-body text-sm leading-relaxed whitespace-pre-wrap">
                       {msg.text}
                   </div>
               ) : (
                   <p className="text-sm">{msg.text}</p>
               )}
               
               {/* Render Sources */}
               {msg.sources && msg.sources.length > 0 && (
                 <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                   <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Fuentes:</h4>
                   <ol className="list-decimal list-inside space-y-1">
                     {msg.sources.map((source, index) => (
                       <li key={index} className="text-xs truncate">
                         <a 
                           href={source.uri} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-brand-600 dark:text-brand-400 hover:underline"
                           title={source.title}
                         >
                           {source.title}
                         </a>
                       </li>
                     ))}
                   </ol>
                 </div>
               )}

               <span className={`text-[10px] block mt-2 ${
                 msg.role === 'user' ? 'text-brand-200' : 'text-gray-400 dark:text-gray-400'
               }`}>
                 {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
               
               {/* Replay button for model messages */}
               {msg.role === 'model' && (
                 <button 
                   onClick={() => speakText(msg.text)}
                   className="mt-2 text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                   title="Leer en voz alta"
                 >
                   <i className="fas fa-volume-up"></i> Escuchar
                 </button>
               )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-600 shadow-sm flex items-center gap-3 transition-colors">
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${isLiveMode ? 'bg-red-500' : 'bg-brand-400'}`}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${isLiveMode ? 'bg-red-500' : 'bg-brand-400'}`} style={{ animationDelay: '0.2s'}}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${isLiveMode ? 'bg-red-500' : 'bg-brand-400'}`} style={{ animationDelay: '0.4s'}}></div>
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse">
                  {isLiveMode ? 'Fany está hablando...' : 'Fany IA está escribiendo...'}
                </span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors">
        <div className={`flex items-end space-x-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-xl border focus-within:ring-2 transition-all ${isLiveMode ? 'border-red-200 focus-within:border-red-500 focus-within:ring-red-100 dark:focus-within:ring-red-900/30' : 'border-gray-200 dark:border-gray-600 focus-within:border-brand-300 dark:focus-within:border-brand-500 focus-within:ring-brand-100 dark:focus-within:ring-brand-900'}`}>
          <button
            onClick={() => setUseGoogleSearch(!useGoogleSearch)}
            className={`p-3 rounded-lg flex-shrink-0 transition-all duration-300 ${
              useGoogleSearch
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 shadow-inner'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
            }`}
            title="Activar/Desactivar Búsqueda con Google"
          >
            <i className="fab fa-google"></i>
          </button>
          <textarea
            className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-white text-sm resize-none max-h-32 py-3 px-2 placeholder-gray-400 dark:placeholder-gray-400"
            rows={1}
            placeholder={isLiveMode ? "Escribe para hablar..." : "Escribe tu consulta técnica aquí..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Microphone Button */}
          <button
            onClick={toggleListening}
            className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-md'
                : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
            }`}
            title="Dictar por voz"
          >
            <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
          </button>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
              isLoading || !inputValue.trim()
                ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : isLiveMode 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                  : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md'
            }`}
            title="Enviar mensaje"
          >
            <i className={`fas ${isLiveMode ? 'fa-phone' : 'fa-paper-plane'}`}></i>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
           {useGoogleSearch 
            ? <span className="font-semibold text-blue-600 dark:text-blue-400">Búsqueda con Google activada.</span>
            : isLiveMode 
              ? 'Modo de respuesta rápida activado.' 
              : 'Fany IA puede cometer errores. Verifica la información importante.'
          }
        </p>
      </div>
    </div>
  );
};

export default ChatInterface;