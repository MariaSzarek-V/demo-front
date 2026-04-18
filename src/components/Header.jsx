import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navbar, Nav, NavDropdown, Container, ButtonGroup, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../i18n/translations';
import LeagueSelector from './LeagueSelector';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, switchLanguage } = useLanguage();
  const t = useTranslation(language);
  const username = user ? user.username : 'User';

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

            {/* League Selector and Language Switcher */}
            <div className="d-flex align-items-center gap-3">
              <LeagueSelector />

              {/* Language Switcher */}
              <ButtonGroup size="sm">
                <Button
                  variant={language === 'pl' ? 'light' : 'outline-light'}
                  onClick={() => switchLanguage('pl')}
                  style={{
                    minWidth: '40px',
                    fontWeight: language === 'pl' ? 'bold' : 'normal'
                  }}
                >
                  PL
                </Button>
                <Button
                  variant={language === 'en' ? 'light' : 'outline-light'}
                  onClick={() => switchLanguage('en')}
                  style={{
                    minWidth: '40px',
                    fontWeight: language === 'en' ? 'bold' : 'normal'
                  }}
                >
                  EN
                </Button>
              </ButtonGroup>

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
                {t('profile')}
              </NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/notifications">
                <i className="fas fa-bell fa-sm fa-fw me-2 text-muted"></i>
                {t('notifications')}
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={handleLogout}>
                <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-muted"></i>
                {t('logout')}
              </NavDropdown.Item>
            </NavDropdown>
            </div>
          </div>

          {/* Navigation Menu Row - always horizontal */}
          <div className="d-flex flex-row align-items-center" style={{ overflowX: 'auto', gap: '0.5rem' }}>
            <Nav.Link
              as={Link}
              to="/games"
              className={`text-white text-nowrap ${location.pathname === '/games' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              {t('games')}
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/ranking"
              className={`text-white text-nowrap ${location.pathname === '/ranking' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              {t('ranking')}
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/chat"
              className={`text-white text-nowrap ${location.pathname === '/chat' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              {t('chat')}
            </Nav.Link>
            <Nav.Link
              as={Link}
              to="/posts"
              className={`text-white text-nowrap ${location.pathname === '/posts' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.75rem' }}
            >
              {t('posts')}
            </Nav.Link>
          </div>
        </div>
      </Container>
    </Navbar>
  );
}

export default Header;
