import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Success() {
  const { id } = useParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const managementLink = `${window.location.origin}/manage/${id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(managementLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <h2 className="text-2xl font-semibold mb-4">Réservation introuvable</h2>
          <Link to="/" className="text-[#0071e3] hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center p-4 font-sans">
      <div className="max-w-xl w-full bg-white rounded-[2rem] p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <CheckCircle2 className="w-20 h-20 text-[#34c759] mx-auto mb-6" />
        <h2 className="text-3xl font-semibold mb-4 tracking-tight">Réservation confirmée</h2>
        <p className="text-[#86868b] mb-8 text-lg leading-relaxed">
          Merci {booking.userInfo.name}. Vos 3 séances pour l'étude clinique ont bien été enregistrées.
        </p>

        <div className="bg-[#f5f5f7] rounded-2xl p-6 text-left mb-8">
          <h3 className="font-semibold text-[#1d1d1f] mb-2">Gérer votre réservation</h3>
          <p className="text-sm text-[#86868b] mb-4">
            Conservez ce lien unique. Il vous permet de modifier ou d'annuler vos créneaux à tout moment.
          </p>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              readOnly 
              value={managementLink}
              className="flex-1 bg-white border border-[#d2d2d7] rounded-lg px-3 py-2 text-sm text-[#1d1d1f] outline-none"
            />
            <button 
              onClick={copyLink}
              className="p-2 bg-white border border-[#d2d2d7] rounded-lg hover:bg-[#f5f5f7] transition-colors flex-shrink-0"
              title="Copier le lien"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-[#34c759]" /> : <Copy className="w-5 h-5 text-[#1d1d1f]" />}
            </button>
            <Link 
              to={`/manage/${id}`}
              className="p-2 bg-[#0071e3] text-white rounded-lg hover:bg-[#0077ED] transition-colors flex-shrink-0"
              title="Ouvrir le lien"
            >
              <ExternalLink className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <Link 
          to="/"
          className="inline-block w-full py-4 bg-[#f5f5f7] text-[#1d1d1f] rounded-full font-medium text-lg hover:bg-[#e8e8ed] transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
