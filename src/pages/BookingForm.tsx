import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, AlertTriangle, ChevronRight, User, Mail, Phone, Info, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, getUpcomingWeeks, DEFAULT_TIMESLOTS, ALL_DAYS } from '../lib/utils';

type GroupType = 'LUNDI' | 'MARDI' | null;

const GROUPS = {
  LUNDI: {
    name: 'Groupe Lundi',
    days: ['Lundi', 'Mercredi', 'Jeudi'],
    description: '1 séance le Lundi + 1 séance le Mercredi + 1 séance le Jeudi'
  },
  MARDI: {
    name: 'Groupe Mardi',
    days: ['Mardi', 'Jeudi', 'Vendredi'],
    description: '1 séance le Mardi + 1 séance le Jeudi + 1 séance le Vendredi'
  }
};

const WEEKS = getUpcomingWeeks(4);

export default function BookingForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // If present, we are in edit mode
  
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<GroupType>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});

  // Fetch existing bookings to disable taken slots
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'bookings'), async (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExistingBookings(bookings);
      
      // If edit mode, fetch the specific booking to pre-fill (only once)
      if (id && !selectedWeek) {
        try {
          const docRef = doc(db, 'bookings', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedWeek(data.week);
            setSelectedGroup(data.group);
            setSelectedSlots(data.slots || {});
            setUserInfo(data.userInfo || { name: '', email: '', phone: '' });
            
            if (!WEEKS.find(w => w.id === data.week)) {
               WEEKS.unshift({ id: data.week, label: `Semaine du ${data.week}` });
            }
          } else {
            navigate('/');
          }
        } catch (err) {
          console.error(err);
        }
      }
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  useEffect(() => {
    if (!selectedWeek) return;
    
    const docRef = doc(db, 'weekConfigs', selectedWeek);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().days) {
        setAvailableSlots(docSnap.data().days);
      } else {
        const defaults: Record<string, string[]> = {};
        ALL_DAYS.forEach(d => defaults[d] = [...DEFAULT_TIMESLOTS]);
        setAvailableSlots(defaults);
      }
    });

    return () => unsubscribe();
  }, [selectedWeek]);

  const handleSlotSelect = (day: string, time: string) => {
    setSelectedSlots(prev => ({ ...prev, [day]: time }));
  };

  const isSlotTaken = (day: string, time: string) => {
    if (!selectedWeek) return false;
    return existingBookings.some(b => 
      b.id !== id && // Ignore current booking if in edit mode
      b.week === selectedWeek && 
      b.slots && b.slots[day] === time
    );
  };

  const isFormValid = () => {
    if (!selectedWeek || !selectedGroup || !userInfo.name || !userInfo.email || !userInfo.phone) return false;
    const requiredDays = GROUPS[selectedGroup].days;
    return requiredDays.every(day => selectedSlots[day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setIsLoading(true);
    try {
      const bookingData = {
        week: selectedWeek,
        group: selectedGroup,
        slots: selectedSlots,
        userInfo,
        updatedAt: Date.now(),
      };

      if (id) {
        // Update existing
        await updateDoc(doc(db, 'bookings', id), bookingData);
        navigate(`/success/${id}`);
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'bookings'), {
          ...bookingData,
          createdAt: Date.now(),
        });
        navigate(`/success/${docRef.id}`);
      }
    } catch (error) {
      console.error("Error saving booking:", error);
      alert("Une erreur est survenue lors de la réservation. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0071e3] selection:text-white pb-32">
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 md:h-8 object-contain" />
          <div className="text-xs md:text-sm font-medium text-[#86868b] bg-[#f5f5f7] px-4 py-1.5 rounded-full">
            Étude Clinique
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        {!id && (
          <div className="mb-12 md:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <img 
              src="/images/Gemini_Generated_Image_q6th58q6th58q6th.png" 
              alt="Présentation de l'étude" 
              className="w-full h-auto rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.08)] object-cover"
            />
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            {id ? "Modifier vos séances." : "Réservez vos séances."}
          </h1>
          <p className="text-xl text-[#86868b]">Programmez vos 3 sessions obligatoires en quelques étapes.</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 md:p-10 mb-16 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#d2d2d7]/30">
          <div className="flex items-start gap-4 mb-8">
            <div className="p-3 bg-[#f5f5f7] rounded-2xl text-[#1d1d1f]">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2 tracking-tight">Instructions de réservation</h2>
              <p className="text-[#86868b] text-lg leading-relaxed">
                Pour le bon déroulement de l'étude, votre participation nécessite <strong className="text-[#1d1d1f] font-semibold">3 sessions obligatoires</strong> au laboratoire réparties sur une même semaine, avec un espacement physiologique très strict.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[#f5f5f7] p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4 text-[#1d1d1f] font-semibold text-lg">
                <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                RÈGLE N°1 : Les Jours
              </div>
              <p className="text-[#86868b] mb-4">Choisissez un groupe et respectez la formule :</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#0071e3] font-bold mt-0.5">•</span>
                  <span><strong className="text-[#1d1d1f] font-semibold">GROUPE LUNDI :</strong><br/>Lundi + Mercredi + Jeudi</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#0071e3] font-bold mt-0.5">•</span>
                  <span><strong className="text-[#1d1d1f] font-semibold">GROUPE MARDI :</strong><br/>Mardi + Jeudi + Vendredi</span>
                </li>
              </ul>
            </div>

            <div className="bg-[#f5f5f7] p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-4 text-[#1d1d1f] font-semibold text-lg">
                <Clock className="w-5 h-5 text-[#0071e3]" />
                RÈGLE N°2 : Les Horaires
              </div>
              <p className="text-[#86868b] mb-4">Choisissez librement parmi les horaires disponibles chaque jour.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-16">
          <section>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight">1. Choisissez votre semaine</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {WEEKS.map(week => {
                const isSelected = selectedWeek === week.id;
                return (
                  <button
                    key={week.id}
                    type="button"
                    onClick={() => setSelectedWeek(week.id)}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-left transition-all duration-200",
                      isSelected 
                        ? "border-[#0071e3] bg-[#f5f9ff] ring-1 ring-[#0071e3]" 
                        : "border-[#d2d2d7] bg-white hover:border-[#86868b]"
                    )}
                  >
                    <div className={cn("font-medium text-lg", isSelected ? "text-[#0071e3]" : "text-[#1d1d1f]")}>
                      {week.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={cn("transition-opacity duration-500", !selectedWeek && "opacity-40 pointer-events-none")}>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight">2. Choisissez votre groupe de jours</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {(Object.keys(GROUPS) as GroupType[]).map((group) => {
                if (!group) return null;
                const isSelected = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      setSelectedGroup(group);
                      setSelectedSlots({});
                    }}
                    className={cn(
                      "p-6 rounded-2xl border-2 text-left transition-all duration-200",
                      isSelected 
                        ? "border-[#0071e3] bg-[#f5f9ff] ring-1 ring-[#0071e3]" 
                        : "border-[#d2d2d7] bg-white hover:border-[#86868b]"
                    )}
                  >
                    <div className={cn("font-semibold text-xl mb-2", isSelected ? "text-[#0071e3]" : "text-[#1d1d1f]")}>
                      {GROUPS[group].name}
                    </div>
                    <div className={cn("text-sm", isSelected ? "text-[#0071e3]/80" : "text-[#86868b]")}>
                      {GROUPS[group].description}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedGroup && (
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold tracking-tight">3. Choisissez vos horaires</h3>
                <p className="text-[#86868b] mt-2">Sélectionnez une heure pour chaque jour de votre groupe. Les créneaux grisés sont déjà réservés.</p>
              </div>
              <div className="bg-white border border-[#d2d2d7] rounded-[2rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                {GROUPS[selectedGroup].days.map((day, index) => (
                  <div key={day} className={cn(
                    "p-6 md:p-8",
                    index !== GROUPS[selectedGroup].days.length - 1 && "border-b border-[#d2d2d7]"
                  )}>
                    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12">
                      <div className="w-32 shrink-0">
                        <div className="text-[#1d1d1f] font-semibold text-xl">{day}</div>
                        <div className="text-sm text-[#86868b] mt-1">Séance {index + 1}</div>
                      </div>
                      <div className="flex flex-wrap gap-3 flex-1">
                        {(availableSlots[day] || DEFAULT_TIMESLOTS).map(time => {
                          const isSelected = selectedSlots[day] === time;
                          const taken = isSlotTaken(day, time);
                          
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={taken && !isSelected}
                              onClick={() => handleSlotSelect(day, time)}
                              className={cn(
                                "px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 border",
                                isSelected
                                  ? "bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-md transform scale-105"
                                  : taken 
                                    ? "bg-[#f5f5f7] text-[#d2d2d7] border-transparent cursor-not-allowed line-through"
                                    : "bg-white text-[#1d1d1f] border-[#d2d2d7] hover:border-[#86868b]"
                              )}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className={cn("transition-opacity duration-500", (!selectedGroup || Object.keys(selectedSlots).length < 3) && "opacity-40 pointer-events-none")}>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight">4. Vos coordonnées</h3>
            </div>
            <div className="bg-white border border-[#d2d2d7] rounded-[2rem] p-8 grid md:grid-cols-3 gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Nom complet</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                  <input 
                    type="text" 
                    required
                    value={userInfo.name}
                    onChange={e => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] focus:bg-white transition-all"
                    placeholder="Jean Dupont"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                  <input 
                    type="email" 
                    required
                    value={userInfo.email}
                    onChange={e => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] focus:bg-white transition-all"
                    placeholder="jean@exemple.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                  <input 
                    type="tel" 
                    required
                    value={userInfo.phone}
                    onChange={e => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] focus:bg-white transition-all"
                    placeholder="06 12 34 56 78"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="pt-8 flex justify-center md:justify-end">
            <button
              type="submit"
              disabled={!isFormValid() || isLoading}
              className={cn(
                "flex items-center justify-center gap-2 px-10 py-4 rounded-full font-medium text-lg transition-all duration-300 w-full md:w-auto",
                isFormValid() && !isLoading
                  ? "bg-[#0071e3] text-white shadow-[0_4px_14px_rgba(0,113,227,0.3)] hover:bg-[#0077ED] hover:shadow-[0_6px_20px_rgba(0,113,227,0.4)] transform hover:-translate-y-0.5"
                  : "bg-[#e8e8ed] text-[#86868b] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {id ? "Enregistrer les modifications" : "Confirmer mes 3 séances"}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
