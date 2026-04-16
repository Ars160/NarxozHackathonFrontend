import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RotateCcw, Loader2, X as XIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import { scheduleApi } from '../services/Api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AbsoluteLoader } from './Loaderss';

const ManageDatesModal = ({ show, onClose, dates, onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDates, setSelectedDates] = useState([]);
  const [customDate, setCustomDate] = useState('');

  const sortDates = useCallback((dates) => {
    return [...dates].sort((a, b) => new Date(a) - new Date(b));
  }, []);

  const updateDatesWithSort = useCallback((newDates) => {
    setSelectedDates(sortDates(newDates));
  }, [sortDates]);

  useEffect(() => {
    if (dates) updateDatesWithSort(dates);
  }, [dates, updateDatesWithSort]);

  const handleRemoveDate = async (dateToRemove) => {
    setIsLoading(true);
    try {
      const response = await scheduleApi.removeDate(dateToRemove);
      updateDatesWithSort(response.dates || []);
      toast.success(`Дата ${dateToRemove} успешно удалена`);
    } catch (error) {
      toast.error('Ошибка при удалении даты');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCustomDate = async () => {
    if (!customDate) { toast.warning('Выберите дату для добавления'); return; }
    if (selectedDates.includes(customDate)) { toast.info(`Дата ${customDate} уже существует`); return; }

    setIsLoading(true);
    try {
      const response = await scheduleApi.addCustomDate(customDate);
      updateDatesWithSort(response.dates);
      setCustomDate('');
      toast.success(`Дата ${customDate} успешно добавлена`);
    } catch (error) {
      toast.error('Ошибка при добавлении даты');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreDates = async () => {
    setIsLoading(true);
    try {
      const response = await scheduleApi.restoreDates();
      updateDatesWithSort(response.dates || []);
      toast.success('Даты успешно восстановлены');
    } catch (error) {
      toast.error('Ошибка при восстановлении дат');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => onComplete(selectedDates);

  const getDayOfWeek = (dateStr) => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[new Date(dateStr).getDay()];
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
      if (!grouped[monthYear]) grouped[monthYear] = [];
      grouped[monthYear].push(dateStr);
    });
    return grouped;
  };

  const renderCalendarMonth = (dates, monthKey) => {
    if (!dates || dates.length === 0) return null;
    const dateSet = new Set(dates.map(d => new Date(d).getDate()));
    const firstDate = new Date(dates[0]);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    const totalDays = lastDayOfMonth.getDate();
    const weeks = [];
    let currentWeek = [];

    for (let i = 0; i < startDay; i++) currentWeek.push(null);
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      currentWeek.push({ day, dateStr, hasExam: dateSet.has(day) });
      if (currentWeek.length === 7) { weeks.push([...currentWeek]); currentWeek = []; }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return (
      <div key={monthKey} className="mb-5">
        <h6 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">{monthKey}</h6>
        <div className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
          <div className="flex mb-2">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
              <div key={day} className="text-center font-semibold text-xs text-gray-400" style={{ width: '14.28%' }}>
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex gap-1 mb-1">
              {week.map((dayObj, dayIndex) => {
                if (!dayObj) return <div key={`e-${weekIndex}-${dayIndex}`} style={{ width: '14.28%' }} />;
                if (!dayObj.hasExam) return (
                  <div key={`n-${dayObj.day}`} style={{ width: '14.28%' }} className="text-center py-2 text-gray-300 text-sm">
                    {dayObj.day}
                  </div>
                );
                return (
                  <div key={dayObj.dateStr} style={{ width: '14.28%' }}>
                    <div className="relative rounded-xl overflow-hidden bg-[#C8102E] text-white text-center" style={{ minHeight: '60px' }}>
                      <button
                        onClick={() => handleRemoveDate(dayObj.dateStr)}
                        className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 transition-colors"
                        aria-label="Удалить"
                      >
                        <XIcon size={10} />
                      </button>
                      <div className="flex flex-col items-center justify-center h-full py-2">
                        <div className="text-xl font-bold leading-none">{dayObj.day}</div>
                        <div className="text-xs mt-1 opacity-80">{getDayOfWeek(dayObj.dateStr)}</div>
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
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-0 overflow-hidden">
        {isLoading && <AbsoluteLoader />}
        <DialogHeader className="bg-[#C8102E] px-6 py-4">
          <DialogTitle className="text-white text-lg font-semibold">Управление датами экзаменов</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-5">

          {/* Add date section */}
          <div className="p-4 border border-gray-100 rounded-xl bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-semibold text-gray-800 text-base">Добавить новую дату</h5>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestoreDates}
                className="text-gray-600 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 rounded-lg text-xs"
              >
                <RotateCcw size={13} />
                Восстановить исходные
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="rounded-xl bg-gray-50 border-gray-200 w-auto focus-visible:ring-[#C8102E]"
              />
              <Button
                onClick={handleAddCustomDate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5"
              >
                <Plus size={15} />
                Добавить
              </Button>
            </div>
          </div>

          {/* Calendar section */}
          <div>
            <h5 className="font-semibold text-gray-800 text-base mb-3">Выбранные даты экзаменов</h5>
            {selectedDates && selectedDates.length > 0 ? (
              <div>
                {Object.entries(groupDatesByMonth()).map(([monthKey, dates]) =>
                  renderCalendarMonth(dates, monthKey)
                )}
              </div>
            ) : (
              <div className="text-center py-8 px-4 border border-amber-200 rounded-xl bg-amber-50 text-amber-700 text-sm">
                Нет выбранных дат. Добавьте даты или восстановите исходные.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl"
          >
            Отмена
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isLoading || selectedDates.length === 0}
            className="bg-[#C8102E] hover:bg-[#A00D26] text-white rounded-xl shadow-sm"
          >
            Продолжить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageDatesModal;