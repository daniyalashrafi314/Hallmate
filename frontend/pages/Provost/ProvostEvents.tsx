import React, { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../App';
import {
  Calendar,
  ExternalLink,
  Eye,
  Globe,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Video,
  X,
  XCircle
} from 'lucide-react';

interface EventItem {
  id: number;
  name: string;
  description: string;
  date: string;
  video_link?: string | null;
  is_public: boolean;
  hall_id?: string | number;
  is_own_hall?: boolean;
}

const API_BASE = 'http://localhost:5000/admin';

const getAuthHeaders = () => {
  const token = localStorage.getItem('hallmate_token');
  return { Authorization: `Bearer ${token}` };
};

const handleAuthRedirect = (status: number) => {
  if (status === 401 || status === 403) {
    window.location.href = '#/login';
    return true;
  }
  return false;
};

const getYouTubeEmbedUrl = (url?: string | null) => {
  if (!url) return null;

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
};

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const ProvostEvents: React.FC = () => {
  const { theme } = useAppContext();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    date: '',
    video_link: '',
    is_public: false
  });

  const totalEvents = useMemo(() => events.length, [events]);
  const publicEvents = useMemo(() => events.filter((event) => event.is_public).length, [events]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/events`, {
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load events');
      }

      const data: EventItem[] = await response.json();
      setEvents(data || []);
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const openCreateModal = () => {
    setForm({
      name: '',
      description: '',
      date: '',
      video_link: '',
      is_public: false
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const submitCreateEvent = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    const date = form.date.trim();
    const video_link = form.video_link.trim();

    if (!name) {
      setFormError('Event name is required.');
      return;
    }

    if (!date) {
      setFormError('Event date is required.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setFormError('Use the YYYY-MM-DD date format.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          description,
          date,
          video_link: video_link || null,
          is_public: form.is_public
        })
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create event');
      }

      setShowCreateModal(false);
      await fetchEvents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedEvent = async () => {
    if (!selectedEvent || !selectedEvent.is_own_hall) return;

    const confirmed = window.confirm(`Delete event \"${selectedEvent.name}\"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      const response = await fetch(`${API_BASE}/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (handleAuthRedirect(response.status)) return;

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete event');
      }

      setSelectedEvent(null);
      await fetchEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className={`text-2xl font-bold ${theme.text}`}>Events</h1>
          <p className="text-gray-500 mt-1">View hall events, publish inter-hall announcements, and add new entries.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchEvents}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold ${theme.primary}`}
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Total Events</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{totalEvents}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Hall Only</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{totalEvents - publicEvents}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500">Inter-Hall</p>
          <p className={`mt-2 text-3xl font-bold ${theme.text}`}>{publicEvents}</p>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-500" />
          <p className="mt-3 text-gray-500">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm flex flex-col items-center">
          <Calendar className="w-12 h-12 text-gray-300 mb-3" />
          <h2 className={`text-lg font-bold ${theme.text}`}>No Events Yet</h2>
          <p className="text-gray-500">Add your first hall event to make it visible here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <article
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className="group cursor-pointer rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {event.is_public ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-purple-100 bg-purple-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-purple-700">
                      <Globe className="h-3 w-3" />
                      Inter-Hall
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                      <MapPin className="h-3 w-3" />
                      Hall Only
                    </span>
                  )}

                  {event.video_link && (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600" title="Video Attached">
                      <Video className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEvent(event);
                  }}
                  className="rounded-full p-1 text-gray-300 transition-colors hover:text-blue-600"
                  title="Quick view"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>

              <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                {event.name}
              </h3>

              <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">
                {event.description || 'No description provided.'}
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5 font-medium text-gray-600">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  {formatDate(event.date)}
                </span>
                <span className="flex items-center gap-1 text-blue-600 font-bold opacity-0 transition-opacity group-hover:opacity-100">
                  View Details <ExternalLink className="w-4 h-4" />
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className={`flex items-start justify-between gap-4 p-6 text-white ${theme.primary}`}>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                    {selectedEvent.is_public ? 'Inter-Hall Event' : 'Hall Only Event'}
                  </span>
                  {selectedEvent.is_own_hall && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
                      Your Hall
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black">{selectedEvent.name}</h2>
                <p className="mt-2 flex items-center gap-1.5 text-white/80 font-medium">
                  <Calendar className="h-4 w-4" /> {formatDate(selectedEvent.date)}
                </p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded-full bg-black/10 p-1.5 text-white/70 transition-colors hover:bg-black/20 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                <Info className="h-4 w-4" /> About This Event
              </h3>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700">
                {selectedEvent.description || 'No description provided.'}
              </p>

              {selectedEvent.video_link && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400">
                    <Video className="h-4 w-4" /> Event Media
                  </h3>

                  {getYouTubeEmbedUrl(selectedEvent.video_link) ? (
                    <div className="aspect-video overflow-hidden rounded-2xl bg-gray-900 shadow-md">
                      <iframe
                        className="h-full w-full border-none"
                        src={getYouTubeEmbedUrl(selectedEvent.video_link) as string}
                        title={selectedEvent.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <a
                      href={selectedEvent.video_link.startsWith('http') ? selectedEvent.video_link : `https://${selectedEvent.video_link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
                    >
                      <ExternalLink className="h-5 w-5" /> Open External Link
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
              {selectedEvent.is_own_hall && (
                <button
                  onClick={deleteSelectedEvent}
                  disabled={deleting}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${deleting ? 'cursor-not-allowed bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {deleting ? 'Deleting...' : 'Delete Event'}
                </button>
              )}
              <button
                onClick={() => setSelectedEvent(null)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className={`flex items-center justify-between p-6 text-white ${theme.primary}`}>
              <div>
                <h2 className="text-2xl font-black">Create Event</h2>
                <p className="mt-1 text-white/80">Publish a new hall event from the admin panel.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-full bg-black/10 p-1.5 text-white/70 transition-colors hover:bg-black/20 hover:text-white"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Event Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
                  placeholder="Orientation Night"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Visibility</label>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, is_public: !prev.is_public }))}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${form.is_public ? 'border-purple-200 bg-purple-50 text-purple-800' : 'border-gray-200 bg-white text-gray-700'}`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {form.is_public ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                      {form.is_public ? 'Inter-Hall' : 'Hall Only'}
                    </span>
                    <span className="text-xs uppercase tracking-wider opacity-70">Toggle</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
                  placeholder="Write a short description of the event..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">Video Link</label>
                <input
                  value={form.video_link}
                  onChange={(e) => setForm((prev) => ({ ...prev, video_link: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-400"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={submitCreateEvent}
                disabled={saving}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition ${saving ? 'cursor-not-allowed bg-gray-400' : theme.primary}`}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvostEvents;