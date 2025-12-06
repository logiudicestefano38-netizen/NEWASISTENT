import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, VoiceSettings } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import type { Content } from '@google/genai';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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
  text: '¡Hola! 🚀 Soy **Fany IA**. ¿En qué puedo ayudarte hoy?\n\nPuedo ayudarte con programación, soporte técnico o crear tablas comparativas. ¡Pruébame!',
  timestamp: new Date()
};

const ChatInterface: React.FC = () => {
  // Initialize state from localStorage
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useGoogleSearch, setUseGoogleSearch] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // Refs for accessing state inside async callbacks/event listeners
  const isLiveModeRef = useRef(isLiveMode);
  const isSpeakingRef = useRef(isSpeaking);
  const inputValueRef = useRef(inputValue); // Track input for auto-send

  // Sync refs
  useEffect(() => { isLiveModeRef.current = isLiveMode; }, [isLiveMode]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { inputValueRef.current = inputValue; }, [inputValue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
    };
  }, []);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const startListening = () => {
    // Prevent starting if already listening or speaking
    if (isListening || isSpeakingRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz nativo.");
      setIsLiveMode(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false; // Stop automatically when user stops speaking
      recognition.interimResults = true; // Show results as we speak

      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Update input. Only add final parts to state to avoid duplication issues
        if (finalTranscript) {
             setInputValue(prev => {
                const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                return prev + space + finalTranscript;
             });
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.error("Error voz:", event.error);
        }
        // If live mode is on, we might want to restart listening if it was just noise error
        // But usually 'no-speech' means silence.
      };

      recognition.onend = () => {
        setIsListening(false);
        
        // AUTO-SEND LOGIC FOR LIVE MODE
        if (isLiveModeRef.current) {
          // Add a small delay to ensure state is updated
          setTimeout(() => {
            if (inputValueRef.current.trim().length > 0) {
              handleSendMessage();
            } else {
              // If no input was captured (silence), restart listening
              // unless we are manually stopping
               if (!isSpeakingRef.current && !isLoading) {
                   startListening();
               }
            }
          }, 200);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecognition();
    } else {
      startListening();
    }
  };

  // Toggle Live Mode
  const toggleLiveMode = () => {
    const newMode = !isLiveMode;
    setIsLiveMode(newMode);
    
    if (newMode) {
      // Start loop
      startListening();
    } else {
      // Stop loop
      stopRecognition();
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Function to handle Text-to-Speech
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop previous

    const settings: VoiceSettings = JSON.parse(
      localStorage.getItem(VOICE_SETTINGS_KEY) || 
      '{"pitch": 1.0, "rate": 1.0, "volume": 1.0, "voiceURI": null}'
    );

    // Strip markdown for speech to avoid reading symbols
    const cleanText = text.replace(/[*#`_\[\]]/g, '');

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

    utterance.onstart = () => setIsSpeaking(true);
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // RESTART LISTENING LOOP
      if (isLiveModeRef.current) {
        startListening();
      }
    };
    
    utterance.onerror = () => {
        setIsSpeaking(false);
        if (isLiveModeRef.current) {
            startListening();
        }
    };

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

  const handleSendMessage = async () => {
    // Read current input from ref to ensure we have latest inside async/timeout
    const textToSend = inputValueRef.current;
    
    if (!textToSend.trim() || isLoading) return;

    // Clear input immediately
    setInputValue('');
    inputValueRef.current = ''; 
    
    // Stop mic if running
    stopRecognition();

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      const history: Content[] = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      // Pass isLiveMode flag to service
      const { text: responseText, sources: responseSources } = await sendMessageToGemini(
          textToSend, 
          history, 
          isLiveModeRef.current, 
          useGoogleSearch
      );

      const newModelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        sources: responseSources,
      };

      setMessages(prev => [...prev, newModelMsg]);

      // Auto speak in live mode OR if requested via button (could add later)
      if (isLiveModeRef.current) {
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

  const renderMarkdown = (text: string) => {
    const rawMarkup = marked.parse(text) as string;
    return { __html: DOMPurify.sanitize(rawMarkup) };
  };

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300 relative">
        {/* Header */}
        <div className={`p-4 text-white flex items-center justify-between transition-colors duration-500 ${isLiveMode ? 'bg-gray-900' : 'bg-brand-600 dark:bg-brand-700'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
               <i className="fas fa-robot text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold flex items-center gap-2">
                Fany IA Chat
              </h3>
              <p className="text-white/80 text-xs">Asistente Técnico</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 mr-2 px-3 py-1.5 rounded-full transition-colors ${isLiveMode ? 'bg-red-900/50 border border-red-500' : 'bg-black/10'}`}>
              <span className={`text-xs font-medium hidden sm:inline ${isLiveMode ? 'text-red-300 animate-pulse' : 'text-white'}`}>Live Mode</span>
              <button 
                onClick={toggleLiveMode}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isLiveMode ? 'bg-red-500' : 'bg-gray-400/50'}`}
              >
                <span className={`${isLiveMode ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
              </button>
            </div>
            <button onClick={handleClearHistory} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors text-sm">
              <i className="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm transition-colors ${
                  msg.role === 'user'
                    ? 'bg-brand-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-600 rounded-bl-none'
                }`}>
                 {msg.role === 'model' ? (
                     <div 
                        className="markdown-body prose prose-sm dark:prose-invert max-w-none" 
                        dangerouslySetInnerHTML={renderMarkdown(msg.text)} 
                     />
                 ) : (
                     <p className="text-sm">{msg.text}</p>
                 )}
                 
                 {msg.sources && msg.sources.length > 0 && (
                   <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                     <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Fuentes:</h4>
                     <ol className="list-decimal list-inside space-y-1">
                       {msg.sources.map((source, index) => (
                         <li key={index} className="text-xs truncate">
                           <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">
                             {source.title}
                           </a>
                         </li>
                       ))}
                     </ol>
                   </div>
                 )}

                 <span className={`text-[10px] block mt-2 ${msg.role === 'user' ? 'text-brand-200' : 'text-gray-400 dark:text-gray-400'}`}>
                   {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
                 
                 {msg.role === 'model' && !isLiveMode && (
                   <button onClick={() => speakText(msg.text)} className="mt-2 text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1">
                     <i className="fas fa-volume-up"></i> Escuchar
                   </button>
                 )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <div className="bg-white dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-none border border-gray-100 dark:border-gray-600 shadow-sm flex items-center gap-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 animate-pulse">Fany IA está escribiendo...</span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-end space-x-2 bg-gray-50 dark:bg-gray-700 p-2 rounded-xl border border-gray-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-brand-100 dark:focus-within:ring-brand-900 transition-all">
            <button
              onClick={() => setUseGoogleSearch(!useGoogleSearch)}
              className={`p-3 rounded-lg flex-shrink-0 transition-all duration-300 ${useGoogleSearch ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}
            >
              <i className="fab fa-google"></i>
            </button>
            <textarea
              className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-800 dark:text-white text-sm resize-none max-h-32 py-3 px-2 placeholder-gray-400"
              rows={1}
              placeholder={isLiveMode ? "Habla ahora..." : "Escribe tu consulta técnica..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={toggleListening}
              className={`p-3 rounded-lg flex-shrink-0 transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="p-3 rounded-lg flex-shrink-0 bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>

      {/* LIVE MODE FULL SCREEN OVERLAY */}
      {isLiveMode && (
        <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-between p-8 animate-fade-in text-white">
          {/* Header */}
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span className="uppercase tracking-widest text-xs font-bold text-red-500">Live Call</span>
            </div>
            <button 
              onClick={toggleLiveMode}
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors border border-gray-700"
            >
              <i className="fas fa-times text-gray-400"></i>
            </button>
          </div>

          {/* Central Visualizer & Content */}
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center space-y-12">
            
            {/* Avatar / Icon */}
            <div className="w-40 h-40 rounded-full bg-gradient-to-br from-brand-600 to-purple-800 p-1.5 shadow-2xl shadow-brand-500/30 relative">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden relative z-10">
                <img src="https://img.icons8.com/3d-fluency/94/robot-2.png" alt="Avatar" className="w-24 h-24" />
              </div>
              {/* Ring Animation */}
              {(isSpeaking || isListening) && (
                <>
                  <div className={`absolute inset-0 rounded-full border-2 ${isListening ? 'border-red-500' : 'border-green-400'} animate-ping opacity-20`}></div>
                  <div className={`absolute inset-0 rounded-full border ${isListening ? 'border-red-400' : 'border-green-300'} animate-pulse opacity-40`}></div>
                </>
              )}
            </div>

            {/* Status Text */}
            <div className="space-y-4 min-h-[120px]">
              <h2 className="text-3xl font-light tracking-wide">
                {isLoading 
                    ? <span className="text-brand-300 animate-pulse">Pensando...</span>
                    : isListening 
                        ? <span className="text-red-400 font-medium">Escuchando...</span> 
                        : isSpeaking 
                            ? <span className="text-green-400">Fany hablando...</span> 
                            : 'Esperando respuesta...'}
              </h2>
              {/* Transcript Display */}
              <div className="h-16 flex items-center justify-center">
                 {inputValue && isListening && (
                    <p className="text-xl text-white font-medium italic animate-fade-in px-4">
                      "{inputValue}"
                    </p>
                 )}
                 {isSpeaking && messages.length > 0 && (
                     <p className="text-lg text-gray-300 font-light px-4 line-clamp-2">
                        {messages[messages.length - 1].text.replace(/[*#]/g, '')}
                     </p>
                 )}
              </div>
            </div>

            {/* WAVE ANIMATION */}
            <div className="h-24 flex items-center justify-center gap-2">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-2.5 rounded-full transition-all duration-300 ${
                    isSpeaking 
                      ? 'bg-green-400 animate-wave' 
                      : isListening 
                        ? 'bg-red-500 animate-wave-fast' 
                        : 'bg-gray-700 h-2'
                  }`}
                  style={{ 
                    animationDelay: `${i * 0.08}s`,
                    height: (isSpeaking || isListening) ? '50px' : '6px' 
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="w-full max-w-md flex flex-col items-center gap-4">
             <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform hover:scale-105 ${
                isListening 
                  ? 'bg-red-500 shadow-lg shadow-red-500/50' 
                  : 'bg-gray-800 hover:bg-gray-700 border border-gray-600'
              }`}
            >
              <i className={`fas ${isListening ? 'fa-microphone-slash text-white text-2xl' : 'fa-microphone text-white text-2xl'}`}></i>
            </button>
            <p className="text-gray-500 text-sm">
                {isListening ? 'Toca para pausar' : 'Toca para hablar'}
            </p>
          </div>
        </div>
      )}

      {/* Styles for markdown and wave animations */}
      <style>{`
        .markdown-body table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        .markdown-body th, .markdown-body td { border: 1px solid #e5e7eb; padding: 0.5em; text-align: left; }
        .markdown-body th { background-color: #f9fafb; font-weight: 600; }
        .dark .markdown-body th, .dark .markdown-body td { border-color: #374151; }
        .dark .markdown-body th { background-color: #1f2937; }
        .markdown-body pre { background: #f3f4f6; padding: 1em; rounded: 0.5em; overflow-x: auto; }
        .dark .markdown-body pre { background: #111827; }
        
        @keyframes wave {
          0%, 100% { height: 10px; opacity: 0.5; }
          50% { height: 60px; opacity: 1; }
        }
        @keyframes wave-fast {
          0%, 100% { height: 15px; }
          50% { height: 70px; }
        }
        .animate-wave { animation: wave 1s ease-in-out infinite; }
        .animate-wave-fast { animation: wave-fast 0.5s ease-in-out infinite; }
      `}</style>
    </>
  );
};

export default ChatInterface;