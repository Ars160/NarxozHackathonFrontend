import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const EditExamModal = ({ exam, onClose, onSave }) => {
  const [formData, setFormData] = useState(exam);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availableProctors, setAvailableProctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Функция загрузки доступных аудиторий и прокторов
  const fetchAvailableOptions = useCallback(async () => {
    if (!formData.Date || !formData.Time_Slot) return; // Если нет даты и времени, не запрашиваем данные

    setIsLoading(true);
    try {
      const roomsResponse = await fetch(`/schedule/available-rooms?date=${formData.Date}&timeSlot=${formData.Time_Slot}`);
      const roomsText = await roomsResponse.text();
      console.log("Ответ сервера (аудитории):", roomsText);
      const roomsData = JSON.parse(roomsText);
      setAvailableRooms(roomsData.rooms || []);

      const proctorsResponse = await fetch(`/schedule/available-proctors?date=${formData.Date}&timeSlot=${formData.Time_Slot}`);
      const proctorsText = await proctorsResponse.text();
      console.log("Ответ сервера (прокторы):", proctorsText);
      const proctorsData = JSON.parse(proctorsText);
      setAvailableProctors(proctorsData.proctors || []);
    } catch (error) {
      console.error('Ошибка:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [formData.Date, formData.Time_Slot]);

  useEffect(() => {
    fetchAvailableOptions();
  }, [fetchAvailableOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/schedule/edit/${exam.Section}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            <Form.Label>Дата</Form.Label>
            <Form.Control
              type="date"
              value={formData.Date}
              onChange={(e) => setFormData({ ...formData, Date: e.target.value })}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Время</Form.Label>
            <Form.Select
              value={formData.Time_Slot}
              onChange={(e) => setFormData({ ...formData, Time_Slot: e.target.value })}
              required
            >
              <option value="08:00-11:00">08:00-11:00</option>
              <option value="11:30-14:30">11:30-14:30</option>
              <option value="15:00-18:00">15:00-18:00</option>
            </Form.Select>
          </Form.Group>

          {isLoading && <p>Загрузка доступных опций...</p>}

          <Form.Group className="mb-3">
            <Form.Label>Аудитория</Form.Label>
            <Form.Select
              value={formData.Room}
              onChange={(e) => setFormData({ ...formData, Room: e.target.value })}
              required
              disabled={isLoading || availableRooms.length === 0}
            >
              {formData.Room && !availableRooms.includes(formData.Room) && (
                <option value={formData.Room}>{formData.Room} (текущая)</option>
              )}
              {availableRooms.map((room) => (
                <option key={room} value={room}>{room}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Проктор</Form.Label>
            <Form.Select
              value={formData.Proctor}
              onChange={(e) => setFormData({ ...formData, Proctor: e.target.value })}
              required
              disabled={isLoading || availableProctors.length === 0}
            >
              {formData.Proctor && !availableProctors.includes(formData.Proctor) && (
                <option value={formData.Proctor}>{formData.Proctor} (текущий)</option>
              )}
              {availableProctors.map((proctor) => (
                <option key={proctor} value={proctor}>{proctor}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={isLoading || availableRooms.length === 0 || availableProctors.length === 0}
          >
            Сохранить изменения
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditExamModal;
