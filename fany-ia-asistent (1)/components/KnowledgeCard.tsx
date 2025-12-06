import React from 'react';
import { KnowledgeItem } from '../types';

interface KnowledgeCardProps {
  item: KnowledgeItem;
}

const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ item }) => {
  const tags = item.etiquetas.split(',').map(tag => tag.trim());

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-all duration-300 flex flex-col h-full group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/40 px-2 py-1 rounded-full uppercase">
          {item.categoria}
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{item.titulo}</h3>
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 flex-grow leading-relaxed">
        {item.contenido}
      </p>
      <div className="pt-4 border-t border-gray-50 dark:border-gray-700 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <span key={index} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded transition-colors">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeCard;