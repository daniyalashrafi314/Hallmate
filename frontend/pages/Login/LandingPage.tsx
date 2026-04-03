import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Building, Bell, Phone, Mail, MapPin, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import hall1img from './1.jpg';
import hall2img from './2.jpg';
import hall3img from './3.jpg';
import hall4img from './4.jpg';
import hall5img from './5.jpg';
import hall6img from './6.jpg';
import hall7img from './7.jpg';

interface HallData {
  hall_id: number;
  name: string;
  total_rooms: number;
  total_residents: number;
  events: { name: string; date: string; description: string }[];
  notices: { title: string; date: string; description: string }[];
}

// HARDCODED IMAGES: Map hall_ids to your local jpeg files
const HALL_IMAGES: Record<number, string> = {
  1: hall1img,
  2: hall2img,
  3: hall3img,
  4: hall4img,
  5: hall5img,
  6: hall6img,
  7: hall7img
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=2000';

export default function LandingPage() {
  const navigate = useNavigate();
  const [halls, setHalls] = useState<HallData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    const fetchLandingData = async () => {
      try {
        const response = await fetch('http://localhost:5000/public/landing-data');
        if (response.ok) {
          const data = await response.json();
          setHalls(data);
        }
      } catch (error) {
        console.error('Failed to fetch landing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLandingData();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (halls.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === halls.length - 1 ? 0 : prev + 1));
    }, 6000); // Slide every 6 seconds
    return () => clearInterval(interval);
  }, [halls.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev === halls.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentIndex((prev) => (prev === 0 ? halls.length - 1 : prev - 1));

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-900 font-bold">Loading HALLMATE...</div>;
  if (halls.length === 0) return <div className="min-h-screen flex items-center justify-center">No Hall Data Available.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
      
      {/* Navbar */}
      <nav className="absolute top-0 w-full z-50 p-6 flex justify-between items-center">
        <h1 className="text-3xl font-black text-white drop-shadow-md tracking-wider">HALL<span className="text-blue-400">MATE</span></h1>
        <button 
          onClick={() => navigate('/login')}
          className="bg-white/10 backdrop-blur-md border border-white/30 text-white font-bold py-2 px-6 rounded-full hover:bg-white hover:text-blue-900 transition-all duration-300 shadow-lg"
        >
          Sign In
        </button>
      </nav>

      {/* Main Carousel Container */}
      <main className="flex-grow relative w-full h-[85vh] overflow-hidden bg-gray-900">
        
        <div 
          className="absolute top-0 left-0 w-full h-full flex transition-transform duration-1000 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {halls.map((hall) => (
            <div key={hall.hall_id} className="min-w-full h-full relative flex-shrink-0">
              
              {/* Hall Background Image */}
              <div className="absolute inset-0">
                <img 
                  src={HALL_IMAGES[hall.hall_id] || DEFAULT_IMAGE} 
                  alt={hall.name}
                  className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
              </div>

              {/* Content Overlay */}
              <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-end max-w-7xl mx-auto">
                <h2 className="text-5xl md:text-7xl font-black text-white mb-6 drop-shadow-lg">{hall.name}</h2>
                
                {/* At A Glance Stats */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 min-w-[200px]">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-300"><Users size={28} /></div>
                    <div>
                      <p className="text-gray-300 text-sm font-bold uppercase tracking-wider">Residents</p>
                      <p className="text-white text-3xl font-black">{hall.total_residents}</p>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 min-w-[200px]">
                    <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-300"><Building size={28} /></div>
                    <div>
                      <p className="text-gray-300 text-sm font-bold uppercase tracking-wider">Total Rooms</p>
                      <p className="text-white text-3xl font-black">{hall.total_rooms}</p>
                    </div>
                  </div>
                </div>

                {/* Events & Notices Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  
                  {/* Public Notices */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                      <Bell className="text-amber-400" /> Public Notices
                    </h3>
                    <div className="space-y-4">
                      {hall.notices.length > 0 ? hall.notices.map((notice, i) => (
                        <div key={i} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                          <p className="text-white font-semibold">{notice.title}</p>
                          <p className="text-sm text-gray-300 flex items-center gap-2 mt-1">
                            <Calendar size={12} /> {new Date(notice.date).toLocaleDateString()}
                          </p>
                        </div>
                      )) : <p className="text-gray-400 italic">No public notices.</p>}
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                      <Calendar className="text-purple-400" /> Upcoming Events
                    </h3>
                    <div className="space-y-4">
                      {hall.events.length > 0 ? hall.events.map((event, i) => (
                        <div key={i} className="border-b border-white/10 pb-3 last:border-0 last:pb-0">
                          <p className="text-white font-semibold">{event.name}</p>
                          <p className="text-sm text-gray-300 flex items-center gap-2 mt-1">
                            <Calendar size={12} /> {new Date(event.date).toLocaleDateString()}
                          </p>
                        </div>
                      )) : <p className="text-gray-400 italic">No upcoming events scheduled.</p>}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Controls */}
        {halls.length > 1 && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
            <button onClick={prevSlide} className="p-3 bg-black/30 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all border border-white/20">
              <ChevronLeft size={24} />
            </button>
            <button onClick={nextSlide} className="p-3 bg-black/30 hover:bg-black/60 text-white rounded-full backdrop-blur-sm transition-all border border-white/20">
              <ChevronRight size={24} />
            </button>
          </div>
        )}

      </main>

      {/* Footer / Contact Section */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h4 className="text-white font-bold text-xl mb-4">HALLMATE</h4>
            <p className="text-sm">Centralized University Hall Management System. Streamlining administration and enhancing student living experiences.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Phone size={18}/> Contact Offices</h4>
            <ul className="space-y-2 text-sm">
              <li>Contact Office: +880 1234 567890</li>
              <li>Hall Admin: +880 0987 654321</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 flex items-center gap-2"><MapPin size={18}/> Location</h4>
            <p className="text-sm">Main Campus Drive<br />University City, Dhaka 1200<br />Bangladesh</p>
          </div>
        </div>
        <div className="text-center mt-12 text-xs border-t border-gray-800 pt-6">
          &copy; {new Date().getFullYear()} HallMate Administration. All rights reserved.
        </div>
      </footer>
    </div>
  );
}