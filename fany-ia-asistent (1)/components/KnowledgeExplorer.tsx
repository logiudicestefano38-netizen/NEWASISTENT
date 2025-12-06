import React, { useState, useMemo } from 'react';
import { FANY_KNOWLEDGE_BASE } from '../constants';
import KnowledgeCard from './KnowledgeCard';

const KnowledgeExplorer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  const categories = useMemo(() => {
    const allCats = FANY_KNOWLEDGE_BASE.conocimientos.map(k => k.categoria);
    return ['Todas', ...Array.from(new Set(allCats))];
  }, []);

  const filteredItems = useMemo(() => {
    return FANY_KNOWLEDGE_BASE.conocimientos.filter(item => {
      const matchesSearch = 
        item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.etiquetas.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'Todas' || item.categoria === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Explorador de Conocimientos</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-gray-400 dark:text-gray-500"></i>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition duration-150 ease-in-out"
              placeholder="Buscar por título, contenido o etiqueta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm rounded-lg transition-colors"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Mostrando {filteredItems.length} resultados
        </div>
      </div>

      {/* Grid Results */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <KnowledgeCard key={index} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 transition-colors">
          <i className="fas fa-folder-open text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No se encontraron conocimientos que coincidan con tu búsqueda.</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeExplorer;