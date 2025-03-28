import React, { useEffect } from 'react';
import { List, Home, ClipboardList } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Отображение уведомления при переходе
  useEffect(() => {
    if (location.state?.message) {
      const { message, type = 'success' } = location.state;

      // Отображаем уведомление в зависимости от типа
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
          toast(message); // По умолчанию обычное уведомление
      }

      // Очищаем состояние навигации
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const hiddenRoutes = ['/create-exam', '/manage-subject-list'];

  const shouldRenderAdditionalButton = !hiddenRoutes.includes(location.pathname);

  const isOnCreateExamPage = location.pathname === '/create-exam';
  const isOnManageSubjectListPage = location.pathname === '/manage-subject-list';

  const additionalButtonText = isOnCreateExamPage ? 'Главная страница' : 'Экзамены';
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
        } else {
          navigate('/create-exam');
        }
      };
  const additionalButtonIcon = isOnCreateExamPage ? <Home size={20} /> : <ClipboardList size={20} />;

  return (
    <nav className="navbar navbar-expand-lg bg-red text-white py-3 shadow-sm" style={{ backgroundColor: '#C8102E' }}>
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
      <div className="container">
        <h1 className="navbar-brand mb-0 h2 text-white">NARXOZ UNIVERSITY</h1>
        <div className="d-flex gap-3 align-items-center">
          {shouldRenderAdditionalButton && (
            <button
              onClick={() => navigate('/subjects')}
              className="btn btn-light text-red d-flex align-items-center gap-2"
              style={{ color: '#C8102E' }}
            >
              <List size={20} />
              <span>Предметы</span>
            </button>
          )}
          <button
            onClick={additionalButtonAction}
            className="btn btn-light text-red d-flex align-items-center gap-2"
            style={{ color: '#C8102E' }}
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