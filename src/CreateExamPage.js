import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import Navbar from './NavBar';
import { ClipboardList } from 'lucide-react';
import { useState } from 'react';
import CreateExamModal from './CreateExamModal';

const CreateExamPage = () => {
  const [showModal, setShowModal] = useState(false);

  const handleCreateExam = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleSaveExam = (newExam) => {
    // Здесь вы можете добавить логику для сохранения нового экзамена, если необходимо
    setShowModal(false);
  };

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
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="2" className="text-center py-4 text-muted">
                      <div className="d-flex flex-column align-items-center">
                        <span className="h5 mb-3">&#128533;</span>
                        Нет данных для отображения
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <CreateExamModal show={showModal} onClose={handleCloseModal} onSave={handleSaveExam} />
    </div>
  );
};

export default CreateExamPage;