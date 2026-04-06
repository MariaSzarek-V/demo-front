import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, NavDropdown, Container } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const username = user ? user.username : 'Użytkownik';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Navbar bg="primary" variant="dark" className="topbar mb-4 static-top shadow">
      <Container fluid>
        <div className="w-100">
          {/* Brand and User Row */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Navbar.Brand as={Link} to="/dashboard" className="d-flex align-items-center text-white">
              <i className="fas fa-trophy me-2"></i>
              <span className="fw-bold">PredictionCUP</span>
            </Navbar.Brand>

            {/* User Dropdown */}
            <NavDropdown
              title={
                <>
                  <i className="fas fa-fw fa-user-circle"></i>
                  <span className="ms-2">{username}</span>
                </>
              }
              id="user-dropdown"
              align="end"
              className="text-white"
            >
              <NavDropdown.Item as={Link} to="/profile">
                <i className="fas fa-user fa-sm fa-fw me-2 text-muted"></i>
                Profil
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/notifications">
                <i className="fas fa-bell fa-sm fa-fw me-2 text-muted"></i>
                Powiadomienia
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-muted"></i>
                Wyloguj
              </NavDropdown.Item>
            </NavDropdown>
          </div>

          {/* Navigation Menu Row - always horizontal */}
          <div className="d-flex flex-row align-items-center" style={{ overflowX: 'auto', gap: '0.5rem' }}>
            <Nav.Link
              as={Link}
              to="/games"
              className={`text-white text-nowrap ${location.pathname === '/games' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              Mecze
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/ranking"
              className={`text-white text-nowrap ${location.pathname === '/ranking' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              Ranking
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/chat"
              className={`text-white text-nowrap ${location.pathname === '/chat' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              Chat
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/posts"
              className={`text-white text-nowrap ${location.pathname === '/posts' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              Posty
            </Nav.Link>
            {user && user.userRole === 'ADMIN' && (
              <NavDropdown
                title="Admin"
                id="admin-dropdown"
                className="text-white text-nowrap"
                style={{ padding: '0.25rem 0.75rem' }}
              >
                <NavDropdown.Item as={Link} to="/admin/games">
                  Zarządzanie meczami
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} to="/admin/games/new">
                  Dodaj mecz
                </NavDropdown.Item>
              </NavDropdown>
            )}
          </div>
        </div>
      </Container>
    </Navbar>
  );
}

export default Header;
