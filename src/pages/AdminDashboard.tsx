import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { CalendarDays, LogOut, Trash2, Loader2, Users, Settings, X, Plus, Info, Calendar as CalendarIcon, ExternalLink, Database, Activity, Edit2, Check, CalendarPlus, Download } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { cn, generateWeekData, DAYS, DEFAULT_TIMESLOTS, sortTimeSlots, getFormattedDateForDay, generateGoogleCalendarLink, generateIcsContent, downloadIcsFile } from '../lib/utils';

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => sessionStorage.getItem('adminUnlocked') === 'true');
  
  const [activeTab, setActiveTab] = useState<'bookings' | 'calendar' | 'settings'>('bookings');
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  
  const [studyWeeks, setStudyWeeks] = useState<any[]>([]);
  const [selectedCalendarWeek, setSelectedCalendarWeek] = useState<string>('');

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<{ [day: string]: string }>({});
  const [savingBooking, setSavingBooking] = useState(false);

  const handleEditBookingClick = (bookingId: string, currentSlots: any) => {
    setEditingBookingId(bookingId);
    setEditSlots({ ...currentSlots });
  };

  const handleSaveBookingSlots = async (bookingId: string) => {
    setSavingBooking(true);
    try {
      await setDoc(doc(db, 'bookings', bookingId), { slots: editSlots }, { merge: true });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, slots: editSlots } : b));
      setEditingBookingId(null);
    } catch (error) {
      console.error("Error saving booking slots:", error);
      alert("Erreur lors de la mise à jour du créneau.");
    } finally {
      setSavingBooking(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && isAdminUnlocked) {
      fetchBookings();
      fetchStudyWeeks();
    }
  }, [user, isAdminUnlocked]);

  const fetchBookings = async () => {
    setLoadingData(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'bookings'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setBookings(data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchStudyWeeks = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'studyWeeks'));
      if (snapshot.empty) {
        // Auto-generate 4 weeks if empty
        const newWeeks = [];
        let currentDate = new Date();
        for (let i = 0; i < 4; i++) {
          const weekData = generateWeekData(currentDate);
          const newWeek = {
            ...weekData,
            slotsByDay: {
              Lundi: [...DEFAULT_TIMESLOTS],
              Mardi: [...DEFAULT_TIMESLOTS],
              Mercredi: [...DEFAULT_TIMESLOTS],
              Jeudi: [...DEFAULT_TIMESLOTS],
              Vendredi: [...DEFAULT_TIMESLOTS],
            }
          };
          await setDoc(doc(db, 'studyWeeks', weekData.id), newWeek);
          newWeeks.push(newWeek);
          currentDate.setDate(currentDate.getDate() + 7);
        }
        setStudyWeeks(newWeeks);
        setSelectedCalendarWeek(newWeeks[0].id);
      } else {
        const weeks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        weeks.sort((a: any, b: any) => a.startDate - b.startDate);
        setStudyWeeks(weeks);
        if (weeks.length > 0) setSelectedCalendarWeek(weeks[0].id);
      }
    } catch (error) {
      console.error("Error fetching study weeks:", error);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoginError("Erreur lors de la connexion avec Google.");
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (password === 'admin_av_booking') {
      sessionStorage.setItem('adminUnlocked', 'true');
      setIsAdminUnlocked(true);
    } else {
      setLoginError("Mot de passe incorrect.");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminUnlocked');
    setIsAdminUnlocked(false);
    signOut(auth);
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm("Supprimer cette réservation ?")) return;
    try {
      await deleteDoc(doc(db, 'bookings', id));
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleAddWeek = async () => {
    let nextDate = new Date();
    if (studyWeeks.length > 0) {
      const lastWeek = studyWeeks[studyWeeks.length - 1];
      nextDate = new Date(lastWeek.startDate);
      nextDate.setDate(nextDate.getDate() + 7);
    }
    
    const weekData = generateWeekData(nextDate);
    const newWeek = {
      ...weekData,
      slotsByDay: {
        Lundi: [...DEFAULT_TIMESLOTS],
        Mardi: [...DEFAULT_TIMESLOTS],
        Mercredi: [...DEFAULT_TIMESLOTS],
        Jeudi: [...DEFAULT_TIMESLOTS],
        Vendredi: [...DEFAULT_TIMESLOTS],
      }
    };

    try {
      await setDoc(doc(db, 'studyWeeks', weekData.id), newWeek);
      fetchStudyWeeks();
    } catch (error) {
      console.error("Error adding week:", error);
      alert("Erreur lors de l'ajout de la semaine.");
    }
  };

  const handleDeleteWeek = async (weekId: string) => {
    if (!window.confirm("Supprimer cette semaine ?")) return;
    try {
      await deleteDoc(doc(db, 'studyWeeks', weekId));
      fetchStudyWeeks();
    } catch (error) {
      console.error("Error deleting week:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleAddSlotToDay = async (weekId: string, day: string, newSlot: string) => {
    if (!newSlot.trim()) return;
    
    const week = studyWeeks.find(w => w.id === weekId);
    if (!week) return;

    const currentSlots = week.slotsByDay?.[day] || [];
    if (currentSlots.includes(newSlot.trim())) return;
    
    const updatedSlots = sortTimeSlots([...currentSlots, newSlot.trim()]);
    const updatedSlotsByDay = { ...week.slotsByDay, [day]: updatedSlots };
    
    try {
      await setDoc(doc(db, 'studyWeeks', weekId), { slotsByDay: updatedSlotsByDay }, { merge: true });
      setStudyWeeks(prev => prev.map(w => w.id === weekId ? { ...w, slotsByDay: updatedSlotsByDay } : w));
    } catch (error) {
      console.error("Error adding slot:", error);
      alert("Erreur lors de l'ajout du créneau.");
    }
  };

  const handleRemoveSlotFromDay = async (weekId: string, day: string, slotToRemove: string) => {
    const week = studyWeeks.find(w => w.id === weekId);
    if (!week) return;

    const currentSlots = week.slotsByDay?.[day] || [];
    const updatedSlots = currentSlots.filter((s: string) => s !== slotToRemove);
    const updatedSlotsByDay = { ...week.slotsByDay, [day]: updatedSlots };
    
    try {
      await setDoc(doc(db, 'studyWeeks', weekId), { slotsByDay: updatedSlotsByDay }, { merge: true });
      setStudyWeeks(prev => prev.map(w => w.id === weekId ? { ...w, slotsByDay: updatedSlotsByDay } : w));
    } catch (error) {
      console.error("Error removing slot:", error);
      alert("Erreur lors de la suppression du créneau.");
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const Header = () => (
    <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
      <div className="max-w-[90rem] mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 lg:gap-6">
          <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 md:h-8 object-contain" />
          <div className="hidden sm:flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full">
            <Link to="/" className="px-4 py-1.5 text-[#86868b] hover:text-[#1d1d1f] rounded-full text-sm font-medium transition-colors whitespace-nowrap">Mon Espace</Link>
            <span className="px-4 py-1.5 bg-white text-[#1d1d1f] rounded-full text-sm font-medium shadow-sm whitespace-nowrap">Administration</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:gap-4">
          {isAdminUnlocked && (
            <div className="flex flex-wrap items-center gap-2 lg:gap-3 mr-0 lg:mr-2 border-[#d2d2d7] xl:pr-4 xl:border-r">
              <a 
                href="https://pro.onedoc.ch/calendar" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium hover:bg-[#f5f5f7] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                <img src="/images/onedoc_logo.svg" alt="OneDoc" className="h-5 object-contain opacity-80 hover:opacity-100 transition-opacity" />
              </a>
              <a 
                href="https://proto-tracker.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-[#0071e3] hover:bg-[#f5f9ff] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                <Database className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">Data Tracker</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <a 
                href="https://www.biodymanager.com/#/app/faq-manager/list" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-[#0071e3] hover:bg-[#f5f9ff] px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
              >
                <Activity className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline">BiodyManager</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] px-4 py-1.5 rounded-full whitespace-nowrap">
            <Users className="w-4 h-4 text-[#0071e3] shrink-0" />
            <span className="max-w-[100px] xl:max-w-none truncate">{user.displayName || user.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );

  if (user && !isAdminUnlocked) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans pb-32">
        <Header />
        <main className="max-w-md mx-auto px-4 py-20">
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="w-8 h-8 text-[#1d1d1f]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Accès Sécurisé</h1>
            <p className="text-[#86868b] mb-8 text-sm">
              Veuillez saisir le mot de passe pour accéder à l'administration.
            </p>
            
            {loginError && (
              <div className="bg-[#fff0f0] text-[#ff3b30] p-4 rounded-xl mb-6 text-sm">
                {loginError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  required
                  placeholder="Mot de passe administrateur"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3.5 px-4 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] focus:bg-white transition-all text-center"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3.5 mt-4 bg-[#1d1d1f] text-white rounded-xl font-medium hover:bg-black transition-colors"
              >
                Déverrouiller
              </button>
            </form>
          </div>
        </main>
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
      <Header />

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
              onClick={() => setActiveTab('calendar')} 
              className={cn(
                "px-5 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2", 
                activeTab === 'calendar' ? "bg-[#1d1d1f] text-white" : "text-[#86868b] hover:text-[#1d1d1f]"
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendrier
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
                {Object.entries(groupedBookings).sort(([a], [b]) => a.localeCompare(b)).map(([week, weekBookings]: [string, any[]]) => {
                  const weekLabel = studyWeeks.find(w => w.id === week)?.label || `Semaine du ${week}`;
                  return (
                    <div key={week} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#d2d2d7]/30">
                      <div className="bg-[#f5f5f7] px-6 py-4 border-b border-[#d2d2d7]/50">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                          {weekLabel}
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
                              {booking.slots && Object.keys(booking.slots).map(day => {
                                const currentWeekData = studyWeeks.find(w => w.id === booking.week);
                                const dayDateStr = currentWeekData ? getFormattedDateForDay(currentWeekData.startDate, day) : '';
                                
                                // Calculate timestamp for the start of the slot
                                let startDateTs = currentWeekData?.startDate || Date.now();
                                if (currentWeekData) {
                                  const dayIndex = DAYS.indexOf(day);
                                  const d = new Date(currentWeekData.startDate);
                                  d.setDate(d.getDate() + dayIndex);
                                  
                                  // Parse time from slot (e.g. "09h00")
                                  const timeSlot = booking.slots[day];
                                  const match = timeSlot.match(/(\d{1,2})[h:]?(\d{2})?/i);
                                  if (match) {
                                    d.setHours(parseInt(match[1] || '0', 10), parseInt(match[2] || '0', 10), 0, 0);
                                  }
                                  startDateTs = d.getTime();
                                }
                                
                                const gcalLink = generateGoogleCalendarLink(
                                  `Étude AudioVitality - ${booking.userInfo?.name}`,
                                  startDateTs,
                                  90,
                                  `Participant: ${booking.userInfo?.name}\nEmail: ${booking.userInfo?.email}\nTél: ${booking.userInfo?.phone}\nGroupe: ${booking.group}`,
                                  "AudioVitality"
                                );

                                const handleDownloadIcs = () => {
                                  const content = generateIcsContent(
                                    `Étude AudioVitality - ${booking.userInfo?.name}`,
                                    startDateTs,
                                    90,
                                    `Participant: ${booking.userInfo?.name}\\nEmail: ${booking.userInfo?.email}\\nTél: ${booking.userInfo?.phone}\\nGroupe: ${booking.group}`,
                                    "AudioVitality"
                                  );
                                  downloadIcsFile(content, `audiovitality-seance-${day.toLowerCase()}.ics`);
                                };

                                return (
                                <div key={day} className="bg-[#f5f5f7] px-3 py-2 rounded-lg text-sm flex flex-col justify-center relative group">
                                  <div className="flex justify-between items-start">
                                    <span className="font-medium">{day} {dayDateStr && <span className="text-xs font-normal text-[#86868b]">({dayDateStr})</span>}</span>
                                    {!editingBookingId && (
                                      <div className="flex gap-1">
                                        <button 
                                          onClick={handleDownloadIcs}
                                          title="Ajouter au calendrier Apple/Outlook"
                                          className="text-[#0071e3] opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#e8f2fc] rounded"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                        <a 
                                          href={gcalLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Ajouter au calendrier Google"
                                          className="text-[#0071e3] opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-[#e8f2fc] rounded"
                                        >
                                          <CalendarPlus className="w-4 h-4" />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                  {editingBookingId === booking.id ? (
                                    <select 
                                      value={editSlots[day] || booking.slots[day]}
                                      onChange={(e) => setEditSlots({...editSlots, [day]: e.target.value})}
                                      className="mt-1 bg-white border border-[#d2d2d7] rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#0071e3]"
                                    >
                                      {studyWeeks.find(w => w.id === booking.week)?.slotsByDay?.[day]?.map((slot: string) => (
                                        <option key={slot} value={slot}>{slot}</option>
                                      )) || <option value={booking.slots[day]}>{booking.slots[day]}</option>}
                                    </select>
                                  ) : (
                                    <span className="text-[#86868b]">{booking.slots[day]}</span>
                                  )}
                                </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="md:w-1/6 flex items-center justify-end gap-2">
                            {editingBookingId === booking.id ? (
                              <button 
                                onClick={() => handleSaveBookingSlots(booking.id)}
                                disabled={savingBooking}
                                className="p-2 text-[#34A853] hover:bg-[#e6f4ea] rounded-lg transition-colors"
                                title="Sauvegarder"
                              >
                                {savingBooking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleEditBookingClick(booking.id, booking.slots)}
                                className="p-2 text-[#86868b] hover:bg-[#f5f5f7] rounded-lg transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                            )}
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
                );
              })}
              </div>
            )}
          </>
        ) : activeTab === 'calendar' ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#d2d2d7]/30 shadow-sm">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#0071e3]" />
                Vue Calendrier
              </h2>
              <select 
                value={selectedCalendarWeek}
                onChange={(e) => setSelectedCalendarWeek(e.target.value)}
                className="bg-[#f5f5f7] border-none rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {studyWeeks.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-[2rem] overflow-hidden border border-[#d2d2d7]/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr>
                    <th className="p-4 border-b border-r border-[#d2d2d7]/50 bg-[#f5f5f7] w-32 font-semibold text-sm text-[#86868b] text-center">Horaires</th>
                    {DAYS.map(day => {
                      const selectedWeekObj = studyWeeks.find(w => w.id === selectedCalendarWeek);
                      const dayDate = selectedWeekObj ? getFormattedDateForDay(selectedWeekObj.startDate, day) : '';
                      return (
                        <th key={day} className="p-4 border-b border-[#d2d2d7]/50 bg-[#f5f5f7] text-center w-1/5">
                          <div className="font-semibold text-[#1d1d1f]">{day}</div>
                          {dayDate && <div className="text-xs font-normal text-[#86868b] mt-0.5">{dayDate}</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const selectedWeekData = studyWeeks.find(w => w.id === selectedCalendarWeek);
                    const allSlotsSet = new Set<string>();
                    if (selectedWeekData?.slotsByDay) {
                      Object.values(selectedWeekData.slotsByDay).forEach((slots: any) => {
                        slots.forEach((s: string) => allSlotsSet.add(s));
                      });
                    }
                    const uniqueSlots = sortTimeSlots(Array.from(allSlotsSet));

                    return uniqueSlots.map((time, idx) => (
                      <tr key={time} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                        <td className="p-4 border-r border-[#d2d2d7]/50 text-sm font-medium text-[#86868b] text-center whitespace-nowrap">
                          {time}
                        </td>
                        {DAYS.map(day => {
                          const isSlotAvailableForDay = selectedWeekData?.slotsByDay?.[day]?.includes(time);
                          const cellBooking = bookings.find(b => 
                            b.week === selectedCalendarWeek && 
                            b.slots && b.slots[day] === time
                          );

                          const isTechnoSession = cellBooking && (
                            (cellBooking.group === 'LUNDI' && day === 'Mercredi') || 
                            (cellBooking.group === 'MARDI' && day === 'Jeudi')
                          );

                          return (
                            <td key={day} className="p-3 border-b border-[#d2d2d7]/30 relative h-24">
                              {cellBooking ? (
                                <div className={cn(
                                  "absolute inset-2 border rounded-xl p-3 flex flex-col justify-center overflow-hidden",
                                  isTechnoSession 
                                    ? "bg-[#fdf4ff] border-[#c026d3]/20" 
                                    : "bg-[#f5f9ff] border-[#0071e3]/20"
                                )}>
                                  <div className={cn(
                                    "font-semibold text-sm truncate",
                                    isTechnoSession ? "text-[#c026d3]" : "text-[#0071e3]"
                                  )}>
                                    {cellBooking.userInfo?.name}
                                  </div>
                                  <div className={cn(
                                    "text-xs truncate mt-0.5",
                                    isTechnoSession ? "text-[#c026d3]/70" : "text-[#86868b]"
                                  )}>
                                    {cellBooking.userInfo?.phone}
                                  </div>
                                  {isTechnoSession && (
                                    <div className="text-[10px] font-bold tracking-widest uppercase text-[#c026d3]/60 mt-1">
                                      Session Techno
                                    </div>
                                  )}
                                </div>
                              ) : isSlotAvailableForDay ? (
                                <div className="absolute inset-2 border-2 border-dashed border-[#d2d2d7]/50 rounded-xl flex items-center justify-center">
                                  <span className="text-xs text-[#d2d2d7] font-medium">Libre</span>
                                </div>
                              ) : (
                                <div className="absolute inset-2 bg-[#f5f5f7] rounded-xl flex items-center justify-center">
                                  <span className="text-xs text-[#d2d2d7] font-medium">-</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div className="bg-[#e8f2ff] text-[#0071e3] p-4 rounded-2xl text-sm flex items-start gap-3 flex-1">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  Gérez ici les semaines d'étude et les créneaux disponibles pour chaque jour.
                </p>
              </div>
              <button 
                onClick={handleAddWeek}
                className="px-6 py-3.5 bg-[#1d1d1f] text-white rounded-xl font-medium hover:bg-black transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Ajouter une semaine
              </button>
            </div>

            <div className="space-y-8">
              {studyWeeks.map(week => (
                <div key={week.id} className="bg-white rounded-3xl p-6 md:p-8 border border-[#d2d2d7]/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#f5f5f7]">
                    <h3 className="text-xl font-semibold">{week.label}</h3>
                    <button 
                      onClick={() => handleDeleteWeek(week.id)}
                      className="text-[#ff3b30] hover:bg-[#fff0f0] px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Supprimer la semaine</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {DAYS.map(day => {
                      const slots = week.slotsByDay?.[day] || [];
                      return (
                        <div key={day} className="bg-[#f5f5f7] rounded-2xl p-4 flex flex-col">
                          <h4 className="font-semibold text-[#1d1d1f] mb-4 text-center">{day}</h4>
                          <div className="space-y-2 mb-4 flex-1">
                            {slots.map((slot: string) => (
                              <div key={slot} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#d2d2d7]/50 text-sm shadow-sm">
                                <span className="font-medium">{slot}</span>
                                <button 
                                  onClick={() => handleRemoveSlotFromDay(week.id, day, slot)} 
                                  className="text-[#86868b] hover:text-[#ff3b30] transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            {slots.length === 0 && (
                              <div className="text-center text-xs text-[#86868b] py-4 bg-white/50 rounded-lg border border-dashed border-[#d2d2d7]">
                                Aucun créneau
                              </div>
                            )}
                          </div>
                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem('newSlot') as HTMLInputElement;
                            handleAddSlotToDay(week.id, day, input.value);
                            input.value = '';
                          }} className="flex gap-1.5 mt-auto">
                            <input 
                              name="newSlot" 
                              type="text" 
                              placeholder="10h-11h" 
                              className="w-full bg-white border border-[#d2d2d7]/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition-all" 
                            />
                            <button 
                              type="submit" 
                              className="bg-[#1d1d1f] text-white p-2 rounded-lg hover:bg-black transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </form>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
