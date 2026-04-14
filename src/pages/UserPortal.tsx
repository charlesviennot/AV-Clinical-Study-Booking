import React, { useState, useEffect } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { CalendarDays, Clock, ChevronRight, User, Mail, Phone, Info, Loader2, LogOut, Edit, Trash2, CheckCircle2, MapPin, AlertTriangle, ChevronDown, Sparkles, X, ExternalLink } from 'lucide-react';
import { cn, DEFAULT_TIMESLOTS } from '../lib/utils';
import { Link } from 'react-router-dom';

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

export default function UserPortal() {
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [userBooking, setUserBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<GroupType>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [userInfo, setUserInfo] = useState({ name: '', email: '', phonePrefix: '+41', phone: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [studyWeeks, setStudyWeeks] = useState<any[]>([]);
  const [showStudyInfo, setShowStudyInfo] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  // Check for in-app browser on mount
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    const inAppBrowserRegex = /Instagram|Snapchat|FBAN|FBAV|TikTok|BytedanceWebview|LinkedInApp|Twitter/i;
    if (inAppBrowserRegex.test(ua)) {
      setIsInAppBrowser(true);
    }
  }, []);

  const StudyInfoModal = () => {
    if (!showStudyInfo) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] max-w-2xl w-full p-8 md:p-10 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setShowStudyInfo(false)}
            className="absolute top-6 right-6 p-2 text-[#86868b] hover:text-[#1d1d1f] bg-[#f5f5f7] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-6 pr-10">
            <div className="p-3 bg-[#f5f9ff] text-[#0071e3] rounded-2xl shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">À propos de l'étude</h2>
          </div>
          <div className="space-y-8 text-[#1d1d1f] leading-relaxed text-lg">
            
            <div>
              <h3 className="text-xl font-semibold mb-3 text-[#0071e3] flex items-center gap-2">
                <span>🔬</span> Participez à notre étude : Accélérer la récupération musculaire par les ondes sonores
              </h3>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><span>🎯</span> Quel est le but de l'étude ?</h4>
              <p className="text-[#86868b]">
                Nous cherchons à mesurer si l'application d'une thérapie par sons à basses fréquences permet de réduire plus rapidement l'inflammation (œdème) et les douleurs musculaires (courbatures) par rapport à un repos classique.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4 flex items-center gap-2"><span>⏳</span> Votre engagement : 3h30 au total réparties sur une semaine</h4>
              <p className="mb-4 text-[#86868b]">L'étude est rapide et nécessite seulement 3 courtes visites dans nos locaux. Voici le déroulement exact :</p>
              <ul className="space-y-3">
                <li className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/30">
                  <strong className="font-semibold text-[#1d1d1f]">Visite 1 (Jour 0) - Le défi physique :</strong> Après un bilan de base, vous effectuerez 100 sauts (Drop Jumps) depuis une boîte de 60 cm. L'objectif est de générer des courbatures standardisées pour que nous puissions évaluer la qualité de votre récupération.
                </li>
                <li className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/30">
                  <strong className="font-semibold text-[#1d1d1f]">Jour 1 (À distance) - Suivi express :</strong> Pas besoin de vous déplacer. Vous répondrez simplement à une question rapide (1 minute) sur votre smartphone pour évaluer votre niveau de douleur.
                </li>
                <li className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/30">
                  <strong className="font-semibold text-[#1d1d1f]">Visite 2 (Jour 2 - 48h après les sauts) - Le Soin :</strong> Vous serez installé en position allongée pendant 40 minutes. Un tirage au sort déterminera si vous recevez la thérapie sonore innovante (AudioVitality) ou une période de repos classique.
                </li>
                <li className="bg-[#f5f5f7] p-4 rounded-xl border border-[#d2d2d7]/30">
                  <strong className="font-semibold text-[#1d1d1f]">Visite 3 (Jour 3 - 72h après les sauts) - Bilan final :</strong> Une dernière visite pour mesurer votre récupération globale.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><span>⚙️</span> Comment évaluons-nous votre récupération ?</h4>
              <p className="text-[#86868b]">
                Lors de vos visites au laboratoire, nous mesurerons votre force de saut, votre souplesse, ainsi que l'hydratation et l'oxygénation de vos muscles grâce à des capteurs posés sur la peau (Bio-impédance et NIRS). Rassurez-vous : toutes ces mesures sont 100 % indolores et non-invasives.
              </p>
            </div>

            <div className="bg-[#f5f9ff] p-6 md:p-8 rounded-3xl border border-[#0071e3]/20">
              <h4 className="font-semibold text-xl mb-6 text-[#0071e3] flex items-center gap-2"><span>⚖️</span> Risques et Bénéfices</h4>
              <div className="space-y-6">
                <div>
                  <p className="font-semibold text-[#1d1d1f] mb-1">L'effort demandé :</p>
                  <p className="text-[#86868b]">Le protocole de sauts provoquera des courbatures musculaires d'intensité modérée à forte pendant 48h à 72h. C'est exactement ce que nous recherchons, c'est une réaction physiologique normale et totalement sans danger !</p>
                </div>
                <div className="h-px w-full bg-[#0071e3]/10"></div>
                <div>
                  <p className="font-semibold text-[#1d1d1f] mb-1 flex items-center gap-2">Votre récompense exceptionnelle <span>🎁</span> :</p>
                  <p className="text-[#86868b]">En plus de contribuer à l'avancement de la science du sport, chaque participant se verra offrir une véritable séance complète de récupération AudioVitality. Pour information, une seule séance de cette technologie de pointe coûte de base 250 € ! Si le tirage au sort vous place dans le groupe "repos classique" lors de la Visite 2, cette séance premium vous sera tout de même offerte ultérieurement en guise de grand remerciement pour votre implication.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <a 
                href="https://www.audiovitality.com/ch-fr/sport/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1d1d1f] text-white rounded-full font-medium hover:bg-black transition-colors"
              >
                Découvrir la technologie AudioVitality
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

          </div>
        </div>
      </div>
    );
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        setUserInfo(prev => ({
          ...prev,
          name: currentUser.displayName || '',
          email: currentUser.email || ''
        }));
        fetchUserBooking(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch all bookings to disable taken slots
  useEffect(() => {
    const fetchAllBookings = async () => {
      if (!user) return;
      try {
        const querySnapshot = await getDocs(collection(db, 'bookings'));
        const bookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setExistingBookings(bookings);
      } catch (error) {
        console.error("Error fetching all bookings:", error);
      }
    };
    fetchAllBookings();
  }, [user, isSubmitting]);

  // Fetch weeks
  useEffect(() => {
    const fetchWeeks = async () => {
      if (!user) return;
      try {
        const snapshot = await getDocs(collection(db, 'studyWeeks'));
        const weeks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        weeks.sort((a: any, b: any) => a.startDate - b.startDate);
        setStudyWeeks(weeks);
      } catch (error) {
        console.error("Error fetching weeks:", error);
      }
    };
    fetchWeeks();
  }, [user]);

  const fetchUserBooking = async (uid: string) => {
    setLoadingBooking(true);
    try {
      const q = query(collection(db, 'bookings'), where("userId", "==", uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const bookingDoc = querySnapshot.docs[0];
        const data = bookingDoc.data();
        setUserBooking({ id: bookingDoc.id, ...data });
        
        // Pre-fill form in case they want to edit
        setSelectedWeek(data.week);
        setSelectedGroup(data.group as GroupType);
        setSelectedSlots(data.slots || {});
        if (data.userInfo) {
          let prefix = '+41';
          let phoneStr = data.userInfo.phone || '';
          if (phoneStr.startsWith('+33')) {
            prefix = '+33';
            phoneStr = phoneStr.substring(3).trim();
          } else if (phoneStr.startsWith('+41')) {
            prefix = '+41';
            phoneStr = phoneStr.substring(3).trim();
          }
          setUserInfo({
            name: data.userInfo.name || '',
            email: data.userInfo.email || '',
            phonePrefix: prefix,
            phone: phoneStr
          });
        }
      } else {
        setUserBooking(null);
      }
    } catch (error) {
      console.error("Error fetching user booking:", error);
    } finally {
      setLoadingBooking(false);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert("Erreur lors de la connexion avec Google.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
    setUserBooking(null);
    setIsEditing(false);
  };

  const handleSlotSelect = (day: string, time: string) => {
    setSelectedSlots(prev => ({ ...prev, [day]: time }));
  };

  const isSlotTaken = (day: string, time: string) => {
    return existingBookings.some(b => 
      b.week === selectedWeek && 
      b.slots && b.slots[day] === time &&
      b.userId !== user?.uid // Don't count their own existing booking
    );
  };

  const isFormValid = () => {
    if (!selectedWeek || !selectedGroup || !userInfo.name || !userInfo.email || !userInfo.phone) return false;
    const requiredDays = GROUPS[selectedGroup].days;
    return requiredDays.every(day => selectedSlots[day]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid() || !user) return;
    
    setIsSubmitting(true);
    try {
      const finalPhone = `${userInfo.phonePrefix} ${userInfo.phone}`;
      const bookingData = {
        userId: user.uid,
        week: selectedWeek,
        group: selectedGroup,
        slots: selectedSlots,
        userInfo: {
          name: userInfo.name,
          email: userInfo.email,
          phone: finalPhone
        },
        updatedAt: Date.now(),
      };

      if (userBooking && isEditing) {
        await updateDoc(doc(db, 'bookings', userBooking.id), bookingData);
        alert("Réservation mise à jour avec succès !");
      } else {
        await addDoc(collection(db, 'bookings'), {
          ...bookingData,
          createdAt: Date.now(),
        });
        alert("Réservation confirmée avec succès !");
      }
      
      await fetchUserBooking(user.uid);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving booking:", error);
      alert("Une erreur est survenue lors de la réservation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userBooking) return;
    if (!window.confirm("Êtes-vous sûr de vouloir annuler définitivement vos 3 séances ?")) return;
    
    try {
      await deleteDoc(doc(db, 'bookings', userBooking.id));
      setUserBooking(null);
      setSelectedWeek('');
      setSelectedGroup(null);
      setSelectedSlots({});
      alert("Votre réservation a été annulée.");
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Une erreur est survenue.");
    }
  };

  if (loadingAuth || loadingBooking) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 font-sans">
        <StudyInfoModal />
        <div className="max-w-md w-full bg-white rounded-[2rem] p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <a href="https://www.audiovitality.com/ch-fr/sport/" target="_blank" rel="noopener noreferrer" className="block mb-8 hover:opacity-80 transition-opacity">
            <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-8 mx-auto" />
          </a>
          <h1 className="text-3xl font-semibold tracking-tight mb-4">
            Étude Clinique
          </h1>
          <p className="text-[#86868b] mb-6 text-lg leading-relaxed">
            Connectez-vous avec votre compte Google pour réserver ou gérer vos séances.
          </p>
          <button onClick={() => setShowStudyInfo(true)} className="mb-8 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f5f9ff] text-[#0071e3] rounded-full font-medium hover:bg-[#e8f2ff] transition-colors border border-[#0071e3]/20 shadow-sm w-full">
            <Sparkles className="w-5 h-5" />
            Découvrir les détails de l'étude
          </button>
          
          {isInAppBrowser ? (
            <div className="mb-4 p-4 bg-[#fff0f0] border border-[#ff3b30]/20 rounded-2xl text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-[#ff3b30] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#ff3b30] mb-1">Navigateur non supporté</h3>
                  <p className="text-sm text-[#1d1d1f]">
                    La connexion Google est bloquée dans cette application (Snapchat, Instagram, etc.). 
                    <br/><br/>
                    Veuillez cliquer sur les <strong>3 petits points</strong> en haut à droite et choisir <strong>"Ouvrir dans le navigateur"</strong> (Safari ou Chrome) pour continuer.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-[#d2d2d7] text-[#1d1d1f] rounded-full font-medium text-lg hover:bg-[#f5f5f7] transition-colors shadow-sm"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuer avec Google
            </button>
          )}
        </div>
      </div>
    );
  }

  // USER DASHBOARD (Has Booking & Not Editing)
  if (userBooking && !isEditing) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans pb-32">
        <StudyInfoModal />
        <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="https://www.audiovitality.com/ch-fr/sport/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 md:h-8 object-contain" />
              </a>
              <div className="hidden sm:flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full">
                <span className="px-4 py-1.5 bg-white text-[#1d1d1f] rounded-full text-sm font-medium shadow-sm">Mon Espace</span>
                <Link to="/admin" className="px-4 py-1.5 text-[#86868b] hover:text-[#1d1d1f] rounded-full text-sm font-medium transition-colors">Administration</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] px-4 py-1.5 rounded-full">
                <User className="w-4 h-4 text-[#0071e3]" />
                {user.displayName}
              </div>
              <button onClick={handleLogout} className="text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-2">
                <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-10 md:py-16">
          <div className="text-center mb-10">
            <CheckCircle2 className="w-16 h-16 text-[#34c759] mx-auto mb-4" />
            <h1 className="text-3xl font-semibold tracking-tight mb-2">
              Réservation confirmée
            </h1>
            <p className="text-[#86868b] mb-6">Vos séances pour l'étude clinique sont programmées.</p>
            <button onClick={() => setShowStudyInfo(true)} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f5f9ff] text-[#0071e3] rounded-full font-medium hover:bg-[#e8f2ff] transition-colors border border-[#0071e3]/20 shadow-sm">
              <Sparkles className="w-5 h-5" />
              Rappels sur l'étude
            </button>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#d2d2d7]/30 mb-8">
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#f5f5f7]">
              <div className="w-12 h-12 bg-[#f5f9ff] rounded-full flex items-center justify-center text-[#0071e3]">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{userBooking.userInfo.name}</h2>
                <p className="text-[#86868b] text-sm">{userBooking.userInfo.email} • {userBooking.userInfo.phone}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#86868b] uppercase tracking-wider mb-4">Détails des créneaux</h3>
              <div className="bg-[#f5f5f7] rounded-2xl p-6">
                <div className="flex items-center gap-2 text-[#1d1d1f] font-medium mb-4">
                  <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                  {studyWeeks.find(w => w.id === userBooking.week)?.label || `Semaine du ${userBooking.week}`} - Groupe {userBooking.group}
                </div>
                
                <div className="space-y-3">
                  {Object.entries(userBooking.slots || {}).map(([day, time]) => (
                    <div key={day} className="flex items-center justify-between bg-white p-3 rounded-xl border border-[#d2d2d7]/50">
                      <span className="font-medium">{day}</span>
                      <span className="flex items-center gap-2 text-[#86868b]">
                        <Clock className="w-4 h-4" />
                        {time as string}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#f5f9ff] text-[#0071e3] rounded-xl font-medium hover:bg-[#e8f2ff] transition-colors"
              >
                <Edit className="w-5 h-5" />
                Modifier les horaires
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#fff0f0] text-[#ff3b30] rounded-xl font-medium hover:bg-[#ffe5e5] transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Annuler la réservation
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // BOOKING FORM (New or Editing)
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0071e3] selection:text-white pb-32">
      <StudyInfoModal />
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="https://www.audiovitality.com/ch-fr/sport/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 md:h-8 object-contain" />
            </a>
            <div className="hidden sm:flex items-center gap-1 bg-[#f5f5f7] p-1 rounded-full">
              <span className="px-4 py-1.5 bg-white text-[#1d1d1f] rounded-full text-sm font-medium shadow-sm">Mon Espace</span>
              <Link to="/admin" className="px-4 py-1.5 text-[#86868b] hover:text-[#1d1d1f] rounded-full text-sm font-medium transition-colors">Administration</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] px-4 py-1.5 rounded-full">
              <User className="w-4 h-4 text-[#0071e3]" />
              {user.displayName}
            </div>
            <button onClick={handleLogout} className="text-sm font-medium text-[#86868b] hover:text-[#1d1d1f] flex items-center gap-2">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 md:py-16">
        {isEditing && (
          <button 
            onClick={() => setIsEditing(false)}
            className="mb-8 text-[#0071e3] font-medium hover:underline flex items-center gap-1"
          >
            ← Retour à mon tableau de bord
          </button>
        )}

        {!isEditing && (
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
            {isEditing ? "Modifiez vos séances." : "Réservez vos séances."}
          </h1>
          <p className="text-xl text-[#86868b] mb-6">Programmez vos 3 sessions obligatoires en quelques étapes.</p>
          <button onClick={() => setShowStudyInfo(true)} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#f5f9ff] text-[#0071e3] rounded-full font-medium hover:bg-[#e8f2ff] transition-colors border border-[#0071e3]/20 shadow-sm">
            <Sparkles className="w-5 h-5" />
            Découvrir les détails de l'étude
          </button>
        </div>

        <div className="bg-white rounded-[2rem] p-8 md:p-10 mb-16 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#d2d2d7]/30">
          <div className="flex flex-col gap-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#f5f9ff] text-[#0071e3] rounded-2xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1">ADRESSE RDV</h2>
                <p className="text-[#1d1d1f] font-medium text-lg">Rue de Genève 7, 1003 Lausanne</p>
              </div>
            </div>

            <div className="h-px w-full bg-[#f5f5f7]"></div>

            <div>
              <h3 className="text-2xl font-semibold mb-6 tracking-tight">Bonjour et merci de votre participation à notre étude clinique sur la récupération sportive !</h3>
              
              <div className="space-y-6 text-[#1d1d1f] leading-relaxed text-lg">
                <p>
                  <strong className="font-semibold text-[#0071e3]">Le Protocole :</strong> Nous évaluons l'impact de la stimulation vibro-acoustique basse fréquence (LFVSS) sur la récupération musculaire (DOMS).
                </p>

                <div className="bg-[#f5f5f7] p-6 md:p-8 rounded-3xl">
                  <p className="font-semibold mb-4 text-xl">Votre engagement (CALENDRIER STRICT) :</p>
                  <p className="mb-6 text-[#86868b]">L'étude nécessite votre présence pour 3 sessions à des intervalles physiologiques stricts (J0, J+2 et J+3). Le déroulement de votre semaine dépendra de votre jour de départ :</p>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-sm">
                      <span className="text-[#0071e3] text-xl mt-0.5">👉</span>
                      <span>Si vous choisissez le <strong className="font-semibold">LUNDI (J0)</strong> : Vos deux sessions de suivi auront obligatoirement lieu le <strong className="font-semibold">MERCREDI</strong> et le <strong className="font-semibold">JEUDI</strong>.</span>
                    </li>
                    <li className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-[#d2d2d7]/50 shadow-sm">
                      <span className="text-[#0071e3] text-xl mt-0.5">👉</span>
                      <span>Si vous choisissez le <strong className="font-semibold">MARDI (J0)</strong> : Vos deux sessions de suivi auront obligatoirement lieu le <strong className="font-semibold">JEUDI</strong> et le <strong className="font-semibold">VENDREDI</strong>.<br/><span className="text-sm text-[#86868b] mt-1 block">(Merci de vous assurer d'être disponible sur ces 3 jours avant de valider vos horaires).</span></span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#fff0f0] p-6 md:p-8 rounded-3xl border border-[#ff3b30]/20">
                  <p className="text-[#ff3b30] font-semibold mb-3 flex items-center gap-2 text-xl">
                    <AlertTriangle className="w-6 h-6" />
                    TENUE DE SPORT OBLIGATOIRE (3 SESSIONS)
                  </p>
                  <p className="text-[#1d1d1f]">
                    Le Jour 0 (J0), vous réaliserez un effort physique pour induire la fatigue musculaire. Les sessions suivantes (J+2 et J+3) seront dédiées à la récupération passive et aux mesures.
                    <br/><br/>
                    <strong className="font-semibold">Merci de venir en tenue de sport (baskets, short/legging, t-shirt) pour vos 3 sessions.</strong> Cela est indispensable pour l'effort du premier jour et facilitera grandement la pose des différents capteurs lors des jours suivants.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-16">
          {/* Step 1: Week */}
          <section>
            <div className="mb-6">
              <h3 className="text-2xl font-semibold tracking-tight">1. Choisissez votre semaine</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {studyWeeks.length === 0 ? (
                <div className="col-span-2 bg-[#fff0f0] border border-[#ff3b30]/20 p-6 rounded-2xl flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-[#ff3b30] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[#1d1d1f] font-semibold text-lg mb-1">Aucune semaine disponible</h4>
                    <p className="text-[#86868b]">
                      Les semaines de réservation n'ont pas encore été configurées. 
                      Si vous êtes l'administrateur, veuillez vous rendre dans l'onglet <Link to="/admin" className="text-[#0071e3] hover:underline">Administration</Link> pour générer les créneaux.
                    </p>
                  </div>
                </div>
              ) : (
                studyWeeks.map(week => {
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
                })
              )}
            </div>
          </section>

          {/* Step 2: Group */}
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

          {/* Step 3: Timeslots */}
          {selectedGroup && (
            <section className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="mb-6">
                <h3 className="text-2xl font-semibold tracking-tight">3. Choisissez vos horaires</h3>
                <p className="text-[#86868b] mt-2">Sélectionnez une heure pour chaque jour de votre groupe.</p>
              </div>
              <div className="bg-white border border-[#d2d2d7] rounded-[2rem] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                {GROUPS[selectedGroup].days.map((day, index) => {
                  const currentWeekData = studyWeeks.find(w => w.id === selectedWeek);
                  const availableSlotsForDay = currentWeekData?.slotsByDay?.[day] || [];

                  return (
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
                          {availableSlotsForDay.length === 0 ? (
                            <div className="text-[#86868b] text-sm italic">Aucun créneau disponible ce jour.</div>
                          ) : (
                            availableSlotsForDay.map((time: string) => {
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
                                        : "bg-[#f5f5f7] text-[#1d1d1f] border-transparent hover:bg-[#e8e8ed]"
                                  )}
                                >
                                  {time}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 4: User Info */}
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
                <div className="flex gap-2">
                  <div className="relative w-1/3">
                    <select
                      value={userInfo.phonePrefix}
                      onChange={e => setUserInfo(prev => ({ ...prev, phonePrefix: e.target.value }))}
                      className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3.5 pl-4 pr-8 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] appearance-none"
                    >
                      <option value="+41">🇨🇭 +41</option>
                      <option value="+33">🇫🇷 +33</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] pointer-events-none" />
                  </div>
                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868b]" />
                    <input 
                      type="tel" 
                      required
                      value={userInfo.phone}
                      onChange={e => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-[#f5f5f7] border border-transparent rounded-xl py-3.5 pl-12 pr-4 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] focus:bg-white transition-all"
                      placeholder={userInfo.phonePrefix === '+41' ? "79 123 45 67" : "6 12 34 56 78"}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="pt-8 flex justify-center md:justify-end">
            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className={cn(
                "flex items-center justify-center gap-2 px-10 py-4 rounded-full font-medium text-lg transition-all duration-300 w-full md:w-auto",
                isFormValid() && !isSubmitting
                  ? "bg-[#0071e3] text-white shadow-[0_4px_14px_rgba(0,113,227,0.3)] hover:bg-[#0077ED] hover:shadow-[0_6px_20px_rgba(0,113,227,0.4)] transform hover:-translate-y-0.5"
                  : "bg-[#e8e8ed] text-[#86868b] cursor-not-allowed"
              )}
            >
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  {isEditing ? "Mettre à jour mes séances" : "Confirmer mes 3 séances"}
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
