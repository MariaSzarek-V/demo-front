import { useState, useEffect } from 'react';
import { Container, Card, Form, Button } from 'react-bootstrap';
import { commentApi } from '../services/api';

function Comments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newCommentText.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      await commentApi.createComment({ text: newCommentText });
      setNewCommentText('');
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
    <Container fluid className="px-2 px-md-4 px-lg-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h1 className="h3 mb-0 text-gray-800">Komentarze użytkowników</h1>
      </div>

      {/* Lista komentarzy */}
      <Card className="shadow mb-4">
        <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {comments && comments.length > 0 ? (
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="mb-3 border-bottom pb-2">
                  <div className="d-flex justify-content-between">
                    <strong>{comment.username}</strong>
                    <small className="text-muted">{formatDate(comment.createdAt)}</small>
                  </div>
                  <p className="mb-1">{comment.text}</p>
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

      {/* Formularz dodawania komentarza */}
      <Card className="shadow">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="text">Dodaj komentarz:</Form.Label>
              <Form.Control
                as="textarea"
                id="text"
                rows={3}
                required
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                disabled={submitting}
              />
            </Form.Group>
            <div className="text-end">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Wysyłanie...' : 'Wyślij'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Comments;
