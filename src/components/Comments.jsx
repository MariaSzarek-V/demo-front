import { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import EmojiPicker from 'emoji-picker-react';
import { commentApi } from '../services/api';

function Comments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifs, setGifs] = useState([]);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);

  const GIPHY_API_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh'; // Public demo key

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
    };

    if (showEmojiPicker || showGifPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showGifPicker]);

  useEffect(() => {
    if (showGifPicker) {
      searchGifs('trending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGifPicker]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await commentApi.getAllComments();
      setComments(response.data);
      setLoading(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newCommentText.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await commentApi.createComment({ text: newCommentText });
      setNewCommentText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      await loadComments();
      setSubmitting(false);
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
      <Card className="shadow mb-3" style={{ flex: '1', minHeight: 0 }}>
        <Card.Body style={{ maxHeight: '100%', overflowY: 'auto' }}>
          {comments && comments.length > 0 ? (
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="mb-3 border-bottom pb-2">
                  <div className="d-flex justify-content-between">
                    <strong>{comment.username}</strong>
                    <small className="text-muted">{formatDate(comment.createdAt)}</small>
                  </div>
                  <div className="mb-1">{renderCommentText(comment.text)}</div>
                </div>
              ))}
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
