import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, User, Download, Filter, ArrowUpDown, LogIn, List } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { scheduleApi } from './Api';
import './style.css';

const ExamScheduler = () => {
  const [scheduleData, setScheduleData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [selectedView, setSelectedView] = useState('general');
  const [loading, setLoading] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    subject: '',
    instructor: '',
    section: '',
    stud_count: '',
    room: '',
    date: '',
    time: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const navigate = useNavigate();

  // Обработчик перехода с уведомлением
  const handleEntryClick = useCallback((examData) => {
    toast.info(`ВХОД В CRN ${examData.Section}`);
    navigate(`/section/${examData.Section}`);
  }, [navigate]);

  const formatDate = useCallback((dateString) => new Date(dateString).toLocaleDateString('ru-RU'), []);

  const filterData = useCallback((data) => {
    return data.filter(exam => {
      const timeFilter = filterCriteria.time.toLowerCase().trim();
      const matchesTime = exam.Time_Slot.toLowerCase().includes(timeFilter);
  
      const roomValue = filterCriteria.room.trim();
      const matchesRoom = roomValue 
        ? exam.Room.toString() === roomValue
        : true;
  
      const studCount = filterCriteria.stud_count.trim();
      const matchesStudCount = studCount 
        ? exam.Students_Count === parseInt(studCount, 10)
        : true;
  
      return (
        exam.Subject.toLowerCase().includes(filterCriteria.subject.toLowerCase().trim()) &&
        exam.Instructor.toLowerCase().includes(filterCriteria.instructor.toLowerCase().trim()) &&
        exam.Section.toLowerCase().includes(filterCriteria.section.toLowerCase().trim()) &&
        matchesStudCount &&
        matchesRoom &&
        (filterCriteria.date === '' || exam.Date.includes(filterCriteria.date)) &&
        matchesTime
      );
    });
  }, [filterCriteria]);

  const sortData = useCallback((data, key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    const sorted = [...data].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'ascending' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'ascending' ? 1 : -1;
      return 0;
    });
    setSortConfig({ key, direction });
    return sorted;
  }, [sortConfig]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterCriteria(prev => ({ ...prev, [name]: value }));
  };

  const handleSort = (key) => {
    setFilteredData(prev => sortData(prev, key));
  };

  const fetchScheduleData = useCallback(async () => {
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
  }, []);

  const fetchStudentSchedule = useCallback(async (id) => {
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
  }, []);

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
  }, [fetchScheduleData]);

  useEffect(() => {
    const dataToFilter = selectedView === 'general' ? scheduleData : studentSchedule;
    setFilteredData(filterData(dataToFilter));
  }, [filterCriteria, selectedView, scheduleData, studentSchedule, filterData]);

  const handleStudentSearch = () => {
    if (studentId.trim()) {
      fetchStudentSchedule(studentId);
      setSelectedView('student');
    } else {
      toast.warning('Пожалуйста, введите ID студента');
    }
  };

  const renderFilterSection = () => (
    <div className="row g-3 mb-4 p-4 bg-gray-50 rounded-lg">
      {/* Фильтр по преподавателю */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">Преподаватель</label>
        <input type="text" name="instructor" value={filterCriteria.instructor} onChange={handleFilterChange} className="form-control" placeholder="Фильтр по преподавателю" />
      </div>
      {/* Фильтр по предмету */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">Предмет</label>
        <input type="text" name="subject" value={filterCriteria.subject} onChange={handleFilterChange} className="form-control" placeholder="Фильтр по предмету" />
      </div>
      {/* Фильтр по CRN */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">CRN</label>
        <input type="text" name="section" value={filterCriteria.section} onChange={handleFilterChange} className="form-control" placeholder="Фильтр по CRN" />
      </div>
      {/* Фильтр по Количество Студентов */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">Количество студентов</label>
        <input type="text" name="stud_count" value={filterCriteria.stud_count} onChange={handleFilterChange} className="form-control" placeholder="Фильтр по количество студентов" />
      </div>
       {/* Фильтр по аудитории */}
       <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">Аудитория</label>
        <input type="text" name="room" value={filterCriteria.room} onChange={handleFilterChange} className="form-control" placeholder="Фильтр по аудитории" />
      </div>
      {/* Фильтр по дате */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">Дата</label>
        <input type="date" name="date" value={filterCriteria.date} onChange={handleFilterChange} className="form-control" />
      </div>
    </div>
  );

  const renderScheduleTable = (data) => (
  <div className="table-responsive  rounded-lg shadow-sm">
    <table className="table table-narxoz">
      <thead>
        <tr>
          {[
            { key: 'Instructor', label: 'Преподаватель' },
            { key: 'Subject', label: 'Предмет' },
            { key: 'Section', label: 'CRN' },
            { key: 'Students_Count', label: 'Количество студентов' },
            { key: 'Date', label: 'Дата' },
            { key: 'Time_Slot', label: 'Время' },
            { key: 'Room', label: 'Аудитория' },
            { key: 'entry', label: 'Вход' }
          ].map(({ key, label }) => (
            <th
              key={key}
              onClick={() => handleSort(key)}
              className="align-middle"
            >
              <div className="d-flex align-items-center justify-content-between">
                <span>{label}</span>
                <ArrowUpDown size={16} className="ms-2" />
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td 
              colSpan={selectedView === 'general' ? 10 : 9} 
              className="text-center py-4 text-muted"
            >
              <div className="d-flex flex-column align-items-center">
                <span className="h5 mb-3">&#128533;</span>
                Нет данных для отображения
              </div>
            </td>
          </tr>
        ) : (
          data.map((exam, index) => (
            <tr key={index}>
              <td data-label="Преподаватель">{exam.Instructor}</td>
              <td data-label="Предмет" className="fw-semibold">
                {exam.Subject}
              </td>
              <td data-label="CRN" className="text-primary">
                {exam.Section}
              </td>
                <td data-label="Количество студентов">
                  <span className="badge bg-red-20 text-red rounded-pill">
                    {exam.Students_Count}
                  </span>
                </td>
              <td data-label="Дата">
                <div className="d-flex flex-column">
                  <span className="text-nowrap">
                    {formatDate(exam.Date)}
                  </span>
                </div>
              </td>
              <td data-label="Время" className="text-nowrap">
                {exam.Time_Slot}
              </td>
              <td data-label="Аудитория">
                <span className="badge bg-gray-100 text-dark rounded">
                  {exam.Room}
                </span>
              </td>
              <td data-label="Вход">
                <button
                  onClick={() => handleEntryClick(exam)}
                  className="btn btn-red btn-sm d-inline-flex align-items-center"
                >
                  <LogIn size={16} className="me-1" />
                  <span>Вход</span>
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
    <div className="container-fluid p-0 min-vh-100">
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

      {/* Увеличенный навбар */}
      <nav className="navbar navbar-expand-lg bg-red text-white py-3 shadow-sm" style={{ backgroundColor: '#C8102E' }}>
        <div className="container">
          <h1 className="navbar-brand mb-0 h2 text-white">NARXOZ UNIVERSITY</h1>
          <div className="d-flex gap-3 align-items-center">
            <button
              onClick={() => setFilteredData(selectedView === 'general' ? scheduleData : studentSchedule)}
              className="btn btn-outline-light d-flex align-items-center gap-2"
            >
              <Filter size={20} />
              <span>Сбросить фильтры</span>
            </button>
            <button
              onClick={handleExport}
              className="btn btn-light text-red d-flex align-items-center gap-2"
              style={{ color: '#C8102E' }}
            >
              <Download size={20} />
              <span>Экспорт</span>
            </button>
            <button
              onClick={() => navigate('/subjects/')}
              className="btn btn-light text-red d-flex align-items-center gap-2"
              style={{ color: '#C8102E' }}
            >
              <List size={20} />
              <span>Предметы</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        <div className="row g-3 mb-4">
          <div className="col-12">
            <div className="d-flex gap-3">
              <button
                onClick={() => setSelectedView('general')}
                className={`btn ${selectedView === 'general' ? 'btn-red text-white' : 'btn-outline-red'} d-flex align-items-center gap-2 py-2 px-4`}
                style={{ 
                  backgroundColor: selectedView === 'general' ? '#C8102E' : 'transparent',
                  borderColor: '#C8102E',
                  color: selectedView === 'general' ? 'white' : '#C8102E'
                }}
              >
                <Calendar size={20} />
                <span className="fs-5">Общее расписание</span>
              </button>
              <button
                onClick={() => setSelectedView('student')}
                className={`btn ${selectedView === 'student' ? 'btn-red text-white' : 'btn-outline-red'} d-flex align-items-center gap-2 py-2 px-4`}
                style={{ 
                  backgroundColor: selectedView === 'student' ? '#C8102E' : 'transparent',
                  borderColor: '#C8102E',
                  color: selectedView === 'student' ? 'white' : '#C8102E'
                }}
              >
                <User size={20} />
                <span className="fs-5">Студент</span>
              </button>
            </div>
          </div>

          {selectedView === 'student' && (
            <div className="col-12 col-md-6">
              <div className="input-group">
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Введите ID студента"
                  className="form-control border-red py-2"
                  style={{ borderColor: '#C8102E' }}
                />
                <button
                  onClick={handleStudentSearch}
                  className="btn btn-red text-white"
                  style={{ backgroundColor: '#C8102E' }}
                >
                  <Search size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {renderFilterSection()}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 text-sm text-gray-500">Найдено записей: {filteredData.length}</div>
            {renderScheduleTable(filteredData)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamScheduler;
