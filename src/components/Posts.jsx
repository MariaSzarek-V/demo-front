import { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Button, Modal, Alert } from 'react-bootstrap';
import EmojiPicker from 'emoji-picker-react';
import { postApi, commentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

function Posts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // New post form
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reactions - posts
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMoreReactionsPicker, setShowMoreReactionsPicker] = useState(null);
  const [showReactionsModal, setShowReactionsModal] = useState(null);

  // Reactions - comments
  const [showCommentReactionPicker, setShowCommentReactionPicker] = useState(null);
  const [showCommentMoreReactionsPicker, setShowCommentMoreReactionsPicker] = useState(null);
  const [showCommentReactionsModal, setShowCommentReactionsModal] = useState(null);

  // Comments - now inline per post
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [postComments, setPostComments] = useState({});
  const [newCommentText, setNewCommentText] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [replyingToComment, setReplyingToComment] = useState({});  // { postId: comment }
  const [quotingComment, setQuotingComment] = useState({});  // { postId: comment }

  const reactionPickerRef = useRef(null);
  const moreReactionsPickerRef = useRef(null);
  const reactionsModalRef = useRef(null);
  const commentReactionPickerRef = useRef(null);
  const commentMoreReactionsPickerRef = useRef(null);
  const commentReactionsModalRef = useRef(null);
  const observerTarget = useRef(null);

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

  useEffect(() => {
    loadPosts();
  }, []);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
      if (moreReactionsPickerRef.current && !moreReactionsPickerRef.current.contains(event.target)) {
        setShowMoreReactionsPicker(null);
      }
      if (reactionsModalRef.current && !reactionsModalRef.current.contains(event.target)) {
        setShowReactionsModal(null);
      }
      if (commentReactionPickerRef.current && !commentReactionPickerRef.current.contains(event.target)) {
        setShowCommentReactionPicker(null);
      }
      if (commentMoreReactionsPickerRef.current && !commentMoreReactionsPickerRef.current.contains(event.target)) {
        setShowCommentMoreReactionsPicker(null);
      }
      if (commentReactionsModalRef.current && !commentReactionsModalRef.current.contains(event.target)) {
        setShowCommentReactionsModal(null);
      }
    };

    if (showReactionPicker !== null || showMoreReactionsPicker !== null || showReactionsModal !== null ||
        showCommentReactionPicker !== null || showCommentMoreReactionsPicker !== null ||
        showCommentReactionsModal !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReactionPicker, showMoreReactionsPicker, showReactionsModal, showCommentReactionPicker,
      showCommentMoreReactionsPicker, showCommentReactionsModal]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await postApi.getAllPosts(0, 10);
      setPosts(response.data.content);
      setHasMore(!response.data.last);
      setPage(0);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Nie udało się załadować postów');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const response = await postApi.getAllPosts(nextPage, 10);
      setPosts(prev => [...prev, ...response.data.content]);
      setHasMore(!response.data.last);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!newPostTitle.trim() || !newPostContent.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const postData = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        imageUrl: newPostImageUrl.trim() || null
      };

      await postApi.createPost(postData);

      // Reload posts
      await loadPosts();

      // Reset form and close modal
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostImageUrl('');
      setShowNewPostModal(false);
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Nie udało się utworzyć posta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (postId, emoji) => {
    try {
      const post = posts.find(p => p.id === postId);
      const existingReaction = post.reactions.find(
        r => r.username === user.username && r.emoji === emoji
      );

      if (existingReaction) {
        await postApi.removeReaction(postId, emoji);
      } else {
        await postApi.addReaction(postId, emoji);
      }

      // Update local state
      const response = await postApi.getPostById(postId);
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  };

  const handleQuickReaction = async (postId, emoji) => {
    await handleReaction(postId, emoji);
    setShowReactionPicker(null);
  };

  const handleMoreReactionEmojiClick = async (emojiObject, postId) => {
    await handleReaction(postId, emojiObject.emoji);
    setShowMoreReactionsPicker(null);
  };

  const loadComments = async (postId) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      const response = await commentApi.getCommentsByPostId(postId);
      setPostComments(prev => ({ ...prev, [postId]: response.data }));
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleComments = async (postId) => {
    const newExpanded = new Set(expandedComments);

    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
      // Load comments if not already loaded
      if (!postComments[postId]) {
        await loadComments(postId);
      }
    }

    setExpandedComments(newExpanded);
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();

    const commentText = newCommentText[postId];
    if (!commentText || !commentText.trim()) return;

    try {
      const commentData = {
        text: commentText.trim()
      };

      // Add parent comment if replying
      if (replyingToComment[postId]) {
        commentData.parentCommentId = replyingToComment[postId].id;
      }

      // Add quoted comment if quoting
      if (quotingComment[postId]) {
        commentData.quotedCommentId = quotingComment[postId].id;
      }

      await commentApi.createComment(postId, commentData);

      setNewCommentText(prev => ({ ...prev, [postId]: '' }));
      setReplyingToComment(prev => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });
      setQuotingComment(prev => {
        const updated = { ...prev };
        delete updated[postId];
        return updated;
      });

      await loadComments(postId);

      // Update comments count in post
      const response = await postApi.getPostById(postId);
      setPosts(prev => prev.map(p => p.id === postId ? response.data : p));
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Nie udało się dodać komentarza');
    }
  };

  const handleCommentReaction = async (commentId, postId, emoji) => {
    try {
      const comments = postComments[postId] || [];
      const currentComment = comments.find(c => c.id === commentId);
      const userReacted = currentComment?.reactions?.some(r => r.username === user.username && r.emoji === emoji);

      if (userReacted) {
        await commentApi.removeReaction(commentId, emoji);
      } else {
        await commentApi.addReaction(commentId, emoji);
      }

      // Reload comments for this post
      await loadComments(postId);
      setShowCommentReactionPicker(null);
      setShowCommentMoreReactionsPicker(null);
    } catch (err) {
      console.error('Error handling comment reaction:', err);
    }
  };

  const handleCommentMoreReactionEmojiClick = async (emojiObject, commentId, postId) => {
    await handleCommentReaction(commentId, postId, emojiObject.emoji);
  };

  const formatDate = (dateString) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: pl
      });
    } catch {
      return dateString;
    }
  };

  const groupReactions = (reactions) => {
    const grouped = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { emoji: r.emoji, count: 0, usernames: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].usernames.push(r.username);
    });
    return Object.values(grouped);
  };

  if (loading) {
    return (
      <Container fluid className="h-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Ładowanie...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 content-container-narrow">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Posty</h2>
        <Button variant="primary" onClick={() => setShowNewPostModal(true)}>
          <i className="fas fa-plus me-2"></i>
          Nowy post
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="posts-list">
        {posts.map(post => (
          <Card key={post.id} className="mb-3 shadow" style={{ backgroundColor: '#f8f9fc' }}>
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <div className="me-2">
                  {post.avatarUrl ? (
                    <img
                      src={post.avatarUrl}
                      alt={post.username}
                      className="rounded-circle"
                      width="40"
                      height="40"
                    />
                  ) : (
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                      style={{ width: '40px', height: '40px', backgroundColor: '#6c757d' }}
                    >
                      {post.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold">{post.username}</div>
                  <small className="text-muted">{formatDate(post.createdAt)}</small>
                </div>
              </div>

              <h5 className="mb-2">{post.title}</h5>
              <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>

              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="img-fluid rounded mb-2"
                  style={{ maxHeight: '400px' }}
                />
              )}

              <div className="d-flex align-items-center gap-3 mt-3 pt-2 border-top">
                {/* Reactions */}
                <div className="position-relative">
                  {/* Reaction Icon Button */}
                  <button
                    onClick={() => setShowReactionPicker(showReactionPicker === post.id ? null : post.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '1.3rem',
                      color: '#858796'
                    }}
                    title="Dodaj reakcję"
                  >
                    <i className="far fa-smile"></i>
                  </button>

                  {/* Quick Reactions Picker */}
                  {showReactionPicker === post.id && (
                    <div
                      ref={reactionPickerRef}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '0',
                        backgroundColor: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '24px',
                        padding: '8px 12px',
                        marginBottom: '5px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        display: 'flex',
                        gap: '8px',
                        zIndex: 1000
                      }}
                    >
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleQuickReaction(post.id, emoji)}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '4px',
                            transition: 'transform 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                          {emoji}
                        </button>
                      ))}
                      {/* More reactions button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoreReactionsPicker(post.id);
                          setShowReactionPicker(null);
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          fontSize: '1.5rem',
                          cursor: 'pointer',
                          padding: '4px',
                          transition: 'transform 0.2s',
                          color: '#858796'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      >
                        ➕
                      </button>
                    </div>
                  )}

                  {/* More Reactions Picker (Emoji Picker) */}
                  {showMoreReactionsPicker === post.id && (
                    <div
                      ref={moreReactionsPickerRef}
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '0',
                        marginBottom: '5px',
                        zIndex: 1001
                      }}
                    >
                      <EmojiPicker
                        onEmojiClick={(emojiData) => handleMoreReactionEmojiClick(emojiData, post.id)}
                        width={300}
                        height={400}
                      />
                    </div>
                  )}
                </div>

                {/* Comments */}
                <button
                  onClick={() => handleToggleComments(post.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '1.3rem',
                    color: expandedComments.has(post.id) ? '#0891b2' : '#858796',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Komentarze"
                >
                  <i className="far fa-comment"></i>
                  <span style={{ fontSize: '0.9rem' }}>{post.commentsCount}</span>
                </button>

                {/* Reactions display */}
                {post.reactions.length > 0 && (
                  <div className="ms-auto">
                    <button
                      className="btn btn-sm btn-light d-flex align-items-center gap-1"
                      onClick={() => setShowReactionsModal({ reactions: post.reactions })}
                      style={{ fontSize: '1rem' }}
                    >
                      {/* All emoji together */}
                      {groupReactions(post.reactions).map(({ emoji }) => (
                        <span key={emoji} style={{ fontSize: '1.4rem' }}>{emoji}</span>
                      ))}
                      {/* Total count */}
                      <span style={{ fontSize: '0.9rem', color: '#666', fontWeight: '600' }}>
                        {post.reactions.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </Card.Body>

            {/* Inline Comments Section */}
            {expandedComments.has(post.id) && (
              <div className="border-top">
                <div className="p-3">
                  {/* Add Comment Form */}
                  <Form onSubmit={(e) => handleAddComment(e, post.id)} className="mb-3">
                    {/* Reply/Quote indicator */}
                    {(replyingToComment[post.id] || quotingComment[post.id]) && (
                      <div
                        style={{
                          backgroundColor: '#f0f0f0',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          marginBottom: '8px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <strong>
                            {replyingToComment[post.id] ? '↩️ Odpowiadasz na komentarz: ' : '💬 Cytujesz komentarz: '}
                          </strong>
                          <span style={{ color: '#666' }}>
                            {(replyingToComment[post.id] || quotingComment[post.id])?.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingToComment(prev => {
                              const updated = { ...prev };
                              delete updated[post.id];
                              return updated;
                            });
                            setQuotingComment(prev => {
                              const updated = { ...prev };
                              delete updated[post.id];
                              return updated;
                            });
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            padding: '0',
                            color: '#666'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <Form.Group>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={newCommentText[post.id] || ''}
                        onChange={(e) => setNewCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Napisz komentarz..."
                      />
                    </Form.Group>
                    <div className="d-flex justify-content-end mt-2">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={!newCommentText[post.id] || !newCommentText[post.id].trim()}
                        size="sm"
                      >
                        Dodaj komentarz
                      </Button>
                    </div>
                  </Form>

                  {/* Comments List */}
                  {loadingComments[post.id] ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Ładowanie...</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h6 className="mb-3">Komentarze ({postComments[post.id]?.length || 0})</h6>
                      <div
                        className="comments-list"
                        style={{
                          maxHeight: '400px',
                          overflowY: 'auto',
                          paddingRight: '10px'
                        }}
                      >
                        {(postComments[post.id] || []).map(comment => (
                          <Card key={comment.id} className="mb-2 shadow-sm">
                            <Card.Body className="py-2 px-3">
                              <div className="d-flex align-items-start">
                                <div className="me-2">
                                  <div
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                    style={{ width: '32px', height: '32px', backgroundColor: '#6c757d', fontSize: '0.8rem' }}
                                  >
                                    {comment.username.charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="flex-grow-1">
                                  <div>
                                    <span className="fw-bold me-2">{comment.username}</span>
                                    <small className="text-muted">{formatDate(comment.createdAt)}</small>
                                  </div>

                                  {/* Quoted comment display */}
                                  {comment.quotedCommentText && (
                                    <div
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        borderLeft: '3px solid #6c757d',
                                        padding: '6px 10px',
                                        marginTop: '6px',
                                        marginBottom: '6px',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem'
                                      }}
                                    >
                                      <div style={{ fontWeight: 'bold', marginBottom: '2px', color: '#495057' }}>
                                        {comment.quotedCommentUsername}
                                      </div>
                                      <div
                                        style={{
                                          color: '#6c757d',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical'
                                        }}
                                      >
                                        {comment.quotedCommentText}
                                      </div>
                                    </div>
                                  )}

                                  {/* Parent comment indicator */}
                                  {comment.parentCommentText && !comment.quotedCommentText && (
                                    <div
                                      style={{
                                        fontSize: '0.8rem',
                                        color: '#858796',
                                        marginTop: '4px',
                                        marginBottom: '4px'
                                      }}
                                    >
                                      ↩️ <strong>{comment.parentCommentUsername}</strong>
                                    </div>
                                  )}

                                  <p className="mb-0 mt-1">{comment.text}</p>

                                  {/* Comment Reactions */}
                                  <div className="d-flex align-items-center gap-2 mt-2">
                                    <div className="position-relative">
                                      {/* Reaction Icon Button */}
                                      <button
                                        onClick={() => setShowCommentReactionPicker(
                                          showCommentReactionPicker === comment.id ? null : comment.id
                                        )}
                                        style={{
                                          backgroundColor: 'transparent',
                                          border: 'none',
                                          cursor: 'pointer',
                                          padding: '4px',
                                          fontSize: '1.1rem',
                                          color: '#858796'
                                        }}
                                        title="Dodaj reakcję"
                                      >
                                        <i className="far fa-smile"></i>
                                      </button>

                                      {/* Quick Reactions Picker */}
                                      {showCommentReactionPicker === comment.id && (
                                        <div
                                          ref={commentReactionPickerRef}
                                          style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: '0',
                                            backgroundColor: 'white',
                                            border: '1px solid #ddd',
                                            borderRadius: '24px',
                                            padding: '8px 12px',
                                            marginBottom: '5px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            display: 'flex',
                                            gap: '8px',
                                            zIndex: 1050
                                          }}
                                        >
                                          {QUICK_REACTIONS.map(emoji => (
                                            <button
                                              key={emoji}
                                              onClick={() => handleCommentReaction(comment.id, post.id, emoji)}
                                              style={{
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                fontSize: '1.5rem',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                transition: 'transform 0.2s'
                                              }}
                                              onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                                              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                          {/* Reply button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setReplyingToComment(prev => ({ ...prev, [post.id]: comment }));
                                              setQuotingComment(prev => {
                                                const updated = { ...prev };
                                                delete updated[post.id];
                                                return updated;
                                              });
                                              setShowCommentReactionPicker(null);
                                            }}
                                            style={{
                                              backgroundColor: 'transparent',
                                              border: 'none',
                                              fontSize: '1.2rem',
                                              cursor: 'pointer',
                                              padding: '4px',
                                              transition: 'transform 0.2s',
                                              color: '#858796'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                            title="Odpowiedz"
                                          >
                                            ↩️
                                          </button>
                                          {/* Quote button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setQuotingComment(prev => ({ ...prev, [post.id]: comment }));
                                              setReplyingToComment(prev => {
                                                const updated = { ...prev };
                                                delete updated[post.id];
                                                return updated;
                                              });
                                              setShowCommentReactionPicker(null);
                                            }}
                                            style={{
                                              backgroundColor: 'transparent',
                                              border: 'none',
                                              fontSize: '1.2rem',
                                              cursor: 'pointer',
                                              padding: '4px',
                                              transition: 'transform 0.2s',
                                              color: '#858796'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                            title="Cytuj"
                                          >
                                            💬
                                          </button>
                                          {/* More reactions button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowCommentMoreReactionsPicker(comment.id);
                                              setShowCommentReactionPicker(null);
                                            }}
                                            style={{
                                              backgroundColor: 'transparent',
                                              border: 'none',
                                              fontSize: '1.5rem',
                                              cursor: 'pointer',
                                              padding: '4px',
                                              transition: 'transform 0.2s',
                                              color: '#858796'
                                            }}
                                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                          >
                                            ➕
                                          </button>
                                        </div>
                                      )}

                                      {/* More Reactions Picker (Emoji Picker) */}
                                      {showCommentMoreReactionsPicker === comment.id && (
                                        <div
                                          ref={commentMoreReactionsPickerRef}
                                          style={{
                                            position: 'absolute',
                                            bottom: '100%',
                                            left: '0',
                                            marginBottom: '5px',
                                            zIndex: 1051
                                          }}
                                        >
                                          <EmojiPicker
                                            onEmojiClick={(emojiData) => handleCommentMoreReactionEmojiClick(emojiData, comment.id, post.id)}
                                            width={300}
                                            height={400}
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Display Grouped Reactions */}
                                    {comment.reactions && comment.reactions.length > 0 && (
                                      <button
                                        className="btn btn-sm btn-light d-flex align-items-center gap-1"
                                        onClick={() => setShowCommentReactionsModal({ reactions: comment.reactions })}
                                        style={{ fontSize: '0.85rem' }}
                                      >
                                        {/* All emoji together */}
                                        {groupReactions(comment.reactions).map(({ emoji }) => (
                                          <span key={emoji} style={{ fontSize: '1.4rem' }}>{emoji}</span>
                                        ))}
                                        {/* Total count */}
                                        <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '600' }}>
                                          {comment.reactions.length}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                        {(!postComments[post.id] || postComments[post.id].length === 0) && (
                          <p className="text-muted text-center py-3">Brak komentarzy</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}

        {/* Loading more indicator */}
        <div ref={observerTarget} className="text-center py-4">
          {loadingMore && (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Ładowanie...</span>
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-muted">Nie ma więcej postów</p>
          )}
        </div>
      </div>

      {/* New Post Modal */}
      <Modal show={showNewPostModal} onHide={() => setShowNewPostModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nowy post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreatePost}>
            <Form.Group className="mb-3">
              <Form.Label>Tytuł *</Form.Label>
              <Form.Control
                type="text"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                placeholder="Wpisz tytuł posta..."
                required
                maxLength={255}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Treść *</Form.Label>
              <Form.Control
                as="textarea"
                rows={6}
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Wpisz treść posta..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>URL obrazka (opcjonalnie)</Form.Label>
              <Form.Control
                type="url"
                value={newPostImageUrl}
                onChange={(e) => setNewPostImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowNewPostModal(false)}>
                Anuluj
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={submitting || !newPostTitle.trim() || !newPostContent.trim()}
              >
                {submitting ? 'Publikowanie...' : 'Opublikuj'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

{/* Post Reactions Modal */}
      {showReactionsModal && (
        <div
          ref={reactionsModalRef}
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'white',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
            zIndex: 1050,
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e3e6f0'
            }}
          >
            <h6 style={{ margin: 0, fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)', fontWeight: 'bold', color: '#5a5c69' }}>
              Reakcje ({showReactionsModal.reactions?.length || 0})
            </h6>
            <button
              onClick={() => setShowReactionsModal(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#858796',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Users list */}
          <div style={{ overflowY: 'auto', padding: '12px 20px' }}>
            {(() => {
              // Group reactions by username
              const userReactions = {};
              (showReactionsModal.reactions || []).forEach(reaction => {
                if (!userReactions[reaction.username]) {
                  userReactions[reaction.username] = [];
                }
                userReactions[reaction.username].push(reaction.emoji);
              });

              // Show users with all their emojis in one line
              return Object.entries(userReactions).map(([username, emojis], index) => (
                <div
                  key={username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: index < Object.keys(userReactions).length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#0891b2',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      marginRight: '12px',
                      flexShrink: 0
                    }}
                  >
                    {username.charAt(0).toUpperCase()}
                  </div>

                  {/* Username */}
                  <div style={{ flex: 1, fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: '#5a5c69', fontWeight: '500' }}>
                    {username}
                  </div>

                  {/* All emojis for this user */}
                  <div style={{ display: 'flex', gap: '6px', fontSize: '1.5rem', marginLeft: '8px' }}>
                    {emojis.map((emoji, emojiIndex) => (
                      <span key={emojiIndex}>{emoji}</span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Comment Reactions Modal */}
      {showCommentReactionsModal && (
        <div
          ref={commentReactionsModalRef}
          style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '500px',
            backgroundColor: 'white',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
            zIndex: 1050,
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e3e6f0'
            }}
          >
            <h6 style={{ margin: 0, fontSize: 'clamp(0.95rem, 2.2vw, 1.1rem)', fontWeight: 'bold', color: '#5a5c69' }}>
              Reakcje ({showCommentReactionsModal.reactions?.length || 0})
            </h6>
            <button
              onClick={() => setShowCommentReactionsModal(null)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#858796',
                padding: '0',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>

          {/* Users list */}
          <div style={{ overflowY: 'auto', padding: '12px 20px' }}>
            {(() => {
              // Group reactions by username
              const userReactions = {};
              (showCommentReactionsModal.reactions || []).forEach(reaction => {
                if (!userReactions[reaction.username]) {
                  userReactions[reaction.username] = [];
                }
                userReactions[reaction.username].push(reaction.emoji);
              });

              // Show users with all their emojis in one line
              return Object.entries(userReactions).map(([username, emojis], index) => (
                <div
                  key={username}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: index < Object.keys(userReactions).length - 1 ? '1px solid #f0f0f0' : 'none'
                  }}
                >
                  {/* Avatar placeholder */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#0891b2',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      marginRight: '12px',
                      flexShrink: 0
                    }}
                  >
                    {username.charAt(0).toUpperCase()}
                  </div>

                  {/* Username */}
                  <div style={{ flex: 1, fontSize: 'clamp(0.9rem, 2vw, 1rem)', color: '#5a5c69', fontWeight: '500' }}>
                    {username}
                  </div>

                  {/* All emojis for this user */}
                  <div style={{ display: 'flex', gap: '6px', fontSize: '1.5rem', marginLeft: '8px' }}>
                    {emojis.map((emoji, emojiIndex) => (
                      <span key={emojiIndex}>{emoji}</span>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </Container>
  );
}

export default Posts;
