import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CalendarDays, LogOut, Trash2, Loader2, Users, Settings, X, Plus, Info } from 'lucide-react';
import { cn, getUpcomingWeeks, DEFAULT_TIMESLOTS, ALL_DAYS } from '../lib/utils';

const WEEKS = getUpcomingWeeks(8); // Show 8 weeks for admin

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(sessionStorage.getItem('adminAuth') === 'true');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'settings'>('bookings');
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [weekConfigs, setWeekConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isAuthenticated) return;
    
    setLoadingData(true);
    
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setBookings(data);
      setLoadingData(false);
    });

    const unsubConfigs = onSnapshot(collection(db, 'weekConfigs'), (snapshot) => {
      const configs: Record<string, any> = {};
      snapshot.forEach(doc => {
        configs[doc.id] = doc.data();
      });
      setWeekConfigs(configs);
    });

    return () => {
      unsubBookings();
      unsubConfigs();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (password === 'admin_av_booking') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
    } else {
      setLoginError("Mot de passe incorrect.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm("Supprimer cette réservation ?")) return;
    try {
      await deleteDoc(doc(db, 'bookings', id));
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleAddSlot = async (weekId: string, day: string, newSlot: string) => {
    if (!newSlot.trim()) return;
    
    const currentWeekConfig = weekConfigs[weekId]?.days || {};
    const currentDaySlots = currentWeekConfig[day] || DEFAULT_TIMESLOTS;
    
    if (currentDaySlots.includes(newSlot.trim())) return; // Prevent duplicates
    
    const updatedDaySlots = [...currentDaySlots, newSlot.trim()].sort();
    const updatedWeekConfig = { ...currentWeekConfig, [day]: updatedDaySlots };
    
    // Ensure all other days are populated with defaults if they don't exist yet
    ALL_DAYS.forEach(d => {
      if (!updatedWeekConfig[d]) {
        updatedWeekConfig[d] = [...DEFAULT_TIMESLOTS];
      }
    });
    
    try {
      await setDoc(doc(db, 'weekConfigs', weekId), { days: updatedWeekConfig });
    } catch (error) {
      console.error("Error adding slot:", error);
      alert("Erreur lors de l'ajout du créneau.");
    }
  };

  const handleRemoveSlot = async (weekId: string, day: string, slotToRemove: string) => {
    const currentWeekConfig = weekConfigs[weekId]?.days || {};
    const currentDaySlots = currentWeekConfig[day] || DEFAULT_TIMESLOTS;
    
    const updatedDaySlots = currentDaySlots.filter(s => s !== slotToRemove);
    const updatedWeekConfig = { ...currentWeekConfig, [day]: updatedDaySlots };
    
    ALL_DAYS.forEach(d => {
      if (!updatedWeekConfig[d]) {
        updatedWeekConfig[d] = [...DEFAULT_TIMESLOTS];
      }
    });
    
    try {
      await setDoc(doc(db, 'weekConfigs', weekId), { days: updatedWeekConfig });
    } catch (error) {
      console.error("Error removing slot:", error);
      alert("Erreur lors de la suppression du créneau.");
    }
  };

  const handleResetSlots = async (weekId: string) => {
    if (!window.confirm("Réinitialiser les créneaux de cette semaine aux valeurs par défaut ?")) return;
    try {
      await deleteDoc(doc(db, 'weekConfigs', weekId));
    } catch (error) {
      console.error("Error resetting slots:", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="text-center mb-8">
            <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-8 mx-auto mb-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Espace Administrateur</h1>
          </div>
          
          {loginError && (
            <div className="bg-[#fff0f0] text-[#ff3b30] p-4 rounded-xl mb-6 text-sm">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Mot de passe</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3 px-4 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] focus:bg-white transition-all"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-3.5 mt-4 bg-[#1d1d1f] text-white rounded-xl font-medium hover:bg-black transition-colors"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const groupedBookings = bookings.reduce((acc, booking) => {
    const week = booking.week || 'Inconnu';
    if (!acc[week]) acc[week] = [];
    acc[week].push(booking);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans pb-32">
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 object-contain" />
            <span className="hidden sm:inline-block px-3 py-1 bg-[#f5f5f7] text-xs font-medium rounded-full text-[#86868b]">Admin</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
          
          <div className="flex bg-white p-1 rounded-full shadow-sm border border-[#d2d2d7]/30">
            <button 
              onClick={() => setActiveTab('bookings')} 
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2", 
                activeTab === 'bookings' ? "bg-[#1d1d1f] text-white" : "text-[#86868b] hover:text-[#1d1d1f]"
              )}
            >
              <Users className="w-4 h-4" />
              Réservations
            </button>
            <button 
              onClick={() => setActiveTab('settings')} 
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2", 
                activeTab === 'settings' ? "bg-[#1d1d1f] text-white" : "text-[#86868b] hover:text-[#1d1d1f]"
              )}
            >
              <Settings className="w-4 h-4" />
              Créneaux
            </button>
          </div>
        </div>

        {activeTab === 'bookings' ? (
          <>
            {loadingData ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-white rounded-[2rem] p-12 text-center border border-[#d2d2d7]/30">
                <CalendarDays className="w-12 h-12 text-[#d2d2d7] mx-auto mb-4" />
                <h3 className="text-xl font-medium text-[#1d1d1f] mb-2">Aucune réservation</h3>
                <p className="text-[#86868b]">Les réservations apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {Object.entries(groupedBookings).sort(([a], [b]) => a.localeCompare(b)).map(([week, weekBookings]) => (
                  <div key={week} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#d2d2d7]/30">
                    <div className="bg-[#f5f5f7] px-6 py-4 border-b border-[#d2d2d7]/50">
                      <h2 className="font-semibold text-lg flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                        {WEEKS.find(w => w.id === week)?.label || `Semaine du ${week}`}
                      </h2>
                    </div>
                    <div className="divide-y divide-[#f5f5f7]">
                      {weekBookings.map((booking) => (
                        <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-[#fafafa] transition-colors">
                          <div className="md:w-1/3">
                            <h3 className="font-semibold text-lg mb-1">{booking.userInfo?.name}</h3>
                            <p className="text-sm text-[#86868b] mb-1">{booking.userInfo?.email}</p>
                            <p className="text-sm text-[#86868b]">{booking.userInfo?.phone}</p>
                            <div className="mt-3 inline-block px-2 py-1 bg-[#f5f9ff] text-[#0071e3] text-xs font-medium rounded">
                              Groupe {booking.group}
                            </div>
                          </div>
                          <div className="md:w-1/2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {booking.slots && Object.entries(booking.slots).map(([day, time]) => (
                                <div key={day} className="bg-[#f5f5f7] px-3 py-2 rounded-lg text-sm">
                                  <span className="font-medium">{day}</span>
                                  <span className="text-[#86868b] ml-2">{time as string}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="md:w-1/6 flex items-center justify-end">
                            <button 
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="p-2 text-[#ff3b30] hover:bg-[#fff0f0] rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-[#e8f2ff] text-[#0071e3] p-4 rounded-2xl text-sm mb-8 flex items-start gap-3">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                Modifiez ici les créneaux horaires disponibles pour chaque jour de chaque semaine. 
                Si vous ne définissez rien, les créneaux par défaut seront utilisés. Les modifications sont appliquées en temps réel.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {WEEKS.map(week => {
                const weekConfig = weekConfigs[week.id]?.days || {};
                const isCustom = !!weekConfigs[week.id];

                return (
                  <div key={week.id} className="bg-white rounded-2xl p-6 border border-[#d2d2d7]/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-lg">{week.label}</h3>
                      {isCustom && (
                        <button 
                          onClick={() => handleResetSlots(week.id)}
                          className="text-xs text-[#86868b] hover:text-[#ff3b30] underline"
                        >
                          Réinitialiser la semaine
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {ALL_DAYS.map(day => {
                        const slots = weekConfig[day] || DEFAULT_TIMESLOTS;
                        return (
                          <div key={day} className="border-t border-[#f5f5f7] pt-4">
                            <h4 className="font-medium text-[#1d1d1f] mb-3">{day}</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {slots.map(slot => (
                                <span key={slot} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] text-[#1d1d1f] rounded-lg text-sm border border-[#d2d2d7]/50">
                                  {slot}
                                  <button 
                                    onClick={() => handleRemoveSlot(week.id, day, slot)} 
                                    className="text-[#86868b] hover:text-[#ff3b30] transition-colors ml-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const input = e.currentTarget.elements.namedItem('newSlot') as HTMLInputElement;
                              handleAddSlot(week.id, day, input.value);
                              input.value = '';
                            }} className="flex gap-2">
                              <input 
                                name="newSlot" 
                                type="text" 
                                placeholder="Ex: 18h00 - 19h30" 
                                className="flex-1 bg-[#f5f5f7] border border-transparent rounded-xl px-4 py-2 text-sm focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] outline-none transition-all" 
                              />
                              <button 
                                type="submit" 
                                className="px-3 py-2 bg-[#1d1d1f] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
