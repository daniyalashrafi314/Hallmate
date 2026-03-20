import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../App';
import { FileText, Calendar, Trash2, File, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Notice {
  notice_id: number;
  title: string;
  description: string;
  created_at: string;
}

interface NoticeDetail extends Notice {
  staff_id: string;
  name: string;
  has_pdf: boolean;
}

const API_BASE_URL = 'http://localhost:5000/staff';
const ITEMS_PER_PAGE = 10;

const StaffNotices: React.FC = () => {
  const { theme } = useAppContext();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<NoticeDetail | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Fetch total count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/notices/count`);
        if (!response.ok) throw new Error('Failed to fetch count');
        const data = await response.json();
        setTotalCount(data.total || 0);
      } catch (err) {
        console.error('Error fetching count:', err);
      }
    };
    fetchCount();
  }, []);

  // Fetch notices for current page
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        params.append('limit', ITEMS_PER_PAGE.toString());
        params.append('offset', ((currentPage - 1) * ITEMS_PER_PAGE).toString());

        const response = await fetch(`${API_BASE_URL}/notices?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch notices');

        const data = await response.json();
        setNotices(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notices');
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [currentPage]);

  const handleNoticeClick = async (noticeId: number) => {
    // Toggle expand/collapse
    if (expandedId === noticeId) {
      setExpandedId(null);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/notices/${noticeId}`);
      if (!response.ok) throw new Error('Failed to fetch notice details');

      const data = await response.json();
      setSelectedNotice(data);
      setExpandedId(noticeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notice details');
    }
  };

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedNotice) return;

    try {
      setPdfLoading(true);
      const response = await fetch(`${API_BASE_URL}/notices/${selectedNotice.notice_id}/pdf`);
      if (!response.ok) {
        setError('Failed to download PDF');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notice-${selectedNotice.notice_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDeleteNotice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedNotice || !window.confirm('Are you sure you want to delete this notice?')) return;

    try {
      setDeleting(true);
      const response = await fetch(`${API_BASE_URL}/notices/${selectedNotice.notice_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete notice');

      setNotices(prev => prev.filter(n => n.notice_id !== selectedNotice.notice_id));
      setSelectedNotice(null);
      setExpandedId(null);
      setTotalCount(prev => Math.max(prev - 1, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notice');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h2 className={`text-2xl font-bold ${theme.text}`}>Notice Board</h2>
        <p className="text-gray-500">Manage notices for your hall</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Notices List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p>No notices found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => {
            const isExpanded = expandedId === notice.notice_id;

            return (
              <div
                key={notice.notice_id}
                onClick={() => handleNoticeClick(notice.notice_id)}
                className="p-6 rounded-2xl flex flex-col md:flex-row gap-6 transition-all cursor-pointer bg-white shadow-sm hover:shadow-md border border-gray-100"
              >
                {/* Date Block */}
                <div className="hidden md:flex flex-col items-center justify-center bg-white rounded-xl p-4 min-w-[100px] border border-gray-100 hover:border-blue-100 transition-colors">
                  <Calendar className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-2xl font-black text-gray-800">
                    {format(parseISO(notice.created_at), 'dd')}
                  </span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {format(parseISO(notice.created_at), 'MMM')}
                  </span>
                </div>

                {/* Content Block */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      {format(parseISO(notice.created_at), 'MMM dd, yyyy')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-800 mb-2">{notice.title}</h3>

                  {/* Description: Clamped to 2 lines when collapsed */}
                  <div className={`text-gray-600 text-sm leading-relaxed mb-4 transition-all duration-300 ${
                    isExpanded ? '' : 'line-clamp-2'
                  }`}>
                    {notice.description}
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="flex items-center justify-end">
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-400 hover:text-blue-500 transition-colors">
                      {isExpanded ? (
                        <><ChevronUp className="w-4 h-4" /> Show Less</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" /> Read More</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-8 px-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === page
                    ? `${theme.primary} text-white`
                    : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal - Notice Details */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
            {/* Modal Header */}
            <div className={`${theme.primary} text-white p-6 flex items-center justify-between sticky top-0`}>
              <h2 className="text-2xl font-bold">Notice Details</h2>
              <button
                onClick={() => {
                  setSelectedNotice(null);
                  setExpandedId(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6">
              {/* Title */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Title</label>
                <h3 className="text-2xl font-bold text-gray-800 mt-2">{selectedNotice.title}</h3>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <label className="text-xs font-black text-gray-400 uppercase">Posted By</label>
                  <p className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedNotice.name}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <label className="text-xs font-black text-gray-400 uppercase">Posted On</label>
                  <p className="text-sm font-semibold text-gray-800 mt-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {format(parseISO(selectedNotice.created_at), 'PPp')}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase">Description</label>
                <div className="bg-gray-50 p-4 rounded-xl mt-2">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedNotice.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* PDF Section */}
              {selectedNotice.has_pdf && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
                  <div className="flex items-center gap-3">
                    <File className="w-6 h-6 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900">Attached PDF Document</p>
                      <p className="text-sm text-blue-700">Click download to view the document</p>
                    </div>
                    <button
                      onClick={handleDownloadPDF}
                      disabled={pdfLoading}
                      className={`px-6 py-2 rounded-lg text-white font-bold transition-all ${
                        pdfLoading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 shadow-lg hover:shadow-xl hover:scale-105'
                      }`}
                    >
                      {pdfLoading ? 'Downloading...' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setSelectedNotice(null);
                    setExpandedId(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-lg border-2 border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleDeleteNotice}
                  disabled={deleting}
                  className={`flex-1 px-6 py-3 rounded-lg text-white font-bold transition-all flex items-center justify-center gap-2 ${
                    deleting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 shadow-lg hover:shadow-xl hover:scale-105'
                  }`}
                >
                  <Trash2 className="w-5 h-5" />
                  {deleting ? 'Deleting...' : 'Delete Notice'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffNotices;
