import React, { useState, useEffect } from 'react';
import { VoiceSettings } from '../types';

const STORAGE_KEY = 'fany_voice_settings';

const DEFAULT_SETTINGS: VoiceSettings = {
  voiceURI: null,
  pitch: 1.0,
  rate: 1.0,
  volume: 1.0,
};

const Settings: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    }
    return DEFAULT_SETTINGS;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      // Filter for relevant voices (Spanish/English) to make the list cleaner
      const filtered = available.sort((a, b) => {
        // Prioritize Spanish
        if (a.lang.startsWith('es') && !b.lang.startsWith('es')) return -1;
        if (!a.lang.startsWith('es') && b.lang.startsWith('es')) return 1;
        return a.name.localeCompare(b.name);
      });
      setVoices(filtered);
    };

    loadVoices();
    
    // Chrome requires this event listener
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const handleSettingChange = (key: keyof VoiceSettings, value: string | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTestVoice = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      "Hola, soy Fany. Así es como sueno con la configuración actual."
    );
    
    if (settings.voiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
      if (selectedVoice) utterance.voice = selectedVoice;
    }

    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    utterance.volume = settings.volume;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const applyPreset = (type: 'default' | 'fast' | 'calm') => {
    switch (type) {
      case 'calm':
        setSettings(prev => ({ ...prev, rate: 0.9, pitch: 0.9, volume: 1.0 }));
        break;
      case 'fast':
        setSettings(prev => ({ ...prev, rate: 1.2, pitch: 1.1, volume: 1.0 }));
        break;
      case 'default':
      default:
        setSettings(prev => ({ ...prev, rate: 1.0, pitch: 1.0, volume: 1.0 }));
        break;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <i className="fas fa-sliders-h text-xl"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Configuración de Voz</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza cómo suena Fany IA</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seleccionar Voz / Acento
            </label>
            <div className="relative">
              <select
                value={settings.voiceURI || ''}
                onChange={(e) => handleSettingChange('voiceURI', e.target.value)}
                className="block w-full pl-3 pr-10 py-3 text-base border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-lg transition-colors"
              >
                <option value="">Automático (Predeterminado del sistema)</option>
                {voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <i className="fas fa-chevron-down text-gray-400"></i>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              * Las voces disponibles dependen de tu sistema operativo y navegador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Speed Control */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Velocidad (Rate)
                </label>
                <span className="text-xs font-mono bg-white dark:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-200">
                  {settings.rate.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.rate}
                onChange={(e) => handleSettingChange('rate', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Lento</span>
                <span>Rápido</span>
              </div>
            </div>

            {/* Pitch Control */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tono (Pitch)
                </label>
                <span className="text-xs font-mono bg-white dark:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-200">
                  {settings.pitch.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.pitch}
                onChange={(e) => handleSettingChange('pitch', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Grave</span>
                <span>Agudo</span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Volumen
                </label>
                <span className="text-xs font-mono bg-white dark:bg-gray-600 px-2 py-1 rounded text-gray-600 dark:text-gray-200">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Silencio</span>
                <span>Máximo</span>
              </div>
            </div>
          </div>

          {/* Style Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Estilos Rápidos
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => applyPreset('default')}
                className="px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
              >
                Estándar
              </button>
              <button
                onClick={() => applyPreset('calm')}
                className="px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
              >
                Calmado y Profundo
              </button>
              <button
                onClick={() => applyPreset('fast')}
                className="px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
              >
                Ágil y Dinámico
              </button>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700" />

          {/* Test Button */}
          <div className="flex justify-end">
            <button
              onClick={handleTestVoice}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-md hover:shadow-lg ${
                isPlaying 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              {isPlaying ? (
                <>
                  <i className="fas fa-stop"></i> Detener
                </>
              ) : (
                <>
                  <i className="fas fa-play"></i> Probar Voz
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;