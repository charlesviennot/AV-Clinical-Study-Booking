import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, User, Trash2, Edit, AlertTriangle, Loader2 } from 'lucide-react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function ManageBooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'bookings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBooking(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching booking:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler définitivement vos 3 séances ?")) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'bookings', id!));
      alert("Votre réservation a été annulée.");
      navigate('/');
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Une erreur est survenue.");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Réservation introuvable ou déjà annulée</h2>
          <Link to="/" className="text-[#0071e3] hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans pb-32">
      <header className="bg-white/70 backdrop-blur-md sticky top-0 z-50 border-b border-[#d2d2d7]/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/images/AVI_Logo_Black.png" alt="AudioVitality" className="h-6 md:h-8 object-contain" />
          <div className="text-xs md:text-sm font-medium text-[#86868b] bg-[#f5f5f7] px-4 py-1.5 rounded-full">
            Gestion de réservation
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight mb-2">Vos séances</h1>
          <p className="text-[#86868b]">Gérez vos créneaux pour l'étude clinique.</p>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#d2d2d7]/30 mb-8">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#f5f5f7]">
            <div className="w-12 h-12 bg-[#f5f9ff] rounded-full flex items-center justify-center text-[#0071e3]">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{booking.userInfo.name}</h2>
              <p className="text-[#86868b] text-sm">{booking.userInfo.email} • {booking.userInfo.phone}</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#86868b] uppercase tracking-wider mb-4">Détails des créneaux</h3>
            <div className="bg-[#f5f5f7] rounded-2xl p-6">
              <div className="flex items-center gap-2 text-[#1d1d1f] font-medium mb-4">
                <CalendarDays className="w-5 h-5 text-[#0071e3]" />
                Semaine du {booking.week} - Groupe {booking.group}
              </div>
              
              <div className="space-y-3">
                {Object.entries(booking.slots).map(([day, time]) => (
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
            <Link 
              to={`/edit/${id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#f5f9ff] text-[#0071e3] rounded-xl font-medium hover:bg-[#e8f2ff] transition-colors"
            >
              <Edit className="w-5 h-5" />
              Modifier les horaires
            </Link>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#fff0f0] text-[#ff3b30] rounded-xl font-medium hover:bg-[#ffe5e5] transition-colors disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              Annuler la réservation
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <Link to="/" className="text-[#86868b] hover:text-[#1d1d1f] transition-colors text-sm">
            Retour à l'accueil
          </Link>
        </div>
      </main>
    </div>
  );
}
