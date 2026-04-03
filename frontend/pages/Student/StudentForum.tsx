import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { useAppContext } from '../../App';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  UserCircle2,
  X,
  XCircle
} from 'lucide-react';

type ForumTab = 'general' | 'hall' | 'mine';

interface ForumPostSummary {
  post_id: number;
  title: string;
  content: string;
  is_public: boolean;
  user_id: string;
  hall_id: number;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_entity_id: string;
  author_type: 'student' | 'staff';
  author_room_id: number | null;
  author_has_photo: boolean;
  like_count: number;
  comment_count: number;
  viewer_has_liked: boolean | null;
  genres: string[] | null;
}

interface ForumPostDetail extends ForumPostSummary {
  hall_name: string;
}

interface ForumComment {
  comment_id: number;
  parent_comment_id: number | null;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_entity_id: string;
  author_type: 'student' | 'staff';
  author_room_id: number | null;
  author_has_photo: boolean;
  replies?: ForumComment[];
}

interface ForumProfile {
  user_id: string;
  display_name: string;
  entity_id: string;
  user_type: 'student' | 'staff';
  hall_name: string | null;
  has_photo: boolean;
  room_id: number | null;
  student_status?: string | null;
  staff_role?: string | null;
  hall_id?: number | null;
  phone_number?: string | null;
}

interface ForumPostFormState {
  title: string;
  content: string;
  is_public: boolean;
  genres: string[];
}

const API_BASE_URL = 'http://localhost:5000/student';
const PAGE_SIZE = 10;
const GENRE_OPTIONS = [
  'Studying',
  'Entertainment',
  'Sports',
  'Food',
  'Announcements',
  'LostAndFound',
  'Rant',
  'Other'
];

const defaultFormState: ForumPostFormState = {
  title: '',
  content: '',
  is_public: false,
  genres: []
};

const formatRelativeTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDistanceToNow(date, { addSuffix: true });
};

const normalizeBoolean = (value: boolean | null | undefined) => Boolean(value);

