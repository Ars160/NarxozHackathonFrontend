import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Search, User, Download, ArrowUpDown, LogIn, Filter, UserPlus, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    <div className="mb-6">
      {/* Mobile: collapsible toggle */}
      <button
        onClick={() => setFiltersOpen(o => !o)}
        className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-sm font-medium text-gray-700 mb-2"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-[#C8102E]" />
          <span>Фильтры</span>
          {Object.values(filterCriteria).some(v => v) && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#C8102E] text-white text-xs font-bold">
              {Object.values(filterCriteria).filter(v => v).length}
            </span>
          )}
        </div>
        {filtersOpen
          ? <ChevronUp size={16} className="text-gray-400" />
          : <ChevronDown size={16} className="text-gray-400" />
        }
      </button>

      {/* Filter fields: always visible on desktop, collapsible on mobile */}
      <div className={`${filtersOpen ? 'block' : 'hidden'} md:block`}>
        <Card className="border-0 shadow-sm rounded-xl bg-white overflow-visible">
          <CardContent className="p-4 md:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 md:gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Преподаватель</label>
                <Input type="text" name="instructor" value={filterCriteria.instructor} onChange={handleFilterChange} placeholder="Преподаватель" className="bg-gray-50 border-gray-200 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Предмет</label>
                <Input type="text" name="subject" value={filterCriteria.subject} onChange={handleFilterChange} placeholder="Предмет" className="bg-gray-50 border-gray-200 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">CRN</label>
                <Input type="text" name="section" value={filterCriteria.section} onChange={handleFilterChange} placeholder="CRN" className="bg-gray-50 border-gray-200 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Аудитория</label>
                <Input type="text" name="room" value={filterCriteria.room} onChange={handleFilterChange} placeholder="Аудитория" className="bg-gray-50 border-gray-200 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Дата</label>
                <Input type="date" name="date" value={filterCriteria.date} onChange={handleFilterChange} className="bg-gray-50 border-gray-200 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Проктор</label>
                <Input type="text" name="proctor" value={filterCriteria.proctor} onChange={handleFilterChange} placeholder="Проктор" className="bg-gray-50 border-gray-200 h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block">&nbsp;</label>
                <Button
                  onClick={handleProctor}
                  className="bg-[#C8102E] hover:bg-[#A00D26] text-white w-full flex gap-2 rounded-lg h-9 shadow-sm border-0 text-sm"
                >
                  <UserPlus size={16}/>
                  <span className="xl:hidden">Назн. проктора</span>
                </Button>
              </div>
            </div>
          </CardContent>
          <AssignProctorModal show={showModal} onClose={handleCloseModal} />
        </Card>
      </div>
    </div>
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
        {/* ── Top bar: view toggle + action buttons ── */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-5">
          {/* View toggle — full width on mobile */}
          <div className="flex gap-1.5 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-full sm:w-auto">
            <button
              onClick={() => setSelectedView('general')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedView === 'general'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Calendar size={15} />
              Расписание
            </button>
            <button
              onClick={() => setSelectedView('student')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedView === 'student'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <User size={15} />
              По студенту
            </button>
          </div>

          {/* Action buttons (Desktop) */}
          <div className="hidden sm:flex flex-wrap gap-2">
            <Button
              onClick={handleDownloadProctors}
              className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-1.5 rounded-xl shadow-sm h-9 px-3 text-xs md:text-sm"
              title="Скачать список прокторов (.xlsx)"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Список прокторов</span>
              <span className="sm:hidden">Прокторы</span>
            </Button>
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="text-[#C8102E] border-[#C8102E] hover:bg-[#F8E8E8] flex items-center gap-1.5 rounded-xl h-9 px-3 text-xs md:text-sm"
              title="Сбросить все фильтры"
            >
              <Filter size={14} />
              Сбросить
            </Button>
            <Button
              onClick={handleExport}
              className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-1.5 rounded-xl shadow-sm h-9 px-3 text-xs md:text-sm"
              title="Экспорт полного расписания"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Экспорт расписания</span>
              <span className="sm:hidden">.xlsx</span>
            </Button>
          </div>
        </div>

        {/* ── Student search bar — smooth animation via inline style ── */}
        <div
          style={{
            maxHeight: selectedView === 'student' ? '100px' : '0px',
            opacity: selectedView === 'student' ? 1 : 0,
            marginBottom: selectedView === 'student' ? '20px' : '0px',
            overflow: 'hidden',
            transition: 'max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease, margin-bottom 0.4s ease',
          }}
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Поиск по ID студента</p>
            <div
              className={`flex items-center rounded-lg overflow-hidden border transition-colors duration-200 ${
                studentId ? 'border-[#C8102E]' : 'border-gray-200 focus-within:border-[#C8102E]'
              }`}
            >
              <div className="pl-3 pr-2 flex items-center shrink-0">
                <User size={15} className={`transition-colors duration-200 ${studentId ? 'text-[#C8102E]' : 'text-gray-300'}`} />
              </div>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStudentSearch()}
                placeholder="Например: S23071631"
                className="flex-1 h-9 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-300"
              />
              <button
                onClick={handleStudentSearch}
                className="bg-[#C8102E] hover:bg-[#A00D26] active:scale-95 text-white h-9 px-4 flex items-center gap-1.5 transition-all duration-150 font-medium text-sm"
              >
                <Search size={15} />
                <span className="hidden sm:inline">Найти</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Action buttons (Mobile) - Centered below search ── */}
        <div className="flex sm:hidden flex-wrap justify-center w-full gap-2 mb-6">
          <Button
            onClick={handleDownloadProctors}
            className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-1.5 rounded-xl shadow-sm h-9 px-3 text-xs"
            title="Скачать список прокторов (.xlsx)"
          >
            <Download size={14} />
            <span>Прокторы</span>
          </Button>
          <Button
            variant="outline"
            onClick={onResetFilters}
            className="text-[#C8102E] border-[#C8102E] hover:bg-[#F8E8E8] flex items-center gap-1.5 rounded-xl h-9 px-3 text-xs"
            title="Сбросить все фильтры"
          >
            <Filter size={14} />
            <span>Сбросить</span>
          </Button>
          <Button
            onClick={handleExport}
            className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-1.5 rounded-xl shadow-sm h-9 px-3 text-xs"
            title="Экспорт полного расписания"
          >
            <Download size={14} />
            <span>Экспорт</span>
          </Button>
        </div>

        {renderFilterSection()}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="text-gray-500">Загрузка данных...</p>
          </div>
        ) : (
          <div>
            <div className="mb-3 text-sm text-gray-500 font-medium">
              Найдено записей: <span className="text-[#C8102E] font-semibold">{filteredData.length}</span>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              {renderScheduleTable(filteredData)}
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filteredData.length === 0 ? (
                <div className="text-center py-14 text-gray-400">
                  <div className="text-4xl mb-2">😕</div>
                  <p className="text-sm">Нет данных для отображения</p>
                </div>
              ) : (
                filteredData.map((exam, index) => (
                  <Card key={index} className="border-0 shadow-sm rounded-2xl p-4 space-y-3 bg-white">
                    {/* Subject + CRN */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-gray-900 text-sm leading-snug flex-1">{exam.Subject}</p>
                      <Badge className="bg-[#F8E8E8] text-[#C8102E] border-0 hover:bg-[#F8E8E8] shrink-0 font-semibold">
                        {exam.Section}
                      </Badge>
                    </div>
                    {/* Instructor */}
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <User size={13} className="text-gray-400 shrink-0" />
                      {exam.Instructor}
                    </p>
                    {/* Date / Time / Room */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-gray-400 mb-0.5">Дата</p>
                        <p className="font-medium text-gray-700">{formatDate(exam.Date)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-gray-400 mb-0.5">Время</p>
                        <p className="font-medium text-gray-700">{exam.Time_Slot}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                        <p className="text-gray-400 mb-0.5">Ауд.</p>
                        <p className="font-medium text-[#C8102E]">{exam.Room}</p>
                      </div>
                    </div>
                    {/* Proctor + Entry */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">
                        {exam.Proctor ? `Проктор: ${exam.Proctor}` : 'Проктор не назначен'}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleEntryClick(exam)}
                        className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-1.5 rounded-xl shadow-sm h-8 px-3 text-xs"
                      >
                        <LogIn size={13} /> Войти
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamScheduler;