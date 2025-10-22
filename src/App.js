import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, User, Download, ArrowUpDown, LogIn, Filter, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import { scheduleApi } from './services/Api';
import './styles/style.css';
import Navbar from './components/NavBar';
import AssignProctorModal from './components/AssignProctorModal';

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
    room: '',
    date: '',
    time: '',
    proctor: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);

  const handleProctor = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const onResetFilters = () => {
    setFilterCriteria({
    subject: '',
    instructor: '',
    section: '',
    room: '',
    date: '',
    time: '',
    proctor: ''
    });
  };
  

  const handleEntryClick = useCallback((examData) => {
    toast.info(`ВХОД В CRN ${examData.Section}`);
    navigate(`/section/${examData.Section}`);
  }, [navigate]);

// Функция, убирающая всё в круглых скобках и разбивающая по "+"
const parseRoomString = (roomString) => {
  if (typeof roomString !== "string") return [];
  const cleaned = roomString.replace(/\(.*?\)/g, "");
  return cleaned.split("+").map(s => s.trim()).filter(Boolean);
};


// Функция для проверки, совпадает ли аудитория (обёрнута в useCallback)
const matchesRoom = useCallback((roomString, filterValue) => {
  if (!filterValue) return true;
  const splittedRooms = parseRoomString(roomString);
  return splittedRooms.some(room => room.toLowerCase().includes(filterValue.toLowerCase()));
}, []);

const formatDate = useCallback((dateString) => new Date(dateString).toLocaleDateString('ru-RU'), []);

const filterData = useCallback((data) => {
  return data.filter(exam => {
    // Фильтр по аудитории
    const roomValue = filterCriteria.room.trim();
    const isRoomMatch = matchesRoom(exam.Room || '', roomValue);

    // Фильтр по времени
    const timeFilter = filterCriteria.time.trim();
    const matchesTime = exam.Time_Slot.toLowerCase().includes(timeFilter.toLowerCase());

    // Фильтр по проктору
    const proctorFilter = filterCriteria.proctor.trim().toLowerCase();
    const proctorValue = exam.Proctor ? exam.Proctor.toString().toLowerCase() : '';
    const matchesProctor = !proctorFilter || proctorValue.includes(proctorFilter);

    // Фильтр по предмету, преподавателю и секции
    const matchesSubject = exam.Subject.toLowerCase().includes(filterCriteria.subject.trim().toLowerCase());
    const matchesInstructor = exam.Instructor.toLowerCase().includes(filterCriteria.instructor.trim().toLowerCase());
    const matchesSection = exam.Section.toLowerCase().includes(filterCriteria.section.trim().toLowerCase());

    // Фильтр по дате (если указана)
    const matchesDate = !filterCriteria.date || exam.Date.includes(filterCriteria.date);

    return (
      matchesSubject &&
      matchesInstructor &&
      matchesSection &&
      matchesProctor &&
      matchesDate &&
      matchesTime &&
      isRoomMatch
    );
  });
}, [filterCriteria, matchesRoom]); // Добавили matchesRoom в зависимости


  
  

  const sortData = useCallback((data, key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    const sorted = [...data].sort((a, b) => {
      const aValue = a[key] === null || a[key] === undefined || (typeof a[key] === 'number' && isNaN(a[key])) ? '' : a[key];
      const bValue = b[key] === null || b[key] === undefined || (typeof b[key] === 'number' && isNaN(b[key])) ? '' : b[key];
      
      if (aValue < bValue) return direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return direction === 'ascending' ? 1 : -1;
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
    const schedulePromise = scheduleApi.getGeneralSchedule()
      .then(data => {
        const sanitizedData = (data || []).map(item => ({
      ...item,
      Room: item.Room ? String(item.Room) : "",
      Date: item.Date ? String(item.Date) : "",
      Subject: item.Subject ? String(item.Subject) : "",
      Teacher: item.Teacher ? String(item.Teacher) : "",
    }));
  
        setScheduleData(sanitizedData);
        setFilteredData(sanitizedData);
      });
  
    toast.promise(schedulePromise, {
      pending: "Загрузка расписания...",
      success: "Расписание успешно загружено",
      error: "Ошибка при загрузке расписания"
    });
  
    try {
      setLoading(true);
      await schedulePromise;
    } catch (err) {
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
      
      const sanitizedData = data.map(item => {
        const newItem = {...item};
        Object.keys(newItem).forEach(key => {
          if (typeof newItem[key] === 'number' && isNaN(newItem[key])) {
            newItem[key] = null;
          }
        });
        return newItem;
      });
      
      setStudentSchedule(sanitizedData);
      setFilteredData(sanitizedData);
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

  const handleDownloadProctors = async () => {
    try {
        await scheduleApi.exportDownloadProctors();
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
      {/* Фильтр по проктору */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
        <label className="form-label">Проктор</label>
        <input type="text" name="proctor" value={filterCriteria.proctor} onChange={handleFilterChange} className="form-control" placeholder="Фильтр по проктору" />
      </div>
      {/* Назначить проктора */}
      <div className="col-12 col-sm-6 col-md-4 col-lg-3">
      <label className="form-label">Назначить Проктора</label>
            <button
              onClick={handleProctor}
              className="btn btn-red text-white d-flex gap-2"
              style={{ backgroundColor: '#C8102E' }}
            >
               <UserPlus size={20}/>
            </button>
      </div>
      <AssignProctorModal show={showModal} onClose={handleCloseModal} />
    </div>
  );

  const renderScheduleTable = (data) => (
  <div className="table-responsive rounded-lg shadow-sm table-container">
    <table className="table table-narxoz">
      <thead>
        <tr>
          {[
            { key: 'Instructor', label: 'Преподаватель' },
            { key: 'Subject', label: 'Предмет' },
            { key: 'Section', label: 'CRN' },
            { key: 'Date', label: 'Дата' },
            { key: 'Time_Slot', label: 'Время' },
            { key: 'Room', label: 'Аудитория' },
            { key: 'Proctor', label: 'Проктор' },
            // { key: 'actions', label: 'Действия', disableSort: true},
            { key: 'entry', label: 'Вход' }
          ].map(({ key, label }) => (
            <th
              key={key}
              onClick={() => key !== 'entry' && handleSort(key)}
              className="align-middle"
            >
              <div className="d-flex align-items-center justify-content-between">
                <span>{label}</span>
                {key !== 'entry' && <ArrowUpDown size={16} className="ms-2" />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td 
              colSpan={10} 
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
                <span className="badge bg-red-20 text-red">
                  {exam.Room}
                </span>
              </td>
              <td data-label="Проктор">{exam.Proctor}</td>
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
      <Navbar />

      <div className="container mt-4">
        <div className="row g-3 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap">
            <div className="d-flex gap-3 flex-wrap">
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
          <div className="d-flex gap-3 mt-2 flex-wrap">
          <button
            className="btn btn-red text-white d-flex align-items-center gap-2"
            style={{ backgroundColor: '#C8102E' }}
            onClick={handleDownloadProctors}
          >
            <Download size={20} />
            Скачать список прокторов
          </button>

            <button
              onClick={onResetFilters}
              className="btn btn-outline-red d-flex align-items-center gap-2"
              style={{ color: '#C8102E', borderColor: '#C8102E' }}
            >
              <Filter size={20} />
              <span>Сбросить фильтры</span>
            </button>

            <button
              onClick={handleExport}
              className="btn btn-red text-white d-flex align-items-center gap-2"
              style={{ backgroundColor: '#C8102E' }}
            >
              <Download size={20} />
              Экспорт
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