const markdownComponents = {
  a: ({ ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-800"
    />
  )
};

const ForumMarkdown: React.FC<{ text: string; className?: string; clampLines?: number }> = ({ text, className, clampLines }) => {
  const clampStyle = clampLines
    ? {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: clampLines,
        overflow: 'hidden'
      }
    : undefined;

  return (
    <div className={className} style={clampStyle}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

const StudentForum: React.FC = () => {
  const { theme } = useAppContext();
  const navigate = useNavigate();
  const { postId } = useParams<{ postId?: string }>();

  const [activeTab, setActiveTab] = useState<ForumTab>('general');
  const [posts, setPosts] = useState<ForumPostSummary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailComments, setDetailComments] = useState<ForumComment[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ForumProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPostDetail | null>(null);
  const [formState, setFormState] = useState<ForumPostFormState>(defaultFormState);
  const [savingPost, setSavingPost] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<number, boolean>>({});
  const [commentDraft, setCommentDraft] = useState('');
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  const [likingPostId, setLikingPostId] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentUserId = localStorage.getItem('user_id') || '';
  const detailAbortRef = useRef<AbortController | null>(null);
  const isDetailView = Boolean(postId);

  const authHeaders = (json = false) => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${localStorage.getItem('hallmate_token')}`
  });

  const handleAuthFailure = () => {
    window.location.href = '#/login';
  };

  const loadPosts = async (page: number, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('tab', activeTab);
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (search.trim()) {
        params.set('search', search.trim());
      }
      selectedGenres.forEach((genre) => params.append('genre', genre));

      const response = await fetch(`${API_BASE_URL}/forum/posts?${params.toString()}`, {
        headers: authHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load posts');
      }

      const data = await response.json();
      const incomingPosts: ForumPostSummary[] = (data.posts || []).map((post: ForumPostSummary) => ({
        ...post,
        viewer_has_liked: normalizeBoolean(post.viewer_has_liked),
        genres: post.genres || []
      }));

      setPosts((prev) => (append ? [...prev, ...incomingPosts] : incomingPosts));
      setCurrentPage(data.pagination?.page || page);
      setTotalPages(data.pagination?.total_pages || 1);
    } catch (err) {
      if (!append) {
        setPosts([]);
      }
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchPostDetail = async (targetPostId: number) => {
    try {
      setDetailLoading(true);
      setError(null);
      detailAbortRef.current?.abort();
      const controller = new AbortController();
      detailAbortRef.current = controller;

      const [postRes, commentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/forum/posts/${targetPostId}`, { headers: authHeaders(), signal: controller.signal }),
        fetch(`${API_BASE_URL}/forum/posts/${targetPostId}/comments`, { headers: authHeaders(), signal: controller.signal })
      ]);

      if (postRes.status === 401 || postRes.status === 403 || commentRes.status === 401 || commentRes.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!postRes.ok) {
        const payload = await postRes.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load post');
      }

      if (!commentRes.ok) {
        const payload = await commentRes.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load comments');
      }

      const postData: ForumPostDetail = await postRes.json();
      const commentData = await commentRes.json();

      setSelectedPost({
        ...postData,
        viewer_has_liked: normalizeBoolean(postData.viewer_has_liked),
        genres: postData.genres || []
      });
      setDetailComments(commentData.comments || []);
      setCommentDraft('');
      setReplyDrafts({});
      setReplyTargets({});
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load post detail');
      setSelectedPost(null);
      setDetailComments([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const openProfileModal = async (userId: string) => {
    try {
      setProfileLoading(true);
      setProfileError(null);
      setSelectedProfile(null);

      const profileRes = await fetch(`${API_BASE_URL}/forum/users/${userId}/profile`, {
        headers: authHeaders()
      });

      if (profileRes.status === 401 || profileRes.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!profileRes.ok) {
        const payload = await profileRes.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load profile');
      }

      const profileData: ForumProfile = await profileRes.json();
      setSelectedProfile(profileData);

      if (profileData.has_photo) {
        const photoRes = await fetch(`${API_BASE_URL}/forum/users/${userId}/photo`, {
          headers: authHeaders()
        });

        if (photoRes.ok) {
          const blob = await photoRes.blob();
          const nextUrl = URL.createObjectURL(blob);
          setProfilePhotoUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl);
            return nextUrl;
          });
        } else {
          setProfilePhotoUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl);
            return null;
          });
        }
      } else {
        setProfilePhotoUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return null;
        });
      }
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
      setSelectedProfile(null);
      setProfilePhotoUrl(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const resetProfileModal = () => {
    setSelectedProfile(null);
    setProfileError(null);
    setProfileLoading(false);
    setProfilePhotoUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
  };

  const openCreateModal = () => {
    setEditingPost(null);
    setFormState(defaultFormState);
    setShowCreateModal(true);
  };

  const openEditModal = (post: ForumPostDetail) => {
    setEditingPost(post);
    setFormState({
      title: post.title,
      content: post.content,
      is_public: post.is_public,
      genres: post.genres || []
    });
    setShowCreateModal(true);
  };

  const closePostModal = () => {
    setShowCreateModal(false);
    setEditingPost(null);
    setFormState(defaultFormState);
  };

  const toggleGenre = (genre: string) => {
    setFormState((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre) ? prev.genres.filter((item) => item !== genre) : [...prev.genres, genre]
    }));
  };

  const handleTabChange = (tab: ForumTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setPosts([]);
    setSearchDraft(search);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft);
    setCurrentPage(1);
  };

  const handlePostLike = async (postIdToToggle: number) => {
    const target = posts.find((post) => post.post_id === postIdToToggle) || (selectedPost?.post_id === postIdToToggle ? selectedPost : null);
    if (!target) return;

    const previousLiked = normalizeBoolean(target.viewer_has_liked);
    const previousCount = target.like_count;
    const nextLiked = !previousLiked;

    setLikingPostId(postIdToToggle);
    setPosts((prev) => prev.map((post) => (
      post.post_id === postIdToToggle
        ? { ...post, viewer_has_liked: nextLiked, like_count: Math.max(0, post.like_count + (nextLiked ? 1 : -1)) }
        : post
    )));
    setSelectedPost((prev) => (
      prev && prev.post_id === postIdToToggle
        ? { ...prev, viewer_has_liked: nextLiked, like_count: Math.max(0, prev.like_count + (nextLiked ? 1 : -1)) }
        : prev
    ));

    try {
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postIdToToggle}/like`, {
        method: 'POST',
        headers: authHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();
      const liked = Boolean(data.liked);
      const likeCount = Number.isFinite(data.like_count) ? data.like_count : (previousCount + (liked ? 1 : -1));

      setPosts((prev) => prev.map((post) => (
        post.post_id === postIdToToggle ? { ...post, viewer_has_liked: liked, like_count: likeCount } : post
      )));
      setSelectedPost((prev) => (
        prev && prev.post_id === postIdToToggle ? { ...prev, viewer_has_liked: liked, like_count: likeCount } : prev
      ));
    } catch (err) {
      setPosts((prev) => prev.map((post) => (
        post.post_id === postIdToToggle ? { ...post, viewer_has_liked: previousLiked, like_count: previousCount } : post
      )));
      setSelectedPost((prev) => (
        prev && prev.post_id === postIdToToggle ? { ...prev, viewer_has_liked: previousLiked, like_count: previousCount } : prev
      ));
      setError(err instanceof Error ? err.message : 'Failed to toggle like');
    } finally {
      setLikingPostId(null);
    }
  };

  const handleDeletePost = async (postToDelete: ForumPostDetail) => {
    if (!window.confirm('Delete this post?')) return;

    try {
      setDeletingPostId(postToDelete.post_id);
      const response = await fetch(`${API_BASE_URL}/forum/posts/${postToDelete.post_id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete post');
      }

      setPosts((prev) => prev.filter((post) => post.post_id !== postToDelete.post_id));
      setSelectedPost(null);
      navigate('/forum');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setDeletingPostId(null);
    }
  };

  const submitPost = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      setActionMessage('Title is required.');
      return;
    }
    if (!formState.content.trim()) {
      setActionMessage('Content is required.');
      return;
    }

    try {
      setSavingPost(true);
      setActionMessage(null);

      const isEdit = Boolean(editingPost);
      const response = await fetch(
        isEdit ? `${API_BASE_URL}/forum/posts/${editingPost!.post_id}` : `${API_BASE_URL}/forum/posts`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: authHeaders(true),
          body: JSON.stringify(formState)
        }
      );

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save post');
      }

      closePostModal();
      await loadPosts(1, false);
      if (selectedPost) {
        await fetchPostDetail(selectedPost.post_id);
      }
      setActionMessage(isEdit ? 'Post updated.' : 'Post created.');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSavingPost(false);
    }
  };

  const submitComment = async (parentCommentId: number | null, content: string) => {
    if (!selectedPost) return;
    const trimmed = content.trim();
    if (!trimmed) return;

    try {
      setPostingComment(true);
      setActionMessage(null);
      const response = await fetch(`${API_BASE_URL}/forum/posts/${selectedPost.post_id}/comments`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ content: trimmed, parent_comment_id: parentCommentId })
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to add comment');
      }

      setCommentDraft('');
      if (parentCommentId !== null) {
        setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: '' }));
        setReplyTargets((prev) => ({ ...prev, [parentCommentId]: false }));
      }
      await fetchPostDetail(selectedPost.post_id);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedPost) return;
    if (!window.confirm('Delete this comment?')) return;

    try {
      setDeletingCommentId(commentId);
      const response = await fetch(`${API_BASE_URL}/forum/posts/${selectedPost.post_id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete comment');
      }

      await fetchPostDetail(selectedPost.post_id);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const openPost = (item: ForumPostSummary) => {
    navigate(`/forum/${item.post_id}`);
  };

  const closeDetail = () => {
    detailAbortRef.current?.abort();
    setSelectedPost(null);
    setDetailComments([]);
    navigate('/forum');
  };

  const visibleComments = useMemo(() => detailComments.filter((comment) => comment.parent_comment_id === null), [detailComments]);

  const renderCommentTree = (comment: ForumComment, depth = 0) => {
    const isAuthor = comment.user_id === currentUserId;
    const replyValue = replyDrafts[comment.comment_id] || '';
    const isReplying = replyTargets[comment.comment_id] || false;

    return (
      <div key={comment.comment_id} className={`${depth > 0 ? 'ml-10 mt-3' : 'mt-4'}`}>
        <div className={`rounded-2xl border ${depth > 0 ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openProfileModal(comment.user_id);
              }}
              className="text-left group"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">{comment.author_name}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wide">{comment.author_type}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                {comment.author_room_id !== null && <span>Room {comment.author_room_id}</span>}
                <span>{formatRelativeTime(comment.created_at)}</span>
              </div>
            </button>

            {isAuthor && (
              <button
                type="button"
                onClick={() => handleDeleteComment(comment.comment_id)}
                disabled={deletingCommentId === comment.comment_id}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                {deletingCommentId === comment.comment_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            )}
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-700">
            <ForumMarkdown text={comment.content} className="prose prose-slate max-w-none prose-p:my-0 prose-headings:mb-2 prose-headings:mt-3 prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100" />
          </div>

          {depth === 0 && (
            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReplyTargets((prev) => ({ ...prev, [comment.comment_id]: !prev[comment.comment_id] }))}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                <MessageCircle className="w-4 h-4" />
                Reply
              </button>
            </div>
          )}

          {isReplying && depth === 0 && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitComment(comment.comment_id, replyValue);
              }}
              className="mt-4 space-y-3"
            >
              <textarea
                value={replyValue}
                onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [comment.comment_id]: event.target.value }))}
                rows={3}
                placeholder="Write a reply..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReplyTargets((prev) => ({ ...prev, [comment.comment_id]: false }))}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postingComment}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Reply
                </button>
              </div>
            </form>
          )}
        </div>

        {comment.replies?.map((reply) => renderCommentTree(reply, depth + 1))}
      </div>
    );
  };

  useEffect(() => {
    loadPosts(1, false);
    // Reset list and refetch when filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, selectedGenres]);

  useEffect(() => {
    if (!postId) {
      setSelectedPost(null);
      setDetailComments([]);
      return;
    }

    const targetPostId = Number(postId);
    if (Number.isNaN(targetPostId)) {
      setError('Invalid post id');
      return;
    }

    fetchPostDetail(targetPostId);
    // Detail view should refetch whenever the route changes.
  }, [postId]);

  useEffect(() => {
    return () => {
      detailAbortRef.current?.abort();
      if (profilePhotoUrl) {
        URL.revokeObjectURL(profilePhotoUrl);
      }
    };
    // Cleanup only; the current URL is managed by state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTabLabel = {
    general: 'General',
    hall: 'My Hall',
    mine: 'My Posts'
  }[activeTab];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
              <MessageSquare className="w-3.5 h-3.5" />
              Student Forum
            </div>
            <div>
              <h1 className={`text-3xl font-bold ${theme.text}`}>Forum Board</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Discuss hall life, share updates, and coordinate with students and staff in your hall community.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
            >
              {sidebarOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Filters
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 ${theme.primary}`}
            >
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </div>
        </div>

        <div className={`${sidebarOpen ? 'mt-5 block' : 'mt-5 hidden lg:block'}`}>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Search posts by title or content"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Search
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {['general', 'hall', 'mine'].map((tab) => {
                const value = tab as ForumTab;
                const active = activeTab === value;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => handleTabChange(value)}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-slate-900 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {value === 'general' ? 'General' : value === 'hall' ? 'My Hall' : 'My Posts'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Genres</p>
                <p className="mt-1 text-sm text-slate-600">Filter posts by forum categories.</p>
              </div>
              {selectedGenres.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedGenres([])}
                  className="text-sm font-medium text-sky-700 hover:text-sky-800"
                >
                  Clear genres
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      setSelectedGenres((prev) => prev.includes(genre) ? prev.filter((item) => item !== genre) : [...prev, genre]);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-sky-700 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {actionMessage && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">{actionMessage}</div>
      )}

      {error && !isDetailView && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      {isDetailView ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={closeDetail}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to feed
            </button>
            <div className="text-sm text-slate-500">{activeTabLabel}</div>
          </div>

          {detailLoading || !selectedPost ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading post detail...
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedPost.is_public ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          <Bookmark className="w-3.5 h-3.5" />
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          <Bookmark className="w-3.5 h-3.5" />
                          Private
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        <Clock3 className="w-3.5 h-3.5" />
                        {formatRelativeTime(selectedPost.created_at)}
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">{selectedPost.title}</h2>
                    <button
                      type="button"
                      onClick={() => openProfileModal(selectedPost.user_id)}
                      className="inline-flex items-center gap-2 text-left"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                        <UserCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 hover:text-sky-700">{selectedPost.author_name}</div>
                        <div className="text-sm text-slate-500">
                          {selectedPost.author_type} {selectedPost.author_room_id !== null ? `• Room ${selectedPost.author_room_id}` : ''}
                        </div>
                      </div>
                    </button>
                  </div>

                  {selectedPost.user_id === currentUserId && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(selectedPost)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(selectedPost)}
                        disabled={deletingPostId === selectedPost.post_id}
                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        {deletingPostId === selectedPost.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {selectedPost.genres && selectedPost.genres.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedPost.genres.map((genre) => (
                      <span key={genre} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600">{genre}</span>
                    ))}
                  </div>
                )}

                <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-slate-700 leading-7">
                  <ForumMarkdown text={selectedPost.content} className="prose prose-slate max-w-none prose-p:my-0 prose-headings:mb-2 prose-headings:mt-4 prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100" />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handlePostLike(selectedPost.post_id)}
                    disabled={likingPostId === selectedPost.post_id}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${selectedPost.viewer_has_liked ? 'bg-rose-50 text-rose-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                  >
                    {likingPostId === selectedPost.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" fill={selectedPost.viewer_has_liked ? 'currentColor' : 'none'} />}
                    {selectedPost.viewer_has_liked ? 'Liked' : 'Like'}
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold">{selectedPost.like_count}</span>
                  </button>
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600">
                    <MessageSquare className="w-4 h-4" />
                    {selectedPost.comment_count} comments
                  </span>
                </div>
              </article>

              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <MessageSquare className="w-5 h-5 text-sky-700" />
                  Comments
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitComment(null, commentDraft);
                  }}
                  className="mt-5 space-y-3"
                >
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    rows={4}
                    placeholder="Write a comment..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={postingComment}
                      className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                    >
                      {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Post Comment
                    </button>
                  </div>
                </form>

                <div className="mt-6">
                  {visibleComments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No comments yet.</div>
                  ) : (
                    <div className="space-y-3">{visibleComments.map((comment) => renderCommentTree(comment))}</div>
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {loading ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading forum posts...
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No posts found</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {search || selectedGenres.length > 0 ? 'Try clearing filters or searching a different keyword.' : 'There are no forum posts in this tab yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const isOwnPost = post.user_id === currentUserId;
                return (
                  <article key={post.post_id} className="group rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <button type="button" onClick={() => openPost(post)} className="flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          {post.is_public ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Public</span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Private</span>
                          )}
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatRelativeTime(post.created_at)}</span>
                        </div>

                        <h2 className="mt-3 text-2xl font-bold text-slate-900 transition group-hover:text-sky-700">{post.title}</h2>

                        <div className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                          <ForumMarkdown
                            text={post.content}
                            clampLines={3}
                            className="prose prose-slate max-w-none prose-p:my-0 prose-headings:mb-2 prose-headings:mt-3 prose-pre:rounded-xl prose-pre:bg-slate-900 prose-pre:text-slate-100"
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProfileModal(post.user_id);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <UserCircle2 className="w-4 h-4" />
                            {post.author_name}
                          </button>

                          <span className="text-sm text-slate-500">
                            {post.author_type === 'student' && post.author_room_id !== null ? `Room ${post.author_room_id}` : post.author_type}
                          </span>
                        </div>

                        {post.genres && post.genres.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {post.genres.map((genre) => (
                              <span key={genre} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">{genre}</span>
                            ))}
                          </div>
                        )}
                      </button>

                      <div className="flex flex-row flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                        <button
                          type="button"
                          onClick={() => handlePostLike(post.post_id)}
                          disabled={likingPostId === post.post_id}
                          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${post.viewer_has_liked ? 'bg-rose-50 text-rose-700' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                        >
                          {likingPostId === post.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" fill={post.viewer_has_liked ? 'currentColor' : 'none'} />}
                          {post.like_count}
                        </button>

                        <button
                          type="button"
                          onClick={() => openPost(post)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {post.comment_count}
                        </button>

                        {isOwnPost && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal({ ...post, hall_name: '' })}
                              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePost({ ...post, hall_name: '' })}
                              disabled={deletingPostId === post.post_id}
                              className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                            >
                              {deletingPostId === post.post_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {posts.length > 0 && currentPage < totalPages && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => loadPosts(currentPage + 1, true)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                Load more posts
              </button>
            </div>
          )}
        </section>
      )}

      {(showCreateModal || editingPost) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{editingPost ? 'Edit Post' : 'Create Post'}</h3>
                <p className="mt-1 text-sm text-slate-500">Share a hall update, question, or discussion topic.</p>
              </div>
              <button type="button" onClick={closePostModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPost} className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={formState.title}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  maxLength={200}
                  placeholder="Post title"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Content</label>
                <textarea
                  value={formState.content}
                  onChange={(event) => setFormState((prev) => ({ ...prev, content: event.target.value }))}
                  rows={8}
                  placeholder="Write your post content..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, is_public: !prev.is_public }))}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${formState.is_public ? 'bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-white text-slate-600'}`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full ${formState.is_public ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {formState.is_public ? <Check className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  </span>
                  {formState.is_public ? 'Public post' : 'Hall-only post'}
                </button>
                <span className="text-sm text-slate-500">Public posts are visible across halls. Hall-only posts stay within your hall.</span>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">Genres</label>
                  <span className="text-xs text-slate-500">Select one or more</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map((genre) => {
                    const active = formState.genres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-sky-700 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
                <button type="button" onClick={closePostModal} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPost}
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {savingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingPost ? 'Save Changes' : 'Publish Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedProfile && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{selectedProfile.display_name}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedProfile.user_type} profile</p>
              </div>
              <button type="button" onClick={resetProfileModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              {profileLoading ? (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading profile...
                </div>
              ) : profileError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{profileError}</div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-slate-100 text-slate-500">
                      {profilePhotoUrl ? <img src={profilePhotoUrl} alt={selectedProfile.display_name} className="h-full w-full object-cover" /> : <UserCircle2 className="w-10 h-10" />}
                    </div>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p><span className="font-medium text-slate-900">Entity ID:</span> {selectedProfile.entity_id}</p>
                      <p><span className="font-medium text-slate-900">Hall:</span> {selectedProfile.hall_name || 'N/A'}</p>
                      <p><span className="font-medium text-slate-900">Room:</span> {selectedProfile.room_id ?? 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">User ID</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 break-all">{selectedProfile.user_id}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Type</p>
                      <p className="mt-1 text-sm font-medium text-slate-800 capitalize">{selectedProfile.user_type}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {selectedProfile.user_type === 'student'
                      ? `Status: ${selectedProfile.student_status || 'N/A'}`
                      : `Role: ${selectedProfile.staff_role || 'N/A'}`}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentForum;
