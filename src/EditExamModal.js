// components/EditExamModal.js
import React from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditExamModal = ({ exam, onClose, onSave }) => {
  const [formData, setFormData] = React.useState(exam);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/schedule/edit/${exam.Section}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        
      });
      
      if (!response.ok) throw new Error('Ошибка сохранения');
      
      const updatedExam = await response.json();
      onSave(updatedExam);
      onClose();
    } catch (error) {
      console.error('Ошибка:', error);
      alert(error.message);
    }
  };

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton style={{ backgroundColor: '#C8102E', color: 'white' }}>
        <Modal.Title>Редактирование экзамена</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Аудитория</Form.Label>
            <Form.Control
              type="text"
              value={formData.Room}
              onChange={(e) => setFormData({...formData, Room: e.target.value})}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Дата</Form.Label>
            <Form.Control
              type="date"
              value={formData.Date}
              onChange={(e) => setFormData({...formData, Date: e.target.value})}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Время</Form.Label>
            <Form.Select
              value={formData.Time_Slot}
              onChange={(e) => setFormData({...formData, Time_Slot: e.target.value})}
              required
            >
              <option value="08:00-11:00">08:00-11:00</option>
              <option value="11:30-14:30">11:30-14:30</option>
              <option value="15:00-18:00">15:00-18:00</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Проктор</Form.Label>
            <Form.Select
              value={formData.Proctor}
              onChange={(e) => setFormData({...formData, Proctor: e.target.value})}
              required
            >
              {/* <option value="">Выберите проктора</option>
              {proctors.map((proctor) => (
                <option key={proctor.id} value={proctor.name}>
                  {proctor.name}
                </option>
              ))} */}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" type="submit">
            Сохранить изменения
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditExamModal;