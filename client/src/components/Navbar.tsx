import React from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import type { Category } from '@shared/schema';
import { useLanguage } from '../context/LanguageContext';

export const Navbar: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const displayCategories = categories.filter(c => c.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (!location.startsWith('/category/')) {
    return null;
  }

  return (
    <nav className="bg-white/95 border-b border-blue-100 overflow-x-auto whitespace-nowrap no-scrollbar sticky top-[56px] md:top-[61px] z-30 transition-all">
      <div className="container mx-auto px-4">
        <ul className="flex items-center justify-start md:justify-center gap-2.5 md:gap-4 py-2.5">
          <li>
            <button
              onClick={() => setLocation('/')}
              className={`text-xs md:text-sm font-black transition-all px-4 py-1.5 rounded-full ${
                location === '/'
                  ? 'bg-[#0B5ED7] text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 bg-blue-50/70 hover:bg-blue-100/80'
              }`}
            >
              {t('home')}
            </button>
          </li>
          <li>
            <button
              onClick={() => setLocation('/wasalni')}
              className={`text-xs md:text-sm font-black transition-all px-4 py-1.5 rounded-full ${
                location === '/wasalni'
                  ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                  : 'text-slate-600 bg-orange-50/70 hover:bg-orange-100/80'
              }`}
            >
              {t('quick_order')}
            </button>
          </li>
          <li>
            <button
              onClick={() => setLocation('/orders')}
              className={`text-xs md:text-sm font-black transition-all px-4 py-1.5 rounded-full ${
                location === '/orders'
                  ? 'bg-[#0B5ED7] text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 bg-blue-50/70 hover:bg-blue-100/80'
              }`}
            >
              {t('orders')}
            </button>
          </li>
          {displayCategories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => setLocation(`/category/${cat.name}`)}
                className={`text-xs md:text-sm font-black transition-all px-4 py-1.5 rounded-full ${
                  location === `/category/${cat.name}`
                    ? 'bg-[#0B5ED7] text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 bg-blue-50/70 hover:bg-blue-100/80'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
