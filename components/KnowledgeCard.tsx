import React, { useState } from 'react';
import { KnowledgeItem } from '../types';

interface KnowledgeCardProps {
  item: KnowledgeItem;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ item }) => {
  const [copied, setCopied] = useState(false);
  const tags = item.etiquetas.split(',').map(tag => tag.trim());

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(item.contenido);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full group relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 px-2 py-1 rounded-full uppercase">
          {item.categoria}
        </span>
        <button
          onClick={handleCopy}
          className={`p-1.5 rounded-md transition-all duration-200 ${
            copied 
              ? 'text-green-500 bg-green-50 dark:bg-green-900/20' 
              : 'text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title={copied ? "¡Copiado!" : "Copiar contenido"}
          aria-label="Copiar contenido al portapapeles"
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
        </button>
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{item.titulo}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-grow leading-relaxed">
        {item.contenido}
      </p>
      <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span key={index} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 dark:hover:text-brand-300 px-2 py-1 rounded-full transition-colors cursor-default border border-transparent hover:border-brand-100 dark:hover:border-brand-800/50">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeCard;