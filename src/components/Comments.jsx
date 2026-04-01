import { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import EmojiPicker from 'emoji-picker-react';
import { commentApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Comments() {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMoreReactionsPicker, setShowMoreReactionsPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [gifs, setGifs] = useState([]);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const moreReactionsPickerRef = useRef(null);
  const messagesEndRef = useRef(null);

  const GIPHY_API_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh'; // Public demo key
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

  useEffect(() => {
    loadComments();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target)) {
        setShowGifPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
      if (moreReactionsPickerRef.current && !moreReactionsPickerRef.current.contains(event.target)) {
        setShowMoreReactionsPicker(null);
      }
    };

    if (showEmojiPicker || showGifPicker || showReactionPicker !== null || showMoreReactionsPicker !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showGifPicker, showReactionPicker, showMoreReactionsPicker]);

  useEffect(() => {
    if (showGifPicker) {
      searchGifs('trending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGifPicker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentApi.getAllComments();
      // Odwróć kolejność - najstarsze na górze, najnowsze na dole
      const sortedComments = response.data.reverse();
      setComments(sortedComments);
      setLoading(false);
      // Scroll do dołu po załadowaniu
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Nie udało się załadować komentarzy');
      setLoading(false);
    }
  };

  const handleTextChange = (e) => {
    setNewCommentText(e.target.value);
    autoResizeTextarea();
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  const handleEmojiClick = (emojiObject) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = newCommentText.substring(0, cursorPosition);
      const textAfterCursor = newCommentText.substring(cursorPosition);
      const newText = textBeforeCursor + emojiObject.emoji + textAfterCursor;

      setNewCommentText(newText);
      setShowEmojiPicker(false);

      setTimeout(() => {
        textarea.focus();
        const newCursorPosition = cursorPosition + emojiObject.emoji.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        autoResizeTextarea();
      }, 0);
    }
  };

  const searchGifs = async (searchTerm) => {
    try {
      const endpoint = searchTerm === 'trending'
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20`
        : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=20`;

      const response = await fetch(endpoint);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Error fetching GIFs:', err);
    }
  };

  const handleGifSearch = (e) => {
    e.preventDefault();
    if (gifSearchTerm.trim()) {
      searchGifs(gifSearchTerm);
    }
  };

  const handleGifClick = (gifUrl) => {
    const gifTag = `[GIF:${gifUrl}]`;
    const textarea = textareaRef.current;

    if (textarea) {
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = newCommentText.substring(0, cursorPosition);
      const textAfterCursor = newCommentText.substring(cursorPosition);
      const newText = textBeforeCursor + gifTag + textAfterCursor;

      setNewCommentText(newText);
      setShowGifPicker(false);

      setTimeout(() => {
        textarea.focus();
        autoResizeTextarea();
      }, 0);
    }
  };

  const handleReactionClick = async (commentId, emoji) => {
    try {
      const comment = comments.find(c => c.id === commentId);
      const userReacted = comment?.reactions?.some(r => r.username === user.username && r.emoji === emoji);

      if (userReacted) {
        await commentApi.removeReaction(commentId, emoji);
      } else {
        await commentApi.addReaction(commentId, emoji);
      }

      // Pobierz zaktualizowane komentarze bez scrollowania
      const response = await commentApi.getAllComments();
      const sortedComments = response.data.reverse();
      setComments(sortedComments);
      setShowReactionPicker(null);
      setShowMoreReactionsPicker(null);
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
  };

  const handleMoreReactionEmojiClick = async (emojiObject, commentId) => {
    await handleReactionClick(commentId, emojiObject.emoji);
  };

  const groupReactions = (reactions) => {
    if (!reactions || reactions.length === 0) return [];

    const grouped = {};
    reactions.forEach(reaction => {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = [];
      }
      grouped[reaction.emoji].push(reaction.username);
    });

    return Object.entries(grouped).map(([emoji, usernames]) => ({
      emoji,
      count: usernames.length,
      usernames
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newCommentText.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const commentData = {
        text: newCommentText,
        parentCommentId: replyingTo?.id || null
      };
      await commentApi.createComment(commentData);
      setNewCommentText('');
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      await loadComments();
      setSubmitting(false);
      // Scroll do dołu po dodaniu komentarza
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error creating comment:', err);
      alert('Nie udało się dodać komentarza');
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCommentText = (text) => {
    const gifRegex = /\[GIF:(https?:\/\/[^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = gifRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <img
          key={match.index}
          src={match[1]}
          alt="GIF"
          style={{ maxWidth: '300px', maxHeight: '300px', display: 'block', marginTop: '8px', marginBottom: '8px', borderRadius: '4px' }}
        />
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  if (loading) {
    return (
      <Container fluid className="px-2 px-md-4 px-lg-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Ładowanie...</span>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="px-2 px-md-4 px-lg-5">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="px-2 px-md-4 px-lg-5" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Lista komentarzy z ograniczoną wysokością i scrollem - TYLKO TEN SCROLL */}
      <Card className="shadow mb-3" style={{ flex: '1', minHeight: 0, backgroundColor: '#f8f9fc' }}>
        <Card.Body style={{ maxHeight: '100%', overflowY: 'auto', padding: '1rem' }}>
          {comments && comments.length > 0 ? (
            <div className="comments-list">
              {comments.map((comment) => {
                const isMyComment = comment.username === user?.username;
                const groupedReactions = groupReactions(comment.reactions);

                return (
                  <div
                    key={comment.id}
                    className="mb-3"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMyComment ? 'flex-end' : 'flex-start'
                    }}
                  >
                    {/* Username and date */}
                    <div className="mb-1" style={{ fontSize: '0.75rem', color: '#858796', paddingLeft: '8px', paddingRight: '8px' }}>
                      <strong>{comment.username}</strong>
                      <span className="ms-2">{formatDate(comment.createdAt)}</span>
                    </div>

                    {/* Message bubble */}
                    <div
                      style={{ position: 'relative', maxWidth: '70%' }}
                      onMouseEnter={() => setShowReactionPicker(comment.id)}
                      onMouseLeave={() => {
                        if (showMoreReactionsPicker !== comment.id) {
                          setShowReactionPicker(null);
                        }
                      }}
                      onClick={() => setShowReactionPicker(comment.id)}
                    >
                      <div
                        style={{
                          backgroundColor: isMyComment ? '#4e73df' : 'white',
                          color: isMyComment ? 'white' : '#333',
                          padding: '10px 14px',
                          borderRadius: '18px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          wordWrap: 'break-word',
                          position: 'relative'
                        }}
                      >
                        {/* Quoted message */}
                        {comment.parentCommentId && (
                          <div
                            style={{
                              backgroundColor: isMyComment ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
                              borderLeft: `3px solid ${isMyComment ? 'rgba(255,255,255,0.5)' : '#4e73df'}`,
                              padding: '6px 10px',
                              marginBottom: '8px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              opacity: 0.9
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '0.75rem' }}>
                              {comment.parentCommentUsername}
                            </div>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {comment.parentCommentText && comment.parentCommentText.length > 60
                                ? comment.parentCommentText.substring(0, 60) + '...'
                                : comment.parentCommentText}
                            </div>
                          </div>
                        )}
                        {renderCommentText(comment.text)}
                      </div>

                      {/* Reactions display */}
                      {groupedReactions.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '4px',
                            marginTop: '4px',
                            flexWrap: 'wrap'
                          }}
                        >
                          {groupedReactions.map((reaction) => {
                            const userReacted = reaction.usernames.includes(user?.username);
                            return (
                              <button
                                key={reaction.emoji}
                                onClick={() => handleReactionClick(comment.id, reaction.emoji)}
                                style={{
                                  backgroundColor: userReacted ? '#e3f2fd' : 'white',
                                  border: userReacted ? '2px solid #4e73df' : '1px solid #ddd',
                                  borderRadius: '12px',
                                  padding: '2px 8px',
                                  fontSize: '0.85rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={reaction.usernames.join(', ')}
                              >
                                <span>{reaction.emoji}</span>
                                <span style={{ fontSize: '0.75rem', color: '#666' }}>{reaction.count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Reaction picker popup */}
                      {showReactionPicker === comment.id && (
                        <div
                          ref={reactionPickerRef}
                          style={{
                            position: 'absolute',
                            top: '-50px',
                            left: isMyComment ? 'auto' : '0',
                            right: isMyComment ? '0' : 'auto',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '24px',
                            padding: '8px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            gap: '8px',
                            zIndex: 100
                          }}
                          onMouseEnter={() => setShowReactionPicker(comment.id)}
                          onMouseLeave={() => {
                            if (showMoreReactionsPicker !== comment.id) {
                              setShowReactionPicker(null);
                            }
                          }}
                        >
                          {QUICK_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReactionClick(comment.id, emoji)}
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
                              setReplyingTo(comment);
                              setShowReactionPicker(null);
                              textareaRef.current?.focus();
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
                          {/* More reactions button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMoreReactionsPicker(comment.id);
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

                      {/* More reactions emoji picker */}
                      {showMoreReactionsPicker === comment.id && (
                        <div
                          ref={moreReactionsPickerRef}
                          style={{
                            position: 'absolute',
                            bottom: '30px',
                            left: isMyComment ? '4px' : 'auto',
                            right: isMyComment ? 'auto' : '4px',
                            zIndex: 101
                          }}
                        >
                          <EmojiPicker
                            onEmojiClick={(emojiObject) => handleMoreReactionEmojiClick(emojiObject, comment.id)}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="text-center text-muted">
              Brak komentarzy. Bądź pierwszy!
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Formularz dodawania komentarza - bez scrolla */}
      <Card className="shadow" style={{ flexShrink: 0 }}>
        <Card.Body style={{ position: 'relative' }}>
          {/* Reply preview */}
          {replyingTo && (
            <div
              style={{
                backgroundColor: '#f0f0f0',
                borderLeft: '3px solid #4e73df',
                padding: '8px 12px',
                marginBottom: '10px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '2px' }}>
                  Odpowiadasz na <strong>{replyingTo.username}</strong>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '400px' }}>
                  {replyingTo.text.length > 50 ? replyingTo.text.substring(0, 50) + '...' : replyingTo.text}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  color: '#858796'
                }}
              >
                ✕
              </button>
            </div>
          )}
          <Form onSubmit={handleSubmit}>
            <div className="d-flex align-items-start gap-2">
              <Form.Control
                as="textarea"
                id="text"
                ref={textareaRef}
                required
                placeholder="Dodaj komentarz..."
                value={newCommentText}
                onChange={handleTextChange}
                disabled={submitting}
                style={{ flex: 1, minHeight: '38px', resize: 'none', overflow: 'hidden' }}
              />
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowGifPicker(false);
                }}
                style={{ height: '38px', flexShrink: 0 }}
              >
                <i className="far fa-smile"></i>
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => {
                  setShowGifPicker(!showGifPicker);
                  setShowEmojiPicker(false);
                }}
                style={{ height: '38px', flexShrink: 0 }}
              >
                GIF
              </Button>
              <Button type="submit" variant="primary" disabled={submitting} style={{ height: '38px', flexShrink: 0 }}>
                <i className={submitting ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'}></i>
              </Button>
            </div>
          </Form>

          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} style={{ position: 'absolute', bottom: '60px', right: '10px', zIndex: 1000 }}>
              <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
            </div>
          )}

          {/* GIF Picker Popup */}
          {showGifPicker && (
            <div
              ref={gifPickerRef}
              style={{
                position: 'absolute',
                bottom: '60px',
                right: '10px',
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #ddd',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                width: '350px',
                maxHeight: '450px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <Form onSubmit={handleGifSearch}>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      placeholder="Szukaj GIF..."
                      value={gifSearchTerm}
                      onChange={(e) => setGifSearchTerm(e.target.value)}
                      size="sm"
                    />
                    <Button type="submit" variant="primary" size="sm">
                      <i className="fas fa-search"></i>
                    </Button>
                  </div>
                </Form>
              </div>
              <div style={{ overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {gifs.map((gif) => (
                  <img
                    key={gif.id}
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    onClick={() => handleGifClick(gif.images.fixed_height.url)}
                    style={{
                      width: '100%',
                      height: 'auto',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      border: '2px solid transparent',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.borderColor = '#4e73df'}
                    onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                  />
                ))}
              </div>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Comments;
