import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Search, 
  X, 
  Store, 
  Tag, 
  Utensils, 
  SlidersHorizontal,
  ChevronLeft,
  Sparkles
} from 'lucide-react';
import MenuItemCard from '../components/MenuItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Category, MenuItem, Restaurant } from '@shared/schema';

const POPULAR_SEARCHES = ['برجر', 'شاورما', 'بيتزا', 'مشاوي', 'عصير طازج', 'وجبة عائلية', 'حلويات', 'شاي'];

export default function SearchPage() {
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState<'all' | 'categories' | 'menuItems'>('all');
  const [searchResults, setSearchResults] = useState<{
    categories: Category[];
    menuItems: MenuItem[];
  }>({ categories: [], menuItems: [] });
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Extract query from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setInputValue(query);
      handleSearch(query);
    }
  }, [window.location.search]);

  const handleSearch = async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setSearchResults({ categories: [], menuItems: [] });
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults({
          categories: data.categories || [],
          menuItems: data.menuItems || []
        });
      }
    } catch (error) {
      console.error('خطأ في البحث:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleSearch(inputValue);
      window.history.replaceState(null, '', `/search?q=${encodeURIComponent(inputValue.trim())}`);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSearchResults({ categories: [], menuItems: [] });
    setHasSearched(false);
    window.history.replaceState(null, '', '/search');
  };

  const handleSuggestionClick = (term: string) => {
    setInputValue(term);
    handleSearch(term);
    window.history.replaceState(null, '', `/search?q=${encodeURIComponent(term)}`);
  };

  const totalResults = searchResults.categories.length + searchResults.menuItems.length;

  const tabs = [
    { id: 'all', label: 'الكل', count: totalResults },
    { id: 'menuItems', label: 'الوجبات والمنتجات', count: searchResults.menuItems.length },
    { id: 'categories', label: 'الأقسام والتصنيفات', count: searchResults.categories.length },
  ];

  const filteredCategories = selectedTab === 'all' || selectedTab === 'categories' ? searchResults.categories : [];
  const filteredMenuItems = selectedTab === 'all' || selectedTab === 'menuItems' ? searchResults.menuItems : [];

  return (
    <div className="min-h-screen bg-[#F4F8FF] pb-24" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        
        {/* Search Header Container */}
        <div className="max-w-2xl mx-auto mb-8 text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-blue-100/80 text-[#0B5ED7] px-3.5 py-1 rounded-full text-xs font-black">
            <Search className="h-3.5 w-3.5" />
            <span>البحث السريع الذكي</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#003B99] tracking-tight">
            عن ماذا تبحث اليوم؟
          </h1>

          {/* Search Input Bar */}
          <form onSubmit={handleSubmit} className="relative mt-4">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="ابحث عن وجبة، مطعم، منتج، أو تصنيف..."
                className="w-full h-14 pr-12 pl-24 rounded-full bg-white border-2 border-blue-100 focus:border-[#0B5ED7] shadow-md focus:shadow-blue-500/10 text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
              <Search className="absolute right-4 h-5 w-5 text-[#0B5ED7]/60 pointer-events-none" />
              
              <div className="absolute left-2 flex items-center gap-1">
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 px-5 rounded-full saidi-orange-gradient hover:brightness-105 text-white font-black text-xs shadow-xs"
                >
                  بحث
                </Button>
              </div>
            </div>
          </form>

          {/* Popular searches tags */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-bold text-slate-400 ml-1">شائع:</span>
            {POPULAR_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => handleSuggestionClick(term)}
                className="text-[11px] font-bold px-3 py-1 rounded-full bg-white border border-blue-100 text-slate-600 hover:text-[#0B5ED7] hover:border-[#0B5ED7]/40 hover:bg-blue-50/50 transition-all active:scale-95"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        {hasSearched && (
          <div className="space-y-6">
            
            {/* Filter Tabs */}
            {totalResults > 0 && (
              <div className="flex items-center justify-between border-b border-blue-100 pb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTab(tab.id as any)}
                      className={`px-4 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        selectedTab === tab.id
                          ? 'bg-[#0B5ED7] text-white shadow-md shadow-blue-600/20'
                          : 'bg-white text-slate-600 border border-blue-100 hover:bg-blue-50'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedTab === tab.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#0B5ED7]'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <span className="text-xs text-[#0B5ED7] font-bold">
                  تم العثور على {totalResults} نتيجة
                </span>
              </div>
            )}

            {/* Loading state */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 py-4">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white p-3 rounded-3xl border border-blue-50 shadow-xs space-y-3">
                    <div className="aspect-square bg-blue-50 rounded-2xl" />
                    <div className="h-4 bg-blue-50 rounded w-3/4" />
                    <div className="h-3 bg-blue-50 rounded w-1/2" />
                    <div className="h-6 bg-blue-50 rounded-lg w-2/3" />
                  </div>
                ))}
              </div>
            ) : totalResults === 0 ? (
              /* No Results State */
              <div className="bg-white rounded-3xl p-12 text-center border border-blue-100 shadow-xs max-w-md mx-auto my-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#0B5ED7] mx-auto mb-4">
                  <Search className="h-8 w-8 text-[#0B5ED7]/50" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">لا توجد نتائج مطابقة لـ "{inputValue}"</h3>
                <p className="text-xs text-slate-500 font-medium mb-6">
                  تأكد من كتابة الكلمات بشكل صحيح أو جرب البحث بكلمات عامة مثل (برجر، بيتزا، مشاوي).
                </p>
                <Button
                  onClick={handleClear}
                  variant="outline"
                  className="rounded-full border-blue-200 text-[#0B5ED7] font-bold"
                >
                  إعادة ضبط البحث
                </Button>
              </div>
            ) : (
              /* Results List */
              <div className="space-y-8">
                
                {/* Categories */}
                {filteredCategories.length > 0 && (
                  <div className="space-y-3">
                    {selectedTab === 'all' && (
                      <h2 className="text-base font-black text-[#003B99] flex items-center gap-2">
                        <Tag className="h-4 w-4 text-[#0B5ED7]" />
                        <span>الأقسام والتصنيفات</span>
                      </h2>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {filteredCategories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center gap-3 p-3 bg-white border border-blue-100 rounded-2xl cursor-pointer hover:border-[#0B5ED7] hover:shadow-md transition-all group"
                          onClick={() => setLocation(`/category/${category.id}`)}
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-blue-50 flex items-center justify-center shrink-0">
                            {category.image ? (
                              <img src={category.image} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                            ) : (
                              <span className="text-xl">{category.icon || '🍽️'}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-800 block truncate group-hover:text-[#0B5ED7] transition-colors">
                              {category.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">تصفح القسم</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Menu Items Grid */}
                {filteredMenuItems.length > 0 && (
                  <div className="space-y-3">
                    {selectedTab === 'all' && (
                      <h2 className="text-base font-black text-[#003B99] flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-[#FF6B00]" />
                        <span>الوجبات والمنتجات</span>
                      </h2>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                      {filteredMenuItems.map((item) => (
                        <MenuItemCard 
                          key={item.id} 
                          item={item} 
                          restaurantId={item.restaurantId || ''} 
                          restaurantName="متجر الصايدي توصيل"
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

        {/* Initial / Empty Search State */}
        {!hasSearched && (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 bg-blue-100/70 rounded-3xl flex items-center justify-center text-[#0B5ED7] mx-auto mb-4">
              <Sparkles className="h-10 w-10 text-[#0B5ED7]" />
            </div>
            <h3 className="text-xl font-black text-[#003B99] mb-2">استكشف وجبات ومتاجر الصايدي توصيل</h3>
            <p className="text-xs md:text-sm text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
              ابحث عن وجباتك المفضلة، المطاعم، الحلويات، والمتاجر واستمتع بأسرع خدمة توصيل إلى باب منزلك.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
