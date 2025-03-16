import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { scheduleApi } from './Api';
import { useNavigate } from 'react-router-dom';

const CreateExamModal = ({ show, onClose, onSave }) => {
  const [fileExams, setFileExams] = useState(null);
  const [fileRooms, setFileRooms] = useState(null);
  const [fileFaculties, setFileFaculties] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [numDays, setNumDays] = useState(14);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const formData = new FormData();
    formData.append('exams', fileExams);
    formData.append('rooms', fileRooms);
    formData.append('faculties', fileFaculties);
    formData.append('start_date', startDate);
    formData.append('num_days', numDays);

    try {
      const newExam = await scheduleApi.createExam(formData);
      onSave(newExam);
      onClose();
      navigate('/manage-subject-list')
    } catch (err) {
      console.error('Ошибка при создании экзамена', err);
    }
  };

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Создать новый экзамен</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
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
          <Form.Group controlId="formStartDate" className="mb-3">
            <Form.Label>Дата начала</Form.Label>
            <Form.Control type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Form.Group>
          <Form.Group controlId="formNumDays" className="mb-3">
            <Form.Label>Количество дней</Form.Label>
            <Form.Control type="number" value={numDays} onChange={(e) => setNumDays(e.target.value)} />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Создать
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateExamModal;