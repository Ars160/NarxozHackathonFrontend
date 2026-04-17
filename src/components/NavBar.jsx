import { useEffect, useState } from 'react';
import { Home, ClipboardList, LayoutDashboard, Menu, X, LogOut } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { InlineAlert, useAlert } from './ui/InlineAlert';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const getRole = localStorage.getItem('role');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { alert, showAlert, clearAlert } = useAlert();

  useEffect(() => {
    if (location.state?.message) {
      const { message, type = 'success' } = location.state;
      showAlert(message, type);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // Закрывать мобильное меню при смене страницы
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isOnCreateExamPage      = location.pathname === '/create-exam';
  const isOnManageSubjectList   = location.pathname === '/manage-subject-list';
  const isOnListOfCRN           = location.pathname.startsWith('/section/');
  const isOnAdminDashboard      = location.pathname === '/admin-dashboard';
  const showAdminDashboard      = location.pathname === '/' && getRole === 'admin';

  const mainButtonText = (isOnCreateExamPage || isOnAdminDashboard || isOnListOfCRN)
    ? 'Главная страница'
    : 'Экзамены';

  const mainButtonIcon = (isOnCreateExamPage || isOnAdminDashboard || isOnListOfCRN)
    ? <Home size={18} />
    : <ClipboardList size={18} />;

  const handleMainButton = () => {
    if (isOnManageSubjectList) {
      if (window.confirm('Вы точно хотите уйти? Все несохраненные изменения будут потеряны.')) {
        navigate('/create-exam');
      }
    } else if (isOnAdminDashboard || isOnListOfCRN) {
      navigate('/');
    } else if (isOnCreateExamPage) {
      navigate('/');
    } else {
      navigate('/create-exam');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const NavButton = ({ onClick, icon, label, className = '' }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm whitespace-nowrap ${className}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <nav className="bg-[#C8102E] text-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center shrink-0">
              <img
                src="/Logo.png"
                alt="UniSchedule"
                className="h-12 w-auto object-contain brightness-0 invert"
              />
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-3">
              {showAdminDashboard && (
                <Link
                  to="/admin-dashboard"
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm"
                >
                  <LayoutDashboard size={18} />
                  <span>Конфликты</span>
                </Link>
              )}
              <NavButton
                onClick={handleMainButton}
                icon={mainButtonIcon}
                label={mainButtonText}
              />
              <button
                onClick={handleLogout}
                title="Выйти"
                className="flex items-center gap-2 bg-white/10 hover:bg-red-800 border border-white/20 text-white px-3 py-2 rounded-xl transition-all duration-200"
              >
                <LogOut size={18} />
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#A00D26] px-4 py-4 space-y-2">
            {showAdminDashboard && (
              <Link
                to="/admin-dashboard"
                className="flex items-center gap-3 text-white py-2.5 px-3 rounded-xl hover:bg-white/10 transition-colors font-medium"
              >
                <LayoutDashboard size={18} />
                Конфликты
              </Link>
            )}
            <button
              onClick={handleMainButton}
              className="w-full flex items-center gap-3 text-white py-2.5 px-3 rounded-xl hover:bg-white/10 transition-colors font-medium text-left"
            >
              {mainButtonIcon}
              {mainButtonText}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 text-white py-2.5 px-3 rounded-xl hover:bg-white/10 transition-colors font-medium text-left"
            >
              <LogOut size={18} />
              Выйти
            </button>
          </div>
        )}
      </nav>

      <InlineAlert {...alert} onClose={clearAlert} />
    </>
  );
};

export default Navbar;