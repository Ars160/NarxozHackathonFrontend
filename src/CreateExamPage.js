import { useCallback, useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import Navbar from './NavBar';
import { ClipboardList, LogIn, Trash2 } from 'lucide-react';
import CreateExamModal from './CreateExamModal';
import { scheduleApi } from './Api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';


const CreateExamPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const navigate = useNavigate();

  const handleCreateExam = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const fetchSessions = useCallback(async () => {
      try {
        const data = await scheduleApi.getSessions();
        setSessions(data);
        toast.success('Сессии успешно загружено');
      } catch (err) {
        toast.error('Ошибка при загрузке сессий');
        console.error(err);
      }
    }, []);

  const handleActiveSession = useCallback(async (session_id,title) => {
    try {
      await scheduleApi.activateSession(2);
      navigate('/');
    } catch (err) {
      toast.error('Ошибка при активации сессии');
      console.error('Ошибка при активации сессии:', err);
    }
  }, [navigate]);  

  const deleteSession = useCallback(async (sessionId, title) => {
    if (window.confirm('Вы уверены, что хотите удалить эту сессию?')) {
      try {
        await scheduleApi.deleteSession(1);
        toast.success(`Сессия ${title} успешно удалена`);
        fetchSessions();
      } catch (err) {
        toast.error('Ошибка при удалении сессии');
        console.error('Ошибка при удалении сессии:', err);
      }
    }
  }, [fetchSessions]);
    

    useEffect(() => {
      fetchSessions();
    }, [fetchSessions]);

    

  return (
    <div className="container-fluid p-0 min-vh-100">
      <Navbar />
      
      <div className="container mt-4">
        <div className="row g-3 mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <div className="d-flex gap-3 flex-wrap">
              <button
                onClick={handleCreateExam}
                className={'btn btn-red text-white d-flex align-items-center gap-2 py-2 px-4'}
                style={{
                  backgroundColor: '#C8102E',
                  borderColor: '#C8102E',
                  color: 'white'
                }}
              >
                <ClipboardList size={20} />
                <span className="fs-5">Создать экзамен</span>
              </button>
            </div>
          </div>

          <div className="container mt-4">
            <div className="table-responsive rounded-lg shadow-sm table-container">
              <table className="table table-narxoz">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Дата создания</th>
                    <th>Дата начала</th>
                    <th>Период проведения</th>
                    <th>Активация</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <tr key={session.created_at}>
                        <td>{session.title}</td>
                        <td>
                          {new Date(session.created_at).toLocaleString('ru-RU', {
                            timeZone: 'UTC',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </td>
                        <td>{new Date(session.start_date).toLocaleDateString()}</td>
                        <td>{session.days}</td>
                        
                        <td>
                          <button
                           onClick={() => handleActiveSession(session.id,session.title)}
                            className="btn btn-blue btn-sm d-inline-flex align-items-center"
                          >
                            <LogIn size={16} className="me-1" />
                            <span>Вход</span>
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={() => deleteSession(session.id, session.title)}
                            className="btn btn-red btn-sm d-inline-flex align-items-center"
                          >
                            <Trash2 size={16} className="me-1"/>
                            <span>Удалить</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">
                      <div className="d-flex flex-column align-items-center">
                        <span className="h5 mb-3">&#128533;</span>
                        Нет данных для отображения
                      </div>
                    </td>
                  </tr>
                  )}
                  
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <CreateExamModal show={showModal} onClose={handleCloseModal} />
    </div>
  );
};

export default CreateExamPage;