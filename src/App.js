import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, User, Download, Filter, ArrowUpDown, LogIn, List } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { scheduleApi } from './Api';
import './style.css';

const ExamScheduler = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [selectedView, setSelectedView] = useState('general');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleEntryClick = (examData) => {
      
    
      // Вывод уведомления
      toast.info(`ВХОД В CRN ${examData.Section}`);
    
      // Перенаправление на другую страницу
      navigate(`/section/${examData.Section}`);
  };
  
  const [filterCriteria, setFilterCriteria] = useState({
    subject: '',
    instructor: '',
    room: '',
    date: ''
  });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'ascending'
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const filterData = (data) => {
    return data.filter(exam => {
      return (
        exam.Subject.toLowerCase().includes(filterCriteria.subject.toLowerCase()) &&
        exam.Instructor.toLowerCase().includes(filterCriteria.instructor.toLowerCase()) &&
        exam.Room.toString().includes(filterCriteria.room) &&
        (filterCriteria.date === '' || exam.Date.includes(filterCriteria.date))
      );
    });
  };

  const sortData = (data, key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    setSortConfig({ key, direction });

    return [...data].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterCriteria(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSort = (key) => {
    const sortedData = sortData(filteredData, key);
    setFilteredData(sortedData);
  };

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      const data = await scheduleApi.getGeneralSchedule();
      setScheduleData(data);
      setFilteredData(data);
      toast.success('Расписание успешно загружено');
    } catch (err) {
      toast.error('Ошибка при загрузке расписания');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentSchedule = async (id) => {
    if (!id.trim()) {
      toast.warning('Пожалуйста, введите ID студента');
      return;
    }

    try {
      setLoading(true);
      const data = await scheduleApi.getStudentSchedule(id);
      setStudentSchedule(data);
      setFilteredData(data);
      toast.success(`Расписание студента ${id} загружено`);
    } catch (err) {
      toast.error('Студент не найден');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      if (selectedView === 'general') {
        await scheduleApi.exportGeneralSchedule();
      } else {
        if (!studentId.trim()) {
          toast.warning('Введите ID студента для экспорта');
          return;
        }
        await scheduleApi.exportStudentSchedule(studentId);
      }
      toast.success('Файл успешно экспортирован');
    } catch (err) {
      toast.error('Ошибка при экспорте файла');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchScheduleData();
  }, []);

  useEffect(() => {
    const filtered = filterData(selectedView === 'general' ? scheduleData : studentSchedule);
    setFilteredData(filtered);
  }, [filterCriteria, selectedView, scheduleData, studentSchedule]);

  const handleStudentSearch = () => {
    if (studentId.trim()) {
      fetchStudentSchedule(studentId);
      setSelectedView('student');
    } else {
      toast.warning('Пожалуйста, введите ID студента');
    }
  };

  const renderFilterSection = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
        <input
          type="text"
          name="subject"
          value={filterCriteria.subject}
          onChange={handleFilterChange}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Фильтр по предмету"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Преподаватель</label>
        <input
          type="text"
          name="instructor"
          value={filterCriteria.instructor}
          onChange={handleFilterChange}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Фильтр по преподавателю"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Аудитория</label>
        <input
          type="text"
          name="room"
          value={filterCriteria.room}
          onChange={handleFilterChange}
          className="w-full px-3 py-2 border rounded-lg"
          placeholder="Фильтр по аудитории"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
        <input
          type="date"
          name="date"
          value={filterCriteria.date}
          onChange={handleFilterChange}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
    </div>
  );

  const renderScheduleTable = (data) => (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[
              { key: 'Instructor', label: 'Преподаватель' },
              { key: 'Subject', label: 'Предмет' },
              { key: 'Section', label: 'CRN' },
              { key: 'YearsOfStudy', label: 'Форма обучения' },
              { key: 'Course', label: 'Курс' },
              ...(selectedView === 'general' ? [{ key: 'Students_Count', label: 'Количество студентов' }] : []),
              { key: 'Date', label: 'Дата' },
              { key: 'Time_Slot', label: 'Время' },
              { key: 'Room', label: 'Аудитория' },
              { key: 'entry', label: 'Вход' }
            ].map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center space-x-1">
                  <span>{label}</span>
                  <ArrowUpDown size={14} className="text-gray-400" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td colSpan={selectedView === 'general' ? 10 : 9} className="px-6 py-4 text-center text-gray-500">
                Нет данных для отображения
              </td>
            </tr>
          ) : (
            data.map((exam, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">{exam.Instructor}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.Subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.Section}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.YearsOfStudy}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.Course}</td>
                {selectedView === 'general' && (
                  <td className="px-6 py-4 whitespace-nowrap">{exam.Students_Count}</td>
                )}
                <td className="px-6 py-4 whitespace-nowrap">{formatDate(exam.Date)}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.Time_Slot}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.Room}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEntryClick(exam)}
                    className="bg-blue-500"
                  >
                    <LogIn className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="container mx-auto p-4 space-y-4">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-red-600">
            NARXOZ University 
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilteredData(selectedView === 'general' ? scheduleData : studentSchedule)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <Filter className="w-5 h-5" />
              <span>Сбросить фильтры</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              <Download className="w-5 h-5" />
              <span>Экспорт в Excel</span>
            </button>
            <button
                    onClick={() => {
                      toast.info(`Список предметов успешно загружен`);
                      navigate(`/subjects/`);
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    <List className="w-5 h-5" />
                    <span>Список Предметов</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setSelectedView('general')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedView === 'general'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Общее расписание</span>
          </button>
          <button
            onClick={() => setSelectedView('student')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedView === 'student'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Расписание студента</span>
          </button>
        </div>

        {selectedView === 'student' && (
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Введите ID студента"
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={handleStudentSearch}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Search className="w-5 h-5" />
              <span>Найти</span>
            </button>
          </div>
        )}

        {renderFilterSection()}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-500">
              Найдено записей: {filteredData.length}
            </div>
            {renderScheduleTable(filteredData)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamScheduler;