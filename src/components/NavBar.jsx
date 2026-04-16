import { useEffect } from 'react';
import { Home, ClipboardList, LayoutDashboard } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const getRole = localStorage.getItem('role');

  useEffect(() => {
    if (location.state?.message) {
      const { message, type = 'success' } = location.state;

      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'info':
          toast.info(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast(message);
      }

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);


  const isOnCreateExamPage = location.pathname === '/create-exam';
  const isOnManageSubjectListPage = location.pathname === '/manage-subject-list';
  const isOnListOfCRN = location.pathname.startsWith('/section/');

  let additionalButtonText = 'Экзамены';

  if (isOnCreateExamPage || location.pathname === '/admin-dashboard' || isOnListOfCRN) {
    additionalButtonText = 'Главная страница';
  }

  const adminDashboardiSVisible = location.pathname === '/' && getRole === 'admin';
  
  const additionalButtonAction = isOnCreateExamPage
    ? () => navigate('/')
    : () => {
        if (isOnManageSubjectListPage) {
          const confirmNavigation = window.confirm(
            'Вы точно хотите уйти? Все несохраненные изменения будут потеряны.'
          );
          if (confirmNavigation) {
            navigate('/create-exam');
          }
        } else if(location.pathname === '/admin-dashboard') {
          navigate('/');
        } else if(isOnListOfCRN) {
          navigate(-1);
        } else {
          navigate('/create-exam');
        }
      };
  const additionalButtonIcon = isOnCreateExamPage ? <Home size={20} /> : <ClipboardList size={20} />;
  const adminDashboardButton = <LayoutDashboard size={20} />;

  return (
    <nav className="bg-red text-white py-4 shadow-md sticky top-0 z-50">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <img src="/Logo.png" alt="UniSchedule" className="h-10 w-auto object-contain brightness-0 invert" />
        </Link>
        <div className="flex gap-4 items-center">
          {adminDashboardiSVisible && (
            <Link
              to="/admin-dashboard"
              className="flex items-center gap-2 bg-white text-red hover:bg-red-light px-4 py-2 rounded-xl shadow-sm transition-all duration-200 font-medium"
            >
              {adminDashboardButton}
              <span>Админ страница</span>
            </Link>
          )}
          <button
            onClick={additionalButtonAction}
            className="flex items-center gap-2 bg-white text-red hover:bg-red-light px-4 py-2 rounded-xl shadow-sm transition-all duration-200 font-medium"
          >
            {additionalButtonIcon}
            <span>{additionalButtonText}</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;