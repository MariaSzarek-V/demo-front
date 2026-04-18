import { useState } from 'react';
import { Modal, Form, Button, Spinner, Row, Col } from 'react-bootstrap';

// Free Giphy API key (public beta key - limit 42 requests/hour per IP)
const GIPHY_API_KEY = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';

function GifPicker({ show, onHide, onSelectGif }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchGifs = async (e) => {
    e?.preventDefault();

    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
      setSearched(true);
    } catch (err) {
      console.error('Error searching GIFs:', err);
      alert('Nie udało się wyszukać GIFów');
    } finally {
      setLoading(false);
    }
  };

  const loadTrending = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      const data = await response.json();
      setGifs(data.data || []);
      setSearched(true);
    } catch (err) {
      console.error('Error loading trending GIFs:', err);
      alert('Nie udało się załadować popularnych GIFów');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGif = (gifUrl) => {
    onSelectGif(gifUrl);
    onHide();
    // Reset state
    setSearchQuery('');
    setGifs([]);
    setSearched(false);
  };

  const handleClose = () => {
    onHide();
    setSearchQuery('');
    setGifs([]);
    setSearched(false);
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Wybierz GIF</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={searchGifs} className="mb-3">
          <div className="d-flex gap-2">
            <Form.Control
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj GIFów..."
            />
            <Button variant="primary" type="submit" disabled={loading}>
              Szukaj
            </Button>
            <Button variant="outline-primary" onClick={loadTrending} disabled={loading}>
              Popularne
            </Button>
          </div>
        </Form>

        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">Ładowanie...</div>
          </div>
        )}

        {!loading && searched && gifs.length === 0 && (
          <div className="text-center text-muted py-5">
            Nie znaleziono GIFów. Spróbuj innego zapytania.
          </div>
        )}

        {!loading && gifs.length > 0 && (
          <Row>
            {gifs.map((gif) => (
              <Col key={gif.id} xs={6} md={4} className="mb-3">
                <div
                  onClick={() => handleSelectGif(gif.images.fixed_height.url)}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0891b2';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <img
                    src={gif.images.fixed_height_small.url}
                    alt={gif.title}
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
              </Col>
            ))}
          </Row>
        )}

        {!searched && (
          <div className="text-center text-muted py-5">
            Wpisz frazę i kliknij "Szukaj" lub wybierz "Popularne" aby zobaczyć GIFy
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Zamknij
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default GifPicker;
