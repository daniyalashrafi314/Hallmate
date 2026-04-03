import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { Calendar, EyeOff, Globe, MapPin, Video, XCircle, Info, ExternalLink } from 'lucide-react';

interface Event {
    id: number;
    name: string;
    description: string;
    date: string;
    video_link?: string;
    is_public: boolean;
}

const StudentEvents: React.FC = () => {
    const { theme } = useAppContext();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const API_BASE = 'http://localhost:5000/student/events';

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('hallmate_token');
            const response = await fetch(API_BASE, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) return window.location.hash = '#/login';
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleHideEvent = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Prevents the modal from opening when clicking the hide button

        // Optimistic UI update
        setEvents(prev => prev.filter(event => event.id !== id));

        try {
            const token = localStorage.getItem('hallmate_token');
            await fetch(`${API_BASE}/${id}/hide`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Failed to hide event:", error);
            // If it fails, we should ideally fetch again to restore the card
        }
    };

    // Helper to extract YouTube ID and format as embed URL
    // Smarter Regex Helper to extract YouTube ID
    const getYouTubeEmbedUrl = (url?: string) => {
        if (!url) return null;

        // This regex catches watch?v=, youtu.be/, embed/, and shorts/
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);

        // YouTube IDs are exactly 11 characters long
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    };


    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800">Hall Events</h2>
                <p className="text-gray-500 mt-1">Discover upcoming inter-hall activities and exclusive events for your hall.</p>
            </div>

            {/* Events List */}
            {loading ? (
                <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>
            ) : events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center flex flex-col items-center">
                    <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-bold text-gray-800">No Upcoming Events</h3>
                    <p className="text-gray-500">There are no new events scheduled at this time.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-2">
                                    {event.is_public ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">
                                            <Globe className="w-3 h-3" /> Inter-Hall
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                                            <MapPin className="w-3 h-3" /> Hall Only
                                        </span>
                                    )}
                                    {event.video_link && (
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-red-50 text-red-600 border border-red-100" title="Video Attached">
                                            <Video className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={(e) => handleHideEvent(e, event.id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                    title="Hide Event"
                                >
                                    <EyeOff className="w-5 h-5" />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
                                {event.name}
                            </h3>

                            <div className="mt-auto pt-4 flex items-center justify-between text-sm text-gray-500 border-t border-gray-50">
                                <span className="flex items-center gap-1.5 font-medium text-gray-600">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    {event.date}
                                </span>
                                <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    View Details <ExternalLink className="w-4 h-4" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">

                        {/* Modal Header */}
                        <div className={`p-6 text-white flex justify-between items-start ${theme.primary}`}>
                            <div>
                                <div className="flex gap-2 mb-2">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20 uppercase tracking-wider">
                                        {selectedEvent.is_public ? 'Inter-Hall Event' : 'Hall Only Event'}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black">{selectedEvent.name}</h3>
                                <p className="flex items-center gap-1.5 mt-2 text-white/80 font-medium">
                                    <Calendar className="w-4 h-4" /> {selectedEvent.date}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedEvent(null)}
                                className="text-white/70 hover:text-white transition-colors bg-black/10 hover:bg-black/20 rounded-full p-1.5"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4" /> About This Event
                            </h4>
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {selectedEvent.description || "No description provided."}
                            </p>

                            {/* Video Link Button */}
                            {/* Smart Event Media Section */}
                            {selectedEvent.video_link && (
                                <div className="mt-8 pt-6 border-t border-gray-100">
                                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Video className="w-4 h-4" /> Event Media
                                    </h4>

                                    {getYouTubeEmbedUrl(selectedEvent.video_link) ? (
                                        /* If it IS a valid YouTube link -> Show the embedded player */
                                        <div className="w-full overflow-hidden rounded-2xl border-none bg-gray-900 shadow-md aspect-video">
                                            <iframe
                                                className="w-full h-full border-none"
                                                src={getYouTubeEmbedUrl(selectedEvent.video_link) as string}
                                                title={selectedEvent.name}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    ) : (
                                        /* If it is NOT a YouTube link (e.g., Google Drive) -> Show a fallback button */
                                        <a
                                            href={selectedEvent.video_link.startsWith('http') ? selectedEvent.video_link : `https://${selectedEvent.video_link}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                                        >
                                            <ExternalLink className="w-5 h-5" /> Open External Link
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentEvents;