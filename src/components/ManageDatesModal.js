import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { Calendar, X, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'react-toastify';
import { scheduleApi } from '../services/Api';


const ManageDatesModal = ({ show, onClose, dates, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [customDate, setCustomDate] = useState('');

  // Функция для сортировки дат с использованием useCallback
  const sortDates = useCallback((dates) => {
    return [...dates].sort((a, b) => new Date(a) - new Date(b));
  }, []);

  // Обновление состояния с сортировкой с использованием useCallback
  const updateDatesWithSort = useCallback((newDates) => {
    const sortedDates = sortDates(newDates);
    setSelectedDates(sortedDates);
  }, [sortDates]);

  useEffect(() => {
    if (dates) {
      updateDatesWithSort(dates);
    }
  }, [dates, updateDatesWithSort]);

  const handleRemoveDate = async (dateToRemove) => {
    setIsLoading(true);
    try {
      const response = await scheduleApi.removeDate(dateToRemove); // Добавлен await
      // Убрана ручная проверка response.ok, так как ошибки перехватываются catch
      const data = response; // response уже является результатом await
      updateDatesWithSort(data.dates || []);
      toast.success(`Дата ${dateToRemove} успешно удалена`);
    } catch (error) {
      console.error('Error removing date:', error);
      toast.error('Ошибка при удалении даты');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddCustomDate = async () => {
    if (!customDate) {
      toast.warning('Выберите дату для добавления');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await scheduleApi.addCustomDate(customDate); // Добавлен await
      const data = response;
      updateDatesWithSort(data.dates);
      setCustomDate('');
      toast.success(`Дата ${customDate} успешно добавлена`);
    } catch (error) {
      console.error('Error adding date:', error);
      toast.error('Ошибка при добавлении даты');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestoreDates = async () => {
    setIsLoading(true);
    try {
      const response = await scheduleApi.restoreDates(); // Добавлен await
      const data = response;
      updateDatesWithSort(data.dates || []);
      toast.success('Даты успешно восстановлены');
    } catch (error) {
      console.error('Error restoring dates:', error);
      toast.error('Ошибка при восстановлении дат');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onComplete(selectedDates);
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#C8102E', color: 'white' }}>
        <Modal.Title>Управление датами экзаменов</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading && (
          <div style={loadingOverlayStyle}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Загрузка...</span>
            </Spinner>
          </div>
        )}
        
        <div className="mb-4">
          <div className="d-flex align-items-center mb-3">
            <h5 className="mb-0 me-2">Добавить новую дату</h5>
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={handleRestoreDates}
              className="ms-auto d-flex align-items-center gap-1"
            >
              <RotateCcw size={16} />
              <span>Восстановить исходные даты</span>
            </Button>
          </div>
          
          <div className="d-flex gap-2">
            <Form.Control 
              type="date" 
              value={customDate} 
              onChange={(e) => setCustomDate(e.target.value)}
              className="w-auto"
            />
            <Button 
              variant="success"
              onClick={handleAddCustomDate}
              className="d-flex align-items-center gap-1"
            >
              <Plus size={16} />
              <span>Добавить</span>
            </Button>
          </div>
        </div>
        
        <h5 className="mb-3">Выбранные даты экзаменов</h5>
        
        {selectedDates && selectedDates.length > 0 ? (
          <div className="row row-cols-1 row-cols-md-3 g-3">
            {selectedDates.map((date) => (
              <div className="col" key={date}>
                <div className="card h-100">
                  <div className="card-body d-flex align-items-center">
                    <Calendar size={18} className="me-2 text-primary" />
                    <span>{formatDate(date)}</span>
                    <Button 
                      variant="link" 
                      className="ms-auto p-0 text-danger"
                      onClick={() => handleRemoveDate(date)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="alert alert-warning">
            Нет выбранных дат. Добавьте даты или восстановите исходные.
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Отмена
        </Button>
        <Button 
          variant="primary" 
          onClick={handleComplete} 
          disabled={isLoading || selectedDates.length === 0}
          style={{ backgroundColor: '#C8102E', borderColor: '#C8102E' }}
        >
          Продолжить
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ManageDatesModal;