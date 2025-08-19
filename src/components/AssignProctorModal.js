import React, { useState } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { authHeaders } from '../utils/authHeaders';

const AssignProctorModal = ({ show, onClose }) => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Пожалуйста, выберите файл с прокторами');
      return;
    }
  
    const formData = new FormData();
    formData.append('proctors', file);
  
    try {
      setIsLoading(true);
  
      const response = await fetch('http://localhost:5000/api/proctors/assign', {
        ...authHeaders(),
        method: 'POST',
        body: formData,
      });
  
      const data = await response.json();
  
      if (response.ok) {
        toast.success(data.message || 'Прокторы успешно назначены');
        onClose(); // Закрыть модалку
      } else {
        toast.error(data.error || 'Произошла ошибка при назначении прокторов');
      }
    } catch (error) {
      console.error('Ошибка при назначении прокторов:', error);
      toast.error('Произошла ошибка при назначении прокторов');
    } finally {
      setIsLoading(false);
    }
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
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton style={{ backgroundColor: '#C8102E', color: 'white' }}>
        <Modal.Title>Назначить прокторов</Modal.Title>
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
          <Form.Group controlId="formProctorsFile" className="mb-3">
            <Form.Label>Загрузить файл с прокторами (.xlsx)</Form.Label>
            <Form.Control type="file" accept=".xlsx" onChange={handleFileChange} />
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
          Назначить
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AssignProctorModal;
