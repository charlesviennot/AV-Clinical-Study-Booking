import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, ChevronRight, ChevronLeft, User, Mail, Phone, Info, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, updateDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, getUpcomingWeeks, DEFAULT_TIMESLOTS, ALL_DAYS } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type GroupType = 'LUNDI' | 'MARDI' | null;

const GROUPS = {
  LUNDI: {
    name: 'Groupe Lundi',
    days: ['Lundi', 'Mercredi', 'Jeudi'],
    description: '1 séance Lundi + 1 séance Mercredi + 1 séance Jeudi'
  },
  MARDI: {
    name: 'Groupe Mardi',
    days: ['Mardi', 'Jeudi', 'Vendredi'],
    description: '1 séance Mardi + 1 séance Jeudi + 1 séance Vendredi'
  }
};

const WEEKS = getUpcomingWeeks(4);

export default function BookingForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [step, setStep] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<GroupType>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [userInfo, setUserInfo] = useState({ name: '', email: '', phone: '' });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);
  
  // Data for the current selected week
  const [weekBookings, setWeekBookings] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Record<string, string[]>>({});

  // Initial fetch for edit mode
  useEffect(() => {
    const fetchInitialData = async () => {
      if (id) {
        try {
          const docRef = doc(db, 'bookings', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSelectedGroup(data.group);
            setSelectedWeek(data.week);
            setSelectedSlots(data.slots || {});
            setUserInfo(data.userInfo || { name: '', email: '', phone: '' });
            
            if (!WEEKS.find(w => w.id === data.week)) {
               WEEKS.unshift({ id: data.week, label: `Semaine du ${data.week}` });
            }
            setStep(4); // Jump to last step if editing
          } else {
            navigate('/');
          }
        } catch (err) {
          console.error(err);
        }
      }
      setIsFetchingInitial(false);
    };
    fetchInitialData();
  }, [id, navigate]);

  // Listen to bookings ONLY for the selected week
  useEffect(() => {
    if (!selectedWeek) return;
    
    const q = query(collection(db, 'bookings'), where('week', '==', selectedWeek));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWeekBookings(bookings);
    });

    return () => unsubscribe();
  }, [selectedWeek]);

  // Listen to week configs
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
    return weekBookings.some(b => 
      b.id !== id && // Ignore current booking if in edit mode
      b.slots && b.slots[day] === time
    );
  };

  const isStepValid = () => {
    if (step === 1) return !!selectedGroup;
    if (step === 2) return !!selectedWeek;
    if (step === 3) {
      if (!selectedGroup) return false;
      const requiredDays = GROUPS[selectedGroup].days;
      return requiredDays.every(day => selectedSlots[day]);
    }
    if (step === 4) return !!(userInfo.name && userInfo.email && userInfo.phone);
    return false;
  };

  const nextStep = () => {
    if (isStepValid() && step < 4) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStepValid()) return;
    
    setIsLoading(true);
    try {
      const bookingData = {
        week: selectedWeek,
        group: selectedGroup,
        slots: selectedSlots,
        userInfo,
        updatedAt: Date.now(),
      };

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), 15000)
      );

      if (id) {
        await Promise.race([
          updateDoc(doc(db, 'bookings', id), bookingData),
          timeoutPromise
        ]);
        navigate(`/success/${id}`);
      } else {
        const docRef = await Promise.race([
          addDoc(collection(db, 'bookings'), {
            ...bookingData,
            createdAt: Date.now(),
          }),
          timeoutPromise
        ]) as any;
        navigate(`/success/${docRef.id}`);
      }
    } catch (error: any) {
      console.error("Error saving booking:", error);
      if (error.message === "TIMEOUT") {
        alert("La connexion au serveur prend trop de temps. Veuillez vérifier votre connexion internet ou désactiver votre bloqueur de publicités, puis réessayez.");
      } else {
        alert("Une erreur est survenue lors de la réservation. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingInitial) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    );
  }

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 20 : -20,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 20 : -20,
      opacity: 0
    })
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0071e3] selection:text-white pb-32">
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 md:h-8 object-contain" />
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  step === i ? "bg-[#0071e3] w-6" : step > i ? "bg-[#0071e3]/40" : "bg-[#d2d2d7]"
                )}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 md:py-16 overflow-hidden">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            {id ? "Modifier vos séances" : "Réservez vos séances"}
          </h1>
          <p className="text-xl text-[#86868b]">Étape {step} sur 4</p>
        </div>

        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={step}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#d2d2d7]/30"
          >
            {step === 1 && (
              <div className="space-y-8">
                <div className="flex items-start gap-4 bg-[#f5f9ff] p-6 rounded-2xl">
                  <Info className="w-6 h-6 text-[#0071e3] shrink-0" />
                  <div>
                    <h2 className="text-xl font-semibold mb-2 tracking-tight text-[#0071e3]">Règle de l'étude</h2>
                    <p className="text-[#1d1d1f] leading-relaxed">
                      Votre participation nécessite <strong className="font-semibold">3 sessions obligatoires</strong> au laboratoire réparties sur une même semaine, avec un espacement physiologique très strict.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold tracking-tight mb-6">Choisissez votre groupe</h3>
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
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold tracking-tight mb-2">Choisissez la semaine</h3>
                <p className="text-[#86868b] mb-6">Sélectionnez la semaine durant laquelle vous effectuerez vos 3 séances.</p>
                
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
                        <div className="flex items-center gap-3">
                          <CalendarDays className={cn("w-5 h-5", isSelected ? "text-[#0071e3]" : "text-[#86868b]")} />
                          <div className={cn("font-medium text-lg", isSelected ? "text-[#0071e3]" : "text-[#1d1d1f]")}>
                            {week.label}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && selectedGroup && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold tracking-tight mb-2">Choisissez vos horaires</h3>
                <p className="text-[#86868b] mb-6">Sélectionnez une heure pour chaque jour de votre groupe. Les créneaux grisés sont déjà réservés.</p>
                
                <div className="space-y-4">
                  {GROUPS[selectedGroup].days.map((day, index) => (
                    <div key={day} className="p-6 bg-[#f5f5f7] rounded-3xl">
                      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="w-32 shrink-0">
                          <div className="text-[#1d1d1f] font-semibold text-xl">{day}</div>
                          <div className="text-sm text-[#86868b] mt-1">Séance {index + 1}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 flex-1">
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
                                  "px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                                  isSelected
                                    ? "bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-md transform scale-105"
                                    : taken 
                                      ? "bg-white/50 text-[#d2d2d7] border-transparent cursor-not-allowed line-through"
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
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold tracking-tight mb-2">Vos coordonnées</h3>
                <p className="text-[#86868b] mb-6">Dernière étape pour confirmer vos séances.</p>
                
                <div className="space-y-4">
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
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200",
              step > 1 ? "text-[#1d1d1f] hover:bg-[#e8e8ed]" : "opacity-0 pointer-events-none"
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Retour
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid()}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all duration-300",
                isStepValid()
                  ? "bg-[#1d1d1f] text-white hover:bg-black transform hover:-translate-y-0.5"
                  : "bg-[#e8e8ed] text-[#86868b] cursor-not-allowed"
              )}
            >
              Continuer
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isStepValid() || isLoading}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-full font-medium transition-all duration-300",
                isStepValid() && !isLoading
                  ? "bg-[#0071e3] text-white shadow-[0_4px_14px_rgba(0,113,227,0.3)] hover:bg-[#0077ED] transform hover:-translate-y-0.5"
                  : "bg-[#e8e8ed] text-[#86868b] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  {id ? "Enregistrer" : "Confirmer"}
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
