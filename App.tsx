import React, { useState, useEffect } from 'react';
import KnowledgeExplorer from './components/KnowledgeExplorer';
import ChatInterface from './components/ChatInterface';
import Settings from './components/Settings';
import type { TabView } from './types';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabView>('search');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check local storage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      {/* Navbar */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg">
                    <i className="fas fa-microchip"></i>
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-brand-500 dark:from-brand-400 dark:to-brand-200">
                  Fany IA
                </span>
              </div>
            </div>
            {/* Desktop Tabs & Theme Toggle */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex space-x-8 items-center mr-4">
                <button
                  onClick={() => setCurrentTab('search')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium leading-5 transition duration-150 ease-in-out h-16 ${
                    currentTab === 'search'
                      ? 'border-brand-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <i className="fas fa-database mr-2"></i>
                  Base de Conocimiento
                </button>
                <button
                  onClick={() => setCurrentTab('chat')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium leading-5 transition duration-150 ease-in-out h-16 ${
                    currentTab === 'chat'
                      ? 'border-brand-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <i className="fas fa-comments mr-2"></i>
                  Asistente Chat
                </button>
                <button
                  onClick={() => setCurrentTab('settings')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium leading-5 transition duration-150 ease-in-out h-16 ${
                    currentTab === 'settings'
                      ? 'border-brand-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <i className="fas fa-cog mr-2"></i>
                  Configuración
                </button>
              </div>
              
              {/* Theme Toggle Button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none transition-colors"
                aria-label="Alternar modo oscuro"
                title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                {darkMode ? (
                  <i className="fas fa-sun text-yellow-400 text-lg"></i>
                ) : (
                  <i className="fas fa-moon text-brand-700 text-lg"></i>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Tab Controls (Sticky just below header) */}
      <div className="sm:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex space-x-2 sticky top-16 z-40 shadow-sm transition-colors duration-300">
         <button
            onClick={() => setCurrentTab('search')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                currentTab === 'search' 
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                  : 'text-gray-500 dark:text-gray-400'
            }`}
         >
             <i className="fas fa-database mb-1 block"></i>
             Explorar
         </button>
         <button
            onClick={() => setCurrentTab('chat')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                currentTab === 'chat' 
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                  : 'text-gray-500 dark:text-gray-400'
            }`}
         >
             <i className="fas fa-comments mb-1 block"></i>
             Chat
         </button>
         <button
            onClick={() => setCurrentTab('settings')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-center transition-colors ${
                currentTab === 'settings' 
                  ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' 
                  : 'text-gray-500 dark:text-gray-400'
            }`}
         >
             <i className="fas fa-cog mb-1 block"></i>
             Ajustes
         </button>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-opacity duration-300 ease-in-out">
          {currentTab === 'search' && <KnowledgeExplorer />}
          {currentTab === 'chat' && <ChatInterface />}
          {currentTab === 'settings' && <Settings />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-12 py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
           <p className="text-gray-400 dark:text-gray-500 text-sm">© 2024 Fany IA Asistent. Todos los derechos reservados.</p>
           <div className="flex space-x-6 mt-4 md:mt-0 text-gray-400 dark:text-gray-500">
             <i className="fab fa-github hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"></i>
             <i className="fab fa-twitter hover:text-blue-400 cursor-pointer transition-colors"></i>
             <i className="fas fa-envelope hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"></i>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;