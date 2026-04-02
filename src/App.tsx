import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Plus, 
  History, 
  BarChart3, 
  Settings, 
  ChevronRight, 
  Timer, 
  Scale, 
  ArrowLeft,
  Star,
  Check,
  Calendar,
  Moon,
  Sun,
  Pencil,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  MessageSquare,
  Search,
  Download,
  Upload,
  Share2,
  Camera,
  Image as ImageIcon,
  Zap,
  Package,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';
import { Shot, Stats, WeeklyData, RatingDistribution, Recipe, Bean } from './types';

const compressImage = (file: File, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

type Screen = 'home' | 'new-shot' | 'edit-shot' | 'shot-detail' | 'stats' | 'history' | 'settings' | 'recipes';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [shots, setShots] = useState<Shot[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [beans, setBeans] = useState<Bean[]>([]);
  const [stats, setStats] = useState<{ stats: Stats; weekly: WeeklyData[]; ratings: RatingDistribution[] } | null>(null);
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('lota-dark-mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('lota-dark-mode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchData();
    const storedRecipes = localStorage.getItem('lota_recipes');
    if (storedRecipes) {
      setRecipes(JSON.parse(storedRecipes));
    }
    const storedBeans = localStorage.getItem('lota_beans');
    if (storedBeans) {
      setBeans(JSON.parse(storedBeans));
    }
  }, []);

  const saveRecipes = (updatedRecipes: Recipe[]) => {
    setRecipes(updatedRecipes);
    localStorage.setItem('lota_recipes', JSON.stringify(updatedRecipes));
  };

  const saveBeans = (updatedBeans: Bean[]) => {
    setBeans(updatedBeans);
    localStorage.setItem('lota_beans', JSON.stringify(updatedBeans));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const storedShots = localStorage.getItem('lota_shots');
      const shotsData: Shot[] = (storedShots ? JSON.parse(storedShots) : []).map((s: any) => ({
        ...s,
        dose: Number(s.dose) || 0,
        yield: Number(s.yield) || 0,
        time: Number(s.time) || 0,
      }));
      
      // Calculate stats
      const total_shots = shotsData.length;
      let totalRating = 0;
      let ratedCount = 0;
      const ratingsCount: Record<string, number> = {};
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weeklyData = Array.from({ length: 7 }, (_, i) => ({ day: i.toString(), count: 0, avg_time: 0, total_time: 0 }));

      shotsData.forEach((s) => {
        // Ratings
        if (s.rating) {
          ratingsCount[s.rating] = (ratingsCount[s.rating] || 0) + 1;
          let val = 0;
          if (s.rating === 'Great') val = 5;
          if (s.rating === 'Good') val = 4;
          if (s.rating === 'Okay') val = 3;
          if (s.rating === 'Off') val = 2;
          if (s.rating === 'Bad') val = 1;
          if (val > 0) {
            totalRating += val;
            ratedCount++;
          }
        }
        
        // Weekly
        const d = new Date(s.created_at);
        if (d >= sevenDaysAgo) {
          const dayOfWeek = d.getDay().toString();
          const dayObj = weeklyData.find(w => w.day === dayOfWeek);
          if (dayObj) {
            dayObj.count++;
            dayObj.total_time = (dayObj.total_time || 0) + Number(s.time || 0);
          }
        }
      });
      
      weeklyData.forEach(w => {
        if (w.count > 0) w.avg_time = w.total_time / w.count;
      });
      
      const avg_rating = ratedCount > 0 ? totalRating / ratedCount : 0;
      const ratingsArray = Object.entries(ratingsCount).map(([rating, count]) => ({ rating, count }));

      const statsData = {
        stats: { total_shots, avg_rating },
        weekly: weeklyData,
        ratings: ratingsArray
      };

      setShots(shotsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddShot = async (shotData: Partial<Shot>) => {
    if (!shotData.bean_name) {
      alert("Please enter a bean name!");
      return;
    }

    try {
      const storedShots = localStorage.getItem('lota_shots');
      const currentShots: Shot[] = storedShots ? JSON.parse(storedShots) : [];
      
      const newShot: Shot = {
        ...shotData,
        dose: Number(shotData.dose) || 0,
        yield: Number(shotData.yield) || 0,
        yield_grams: Number(shotData.yield_grams) || Number(shotData.yield) || 0,
        yield_ml: Number(shotData.yield_ml) || 0,
        time: Number(shotData.time) || 0,
        id: Date.now().toString(),
        created_at: shotData.created_at ? new Date(shotData.created_at).toISOString() : new Date().toISOString()
      } as Shot;
      
      const updatedShots = [newShot, ...currentShots];
      localStorage.setItem('lota_shots', JSON.stringify(updatedShots));

      await fetchData();
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error adding shot:', error);
      alert("Failed to save shot. Please try again.");
    }
  };

  const handleUpdateShot = async (id: string, shotData: Partial<Shot>, navigateHome: boolean = true) => {
    try {
      const storedShots = localStorage.getItem('lota_shots');
      const currentShots: Shot[] = storedShots ? JSON.parse(storedShots) : [];
      
      const dataToUpdate = { ...shotData };
      if (dataToUpdate.dose !== undefined) dataToUpdate.dose = Number(dataToUpdate.dose) || 0;
      if (dataToUpdate.yield !== undefined) {
        dataToUpdate.yield = Number(dataToUpdate.yield) || 0;
        dataToUpdate.yield_grams = Number(dataToUpdate.yield) || 0;
      }
      if (dataToUpdate.yield_grams !== undefined) {
        dataToUpdate.yield_grams = Number(dataToUpdate.yield_grams) || 0;
        dataToUpdate.yield = dataToUpdate.yield_grams;
      }
      if (dataToUpdate.yield_ml !== undefined) dataToUpdate.yield_ml = Number(dataToUpdate.yield_ml) || 0;
      if (dataToUpdate.time !== undefined) dataToUpdate.time = Number(dataToUpdate.time) || 0;
      if (dataToUpdate.created_at !== undefined) dataToUpdate.created_at = new Date(dataToUpdate.created_at).toISOString();

      const updatedShots = currentShots.map(s => s.id === id ? { ...s, ...dataToUpdate } : s);
      localStorage.setItem('lota_shots', JSON.stringify(updatedShots));

      await fetchData();
      if (navigateHome) {
        setCurrentScreen('home');
      }
    } catch (error) {
      console.error('Error updating shot:', error);
      alert("Failed to update shot. Please try again.");
    }
  };

  const handleDeleteShot = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shot?")) return;

    try {
      const storedShots = localStorage.getItem('lota_shots');
      const currentShots: Shot[] = storedShots ? JSON.parse(storedShots) : [];
      
      const updatedShots = currentShots.filter(s => s.id !== id);
      localStorage.setItem('lota_shots', JSON.stringify(updatedShots));

      await fetchData();
      setCurrentScreen('home');
    } catch (error) {
      console.error('Error deleting shot:', error);
      alert("Failed to delete shot. Please try again.");
    }
  };

  return (
    <div className="max-w-[390px] mx-auto min-h-screen notion-app-container flex flex-col relative overflow-hidden shadow-sm border-x border-notion-border">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          <AnimatePresence mode="wait">
            {currentScreen === 'home' && (
              <HomeScreen 
                key="home" 
                shots={shots} 
                stats={stats?.stats} 
                onSelectShot={(shot) => {
                  setSelectedShot(shot);
                  setCurrentScreen('shot-detail');
                }}
                onEditShot={(shot) => {
                  setSelectedShot(shot);
                  setCurrentScreen('edit-shot');
                }}
                setCurrentScreen={setCurrentScreen}
              />
            )}
            {currentScreen === 'new-shot' && (
              <NewShotScreen 
                key="new" 
                onBack={() => setCurrentScreen('home')} 
                onSubmit={handleAddShot}
                recipes={recipes}
              />
            )}
            {currentScreen === 'edit-shot' && selectedShot && (
              <NewShotScreen 
                key="edit" 
                initialData={selectedShot}
                onBack={() => setCurrentScreen('shot-detail')} 
                onSubmit={(data) => handleUpdateShot(selectedShot.id, data)}
                recipes={recipes}
              />
            )}
            {currentScreen === 'recipes' && (
              <RecipesScreen 
                key="recipes" 
                recipes={recipes}
                onSave={saveRecipes}
                beans={beans}
                onSaveBeans={saveBeans}
                onBack={() => setCurrentScreen('home')}
              />
            )}
            {currentScreen === 'shot-detail' && selectedShot && (
              <ShotDetailScreen 
                key="detail" 
                shot={selectedShot} 
                onBack={() => setCurrentScreen('home')} 
                onEdit={() => setCurrentScreen('edit-shot')}
                onDelete={() => handleDeleteShot(selectedShot.id)}
                onUpdate={(data) => {
                  handleUpdateShot(selectedShot.id, data, false);
                  setSelectedShot({ ...selectedShot, ...data });
                }}
              />
            )}
            {currentScreen === 'stats' && stats && (
              <StatsScreen 
                key="stats" 
                weekly={stats.weekly} 
                stats={stats.stats}
                ratings={stats.ratings}
                onBack={() => setCurrentScreen('home')}
              />
            )}
            {currentScreen === 'history' && (
              <HistoryScreen 
                key="history" 
                shots={shots} 
                onSelectShot={(shot) => {
                  setSelectedShot(shot);
                  setCurrentScreen('shot-detail');
                }}
                onEditShot={(shot) => {
                  setSelectedShot(shot);
                  setCurrentScreen('edit-shot');
                }}
                onBack={() => setCurrentScreen('home')}
              />
            )}
            {currentScreen === 'settings' && (
              <SettingsScreen 
                key="settings" 
                onBack={() => setCurrentScreen('home')}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                shots={shots}
                onRefresh={fetchData}
              />
            )}
          </AnimatePresence>
        </main>

        {/* Navigation Bar */}
        <nav className="absolute bottom-0 left-0 right-0 notion-nav px-6 py-3 flex justify-between items-center z-50">
          <NavButton 
            active={currentScreen === 'home'} 
            onClick={() => setCurrentScreen('home')} 
            icon={<Coffee size={20} />} 
            label="Brew"
          />
          <NavButton 
            active={currentScreen === 'stats'} 
            onClick={() => setCurrentScreen('stats')} 
            icon={<BarChart3 size={20} />} 
            label="Stats"
          />
          <NavButton 
            active={currentScreen === 'recipes'} 
            onClick={() => setCurrentScreen('recipes')} 
            icon={<Zap size={20} />} 
            label="Recipes"
          />
          <button 
            onClick={() => setCurrentScreen('new-shot')}
            className="bg-notion-text text-notion-bg p-3 rounded-full shadow-md -mt-8 active:scale-90 transition-transform"
          >
            <Plus size={24} />
          </button>
          <NavButton 
            active={currentScreen === 'history'} 
            onClick={() => setCurrentScreen('history')} 
            icon={<History size={20} />} 
            label="History"
          />
          <NavButton 
            active={currentScreen === 'settings'} 
            onClick={() => setCurrentScreen('settings')} 
            icon={<Settings size={20} />} 
            label="Settings"
          />
        </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-notion-text' : 'text-notion-secondary'}`}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}

function ShotListItem({ shot, onClick, onEdit }: { shot: Shot; onClick: () => void; onEdit?: (e: React.MouseEvent) => void; key?: React.Key }) {
  const ratingColors: Record<string, string> = {
    'Great': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    'Good': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    'Okay': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    'Off': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    'Bad': 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  const ratingStars: Record<string, number> = {
    'Great': 5,
    'Good': 4,
    'Okay': 3,
    'Off': 2,
    'Bad': 1,
  };

  return (
    <div 
      onClick={onClick}
      className="notion-card flex justify-between items-center group hover:border-notion-text transition-all active:scale-[0.98] p-4"
    >
      {/* Left Group (Icon & Text) */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-12 h-12 rounded-xl bg-notion-hover flex items-center justify-center text-notion-secondary group-hover:text-notion-text transition-colors shrink-0">
          <Coffee size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-notion-text truncate">{shot.bean_name}</p>
          <div className="flex items-center gap-2 mt-0.5 min-w-0">
            <span className="text-[10px] text-notion-secondary uppercase font-bold tracking-wider whitespace-nowrap shrink-0">
              {new Date(shot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
            <span className="w-1 h-1 rounded-full bg-notion-border shrink-0" />
            <span className="text-[10px] text-notion-secondary font-medium truncate">
              {shot.brew_method || 'Espresso Machine'} • {shot.time}s • 1:{shot.dose > 0 ? (shot.yield / shot.dose).toFixed(1) : '0'}
              {shot.origin && ` • ${shot.origin}`}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 min-w-0">
            <div className="flex gap-0.5 shrink-0">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={10} 
                  className={i < (ratingStars[shot.rating] || 0) ? "text-amber-500 fill-amber-500" : "text-notion-border"} 
                />
              ))}
            </div>
            {shot.notes && (
              <div className="flex items-center gap-1 min-w-0">
                <span className="w-1 h-1 rounded-full bg-notion-border shrink-0" />
                <MessageSquare size={10} className="text-notion-secondary shrink-0" />
                <p className="text-[10px] text-notion-secondary truncate italic">
                  {shot.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Group (Badge & Pencil) */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-tight whitespace-nowrap ${ratingColors[shot.rating] || 'bg-notion-hover text-notion-secondary'}`}>
          {shot.rating}
        </span>
        {onEdit && (
          <button 
            onClick={onEdit}
            className="p-2 hover:bg-notion-hover rounded-lg text-notion-secondary hover:text-notion-text transition-colors opacity-0 group-hover:opacity-100"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function HomeScreen({ shots, stats, onSelectShot, onEditShot, setCurrentScreen }: { shots: Shot[]; stats?: Stats; onSelectShot: (shot: Shot) => void; onEditShot: (shot: Shot) => void; setCurrentScreen: (s: Screen) => void; key?: string }) {
  const shotsWithTime = shots.filter(s => Number(s.time) > 0);
  const avgTime = shotsWithTime.length > 0 
    ? Math.round(shotsWithTime.reduce((acc, s) => acc + Number(s.time), 0) / shotsWithTime.length) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative bg-notion-bg"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full bg-notion-bg/80 backdrop-blur-md border-b border-notion-border px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Lota Espresso Tracker</h1>
        <div className="w-8 h-8 rounded-full bg-notion-hover flex items-center justify-center">
          <Coffee size={18} className="text-notion-text" />
        </div>
      </header>

      {/* Fixed Hero Image Container */}
      <div className="sticky top-[64px] z-10 w-full aspect-[4/5] overflow-hidden bg-notion-bg">
        <img 
          src="https://i.postimg.cc/rm317JgV/Chat-GPT-Image-Mar-31-2026-07-03-38-PM.png" 
          alt="Lota Kop Colorful Illustration" 
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Scrolling Content */}
      <div className="relative z-20 bg-notion-bg px-6 pt-8 pb-24 -mt-12 rounded-t-[32px] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] border-t border-notion-border">
        <div className="max-w-md mx-auto space-y-8">
          <button 
            onClick={() => setCurrentScreen('new-shot')}
            className="notion-btn-primary w-full py-3.5 text-base font-semibold shadow-xl active:scale-[0.98] transition-all"
          >
            New Shot
          </button>

          <div className="space-y-4">
            <h2 className="text-[11px] font-bold text-notion-secondary uppercase tracking-[0.2em] px-1">Overall Summary</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-notion-hover border border-notion-border rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Shots</span>
                <span className="text-2xl font-bold">{stats?.total_shots || 0}</span>
              </div>
              <div className="bg-notion-hover border border-notion-border rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Beans</span>
                <span className="text-2xl font-bold">{new Set(shots.map(s => s.bean_name)).size}</span>
              </div>
              <div className="bg-notion-hover border border-notion-border rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Quality</span>
                <span className="text-2xl font-bold">{shots.filter(s => s.rating === 'Great' || s.rating === 'Good').length}</span>
              </div>
              <div className="bg-notion-hover border border-notion-border rounded-2xl p-5 shadow-sm flex flex-col gap-1">
                <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Avg Time</span>
                <span className="text-2xl font-bold">{avgTime}s</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[11px] font-bold text-notion-secondary uppercase tracking-[0.2em]">Recent Brews</h2>
              <button 
                onClick={() => setCurrentScreen('history')}
                className="text-xs font-bold text-notion-text hover:underline transition-all"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {shots.slice(0, 3).map((shot) => (
                <ShotListItem 
                  key={shot.id} 
                  shot={shot} 
                  onClick={() => onSelectShot(shot)} 
                  onEdit={(e) => {
                    e.stopPropagation();
                    onEditShot(shot);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NewShotScreen({ onBack, onSubmit, initialData, recipes }: { onBack: () => void; onSubmit: (data: any) => void; initialData?: Shot; recipes: Recipe[]; key?: string }) {
  const [formData, setFormData] = useState({
    bean_name: initialData?.bean_name || '',
    roaster: initialData?.roaster || '',
    origin: initialData?.origin || '',
    bean_type: initialData?.bean_type || 'Arabica',
    roast_level: initialData?.roast_level || 'Medium',
    grind_setting: initialData?.grind_setting || '',
    dose: initialData?.dose?.toString() || '',
    yield: initialData?.yield?.toString() || '',
    yield_grams: initialData?.yield_grams?.toString() || initialData?.yield?.toString() || '',
    yield_ml: initialData?.yield_ml?.toString() || '',
    time: initialData?.time?.toString() || '',
    rating: initialData?.rating || 'Good',
    notes: initialData?.notes || '',
    machine: initialData?.machine || '',
    grinder: initialData?.grinder || '',
    brew_method: initialData?.brew_method || 'Espresso Machine',
    photo_url: initialData?.photo_url || '',
    created_at: initialData?.created_at ? new Date(initialData.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  });

  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(initialData?.time || 0);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);

  const handleLoadRecipe = (recipe: Recipe) => {
    setFormData(prev => ({
      ...prev,
      bean_name: recipe.bean_name || prev.bean_name,
      roaster: recipe.roaster || prev.roaster,
      origin: recipe.origin || prev.origin,
      bean_type: recipe.bean_type || prev.bean_type,
      roast_level: recipe.roast_level || prev.roast_level,
      grind_setting: recipe.grind_setting || prev.grind_setting,
      dose: recipe.dose?.toString() || prev.dose,
      yield: recipe.yield?.toString() || prev.yield,
      yield_grams: recipe.yield_grams?.toString() || recipe.yield?.toString() || prev.yield_grams,
      yield_ml: recipe.yield_ml?.toString() || prev.yield_ml,
      time: recipe.time?.toString() || prev.time,
      brew_method: recipe.brew_method || prev.brew_method,
    }));
    if (recipe.time) setSeconds(recipe.time);
    setShowRecipeSelector(false);
  };

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setSeconds(s => {
          const next = s + 1;
          setFormData(prev => ({ ...prev, time: next.toString() }));
          return next;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const handleToggleTimer = () => {
    setTimerActive(!timerActive);
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setSeconds(0);
    setFormData(prev => ({ ...prev, time: '0' }));
  };

  const ratings = ['Bad', 'Off', 'Okay', 'Good', 'Great'];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(prev => ({ ...prev, photo_url: compressed }));
      } catch (err) {
        console.error('Error compressing image:', err);
      }
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="p-6 space-y-6 min-h-screen"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">{initialData ? 'Edit Shot' : 'New Shot'}</h1>
        </div>
        {!initialData && recipes.length > 0 && (
          <button 
            onClick={() => setShowRecipeSelector(true)}
            className="text-xs font-bold text-notion-text bg-notion-hover px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-notion-border transition-colors"
          >
            <Zap size={14} />
            Load Recipe
          </button>
        )}
      </header>

      <AnimatePresence>
        {showRecipeSelector && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowRecipeSelector(false)}
          >
            <motion.div 
              className="bg-notion-bg w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase tracking-widest text-notion-secondary">Select Recipe</h3>
                <button onClick={() => setShowRecipeSelector(false)} className="text-notion-secondary hover:text-notion-text">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <div className="space-y-2">
                {recipes.map(recipe => (
                  <button 
                    key={recipe.id}
                    onClick={() => handleLoadRecipe(recipe)}
                    className="w-full text-left notion-card p-4 hover:border-notion-text transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-notion-text">{recipe.name}</p>
                        <p className="text-[10px] text-notion-secondary uppercase tracking-wider font-bold">
                          {recipe.bean_name} • {recipe.dose}g / {recipe.yield}g
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-notion-secondary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        {/* Date Section */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-notion-secondary ml-1 flex items-center gap-1">
            <Calendar size={12} />
            Brew Date
          </label>
          <input 
            type="date" 
            className="notion-input w-full cursor-pointer"
            value={formData.created_at}
            onChange={e => setFormData({...formData, created_at: e.target.value})}
          />
        </div>

        {/* Timer Section */}
        <div className="bg-notion-hover rounded-3xl p-8 flex flex-col items-center relative overflow-hidden">
          <button 
            onClick={handleResetTimer}
            disabled={seconds === 0 && !timerActive}
            className="absolute top-6 right-6 w-10 h-10 bg-notion-bg/50 rounded-xl flex items-center justify-center text-notion-secondary hover:text-notion-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-notion-border z-20"
            title="Reset Timer"
          >
            <RotateCcw size={18} />
          </button>

          <div className="flex items-center justify-center gap-2 text-notion-secondary text-xs font-bold tracking-widest uppercase mb-6">
            <Timer size={14} />
            <span>Extraction Timer</span>
          </div>

          <div className="relative w-64 h-64 flex items-center justify-center mb-8">
            {/* Analog Dial SVG */}
            <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
              {/* Tick Marks */}
              {[...Array(60)].map((_, i) => (
                <line
                  key={i}
                  x1="100"
                  y1="12"
                  x2="100"
                  y2={i % 5 === 0 ? "24" : "20"}
                  stroke={i % 5 === 0 ? "var(--notion-secondary)" : "var(--notion-border)"}
                  strokeWidth={i % 5 === 0 ? "2" : "1"}
                  transform={`rotate(${i * 6}, 100, 100)`}
                />
              ))}
              
              {/* Background Track */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="var(--notion-border)"
                strokeWidth="8"
              />
              
              {/* Progress Sweep */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="#ef4444"
                strokeWidth="8"
                strokeDasharray={502.65}
                strokeDashoffset={502.65 - ((seconds % 60) / 60) * 502.65}
                strokeLinecap="round"
                className="transition-all duration-1000 linear"
                style={{ 
                  transitionProperty: 'stroke-dashoffset',
                  transitionTimingFunction: 'linear'
                }}
              />
            </svg>

            {/* Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-bold text-notion-text tabular-nums tracking-tighter">
                {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}
              </div>
              {seconds > 60 && (
                <div className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest mt-1">
                  Lap {Math.floor(seconds / 60) + 1}
                </div>
              )}
            </div>
          </div>

          <div className="w-full">
            <button 
              onClick={handleToggleTimer}
              className="w-full bg-notion-text text-notion-bg py-4 rounded-xl flex justify-center items-center gap-2 font-semibold text-lg active:scale-[0.98] transition-transform"
            >
              {timerActive ? (
                <>
                  <Pause size={20} fill="white" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="white" />
                  <span>{seconds > 0 ? 'Resume' : 'Start Extraction'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-notion-secondary ml-1">Bean Details</label>
            <input 
              placeholder="Bean Name (e.g. Mt Apo)" 
              className="notion-input"
              value={formData.bean_name}
              onChange={e => setFormData({...formData, bean_name: e.target.value})}
            />
            <input 
              placeholder="Roaster" 
              className="notion-input"
              value={formData.roaster}
              onChange={e => setFormData({...formData, roaster: e.target.value})}
            />
            <input 
              placeholder="Origin (e.g. Ethiopia, Colombia)" 
              className="notion-input"
              value={formData.origin}
              onChange={e => setFormData({...formData, origin: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-2">
              <input 
                placeholder="Type (e.g. Arabica)" 
                className="notion-input"
                value={formData.bean_type}
                onChange={e => setFormData({...formData, bean_type: e.target.value})}
              />
              <input 
                placeholder="Roast (e.g. Medium)" 
                className="notion-input"
                value={formData.roast_level}
                onChange={e => setFormData({...formData, roast_level: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-notion-secondary ml-1">Dose (g)</label>
              <input 
                type="number" 
                placeholder="18.0" 
                className="notion-input"
                value={formData.dose}
                onChange={e => setFormData({...formData, dose: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-notion-secondary ml-1">Yield (g)</label>
              <input 
                type="number" 
                placeholder="36.0" 
                className="notion-input"
                value={formData.yield_grams}
                onChange={e => {
                  const val = e.target.value;
                  setFormData({...formData, yield_grams: val, yield: val});
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-notion-secondary ml-1">Yield (ml)</label>
              <input 
                type="number" 
                placeholder="40" 
                className="notion-input"
                value={formData.yield_ml}
                onChange={e => setFormData({...formData, yield_ml: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-notion-secondary ml-1">Time (s)</label>
              <input 
                type="number" 
                placeholder="30" 
                className="notion-input"
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-notion-secondary ml-1">Grind Setting</label>
              <input 
                placeholder="8.5" 
                className="notion-input"
                value={formData.grind_setting}
                onChange={e => setFormData({...formData, grind_setting: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-notion-secondary ml-1">Ratio</label>
              <div className="notion-input bg-notion-hover flex items-center justify-center font-bold text-notion-text">
                1:{formData.dose > 0 ? (formData.yield / formData.dose).toFixed(1) : '0'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-notion-secondary ml-1">Brew Method</label>
            <select 
              className="notion-input w-full cursor-pointer"
              value={formData.brew_method}
              onChange={e => setFormData({...formData, brew_method: e.target.value})}
            >
              <option value="Espresso Machine">Espresso Machine</option>
              <option value="Pour Over">Pour Over</option>
              <option value="Aeropress">Aeropress</option>
              <option value="French Press">French Press</option>
              <option value="Moka Pot">Moka Pot</option>
              <option value="Cold Brew">Cold Brew</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-notion-secondary ml-1">Equipment</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Coffee className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-secondary" size={14} />
                <input 
                  placeholder="Machine" 
                  className="notion-input pl-9"
                  value={formData.machine}
                  onChange={e => setFormData({...formData, machine: e.target.value})}
                />
              </div>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-secondary" size={14} />
                <input 
                  placeholder="Grinder" 
                  className="notion-input pl-9"
                  value={formData.grinder}
                  onChange={e => setFormData({...formData, grinder: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-notion-secondary ml-1">Rating</label>
            <div className="flex flex-wrap gap-1.5">
              {ratings.map((r) => (
                <button
                  key={r}
                  onClick={() => setFormData({...formData, rating: r})}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    formData.rating === r 
                      ? 'bg-notion-text text-notion-bg' 
                      : 'bg-notion-hover text-notion-secondary hover:bg-notion-border hover:text-notion-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-notion-secondary ml-1">Photo</label>
            <div className="flex items-center gap-4">
              {formData.photo_url ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-notion-border shrink-0">
                  <img src={formData.photo_url} alt="Shot" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                  >
                    <Plus size={12} className="rotate-45" />
                  </button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl border border-dashed border-notion-border flex flex-col items-center justify-center text-notion-secondary hover:bg-notion-hover hover:text-notion-text transition-colors cursor-pointer shrink-0">
                  <Camera size={20} className="mb-1" />
                  <span className="text-[10px] font-medium">Add Photo</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePhotoUpload}
                  />
                </label>
              )}
              <div className="flex-1 text-xs text-notion-secondary">
                Upload a photo of your extraction, latte art, or beans.
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-notion-secondary ml-1">Notes</label>
            <textarea 
              placeholder="Tasting notes..." 
              className="notion-input min-h-[80px] resize-none"
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
            />
          </div>

          <button 
            onClick={() => onSubmit(formData)}
            className="notion-btn-primary w-full py-2.5 mt-2"
          >
            Save Shot
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function InlineInput({ 
  value, 
  onSave, 
  type = "text",
  className = "",
  placeholder = ""
}: { 
  value: string | number | undefined, 
  onSave: (val: string) => void,
  type?: string,
  className?: string,
  placeholder?: string
}) {
  const [val, setVal] = useState(value?.toString() || '');
  
  useEffect(() => {
    setVal(value?.toString() || '');
  }, [value]);

  return (
    <input
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val !== value?.toString()) {
          onSave(val);
        }
      }}
      placeholder={placeholder}
      className={`bg-transparent border-none focus:ring-1 focus:ring-notion-border focus:bg-notion-hover rounded px-1 w-full outline-none transition-colors ${className}`}
    />
  );
}

function ShotDetailScreen({ shot, onBack, onEdit, onDelete, onUpdate }: { shot: Shot; onBack: () => void; onEdit: () => void; onDelete: () => void; onUpdate: (data: Partial<Shot>) => void; key?: string }) {
  const [notes, setNotes] = useState(shot.notes || '');

  const handleShare = async () => {
    const shareText = `☕ Coffee Brew Details:
Bean: ${shot.bean_name} ${shot.origin ? `(${shot.origin})` : ''} ${shot.roaster ? `by ${shot.roaster}` : ''}
Method: ${shot.brew_method || 'Espresso Machine'}
Dose: ${shot.dose}g | Yield: ${shot.yield}g | Time: ${shot.time}s
Grind: ${shot.grind_setting}
Rating: ${shot.rating}
${shot.machine ? `Machine: ${shot.machine}\n` : ''}${shot.grinder ? `Grinder: ${shot.grinder}\n` : ''}Notes: ${shot.notes || 'None'}

Shared from Lota Espresso Tracker`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Coffee Brew Details',
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Brew details copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6 pb-32"
    >
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors text-notion-secondary hover:text-notion-text" title="Share Shot">
            <Share2 size={18} />
          </button>
          <button onClick={onEdit} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors text-notion-secondary hover:text-notion-text">
            <Pencil size={18} />
          </button>
        </div>
      </header>

      <div className="w-full aspect-square rounded-xl overflow-hidden border border-notion-border shadow-sm relative group">
        <img 
          src={shot.photo_url || "https://i.postimg.cc/MHw7WTkR/Chat-GPT-Image-Mar-31-2026-07-24-04-PM.png"} 
          alt="Espresso Shot" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <Camera size={24} className="mb-2" />
          <span className="text-xs font-medium">Change Photo</span>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                try {
                  const compressed = await compressImage(file);
                  onUpdate({ photo_url: compressed });
                } catch (err) {
                  console.error('Error compressing image:', err);
                }
              }
            }}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-notion-hover rounded-md p-2 text-center relative group/date">
          <p className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider flex items-center justify-center gap-1">
            <Calendar size={10} />
            Date
          </p>
          <input 
            type="date"
            value={new Date(shot.created_at).toISOString().split('T')[0]}
            onChange={(e) => onUpdate({ created_at: e.target.value })}
            className="text-xs font-medium bg-transparent border-none focus:ring-0 w-full text-center cursor-pointer outline-none appearance-none"
            style={{ textAlign: 'center' }}
          />
        </div>
        <div className="bg-notion-hover rounded-md p-2 text-center">
          <p className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Bean</p>
          <InlineInput 
            value={shot.bean_name} 
            onSave={(val) => onUpdate({ bean_name: val })} 
            className="text-xs font-medium text-center"
            placeholder="Bean Name"
          />
          <InlineInput 
            value={shot.roaster} 
            onSave={(val) => onUpdate({ roaster: val })} 
            className="text-[10px] text-notion-secondary text-center mt-0.5"
            placeholder="Roaster"
          />
          <InlineInput 
            value={shot.origin} 
            onSave={(val) => onUpdate({ origin: val })} 
            className="text-[10px] text-notion-secondary text-center italic"
            placeholder="Origin"
          />
        </div>
        <div className="bg-notion-hover rounded-md p-2 text-center">
          <p className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Type</p>
          <InlineInput 
            value={shot.bean_type || 'Arabica'} 
            onSave={(val) => onUpdate({ bean_type: val })} 
            className="text-xs font-medium text-center"
          />
        </div>
        <div className="bg-notion-hover rounded-md p-2 text-center">
          <p className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Roast</p>
          <InlineInput 
            value={shot.roast_level || 'Medium'} 
            onSave={(val) => onUpdate({ roast_level: val })} 
            className="text-xs font-medium text-center"
          />
        </div>
      </div>

      <div className="border border-notion-border rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-notion-secondary uppercase tracking-widest">Extraction Details</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Grind</span>
            <div className="bg-notion-hover rounded px-2 py-1 flex items-center">
              <InlineInput 
                value={shot.grind_setting} 
                onSave={(val) => onUpdate({ grind_setting: val })} 
                className="text-xs font-medium"
              />
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Dose</span>
            <div className="bg-notion-hover rounded px-2 py-1 flex items-center">
              <InlineInput 
                type="number"
                value={shot.dose} 
                onSave={(val) => onUpdate({ dose: parseFloat(val) || 0 })} 
                className="text-xs font-medium"
              />
              <span className="text-xs font-medium text-notion-secondary ml-1">g</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Yield (g)</span>
            <div className="bg-notion-hover rounded px-2 py-1 flex items-center">
              <InlineInput 
                type="number"
                value={shot.yield_grams || shot.yield} 
                onSave={(val) => onUpdate({ yield_grams: parseFloat(val) || 0, yield: parseFloat(val) || 0 })} 
                className="text-xs font-medium"
              />
              <span className="text-xs font-medium text-notion-secondary ml-1">g</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Yield (ml)</span>
            <div className="bg-notion-hover rounded px-2 py-1 flex items-center">
              <InlineInput 
                type="number"
                value={shot.yield_ml} 
                onSave={(val) => onUpdate({ yield_ml: parseFloat(val) || 0 })} 
                className="text-xs font-medium"
              />
              <span className="text-xs font-medium text-notion-secondary ml-1">ml</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Time</span>
            <div className="bg-notion-hover rounded px-2 py-1 flex items-center">
              <InlineInput 
                type="number"
                value={shot.time} 
                onSave={(val) => onUpdate({ time: parseFloat(val) || 0 })} 
                className="text-xs font-medium"
              />
              <span className="text-xs font-medium text-notion-secondary ml-1">s</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Ratio</span>
            <div className="bg-notion-hover rounded px-2 py-1 flex items-center h-[26px]">
              <span className="text-xs font-bold text-notion-text">
                1:{shot.dose > 0 ? (shot.yield / shot.dose).toFixed(1) : '0'}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-notion-border grid grid-cols-3 gap-3">
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-notion-secondary">
              <Coffee size={12} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Method</span>
            </div>
            <select 
              value={shot.brew_method || 'Espresso Machine'}
              onChange={(e) => onUpdate({ brew_method: e.target.value })}
              className="w-full bg-notion-hover rounded-md px-1 py-1 text-[10px] font-bold text-notion-text border border-transparent focus:border-notion-border focus:outline-none text-center uppercase tracking-tight cursor-pointer appearance-none"
            >
              <option value="Espresso Machine">Espresso</option>
              <option value="Pour Over">Pour Over</option>
              <option value="Aeropress">Aero</option>
              <option value="French Press">French</option>
              <option value="Moka Pot">Moka</option>
              <option value="Cold Brew">Cold</option>
            </select>
          </div>
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-notion-secondary">
              <Settings size={12} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Machine</span>
            </div>
            <div className="w-full bg-notion-hover rounded-md px-1 py-1 flex items-center justify-center">
              <InlineInput 
                value={shot.machine} 
                onSave={(val) => onUpdate({ machine: val })} 
                className="text-[10px] font-bold text-center w-full"
                placeholder="Machine"
              />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col items-center">
            <div className="flex items-center gap-1 text-notion-secondary">
              <Zap size={12} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Grinder</span>
            </div>
            <div className="w-full bg-notion-hover rounded-md px-1 py-1 flex items-center justify-center">
              <InlineInput 
                value={shot.grinder} 
                onSave={(val) => onUpdate({ grinder: val })} 
                className="text-[10px] font-bold text-center w-full"
                placeholder="Grinder"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Rating</span>
          <div className="bg-notion-hover rounded-lg p-3 flex justify-between items-center">
            <span className="text-xs font-semibold uppercase">{shot.rating}</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => {
                const ratingMap: Record<string, number> = { 'Great': 5, 'Good': 4, 'Okay': 3, 'Off': 2, 'Bad': 1 };
                const val = ratingMap[shot.rating] || 0;
                return (
                  <Star key={i} size={14} fill={i < val ? "currentColor" : "none"} className={i < val ? "text-notion-text" : "text-notion-border"} />
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Notes</span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              if (notes !== shot.notes) {
                onUpdate({ notes });
              }
            }}
            className="w-full bg-notion-hover rounded-lg p-3 text-xs leading-relaxed text-notion-text border border-notion-border focus:outline-none focus:ring-1 focus:ring-notion-text min-h-[80px] resize-none transition-colors hover:bg-notion-border/50"
            placeholder="Add your notes here..."
          />
        </div>
      </div>

      <button 
        onClick={onDelete}
        className="notion-btn-secondary w-full py-2.5 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
      >
        <Trash2 size={16} />
        Delete Shot
      </button>
    </motion.div>
  );
}

function StatsScreen({ weekly, stats, ratings, onBack }: { weekly: WeeklyData[]; stats: Stats; ratings: RatingDistribution[]; onBack: () => void; key?: string }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Prepare weekly data for line chart
  const weeklyChartData = days.map((day, i) => {
    const data = weekly.find(w => parseInt(w.day) === i);
    return {
      name: day,
      shots: data?.count || 0,
      avgTime: data?.avg_time ? Math.round(data.avg_time) : 0
    };
  });

  // Prepare rating distribution data
  const ratingOrder = ['Great', 'Good', 'Okay', 'Off', 'Bad'];
  const ratingColors: Record<string, string> = {
    'Great': '#10b981',
    'Good': '#3b82f6',
    'Okay': '#f59e0b',
    'Off': '#f97316',
    'Bad': '#ef4444',
  };

  const ratingChartData = ratingOrder.map(r => {
    const data = ratings.find(item => item.rating === r);
    return {
      name: r,
      count: data?.count || 0,
      color: ratingColors[r]
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-8 pb-32"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Brew Analytics</h1>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="notion-stat-box p-4">
          <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Overall Rating</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{(stats.avg_rating || 0).toFixed(1)}</span>
            <span className="text-xs text-notion-secondary">/ 5.0</span>
          </div>
        </div>
        <div className="notion-stat-box p-4">
          <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-wider">Total Brews</span>
          <span className="text-2xl font-bold">{stats.total_shots}</span>
        </div>
      </div>

      {/* Rating Distribution Bar Chart */}
      <div className="border border-notion-border rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2 text-notion-secondary">
          <BarChart3 size={18} />
          <h3 className="text-xs font-semibold uppercase tracking-widest">Rating Distribution</h3>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ratingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--notion-border)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--notion-secondary)' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--notion-secondary)' }} 
              />
              <Tooltip 
                cursor={{ fill: 'transparent' }}
                contentStyle={{ 
                  backgroundColor: 'var(--notion-bg)', 
                  borderColor: 'var(--notion-border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {ratingChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shot Time Line Chart */}
      <div className="border border-notion-border rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2 text-notion-secondary">
          <Timer size={18} />
          <h3 className="text-xs font-semibold uppercase tracking-widest">Avg Shot Time (Last 7 Days)</h3>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--notion-border)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--notion-secondary)' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--notion-secondary)' }} 
                unit="s"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--notion-bg)', 
                  borderColor: 'var(--notion-border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="avgTime" 
                stroke="var(--notion-text)" 
                strokeWidth={2} 
                dot={{ r: 4, fill: 'var(--notion-bg)', stroke: 'var(--notion-text)', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly Frequency */}
      <div className="border border-notion-border rounded-xl p-5 space-y-6">
        <div className="flex items-center gap-2 text-notion-secondary">
          <Calendar size={18} />
          <h3 className="text-xs font-semibold uppercase tracking-widest">Brew Frequency</h3>
        </div>
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--notion-border)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--notion-secondary)' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: 'var(--notion-secondary)' }} 
              />
              <Tooltip 
                cursor={{ fill: 'var(--notion-hover)' }}
                contentStyle={{ 
                  backgroundColor: 'var(--notion-bg)', 
                  borderColor: 'var(--notion-border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Bar dataKey="shots" fill="var(--notion-text)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryScreen({ shots, onSelectShot, onEditShot, onBack }: { shots: Shot[]; onSelectShot: (shot: Shot) => void; onEditShot: (shot: Shot) => void; onBack: () => void; key?: string }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShots = shots.filter(shot => {
    const query = searchQuery.toLowerCase();
    return (
      shot.bean_name?.toLowerCase().includes(query) ||
      shot.roaster?.toLowerCase().includes(query) ||
      shot.notes?.toLowerCase().includes(query)
    );
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Brew History</h1>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-notion-secondary" size={16} />
        <input
          type="text"
          placeholder="Search by bean, roaster, or notes..."
          className="notion-input pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filteredShots.length > 0 ? (
          filteredShots.map((shot) => (
            <ShotListItem 
              key={shot.id} 
              shot={shot} 
              onClick={() => onSelectShot(shot)} 
              onEdit={(e) => {
                e.stopPropagation();
                onEditShot(shot);
              }}
            />
          ))
        ) : (
          <div className="text-center py-12 text-notion-secondary">
            <p className="text-sm">No shots found matching your search.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RecipesScreen({ recipes, onSave, beans, onSaveBeans, onBack }: { recipes: Recipe[]; onSave: (recipes: Recipe[]) => void; beans: Bean[]; onSaveBeans: (beans: Bean[]) => void; onBack: () => void; key?: string }) {
  const [activeTab, setActiveTab] = useState<'recipes' | 'beans'>('recipes');
  const [isAdding, setIsAdding] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingBean, setEditingBean] = useState<Bean | null>(null);
  
  // Recipe Form State
  const [recipeFormData, setRecipeFormData] = useState({
    name: '',
    bean_name: '',
    roaster: '',
    origin: '',
    bean_type: 'Arabica',
    roast_level: 'Medium',
    grind_setting: '',
    dose: '',
    yield: '',
    yield_grams: '',
    yield_ml: '',
    time: '',
    brew_method: 'Espresso Machine',
    rating: 0
  });

  // Bean Form State
  const [beanFormData, setBeanFormData] = useState({
    name: '',
    roaster: '',
    origin: '',
    roast_date: new Date().toISOString().split('T')[0],
    roast_level: 'Medium',
    bean_type: 'Arabica',
    weight: '',
    total_weight: '',
    notes: ''
  });

  const handleSaveRecipe = () => {
    if (!recipeFormData.name) return;
    
    const newRecipe: Recipe = {
      id: editingRecipe?.id || Date.now().toString(),
      name: recipeFormData.name,
      bean_name: recipeFormData.bean_name,
      roaster: recipeFormData.roaster,
      origin: recipeFormData.origin,
      bean_type: recipeFormData.bean_type,
      roast_level: recipeFormData.roast_level,
      grind_setting: recipeFormData.grind_setting,
      dose: parseFloat(recipeFormData.dose) || 0,
      yield: parseFloat(recipeFormData.yield) || 0,
      yield_grams: parseFloat(recipeFormData.yield_grams) || parseFloat(recipeFormData.yield) || 0,
      yield_ml: parseFloat(recipeFormData.yield_ml) || 0,
      time: parseFloat(recipeFormData.time) || 0,
      brew_method: recipeFormData.brew_method,
      rating: recipeFormData.rating,
      created_at: editingRecipe?.created_at || new Date().toISOString()
    };

    if (editingRecipe) {
      onSave(recipes.map(r => r.id === editingRecipe.id ? newRecipe : r));
    } else {
      onSave([newRecipe, ...recipes]);
    }
    
    setIsAdding(false);
    setEditingRecipe(null);
    resetRecipeForm();
  };

  const handleSaveBean = () => {
    if (!beanFormData.name || !beanFormData.roaster) return;

    const newBean: Bean = {
      id: editingBean?.id || Date.now().toString(),
      name: beanFormData.name,
      roaster: beanFormData.roaster,
      origin: beanFormData.origin,
      roast_date: beanFormData.roast_date,
      roast_level: beanFormData.roast_level,
      bean_type: beanFormData.bean_type,
      weight: parseFloat(beanFormData.weight) || 0,
      total_weight: parseFloat(beanFormData.total_weight) || parseFloat(beanFormData.weight) || 0,
      notes: beanFormData.notes,
      created_at: editingBean?.created_at || new Date().toISOString()
    };

    if (editingBean) {
      onSaveBeans(beans.map(b => b.id === editingBean.id ? newBean : b));
    } else {
      onSaveBeans([newBean, ...beans]);
    }

    setIsAdding(false);
    setEditingBean(null);
    resetBeanForm();
  };

  const resetRecipeForm = () => {
    setRecipeFormData({
      name: '',
      bean_name: '',
      roaster: '',
      origin: '',
      bean_type: 'Arabica',
      roast_level: 'Medium',
      grind_setting: '',
      dose: '',
      yield: '',
      yield_grams: '',
      yield_ml: '',
      time: '',
      brew_method: 'Espresso Machine',
      rating: 0
    });
  };

  const resetBeanForm = () => {
    setBeanFormData({
      name: '',
      roaster: '',
      origin: '',
      roast_date: new Date().toISOString().split('T')[0],
      roast_level: 'Medium',
      bean_type: 'Arabica',
      weight: '',
      total_weight: '',
      notes: ''
    });
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeFormData({
      name: recipe.name,
      bean_name: recipe.bean_name || '',
      roaster: recipe.roaster || '',
      origin: recipe.origin || '',
      bean_type: recipe.bean_type || 'Arabica',
      roast_level: recipe.roast_level || 'Medium',
      grind_setting: recipe.grind_setting || '',
      dose: recipe.dose?.toString() || '',
      yield: recipe.yield?.toString() || '',
      yield_grams: recipe.yield_grams?.toString() || recipe.yield?.toString() || '',
      yield_ml: recipe.yield_ml?.toString() || '',
      time: recipe.time?.toString() || '',
      brew_method: recipe.brew_method || 'Espresso Machine',
      rating: recipe.rating || 0
    });
    setIsAdding(true);
  };

  const handleEditBean = (bean: Bean) => {
    setEditingBean(bean);
    setBeanFormData({
      name: bean.name,
      roaster: bean.roaster,
      origin: bean.origin || '',
      roast_date: bean.roast_date || new Date().toISOString().split('T')[0],
      roast_level: bean.roast_level,
      bean_type: bean.bean_type || 'Arabica',
      weight: bean.weight.toString(),
      total_weight: bean.total_weight.toString(),
      notes: bean.notes || ''
    });
    setIsAdding(true);
  };

  const handleDeleteRecipe = (id: string) => {
    if (window.confirm('Delete this recipe?')) {
      onSave(recipes.filter(r => r.id !== id));
    }
  };

  const handleDeleteBean = (id: string) => {
    if (window.confirm('Delete this bean from inventory?')) {
      onSaveBeans(beans.filter(b => b.id !== id));
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6 pb-32"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">Recipes & Inventory</h1>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { 
              if (activeTab === 'recipes') resetRecipeForm(); 
              else resetBeanForm();
              setIsAdding(true); 
            }}
            className="p-2 bg-notion-text text-notion-bg rounded-full shadow-sm active:scale-90 transition-transform"
          >
            <Plus size={20} />
          </button>
        )}
      </header>

      {/* Tab Switcher */}
      {!isAdding && (
        <div className="flex p-1 bg-notion-hover rounded-xl border border-notion-border">
          <button 
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'recipes' ? 'bg-notion-bg shadow-sm text-notion-text' : 'text-notion-secondary'}`}
          >
            <Zap size={14} />
            Recipes
          </button>
          <button 
            onClick={() => setActiveTab('beans')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'beans' ? 'bg-notion-bg shadow-sm text-notion-text' : 'text-notion-secondary'}`}
          >
            <Package size={14} />
            Bean Inventory
          </button>
        </div>
      )}

      {isAdding ? (
        <div className="space-y-4 bg-notion-hover p-4 rounded-xl border border-notion-border">
          {activeTab === 'recipes' ? (
            <>
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-notion-secondary uppercase tracking-[0.2em] px-1 border-b border-notion-border pb-1">Coffee Details</h3>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Recipe Name</label>
                    <input 
                      placeholder="e.g. Morning Delight" 
                      className="notion-input"
                      value={recipeFormData.name}
                      onChange={e => setRecipeFormData({...recipeFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Bean</label>
                      <input 
                        placeholder="Bean Name" 
                        className="notion-input"
                        value={recipeFormData.bean_name}
                        onChange={e => setRecipeFormData({...recipeFormData, bean_name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Roaster</label>
                      <input 
                        placeholder="Roaster" 
                        className="notion-input"
                        value={recipeFormData.roaster}
                        onChange={e => setRecipeFormData({...recipeFormData, roaster: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Origin</label>
                    <input 
                      placeholder="e.g. Ethiopia, Colombia" 
                      className="notion-input"
                      value={recipeFormData.origin}
                      onChange={e => setRecipeFormData({...recipeFormData, origin: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Rating</label>
                    <div className="flex gap-1 px-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRecipeFormData({ ...recipeFormData, rating: star })}
                          className={`p-1 transition-colors ${recipeFormData.rating >= star ? 'text-yellow-500' : 'text-notion-secondary opacity-30 hover:opacity-100'}`}
                        >
                          <Star size={20} fill={recipeFormData.rating >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-notion-secondary uppercase tracking-[0.2em] px-1 border-b border-notion-border pb-1">Extraction Parameters</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Dose (g)</label>
                      <input 
                        type="number"
                        placeholder="18.0" 
                        className="notion-input"
                        value={recipeFormData.dose}
                        onChange={e => setRecipeFormData({...recipeFormData, dose: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Yield (g)</label>
                      <input 
                        type="number"
                        placeholder="36.0" 
                        className="notion-input"
                        value={recipeFormData.yield_grams}
                        onChange={e => {
                          const val = e.target.value;
                          setRecipeFormData({...recipeFormData, yield_grams: val, yield: val});
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Yield (ml)</label>
                      <input 
                        type="number"
                        placeholder="40" 
                        className="notion-input"
                        value={recipeFormData.yield_ml}
                        onChange={e => setRecipeFormData({...recipeFormData, yield_ml: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Time (s)</label>
                      <input 
                        type="number"
                        placeholder="30" 
                        className="notion-input"
                        value={recipeFormData.time}
                        onChange={e => setRecipeFormData({...recipeFormData, time: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Grind</label>
                    <input 
                      placeholder="8.5" 
                      className="notion-input"
                      value={recipeFormData.grind_setting}
                      onChange={e => setRecipeFormData({...recipeFormData, grind_setting: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Bean Name</label>
                <input 
                  placeholder="e.g. Ethiopia Yirgacheffe" 
                  className="notion-input"
                  value={beanFormData.name}
                  onChange={e => setBeanFormData({...beanFormData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Roaster</label>
                <input 
                  placeholder="e.g. Onyx Coffee Lab" 
                  className="notion-input"
                  value={beanFormData.roaster}
                  onChange={e => setBeanFormData({...beanFormData, roaster: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Origin</label>
                <input 
                  placeholder="e.g. Ethiopia, Colombia" 
                  className="notion-input"
                  value={beanFormData.origin}
                  onChange={e => setBeanFormData({...beanFormData, origin: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Roast Date</label>
                  <input 
                    type="date"
                    className="notion-input"
                    value={beanFormData.roast_date}
                    onChange={e => setBeanFormData({...beanFormData, roast_date: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Roast Level</label>
                  <select 
                    className="notion-input"
                    value={beanFormData.roast_level}
                    onChange={e => setBeanFormData({...beanFormData, roast_level: e.target.value})}
                  >
                    <option>Light</option>
                    <option>Medium-Light</option>
                    <option>Medium</option>
                    <option>Medium-Dark</option>
                    <option>Dark</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Current Weight (g)</label>
                  <input 
                    type="number"
                    placeholder="250" 
                    className="notion-input"
                    value={beanFormData.weight}
                    onChange={e => setBeanFormData({...beanFormData, weight: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Total Weight (g)</label>
                  <input 
                    type="number"
                    placeholder="250" 
                    className="notion-input"
                    value={beanFormData.total_weight}
                    onChange={e => setBeanFormData({...beanFormData, total_weight: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Notes</label>
                <textarea 
                  placeholder="Flavor notes, origin details..." 
                  className="notion-input min-h-[80px]"
                  value={beanFormData.notes}
                  onChange={e => setBeanFormData({...beanFormData, notes: e.target.value})}
                />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button 
              onClick={activeTab === 'recipes' ? handleSaveRecipe : handleSaveBean}
              className="flex-1 notion-btn-primary py-2.5"
            >
              {activeTab === 'recipes' 
                ? (editingRecipe ? 'Update Recipe' : 'Save Recipe')
                : (editingBean ? 'Update Bean' : 'Add to Inventory')
              }
            </button>
            <button 
              onClick={() => { 
                setIsAdding(false); 
                setEditingRecipe(null); 
                setEditingBean(null);
              }}
              className="flex-1 notion-btn-secondary py-2.5"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTab === 'recipes' ? (
            recipes.length === 0 ? (
              <div className="text-center py-12 text-notion-secondary">
                <p className="text-sm">No recipes saved yet.</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="text-xs font-bold text-notion-text mt-2 hover:underline"
                >
                  Create your first recipe
                </button>
              </div>
            ) : (
              recipes.map(recipe => (
                <div key={recipe.id} className="notion-card p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-notion-text">{recipe.name}</h3>
                        {recipe.rating && recipe.rating > 0 && (
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={10} 
                                className={star <= recipe.rating ? 'text-yellow-500' : 'text-notion-secondary opacity-20'} 
                                fill={star <= recipe.rating ? 'currentColor' : 'none'}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-notion-secondary uppercase tracking-wider font-bold">
                        {recipe.bean_name} {recipe.origin ? `(${recipe.origin})` : ''} • {recipe.roaster}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditRecipe(recipe)} className="p-1.5 hover:bg-notion-hover rounded-md text-notion-secondary">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteRecipe(recipe.id)} className="p-1.5 hover:bg-notion-hover rounded-md text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-notion-border">
                    <div className="text-center">
                      <p className="text-[8px] text-notion-secondary uppercase font-bold">Dose</p>
                      <p className="text-xs font-bold">{recipe.dose}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-notion-secondary uppercase font-bold">Yield</p>
                      <p className="text-xs font-bold">
                        {recipe.yield_grams || recipe.yield}g
                        {recipe.yield_ml ? ` / ${recipe.yield_ml}ml` : ''}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-notion-secondary uppercase font-bold">Time</p>
                      <p className="text-xs font-bold">{recipe.time}s</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-notion-secondary uppercase font-bold">Grind</p>
                      <p className="text-xs font-bold">{recipe.grind_setting}</p>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            beans.length === 0 ? (
              <div className="text-center py-12 text-notion-secondary">
                <p className="text-sm">Your inventory is empty.</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="text-xs font-bold text-notion-text mt-2 hover:underline"
                >
                  Add your first bag of beans
                </button>
              </div>
            ) : (
              beans.map(bean => (
                <div key={bean.id} className="notion-card p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-notion-hover flex items-center justify-center text-notion-text border border-notion-border">
                        <Coffee size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-notion-text">{bean.name}</h3>
                        <p className="text-[10px] text-notion-secondary uppercase tracking-wider font-bold">
                          {bean.roaster} • {bean.origin ? `${bean.origin} • ` : ''}{bean.roast_level}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditBean(bean)} className="p-1.5 hover:bg-notion-hover rounded-md text-notion-secondary">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDeleteBean(bean.id)} className="p-1.5 hover:bg-notion-hover rounded-md text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar for Weight */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest">Remaining</span>
                      <span className="text-xs font-bold">{bean.weight}g / {bean.total_weight}g</span>
                    </div>
                    <div className="h-1.5 bg-notion-hover rounded-full overflow-hidden border border-notion-border">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (bean.weight / bean.total_weight) * 100)}%` }}
                        className={`h-full rounded-full ${
                          (bean.weight / bean.total_weight) < 0.2 ? 'bg-red-500' : 'bg-notion-text'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-notion-border">
                    <div className="flex items-center gap-1.5 text-notion-secondary">
                      <Calendar size={12} />
                      <span className="text-[10px] font-medium">Roasted {bean.roast_date}</span>
                    </div>
                    {bean.notes && (
                      <div className="flex items-center gap-1.5 text-notion-secondary">
                        <MessageSquare size={12} />
                        <span className="text-[10px] font-medium truncate max-w-[100px]">{bean.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}
    </motion.div>
  );
}

function SettingsScreen({ onBack, darkMode, setDarkMode, shots, onRefresh }: { onBack: () => void; darkMode: boolean; setDarkMode: (v: boolean) => void; shots: Shot[]; onRefresh: () => void; key?: string }) {
  const handleExportCSV = () => {
    if (shots.length === 0) {
      alert("No data to export!");
      return;
    }

    const headers = ['bean_name', 'roaster', 'origin', 'bean_type', 'roast_level', 'grind_setting', 'dose', 'yield', 'yield_grams', 'yield_ml', 'time', 'rating', 'notes', 'machine', 'grinder', 'created_at'];
    const csvRows = [
      headers.join(','),
      ...shots.map(shot => headers.map(header => {
        const val = (shot as any)[header] || '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lota-espresso-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const data = lines.slice(1).map(line => {
        // Simple CSV parser that handles quotes
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const obj: any = {};
        headers.forEach((header, index) => {
          let val = values[index]?.replace(/^"|"$/g, '').replace(/""/g, '"');
          if (['dose', 'yield', 'yield_grams', 'yield_ml', 'time'].includes(header)) {
            obj[header] = parseFloat(val) || 0;
          } else {
            obj[header] = val || '';
          }
        });
        return obj;
      });

      try {
        const storedShots = localStorage.getItem('lota_shots');
        const currentShots: Shot[] = storedShots ? JSON.parse(storedShots) : [];
        
        const newShots = data.map((shot: any) => ({
          ...shot,
          id: Date.now().toString() + Math.random().toString(36).substring(7),
          created_at: shot.created_at || new Date().toISOString()
        }));

        const updatedShots = [...newShots, ...currentShots];
        localStorage.setItem('lota_shots', JSON.stringify(updatedShots));

        alert(`Successfully imported ${data.length} shots!`);
        onRefresh();
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import data. Please check your CSV format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6 space-y-6"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-1.5 hover:bg-notion-hover rounded-md transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </header>

      <div className="border border-notion-border rounded-xl p-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Dark Mode</span>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-notion-hover rounded-md transition-colors text-notion-secondary hover:text-notion-text"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        <div className="h-px bg-notion-border" />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">App Version</span>
          <span className="text-xs text-notion-secondary">1.0.0</span>
        </div>
        <div className="h-px bg-notion-border" />
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Units</span>
          <span className="text-xs bg-notion-hover px-2 py-1 rounded border border-notion-border">Metric (g/ml)</span>
        </div>
        <div className="h-px bg-notion-border" />
        
        <div className="space-y-2 pt-2">
          <h3 className="text-[10px] font-bold text-notion-secondary uppercase tracking-widest px-1">Data Management</h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={handleExportCSV}
              className="notion-btn-secondary py-2 text-xs flex items-center justify-center gap-2"
            >
              <Download size={14} />
              Export CSV
            </button>
            <label className="notion-btn-secondary py-2 text-xs flex items-center justify-center gap-2 cursor-pointer">
              <Upload size={14} />
              Import CSV
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleImportCSV}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-notion-secondary mt-12">
        Made with ❤️ for Coffee Lovers
      </div>
    </motion.div>
  );
}
