import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, User, Download, ArrowUpDown, LogIn, Filter, UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import { scheduleApi } from './services/Api';
import './styles/style.css';
import Navbar from './components/NavBar';
import AssignProctorModal from './components/AssignProctorModal';
import { Card, CardContent } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Badge } from './components/ui/badge';

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
    const matchesDate = !filterCriteria.date || (() => {
      try {
        // Нормализуем дату из базы данных в формат YYYY-MM-DD
        const examDate = new Date(exam.Date).toISOString().split('T')[0];
        return examDate === filterCriteria.date;
      } catch (e) {
        return false;
      }
    })();

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
}, [filterCriteria, matchesRoom]);

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
    <Card className="mb-6 border-0 shadow-sm rounded-xl bg-white overflow-visible">
      <CardContent className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
          {/* Фильтр по преподавателю */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Преподаватель</label>
            <Input type="text" name="instructor" value={filterCriteria.instructor} onChange={handleFilterChange} placeholder="Преподаватель" className="bg-gray-50 border-gray-200 focus-visible:ring-red" />
          </div>
          {/* Фильтр по предмету */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Предмет</label>
            <Input type="text" name="subject" value={filterCriteria.subject} onChange={handleFilterChange} placeholder="Предмет" className="bg-gray-50 border-gray-200 focus-visible:ring-red" />
          </div>
          {/* Фильтр по CRN */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">CRN</label>
            <Input type="text" name="section" value={filterCriteria.section} onChange={handleFilterChange} placeholder="CRN" className="bg-gray-50 border-gray-200 focus-visible:ring-red" />
          </div>
          {/* Фильтр по аудитории */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Аудитория</label>
            <Input type="text" name="room" value={filterCriteria.room} onChange={handleFilterChange} placeholder="Аудитория" className="bg-gray-50 border-gray-200 focus-visible:ring-red" />
          </div>
          {/* Фильтр по дате */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Дата</label>
            <Input type="date" name="date" value={filterCriteria.date} onChange={handleFilterChange} className="bg-gray-50 border-gray-200 focus-visible:ring-red" />
          </div>
          {/* Фильтр по проктору */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Проктор</label>
            <Input type="text" name="proctor" value={filterCriteria.proctor} onChange={handleFilterChange} placeholder="Проктор" className="bg-gray-50 border-gray-200 focus-visible:ring-red" />
          </div>
          {/* Назначить проктора */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block">&nbsp;</label>
            <Button
              onClick={handleProctor}
              className="bg-red hover:bg-red-700 text-white w-full flex gap-2 rounded-lg py-2 h-10 shadow-sm border-0"
              style={{ backgroundColor: '#C8102E' }}
            >
               <UserPlus size={18}/>
               <span className="xl:hidden">Назначить Проктора</span>
            </Button>
          </div>
        </div>
      </CardContent>
      <AssignProctorModal show={showModal} onClose={handleCloseModal} />
    </Card>
  );

  const renderScheduleTable = (data) => (
    <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#C8102E] hover:bg-[#C8102E]">
            {[
              { key: 'Instructor', label: 'Преподаватель' },
              { key: 'Subject', label: 'Предмет' },
              { key: 'Section', label: 'CRN' },
              { key: 'Date', label: 'Дата' },
              { key: 'Time_Slot', label: 'Время' },
              { key: 'Room', label: 'Аудитория' },
              { key: 'Proctor', label: 'Проктор' },
              { key: 'entry', label: 'Вход' }
            ].map(({ key, label }) => (
              <TableHead
                key={key}
                onClick={() => key !== 'entry' && handleSort(key)}
                className={`text-white font-medium align-middle ${key !== 'entry' ? 'cursor-pointer hover:text-red-100 transition-colors' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span>{label}</span>
                  {key !== 'entry' && <ArrowUpDown size={14} className="opacity-70" />}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={8} 
                className="text-center py-10 text-gray-500"
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="text-4xl mb-3">&#128533;</span>
                  Нет данных для отображения
                </div>
              </TableCell>
            </TableRow>
          ) : (
            data.map((exam, index) => (
              <TableRow key={index} className="hover:bg-[#F8E8E8]/50 transition-colors">
                <TableCell className="font-medium">{exam.Instructor}</TableCell>
                <TableCell className="font-semibold text-gray-900">{exam.Subject}</TableCell>
                <TableCell className="text-[#C8102E] font-medium">{exam.Section}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(exam.Date)}</TableCell>
                <TableCell className="whitespace-nowrap">{exam.Time_Slot}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-[#F8E8E8] text-[#C8102E] hover:bg-[#F8E8E8]">
                    {exam.Room}
                  </Badge>
                </TableCell>
                <TableCell>{exam.Proctor}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => handleEntryClick(exam)}
                    size="sm"
                    className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center justify-center gap-1 shadow-sm"
                  >
                    <LogIn size={16} />
                    <span>Вход</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-[#2D2D2D]">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={selectedView === 'general' ? 'default' : 'outline'}
              onClick={() => setSelectedView('general')}
              className={`flex items-center gap-2 h-11 px-6 rounded-xl ${selectedView === 'general' ? 'bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-md' : 'text-[#C8102E] border-[#C8102E] hover:bg-[#F8E8E8]'}`}
            >
              <Calendar size={18} />
              <span className="text-base font-medium">Общее расписание</span>
            </Button>
            <Button
              variant={selectedView === 'student' ? 'default' : 'outline'}
              onClick={() => setSelectedView('student')}
              className={`flex items-center gap-2 h-11 px-6 rounded-xl ${selectedView === 'student' ? 'bg-[#C8102E] hover:bg-[#A00D26] text-white shadow-md' : 'text-[#C8102E] border-[#C8102E] hover:bg-[#F8E8E8]'}`}
            >
              <User size={18} />
              <span className="text-base font-medium">Студент</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleDownloadProctors}
              className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-2 rounded-xl shadow-sm"
            >
              <Download size={18} />
              Скачать список прокторов
            </Button>
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="text-[#C8102E] border-[#C8102E] hover:bg-[#F8E8E8] flex items-center gap-2 rounded-xl"
            >
              <Filter size={18} />
              Сбросить фильтры
            </Button>
            <Button
              onClick={handleExport}
              className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-2 rounded-xl shadow-sm"
            >
              <Download size={18} />
              Экспорт
            </Button>
          </div>
        </div>

        {selectedView === 'student' && (
          <div className="mb-6 w-full md:max-w-md">
            <div className="flex items-center rounded-xl overflow-hidden shadow-sm border border-[#C8102E]">
              <Input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Введите ID студента"
                className="border-0 rounded-none h-11 focus-visible:ring-0 text-base"
              />
              <button
                onClick={handleStudentSearch}
                className="bg-[#C8102E] hover:bg-[#A00D26] text-white h-11 px-6 transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
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
            <div className="mb-4 text-sm text-gray-500">Найдено записей: {filteredData.length}</div>
            {renderScheduleTable(filteredData)}
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamScheduler;