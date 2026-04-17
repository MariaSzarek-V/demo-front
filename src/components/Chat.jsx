import { useState, useEffect, useRef } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import EmojiPicker from 'emoji-picker-react';
import { chatApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLeague } from '../contexts/LeagueContext';

function Chat() {
  const { user } = useAuth();
  const { selectedLeague } = useLeague();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showCombinedPicker, setShowCombinedPicker] = useState(false);
  const [pickerTab, setPickerTab] = useState('emoji'); // 'emoji' or 'gif'
  const [showReactionsModal, setShowReactionsModal] = useState(null); // { messageId, emoji }
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showMoreReactionsPicker, setShowMoreReactionsPicker] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [gifs, setGifs] = useState([]);
  const [gifSearchTerm, setGifSearchTerm] = useState('');
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const gifPickerRef = useRef(null);
  const combinedPickerRef = useRef(null);
  const reactionPickerRef = useRef(null);
  const moreReactionsPickerRef = useRef(null);
  const reactionsModalRef = useRef(null);
  const messagesEndRef = useRef(null);

  const GIPHY_API_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh'; // Public demo key
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

  // Generate consistent color for each user
  const getUserColor = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      '#0891b2', // cyan
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // emerald
      '#6366f1', // indigo
      '#f97316', // orange
      '#14b8a6', // teal
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    if (selectedLeague) {
      loadMessages();
    }
  }, [selectedLeague]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (combinedPickerRef.current && !combinedPickerRef.current.contains(event.target)) {
        setShowCombinedPicker(false);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPicker(null);
      }
      if (moreReactionsPickerRef.current && !moreReactionsPickerRef.current.contains(event.target)) {
        setShowMoreReactionsPicker(null);
      }
      if (reactionsModalRef.current && !reactionsModalRef.current.contains(event.target)) {
        setShowReactionsModal(null);
      }
    };

    if (showCombinedPicker || showReactionPicker !== null || showMoreReactionsPicker !== null || showReactionsModal !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCombinedPicker, showReactionPicker, showMoreReactionsPicker, showReactionsModal]);

  useEffect(() => {
    if (showCombinedPicker && pickerTab === 'gif') {
      searchGifs('trending');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCombinedPicker, pickerTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getAllMessages(selectedLeague?.id);
      // Odwróć kolejność - najstarsze na górze, najnowsze na dole
      const sortedMessages = response.data.reverse();
      setMessages(sortedMessages);
      setLoading(false);
      // Scroll do dołu po załadowaniu
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Nie udało się załadować wiadomośćy');
      setLoading(false);
    }
  };

  const handleTextChange = (e) => {
    setNewMessageText(e.target.value);
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
      const textBeforeCursor = newMessageText.substring(0, cursorPosition);
      const textAfterCursor = newMessageText.substring(cursorPosition);
      const newText = textBeforeCursor + emojiObject.emoji + textAfterCursor;

      setNewMessageText(newText);
      setShowCombinedPicker(false);

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

  const handleGifClick = async (gifUrl) => {
    // Send GIF immediately as separate message
    const gifTag = `[GIF:${gifUrl}]`;

    try {
      setSubmitting(true);
      const messageData = {
        text: gifTag,
        parentMessageId: replyingTo?.id || null
      };
      await chatApi.createMessage(messageData);
      setReplyingTo(null);
      setShowCombinedPicker(false);
      await loadMessages();
      setSubmitting(false);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error sending GIF:', err);
      alert('Nie udało się wysłać GIF-a');
      setSubmitting(false);
    }
  };

  const handleReactionClick = async (messageId, emoji) => {
    try {
      const currentMessage = messages.find(c => c.id === messageId);
      const userReacted = currentMessage?.reactions?.some(r => r.username === user.username && r.emoji === emoji);

      if (userReacted) {
        await chatApi.removeReaction(messageId, emoji);
      } else {
        await chatApi.addReaction(messageId, emoji);
      }

      // Pobierz zaktualizowane wiadomośće bez scrollowania
      const response = await chatApi.getAllMessages();
      const sortedMessages = response.data.reverse();
      setMessages(sortedMessages);
      setShowReactionPicker(null);
      setShowMoreReactionsPicker(null);
    } catch (err) {
      console.error('Error updating reaction:', err);
    }
  };

  const handleMoreReactionEmojiClick = async (emojiObject, messageId) => {
    await handleReactionClick(messageId, emojiObject.emoji);
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

    if (!newMessageText.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      const messageData = {
        text: newMessageText,
        parentMessageId: replyingTo?.id || null,
        leagueId: selectedLeague?.id
      };
      await chatApi.createMessage(messageData);
      setNewMessageText('');
      setReplyingTo(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      await loadMessages();
      setSubmitting(false);
      // Scroll do dołu po dodaniu wiadomośća
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error creating message:', err);
      alert('Nie udało się dodać wiadomośća');
      setSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    // Enter without Shift = send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Shift+Enter = new line (default behavior)
  };

  const formatDate = (dateString) => {
    // Handle array format from backend [year, month, day, hour, minute]
    let date;
    if (Array.isArray(dateString)) {
      // LocalDateTime from Java comes as array
      const [year, month, day, hour, minute] = dateString;
      date = new Date(year, month - 1, day, hour, minute);
    } else {
      date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessageText = (text) => {
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
          style={{ maxWidth: '100%', maxHeight: '200px', display: 'block', marginTop: '0', marginBottom: '0', borderRadius: '8px' }}
        />
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const isOnlyGif = (text) => {
    return /^\[GIF:https?:\/\/[^\]]+\]$/.test(text.trim());
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
    <Container fluid className="px-1 px-md-2 px-lg-3 content-container-narrow" style={{ height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Lista wiadomośćy z ograniczoną wysokością i scrollem - TYLKO TEN SCROLL */}
      <Card className="shadow mb-2" style={{ flex: '1', minHeight: 0, backgroundColor: '#f8f9fc' }}>
        <Card.Body style={{ maxHeight: '100%', overflowY: 'auto', padding: '0.3rem' }}>
          {messages && messages.length > 0 ? (
            <div className="messages-list">
              {messages.map((message, index) => {
                const isMyMessage = message.username === user?.username;
                const groupedReactions = groupReactions(message.reactions);

                // Sprawdź czy poprzedni wiadomość jest od innej osoby
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const isDifferentAuthor = previousMessage && previousMessage.username !== message.username;
                const marginBottom = isDifferentAuthor ? '12px' : '2px';

                return (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                      marginBottom: marginBottom,
                      padding: '2px',
                      borderRadius: '8px',
                      backgroundColor: highlightedMessageId === message.id ? '#e0f2f4' : 'transparent',
                      transition: 'background-color 0.3s ease'
                    }}
                  >
                    {/* Username and date */}
                    {(!isMyMessage || expandedMessageId === message.id) && (
                      <div style={{
                        fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                        color: '#858796',
                        paddingLeft: isMyMessage ? '0' : '40px',
                        paddingRight: isMyMessage ? '0' : '0',
                        marginBottom: '2px'
                      }}>
                        {!isMyMessage && <strong>{message.username}</strong>}
                        <span className={!isMyMessage ? 'ms-2' : ''}>{formatDate(message.createdAt)}</span>
                      </div>
                    )}

                    {/* Message bubble z avatarem */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: isMyMessage ? 'row' : 'row',
                        alignItems: 'flex-end',
                        gap: '8px',
                        width: '100%'
                      }}
                    >
                      {/* Avatar tylko dla wiadomości od innych - po lewej */}
                      {!isMyMessage && (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: getUserColor(message.username),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 'bold',
                            flexShrink: 0,
                            overflow: 'hidden'
                          }}
                        >
                          {message.avatarUrl ? (
                            <img
                              src={message.avatarUrl}
                              alt={message.username}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            message.username.charAt(0).toUpperCase()
                          )}
                        </div>
                      )}

                      {/* Message bubble wrapper with reactions */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isMyMessage ? 'flex-end' : 'flex-start',
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        {/* Message bubble container */}
                        <div style={{ position: 'relative', maxWidth: '92%', display: 'flex', flexDirection: 'column', alignItems: isMyMessage ? 'flex-end' : 'flex-start' }}>
                          {/* Quoted message bubble - ABOVE (Messenger style) */}
                          {message.parentMessageId && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToMessage(message.parentMessageId);
                              }}
                              style={{
                                backgroundColor: isMyMessage ? '#d4e9ea' : '#f5f5f5',
                                color: isMyMessage ? '#1d3557' : '#5a5c69',
                                padding: '6px 12px',
                                borderRadius: '12px',
                                fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                marginBottom: '-8px',
                                maxWidth: '90%',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                                zIndex: 0,
                                position: 'relative'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = isMyMessage ? '#c0dee0' : '#e8e8e8';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isMyMessage ? '#d4e9ea' : '#f5f5f5';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }}
                            >
                              <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: 'clamp(0.65rem, 1.5vw, 0.72rem)' }}>
                                {message.parentMessageUsername}
                              </div>
                              <div style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                wordBreak: 'break-word'
                              }}>
                                {message.parentMessageText}
                              </div>
                            </div>
                          )}

                          {/* Main message bubble */}
                        <div
                          style={{ position: 'relative', width: '100%', zIndex: 1 }}
                          onMouseEnter={() => setShowReactionPicker(message.id)}
                          onMouseLeave={() => {
                            if (showMoreReactionsPicker !== message.id) {
                              setShowReactionPicker(null);
                            }
                          }}
                          onClick={() => {
                            if (isMyMessage) {
                              setExpandedMessageId(expandedMessageId === message.id ? null : message.id);
                            } else {
                              setShowReactionPicker(message.id);
                            }
                          }}
                        >
                      {isOnlyGif(message.text) ? (
                        // Just render the GIF
                        <>
                          {renderMessageText(message.text)}
                        </>
                      ) : (
                        // Render with bubble for text
                        <div
                          style={{
                            backgroundColor: isMyMessage ? '#0891b2' : 'white',
                            color: isMyMessage ? 'white' : '#333',
                            padding: '10px 14px',
                            borderRadius: '18px',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                            wordWrap: 'break-word',
                            position: 'relative',
                            fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
                          }}
                        >
                          {renderMessageText(message.text)}
                        </div>
                      )}
                        </div>

                      {/* Reactions display - wszystkie w jednej chmurce */}
                      {groupedReactions.length > 0 && (
                        <div
                          style={{
                            marginTop: '-8px',
                            marginLeft: '8px',
                            position: 'relative',
                            zIndex: 1
                          }}
                        >
                          <button
                            onClick={() => setShowReactionsModal({ messageId: message.id })}
                            style={{
                              backgroundColor: message.reactions.some(r => r.username === user?.username) ? '#e0f2f1' : 'white',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '2px 6px',
                              fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Zobacz reakcje"
                          >
                            {/* All emoji together */}
                            {groupedReactions.map(r => (
                              <span key={r.emoji} style={{ fontSize: '1rem' }}>{r.emoji}</span>
                            ))}
                            {/* Total count */}
                            <span style={{ fontSize: 'clamp(0.7rem, 1.6vw, 0.8rem)', color: '#666', marginLeft: '2px', fontWeight: '600' }}>
                              {message.reactions.length}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Reaction picker popup */}
                      {showReactionPicker === message.id && (
                        <div
                          ref={reactionPickerRef}
                          style={{
                            position: 'absolute',
                            top: '-50px',
                            left: isMyMessage ? 'auto' : '0',
                            right: isMyMessage ? '0' : 'auto',
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '24px',
                            padding: '8px 12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            display: 'flex',
                            gap: '8px',
                            zIndex: 100
                          }}
                          onMouseEnter={() => setShowReactionPicker(message.id)}
                          onMouseLeave={() => {
                            if (showMoreReactionsPicker !== message.id) {
                              setShowReactionPicker(null);
                            }
                          }}
                        >
                          {QUICK_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReactionClick(message.id, emoji)}
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
                              setReplyingTo(message);
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
                              setShowMoreReactionsPicker(message.id);
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
                      {showMoreReactionsPicker === message.id && (
                        <div
                          ref={moreReactionsPickerRef}
                          style={{
                            position: 'absolute',
                            bottom: '30px',
                            left: isMyMessage ? '4px' : 'auto',
                            right: isMyMessage ? 'auto' : '4px',
                            zIndex: 101
                          }}
                        >
                          <EmojiPicker
                            onEmojiClick={(emojiObject) => handleMoreReactionEmojiClick(emojiObject, message.id)}
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
                );
              })}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="text-center text-muted">
              Brak wiadomośćy. Bądź pierwszy!
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Formularz dodawania wiadomośća - bez scrolla */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Card className="shadow" style={{ flexShrink: 0, backgroundColor: '#f8f9fc' }}>
        <Card.Body style={{ position: 'relative', padding: '0.5rem' }}>
          {/* Reply preview */}
          {replyingTo && (
            <div
              style={{
                backgroundColor: '#f0f0f0',
                borderLeft: '3px solid rgba(8, 145, 178, 0.85)',
                padding: '8px 12px',
                marginBottom: '10px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)', color: '#666', marginBottom: '2px' }}>
                  Odpowiadasz na <strong>{replyingTo.username}</strong>
                </div>
                <div style={{ fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
            {/* Input row - like Messenger */}
            <div className="d-flex align-items-center gap-2">
              {/* Textarea container with emoji button inside */}
              <div style={{ position: 'relative', flex: 1 }}>
                <Form.Control
                  as="textarea"
                  id="text"
                  ref={textareaRef}
                  required
                  placeholder="Wiadomość"
                  value={newMessageText}
                  onChange={handleTextChange}
                  onKeyPress={handleKeyPress}
                  disabled={submitting}
                  rows={1}
                  style={{
                    width: '100%',
                    minHeight: '36px',
                    maxHeight: '120px',
                    resize: 'none',
                    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                    padding: '0.45rem 3rem 0.45rem 0.75rem',
                    borderRadius: '18px'
                  }}
                />

                {/* Emoji/GIF button inside textarea - centered vertically */}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setShowCombinedPicker(!showCombinedPicker);
                    setPickerTab('emoji');
                  }}
                  style={{
                    position: 'absolute',
                    right: '4px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '4px',
                    fontSize: '1.3rem',
                    textDecoration: 'none',
                    color: showCombinedPicker ? '#0891b2' : '#858796',
                    lineHeight: 1
                  }}
                  title="Emoji i GIF"
                >
                  <i className="far fa-smile"></i>
                </Button>
              </div>

              {/* Send button on right */}
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                style={{
                  flexShrink: 0,
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className={submitting ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'}></i>
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

        {/* Combined Emoji & GIF Picker - NA SAMYM DOLE */}
        {showCombinedPicker && (
          <div
            ref={combinedPickerRef}
            style={{
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderTop: '2px solid #e3e6f0',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
              width: '100%',
              height: '400px',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 999
            }}
          >
            {/* Tabs na górze */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e3e6f0' }}>
              <button
                type="button"
                onClick={() => setPickerTab('emoji')}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: pickerTab === 'emoji' ? '#f8f9fc' : 'transparent',
                  border: 'none',
                  borderBottom: pickerTab === 'emoji' ? '2px solid #0891b2' : 'none',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                  fontWeight: pickerTab === 'emoji' ? 'bold' : 'normal',
                  color: pickerTab === 'emoji' ? '#0891b2' : '#858796'
                }}
              >
                <i className="far fa-smile me-2"></i>Emoji
              </button>
              <button
                type="button"
                onClick={() => {
                  setPickerTab('gif');
                  if (gifs.length === 0) {
                    searchGifs('trending');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: pickerTab === 'gif' ? '#f8f9fc' : 'transparent',
                  border: 'none',
                  borderBottom: pickerTab === 'gif' ? '2px solid #0891b2' : 'none',
                  cursor: 'pointer',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                  fontWeight: pickerTab === 'gif' ? 'bold' : 'normal',
                  color: pickerTab === 'gif' ? '#0891b2' : '#858796'
                }}
              >
                <i className="fas fa-images me-2"></i>GIF
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {pickerTab === 'emoji' ? (
                <div style={{ height: '100%', display: 'flex', justifyContent: 'center', padding: '8px' }}>
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width="100%"
                    height={340}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    previewConfig={{ showPreview: false }}
                    categories={[
                      { category: 'suggested', name: 'Ostatnio używane' },
                      { category: 'smileys_people', name: 'Buźki i ludzie' },
                      { category: 'animals_nature', name: 'Zwierzęta i natura' },
                      { category: 'food_drink', name: 'Jedzenie i picie' },
                      { category: 'travel_places', name: 'Podróże i miejsca' },
                      { category: 'activities', name: 'Aktywności' },
                      { category: 'objects', name: 'Obiekty' },
                      { category: 'symbols', name: 'Symbole' },
                      { category: 'flags', name: 'Flagi' }
                    ]}
                  />
                </div>
              ) : (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '8px', borderBottom: '1px solid #e3e6f0' }}>
                    <Form onSubmit={handleGifSearch}>
                      <div className="d-flex gap-2">
                        <Form.Control
                          type="text"
                          placeholder="Szukaj GIF..."
                          value={gifSearchTerm}
                          onChange={(e) => setGifSearchTerm(e.target.value)}
                          size="sm"
                          style={{ fontSize: 'clamp(0.8rem, 1.8vw, 0.9rem)' }}
                        />
                        <Button type="submit" variant="primary" size="sm">
                          <i className="fas fa-search"></i>
                        </Button>
                      </div>
                    </Form>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
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
                        onMouseEnter={(e) => e.target.style.borderColor = '#22d3ee'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop overlay - przyszarzenie tła */}
      {showReactionsModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1040,
            backdropFilter: 'blur(2px)'
          }}
          onClick={() => setShowReactionsModal(null)}
        />
      )}

      {/* Reactions Modal - dymek na dole */}
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
            flexDirection: 'column',
            animation: 'slideUp 0.3s ease-out'
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
              Reakcje {(() => {
                const currentMessage = messages.find(c => c.id === showReactionsModal.messageId);
                return currentMessage?.reactions?.length ? `(${currentMessage.reactions.length})` : '';
              })()}
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
              const currentMessage = messages.find(c => c.id === showReactionsModal.messageId);
              if (!currentMessage || !currentMessage.reactions) return null;

              // Group reactions by username
              const userReactions = {};
              currentMessage.reactions.forEach(reaction => {
                if (!userReactions[reaction.username]) {
                  userReactions[reaction.username] = [];
                }
                userReactions[reaction.username].push(reaction.emoji);
              });

              // Show users with all their emojis
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

export default Chat;
