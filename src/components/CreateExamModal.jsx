import React, { useState } from 'react';
import { scheduleApi } from '../services/Api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Loader2, UploadCloud, FileText } from 'lucide-react';
import ManageDatesModal from './ManageDatesModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';

// Определяем ВНЕ основного компонента — иначе React сбрасывает state при каждом рендере
const FileField = ({ label, onFileChange }) => {
  const [fileName, setFileName] = React.useState(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    setFileName(file ? file.name : null);
    onFileChange(file);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <label className={`flex items-center gap-3 px-3 py-2.5 border rounded-xl cursor-pointer transition-all
        ${fileName ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-gray-50 hover:border-[#C8102E]'}`}>
        {fileName
          ? <FileText size={16} className="text-emerald-600 shrink-0" />
          : <UploadCloud size={16} className="text-gray-400 shrink-0" />
        }
        <span className={`text-sm truncate flex-1 ${
          fileName ? 'text-emerald-700 font-medium' : 'text-gray-400'
        }`}>
          {fileName || 'Выберите .xlsx файл...'}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />
      </label>
    </div>
  );
};

const CreateExamModal = ({ show, onClose }) => {
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
      if (response && response.dates) {
        setExamDates(response.dates);
        setShowDatesModal(true);
      } else {
        onClose();
        navigate('/manage-subject-list', {
          state: { message: 'Экзамен успешно создан!', type: 'success' },
        });
      }
    } catch (err) {
      console.error('Ошибка при создании экзамена', err);
      toast.error('Ошибка при создании экзамена');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatesComplete = async () => {
    setShowDatesModal(false);
    onClose();
    await scheduleApi.sendEmailsSubadmin();
    navigate('/admin-manage-list', {
      state: { message: 'Экзамен успешно создан и даты настроены!', type: 'success' },
    });
  };


  return (
    <>
      <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-[#C8102E] px-6 py-4">
            <DialogTitle className="text-white text-lg font-semibold">Создать новый экзамен</DialogTitle>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50 rounded-2xl">
                <Loader2 size={32} className="animate-spin text-[#C8102E]" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Название экзамена</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите название"
                className="rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-[#C8102E]"
              />
            </div>

            <FileField label="Файл с экзаменами" onFileChange={(f) => setFileExams(f)} />
            <FileField label="Файл с аудиториями" onFileChange={(f) => setFileRooms(f)} />
            <FileField label="Файл с факультетами" onFileChange={(f) => setFileFaculties(f)} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Дата начала</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-[#C8102E]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Количество дней</label>
                <Input
                  type="number"
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                  placeholder="30"
                  min="1"
                  className="rounded-xl bg-gray-50 border-gray-200 focus-visible:ring-[#C8102E]"
                />
              </div>
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
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-[#C8102E] hover:bg-[#A00D26] text-white rounded-xl shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Создание...
                </>
              ) : (
                'Создать'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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