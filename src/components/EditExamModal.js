import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

const EditExamModal = ({ exam, onClose, onSave }) => {
  const [formData, setFormData] = useState({ 
    ...exam,
    duration: exam.duration || 60,
    Room: exam.Room || '',
    Proctor: exam.Proctor || '',
    // Ensure Date is in yyyy-MM-dd format for the date input
    Date: exam.Date ? formatDateForInput(exam.Date) : '',
  });
  
  const [availableRooms, setAvailableRooms] = useState([]);
  const [availableProctors, setAvailableProctors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Пример улучшенной функции для работы с API
async function fetchApi(url, options = {}) {
  try {
    const response = await fetch(url, options);
    
    // Проверяем Content-Type ответа
    const contentType = response.headers.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      // Если это не JSON, получаем текст ошибки
      const errorText = await response.text();
      console.error('API вернул не JSON:', errorText);
      throw new Error('Сервер вернул неверный формат данных');
    }
    
    // Проверяем статус ответа
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Ошибка ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка API:', error);
    throw error;
  }
}

// Использование в компоненте EditExamModal
const fetchAvailableOptions = useCallback(async () => {
  if (!formData.Date || !formData.Time_Slot) return;

  setIsLoading(true);
  setError('');

  try {
    const formattedDate = formatDateForApi(formData.Date);
    
    // Используем новую функцию для API-запросов
    const roomsData = await fetchApi(
      `/schedule/available-rooms?date=${formattedDate}&timeSlot=${encodeURIComponent(formData.Time_Slot)}`
    );
    
    setAvailableRooms(roomsData.rooms || []);

    const proctorsData = await fetchApi(
      `/schedule/available-proctors?date=${formattedDate}&timeSlot=${encodeURIComponent(formData.Time_Slot)}`
    );
    
    setAvailableProctors(proctorsData.proctors || []);

  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
}, [formData.Date, formData.Time_Slot]);

  // Function to format date to yyyy-MM-dd for input fields
  function formatDateForInput(dateString) {
    // Check if the date is already in yyyy-MM-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    try {
      // Parse the date (handles various formats including "Sun, 30 Mar 2025")
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return ''; // Return empty if invalid date
      }
      
      // Format to yyyy-MM-dd
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("Date parsing error:", error);
      return '';
    }
  }

  // Format date for API requests
  function formatDateForApi(dateString) {
    if (!dateString) return '';
    
    try {
      // Ensure date is in yyyy-MM-dd format for the API
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error("API date formatting error:", error);
      return dateString;
    }
  }

  // Effect for automatic data loading when date/time changes
  useEffect(() => {
    fetchAvailableOptions();
  }, [fetchAvailableOptions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
  
    try {
      const formattedDate = formatDateForApi(formData.Date);
      
      console.log('Отправка данных:', {
        room: formData.Room,
        date: formattedDate,
        time_slot: formData.Time_Slot,
        proctor: formData.Proctor,
        duration: formData.duration
      });
      
      const response = await fetch(`/schedule/edit/${exam.Section}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: formData.Room,
          date: formattedDate,
          time_slot: formData.Time_Slot,
          proctor: formData.Proctor,
          duration: formData.duration
        }),
      });
  
      // Проверяем Content-Type ответа
      const contentType = response.headers.get('Content-Type');
      
      if (!contentType || !contentType.includes('application/json')) {
        // Если это не JSON, получаем текст ошибки
        const errorText = await response.text();
        console.error('Сервер вернул не JSON:', errorText);
        throw new Error('Сервер вернул неверный формат данных');
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Ошибка ${response.status}`);
      }
  
      const result = await response.json();
      console.log('Ответ сервера:', result);
      onSave(result.updated_schedule);
      onClose();
  
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Field change handlers
  const handleDateChange = (e) => {
    setFormData(prev => ({
      ...prev,
      Date: e.target.value,
      Room: '',
      Proctor: ''
    }));
  };

  const handleTimeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      Time_Slot: e.target.value,
      Room: '',
      Proctor: ''
    }));
  };

  return (
    <Modal show={true} onHide={onClose} centered size="lg">
      <Modal.Header 
        closeButton 
        style={{ backgroundColor: '#C8102E', color: 'white' }}
      >
        <Modal.Title>Редактирование экзамена - {exam.Section}</Modal.Title>
      </Modal.Header>
      
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <div className="row g-3">
            {/* Дата */}
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Дата экзамена</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.Date || ''}
                  onChange={handleDateChange}
                  required
                />
              </Form.Group>
            </div>

            {/* Время */}
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Время проведения</Form.Label>
                <Form.Select
                  value={formData.Time_Slot || ''}
                  onChange={handleTimeChange}
                  required
                >
                  <option value="">Выберите время</option>
                  <option value="08:00-11:00">08:00 - 11:00</option>
                  <option value="11:30-14:30">11:30 - 14:30</option>
                  <option value="15:00-18:00">15:00 - 18:00</option>
                </Form.Select>
              </Form.Group>
            </div>

            {/* Аудитория */}
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Аудитория</Form.Label>
                <Form.Select
                  value={formData.Room}
                  onChange={(e) => setFormData(prev => ({ ...prev, Room: e.target.value }))}
                  required
                  disabled={isLoading}
                >
                  <option value="">{isLoading ? 'Загрузка...' : 'Выберите аудиторию'}</option>
                  {availableRooms.map(room => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </Form.Select>
                {availableRooms.length === 0 && !isLoading && (
                  <Form.Text className="text-danger">
                    Нет доступных аудиторий
                  </Form.Text>
                )}
              </Form.Group>
            </div>

            {/* Проктор */}
            <div className="col-md-6">
              <Form.Group>
                <Form.Label>Проктор</Form.Label>
                <Form.Select
                  value={formData.Proctor}
                  onChange={(e) => setFormData(prev => ({ ...prev, Proctor: e.target.value }))}
                  required
                  disabled={isLoading}
                >
                  <option value="">{isLoading ? 'Загрузка...' : 'Выберите проктора'}</option>
                  {availableProctors.map(proctor => (
                    <option key={proctor} value={proctor}>{proctor}</option>
                  ))}
                </Form.Select>
                {availableProctors.length === 0 && !isLoading && (
                  <Form.Text className="text-danger">
                    Нет доступных прокторов
                  </Form.Text>
                )}
              </Form.Group>
            </div>

            {/* Продолжительность */}
            <div className="col-12">
              <Form.Group>
                <Form.Label>Продолжительность экзамена</Form.Label>
                <Form.Select
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration: parseInt(e.target.value) 
                  }))}
                >
                  <option value={60}>60 минут</option>
                  <option value={120}>120 минут</option>
                  <option value={180}>180 минут</option>
                </Form.Select>
              </Form.Group>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            Отмена
          </Button>
          
          <Button 
            variant="danger"
            type="submit"
            disabled={isLoading || !formData.Room || !formData.Proctor}
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Сохранение...
              </>
            ) : 'Сохранить изменения'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditExamModal;