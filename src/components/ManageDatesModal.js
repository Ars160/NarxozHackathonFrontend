import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Spinner } from 'react-bootstrap';
import { Plus, RotateCcw } from 'lucide-react';
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
      const response = await scheduleApi.removeDate(dateToRemove);
      const data = response;
      console.log('Server response after removing date:', data);
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

    if (selectedDates.includes(customDate)) {
      toast.info(`Дата ${customDate} уже существует`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await scheduleApi.addCustomDate(customDate);
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
      const response = await scheduleApi.restoreDates();
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

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[date.getDay()];
  };

  const getMonthYear = (dateStr) => {
    const date = new Date(dateStr);
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const groupDatesByMonth = () => {
    const grouped = {};
    selectedDates.forEach(dateStr => {
      const monthYear = getMonthYear(dateStr);
      if (!grouped[monthYear]) {
        grouped[monthYear] = [];
      }
      grouped[monthYear].push(dateStr);
    });
    return grouped;
  };

  const renderCalendarMonth = (dates, monthKey) => {
    if (!dates || dates.length === 0) return null;

    // Создаем Set для быстрой проверки наличия даты
    const dateSet = new Set(dates.map(d => new Date(d).getDate()));
    
    // Получаем первую дату месяца для определения начала
    const firstDate = new Date(dates[0]);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();
    
    // Первый день месяца
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // День недели первого дня (0 = воскресенье, 1 = понедельник, и т.д.)
    let startDay = firstDayOfMonth.getDay();
    // Конвертируем: понедельник = 0, воскресенье = 6
    startDay = startDay === 0 ? 6 : startDay - 1;
    
    const totalDays = lastDayOfMonth.getDate();
    
    // Создаем массив недель
    const weeks = [];
    let currentWeek = [];
    
    // Заполняем пустые ячейки в начале
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }
    
    // Заполняем дни месяца
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasExam = dateSet.has(day);
      
      currentWeek.push({
        day: day,
        dateStr: dateStr,
        hasExam: hasExam
      });
      
      // Если воскресенье (7 дней в неделе), начинаем новую неделю
      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    }
    
    // Заполняем последнюю неделю пустыми ячейками
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return (
      <div key={monthKey} className="mb-4">
        <h6 className="mb-3 text-muted">{monthKey}</h6>
        <div className="border rounded p-3" style={{ backgroundColor: '#f8f9fa' }}>
          {/* Заголовки дней недели */}
          <div className="d-flex mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="text-center fw-bold" style={{ width: '14.28%', fontSize: '13px', color: '#666' }}>
                {day}
              </div>
            ))}
          </div>
          
          {/* Недели с датами */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="d-flex gap-2 mb-2">
              {week.map((dayObj, dayIndex) => {
                if (!dayObj) {
                  return <div key={`empty-${weekIndex}-${dayIndex}`} style={{ width: '14.28%' }} />;
                }
                
                if (!dayObj.hasExam) {
                  return (
                    <div key={`noexam-${dayObj.day}`} style={{ width: '14.28%' }}>
                      <div className="text-center p-2" style={{ color: '#ccc', fontSize: '14px' }}>
                        {dayObj.day}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div 
                    key={dayObj.dateStr} 
                    style={{ width: '14.28%' }}
                  >
                    <div 
                      className="card text-center position-relative"
                      style={{ 
                        backgroundColor: '#C8102E',
                        color: 'white',
                        border: 'none',
                        minHeight: '65px'
                      }}
                    >
                      <button
                        onClick={() => handleRemoveDate(dayObj.dateStr)}
                        className="btn-close btn-close-white position-absolute"
                        style={{ 
                          fontSize: '10px',
                          top: '4px',
                          right: '4px',
                          padding: '4px'
                        }}
                        aria-label="Удалить"
                      />
                      <div className="card-body p-2 d-flex flex-column justify-content-center align-items-center">
                        <div style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: '1' }}>
                          {dayObj.day}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.9 }}>
                          {getDayOfWeek(dayObj.dateStr)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#C8102E', color: 'white' }}>
        <Modal.Title>Управление датами экзаменов</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
          <div>
            {Object.entries(groupDatesByMonth()).map(([monthKey, dates]) => 
              renderCalendarMonth(dates, monthKey)
            )}
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