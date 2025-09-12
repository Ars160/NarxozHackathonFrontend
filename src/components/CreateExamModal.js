import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { scheduleApi } from '../services/Api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ManageDatesModal from './ManageDatesModal';

const CreateExamModal = ({ show, onClose}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [fileExams, setFileExams] = useState(null);
  const [fileRooms, setFileRooms] = useState(null);
  const [fileFaculties, setFileFaculties] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [numDays, setNumDays] = useState('');
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [examDates, setExamDates] = useState([]);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    // Validate form fields
    if (!name || !fileExams || !fileRooms || !fileFaculties || !startDate || !numDays) {
      toast.error('Пожалуйста, заполните все поля формы');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', name);
    formData.append('exams', fileExams);
    formData.append('rooms', fileRooms);
    formData.append('faculties', fileFaculties);
    formData.append('start_date', startDate);
    formData.append('num_days', numDays);

    try {
      const response = await scheduleApi.createExam(formData);
      
      // If we have dates in the response, show the dates modal
      if (response && response.dates) {
        setExamDates(response.dates);
        setShowDatesModal(true);
      } else {
        // If no dates in response, proceed to manage subjects
        onClose();
        navigate('/manage-subject-list', {
          state: {
            message: `Экзамен успешно создан!`,
            type: 'success',
          },
        });
      }
    } catch (err) {
      console.error('Ошибка при создании экзамена', err);
      toast.error('Ошибка при создании экзамена');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatesComplete = () => {
    setShowDatesModal(false);
    onClose();
    navigate('/admin-manage-list', {
      state: {
        message: `Экзамен успешно создан и даты настроены!`,
        type: 'success',
      },
    });
  };

  const loadingOverlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: '#C8102E',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  };

  return (
    <>
      <Modal show={show} onHide={onClose}>
        <Modal.Header closeButton style={{ backgroundColor: '#C8102E', color: 'white' }}>
          <Modal.Title>Создать новый экзамен</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoading && (
            <div style={loadingOverlayStyle}>
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </Spinner>
            </div>
          )}
          <Form>
            <Form.Group controlId="formName" className="mb-2">
              <Form.Label>Название Экзамена</Form.Label>
              <Form.Control type="text" onChange={(e) => setName(e.target.value)} />
            </Form.Group>
            <Form.Group controlId="formFileExams" className="mb-3">
              <Form.Label>Файл с экзаменами</Form.Label>
              <Form.Control type="file" onChange={(e) => setFileExams(e.target.files[0])} />
            </Form.Group>
            <Form.Group controlId="formFileRooms" className="mb-3">
              <Form.Label>Файл с аудиториями</Form.Label>
              <Form.Control type="file" onChange={(e) => setFileRooms(e.target.files[0])} />
            </Form.Group>
            <Form.Group controlId="formFileFaculties" className="mb-3">
              <Form.Label>Файл с факультетами</Form.Label>
              <Form.Control type="file" onChange={(e) => setFileFaculties(e.target.files[0])} />
            </Form.Group>
            <Form.Group controlId="formStartDate" className="mb-2">
              <Form.Label>Дата начала</Form.Label>
              <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Form.Group>
            <Form.Group controlId="formNumDays" className="mb-2">
              <Form.Label>Количество дней</Form.Label>
              <Form.Control type="number" value={numDays} onChange={(e) => setNumDays(e.target.value)} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Отмена
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            disabled={isLoading}
            style={{ backgroundColor: '#C8102E', borderColor: '#C8102E' }}
          >
            Создать
          </Button>
        </Modal.Footer>
      </Modal>

      <ManageDatesModal 
        show={showDatesModal}
        onClose={() => setShowDatesModal(false)}
        dates={examDates}
        onComplete={handleDatesComplete}
      />
    </>
  );
};

export default CreateExamModal;