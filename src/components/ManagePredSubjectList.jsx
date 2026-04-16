import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Trash2, BookOpen, Users, Calendar, CheckCircle, ArrowUpDown, ChevronDown, ChevronRight, Search, Loader2 } from 'lucide-react';
import '../styles/style.css';
import Navbar from './NavBar';
import { scheduleApi } from '../services/Api';
import { GlobalLoader, LocalLoader } from './Loaderss';
import { authHeaders } from '../utils/authHeaders';

const ManagePredSubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectGroups, setSubjectGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('section');
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState({});

  const [classroomNumber, setClassroomNumber] = useState('107');
  const [freeSlots, setFreeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotForSection, setSelectedSlotForSection] = useState({});
  const [pendingBookings, setPendingBookings] = useState([]);
  const [commitLoading, setCommitLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSubjects = async () => {
    try {
      const data = await scheduleApi.getSubAdminsStatus();

      if (!data.has_drafts) {
        navigate("/");
        return;
      }

      if (Array.isArray(data.subAdmins)) {
        const currentRole = localStorage.getItem("role");
        const found = data.subAdmins.find(
          (item) => item.role === currentRole && item.status === "ready"
        );

        if (found) {
          navigate("/", { state: { message: "Вы уже сделали свою школу", type: "info" } });
          return;
        }
      }

      const subjects = await scheduleApi.getSubjects();
      setSubjects(Array.isArray(subjects) ? subjects : []);

    } catch (error) {
      toast.error('Ошибка при загрузке списка предметов');
      setSubjects([]);
    }
  };

  const fetchSubjectGroups = async (subject) => {
    // Если уже открыт этот предмет, закрываем его
    if (selectedSubject === subject) {
      setSelectedSubject(null);
      return;
    }

    setGroupsLoading(true);
    
    try {
      const response = await fetch(`http://localhost:5000/subjects/${encodeURIComponent(subject)}/groups`, authHeaders());
      
      if (!response.ok) {
        setSelectedSubject(null);
        toast.info(`Группы для предмета "${subject}" не найдены`);
        return;
      }

      const data = await response.json();
      const groupsArray = [];
      
      if (data.groups && typeof data.groups === 'object') {
        for (const eduProgram in data.groups) {
          if (Array.isArray(data.groups[eduProgram])) {
            groupsArray.push(...data.groups[eduProgram].map(group => {
              const localChanges = pendingChanges[group.Section] || {};
              
              return {
                ...group,
                EduProgram: eduProgram,
                has_exam: localChanges.has_exam ?? group.has_exam ?? true,
                has_proctor: localChanges.has_proctor ?? group.has_proctor ?? true,
                two_rooms_needed: localChanges.two_rooms_needed ?? group.two_rooms_needed ?? false,
                bookedSlotId: group.bookedSlotId ?? null,
                classroom_type: localChanges.classroom_type ?? group.classroom_type ?? 'regular',
                duration: localChanges.duration ?? group.duration ?? 180
              };
            }));
          }
        }
      }

      setSubjectGroups(prev => ({ ...prev, [subject]: groupsArray }));
      setSelectedSubject(subject);

    } catch (error) {
      toast.error(`Ошибка при загрузке групп для предмета "${subject}"`);
    } finally {
      setGroupsLoading(false);
    }
  };

  const deleteSubject = async (subject) => {
    if (window.confirm(`Удалить все группы предмета "${subject}"?`)) {
      try {
        await scheduleApi.deleteSubject(subject);
        fetchSubjects();
        
        setSubjectGroups(prev => {
          const updated = { ...prev };
          delete updated[subject];
          return updated;
        });
        
        if (selectedSubject === subject) {
          setSelectedSubject(null);
        }
        
        toast.success(`Предмет "${subject}" удален`);
      } catch (error) {
        toast.error(`Ошибка удаления предмета "${subject}"`);
      }
    }
  };

  const deleteSection = async (section) => {
    if (window.confirm(`Удалить секцию "${section}"?`)) {
      try {
        await scheduleApi.deleteSection(section);
        
        setSubjectGroups(prev => {
          const updatedGroups = { ...prev };
          updatedGroups[selectedSubject] = updatedGroups[selectedSubject].filter(
            g => g.Section !== section
          );
          return updatedGroups;
        });

        setPendingBookings(prev => prev.filter(b => b.sectionId !== section));
        
        toast.success(`Секция "${section}" удалена`);
      } catch (error) {
        toast.error('Ошибка удаления секции');
      }
    }
  };

  const handleClassroomTypeChange = (sectionId, newType) => {
    setSubjectGroups(prev => {
      const updated = { ...prev };
      updated[selectedSubject] = updated[selectedSubject].map(g =>
        g.Section === sectionId ? { ...g, classroom_type: newType } : g
      );
      return updated;
    });

    setPendingChanges(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        classroom_type: newType
      }
    }));
  };

  const handleDurationChange = async (sectionId, newDuration) => {
    setSubjectGroups(prev => {
      const updated = { ...prev };
      updated[selectedSubject] = updated[selectedSubject].map(g =>
        g.Section === sectionId ? { ...g, duration: newDuration } : g
      );
      return updated;
    });
    setPendingChanges(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] || {}), duration: newDuration }
    }));
    const res = await fetch('http://localhost:5000/api/update_exam_durations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders().headers },
      body: JSON.stringify({ exams: [{ section_id: sectionId, duration: newDuration }] })
    });
    res.ok ? toast.success('Длительность обновлена') : toast.error('Ошибка обновления');
  };

  const handleReady = async () => {
    if (!window.confirm('Подтвердить готовность и отправить все накопленные изменения?')) return;

    const userRole = localStorage.getItem('role');
    const allowedRoles = ['admin-gum', 'admin-sdt', 'admin-sem', 'admin-spigu'];
    if (!allowedRoles.includes(userRole)) {
      toast.error('Эта функция доступна только для subAdmin');
      return;
    }

    setReadyLoading(true);

    const examsPayload = Object.entries(pendingChanges).map(([sectionId, changes]) => ({
      section_id: sectionId,
      has_exam: changes.has_exam,
      has_proctor: changes.has_proctor,
      two_rooms_needed: changes.two_rooms_needed,
      classroom_type: changes.classroom_type,
      duration: changes.duration
    }));

    const bookingsPayload = pendingBookings.map(b => ({
      slot_id: Number(b.slotId),
      subject: b.subject,
      sections: [b.sectionId]
    }));

    try {
      const baseAuth = authHeaders() || {};
      const headers = {
        ...(baseAuth.headers || {}),
        'Content-Type': 'application/json'
      };

      const promises = [];

      if (bookingsPayload.length > 0) {
        promises.push(
          fetch('http://localhost:5000/api/slots/book', {
            ...(baseAuth || {}),
            method: 'POST',
            headers,
            body: JSON.stringify(bookingsPayload)
          }).then(async (res) => {
            if (!res.ok) {
              const t = await res.text().catch(()=> '');
              throw new Error(`Ошибка бронирования: ${res.status} ${t}`);
            }
            return res.json();
          })
        );
      }

      if (examsPayload.length > 0) {
        promises.push(scheduleApi.updateExamBatch({ exams: examsPayload }));
      }

      await Promise.all(promises);
      await scheduleApi.setSubAdminStatus({ status: 'ready' });

      setPendingBookings([]);
      setPendingChanges({});

      toast.success('Все изменения отправлены, статус: готово');
      navigate('/');
    } catch (error) {
      toast.error(`Ошибка при отправке: ${error.message || error}`);
    } finally {
      setReadyLoading(false);
    }
  };

  const handleExamToggle = (sectionId, checked) => {
    const updatedGroups = subjectGroups[selectedSubject].map(group =>
      group.Section === sectionId
        ? { 
            ...group, 
            has_exam: checked,
            has_proctor: checked ? group.has_proctor : false,
            two_rooms_needed: checked ? group.two_rooms_needed : false
          }
        : group
    );

    setSubjectGroups(prev => ({
      ...prev,
      [selectedSubject]: updatedGroups
    }));

    setPendingChanges(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        has_exam: checked,
        has_proctor: checked ? (prev[sectionId]?.has_proctor ?? true) : false,
        two_rooms_needed: checked ? (prev[sectionId]?.two_rooms_needed ?? false) : false
      }
    }));
  };

  const handleProctorToggle = (sectionId, checked) => {
    const group = subjectGroups[selectedSubject].find(g => g.Section === sectionId);

    if (checked && !group.has_exam) {
      toast.warning('Нельзя включить проктора без экзамена');
      return;
    }

    const updatedGroups = subjectGroups[selectedSubject].map(group =>
      group.Section === sectionId ? { ...group, has_proctor: checked } : group
    );

    setSubjectGroups(prev => ({
      ...prev,
      [selectedSubject]: updatedGroups
    }));

    setPendingChanges(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        has_proctor: checked
      }
    }));
  };

  const handleRoomReqToggle = (sectionId, checked) => {
    const group = subjectGroups[selectedSubject].find(g => g.Section === sectionId);

    if (!group) {
      toast.error('Секция не найдена');
      return;
    }

    if (checked && !group.has_exam) {
      toast.warning('Нельзя включить требование аудитории без экзамена');
      return;
    }

    const updatedGroups = subjectGroups[selectedSubject].map(group =>
      group.Section === sectionId ? { ...group, two_rooms_needed: checked } : group
    );

    setSubjectGroups(prev => ({
      ...prev,
      [selectedSubject]: updatedGroups
    }));

    setPendingChanges(prev => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        two_rooms_needed: checked
      }
    }));
  };

  const handleToggleAllExams = (enable) => {
    if (!selectedSubject) return;

    const updatedGroups = subjectGroups[selectedSubject].map(group => ({
      ...group,
      has_exam: enable,
      has_proctor: enable,
      two_rooms_needed: enable ? group.two_rooms_needed : false
    }));

    setSubjectGroups(prev => ({
      ...prev,
      [selectedSubject]: updatedGroups
    }));

    const newPendingChanges = { ...pendingChanges };
    updatedGroups.forEach(group => {
      newPendingChanges[group.Section] = {
        ...(newPendingChanges[group.Section] || {}),
        has_exam: enable,
        has_proctor: enable,
        two_rooms_needed: enable ? group.two_rooms_needed : false
      };
    });
    setPendingChanges(newPendingChanges);

    toast.success(`Все экзамены ${enable ? 'включены' : 'отключены'}`);
  };

  const handleToggleAllProctors = (enable) => {
    if (!selectedSubject) return;

    const groupsWithExam = subjectGroups[selectedSubject].filter(group => group.has_exam);
    if (groupsWithExam.length === 0) {
      toast.warning('Нет групп с включенными экзаменами');
      return;
    }

    const updatedGroups = subjectGroups[selectedSubject].map(group => ({
      ...group,
      has_proctor: group.has_exam ? enable : group.has_proctor
    }));

    setSubjectGroups(prev => ({
      ...prev,
      [selectedSubject]: updatedGroups
    }));

    const newPendingChanges = { ...pendingChanges };
    groupsWithExam.forEach(group => {
      newPendingChanges[group.Section] = {
        ...(newPendingChanges[group.Section] || {}),
        has_proctor: enable
      };
    });
    setPendingChanges(newPendingChanges);

    toast.success(`Все прокторы ${enable ? 'включены' : 'отключены'}`);
  };

  const handleToggleAllRooms = (enable) => {
    if (!selectedSubject) return;

    const groupsWithExam = subjectGroups[selectedSubject].filter(group => group.has_exam);
    if (groupsWithExam.length === 0) {
      toast.warning('Нет групп с включенными экзаменами');
      return;
    }

    const updatedGroups = subjectGroups[selectedSubject].map(group => ({
      ...group,
      two_rooms_needed: group.has_exam ? enable : group.two_rooms_needed
    }));

    setSubjectGroups(prev => ({
      ...prev,
      [selectedSubject]: updatedGroups
    }));

    const newPendingChanges = { ...pendingChanges };
    groupsWithExam.forEach(group => {
      newPendingChanges[group.Section] = {
        ...(newPendingChanges[group.Section] || {}),
        two_rooms_needed: enable
      };
    });
    setPendingChanges(newPendingChanges);

    toast.success(`Все требования аудиторий ${enable ? 'включены' : 'отключены'}`);
  };

  const fetchFreeSlots = async () => {
    if (!classroomNumber) {
      toast.warning('Введите номер аудитории');
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/classroom/free-slots?classroom_number=${encodeURIComponent(classroomNumber)}`, authHeaders());
      if (!res.ok) {
        toast.error('Не удалось загрузить слоты для аудитории');
        setFreeSlots([]);
        return;
      }
      const data = await res.json();
      setFreeSlots(Array.isArray(data) ? data : []);
      toast.success('Слоты загружены');
    } catch (err) {
      toast.error('Ошибка при загрузке слотов');
      setFreeSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSelectSlotForSection = (sectionId, slotId) => {
    setSelectedSlotForSection(prev => ({ ...prev, [sectionId]: slotId }));
  };

  const handleBookSlotLocal = (sectionId) => {
    const slotId = selectedSlotForSection[sectionId];
    if (!slotId) {
      toast.warning('Выберите слот перед закреплением');
      return;
    }

    if (pendingBookings.some(b => b.sectionId === sectionId)) {
      toast.info('Секция уже локально закреплена');
      return;
    }

    setPendingBookings(prev => [...prev, { sectionId, slotId: Number(slotId), subject: selectedSubject }]);

    setSubjectGroups(prev => {
      const updated = { ...prev };
      updated[selectedSubject] = updated[selectedSubject].map(g =>
        g.Section === sectionId ? { ...g, bookedSlotId: slotId, is_booked: true, pending_local: true } : g
      );
      return updated;
    });

    setFreeSlots(prev => prev.map(s => (String(s.id) === String(slotId) ? { ...s, is_booked: true } : s)));

    toast.info('Слот локально закреплён');
  };

  const cancelLocalBooking = (sectionId) => {
    const booking = pendingBookings.find(b => b.sectionId === sectionId);
    if (!booking) {
      toast.info('Локальная бронь не найдена');
      return;
    }

    setPendingBookings(prev => prev.filter(b => b.sectionId !== sectionId));

    setSubjectGroups(prev => {
      const updated = { ...prev };
      updated[selectedSubject] = updated[selectedSubject].map(g =>
        g.Section === sectionId ? { ...g, bookedSlotId: null, is_booked: false, pending_local: false } : g
      );
      return updated;
    });

    setFreeSlots(prev => prev.map(s => (String(s.id) === String(booking.slotId) ? { ...s, is_booked: false } : s)));

    setSelectedSlotForSection(prev => {
      const updated = { ...prev };
      delete updated[sectionId];
      return updated;
    });

    toast.info('Локальная бронь отменена');
  };

  const handleCommitBookings = async () => {
    if (pendingBookings.length === 0) {
      toast.info('Нет локально выбранных бронирований');
      return;
    }

    if (!window.confirm(`Отправить ${pendingBookings.length} бронирований на сервер?`)) return;

    setCommitLoading(true);
    try {
      const map = {};
      pendingBookings.forEach(b => {
        const key = `${b.slotId}::${b.subject}`;
        if (!map[key]) map[key] = { slot_id: Number(b.slotId), subject: b.subject, sections: [] };
        map[key].sections.push(b.sectionId);
      });

      const payload = Object.values(map);

      const baseAuth = authHeaders() || {};
      const headers = {
        ...(baseAuth.headers || {}),
        'Content-Type': 'application/json'
      };

      const res = await fetch('http://localhost:5000/api/slots/book', {
        ...(baseAuth || {}),
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Ошибка бронирования: ${res.status} ${text}`);
      }

      await res.json();

      setSubjectGroups(prev => {
        const updated = { ...prev };
        if (selectedSubject && Array.isArray(updated[selectedSubject])) {
          updated[selectedSubject] = updated[selectedSubject].map(g => {
            const found = pendingBookings.find(b => b.sectionId === g.Section);
            if (found) {
              return { ...g, bookedSlotId: found.slotId, is_booked: true, pending_local: false, booked_final: true };
            }
            return g;
          });
        }
        return updated;
      });

      setPendingBookings([]);
      toast.success('Все выбранные слоты успешно закреплены на сервере');
    } catch (error) {
      toast.error(`Не удалось закрепить слоты: ${error.message || error}`);
    } finally {
      setCommitLoading(false);
    }
  };

  const filteredSubjects = (subjects || []).filter(subject =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSortedGroups = () => {
    if (!selectedSubject || !subjectGroups[selectedSubject]) return [];
    
    const groups = [...subjectGroups[selectedSubject]];
    
    switch(sortBy) {
      case 'section':
        return groups.sort((a, b) => a.Section.localeCompare(b.Section));
      case 'instructor':
        return groups.sort((a, b) => (a.Instructor || '').localeCompare(b.Instructor || ''));
      case 'program':
        return groups.sort((a, b) => (a.EduProgram || '').localeCompare(b.EduProgram || ''));
      default:
        return groups;
    }
  };

  const sortedGroups = getSortedGroups();

  return (
    <div className={`min-h-screen bg-[#F8F9FA] pb-12 ${readyLoading ? 'pointer-events-none opacity-60' : ''}`}>
      <Navbar showFilterButton={false} />
      
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-6 md:py-8">
        {readyLoading && <GlobalLoader />}
        
        {/* Верхняя панель */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 z-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Управление предметами</h2>
              <p className="text-sm text-gray-500 mt-1">Организация и настройка экзаменационных групп</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Поиск */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск предметов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#C8102E]/20 outline-none transition-shadow placeholder:text-gray-400"
                />
              </div>

              {/* Кнопка Готово */}
              <button
                onClick={handleReady}
                disabled={readyLoading}
                className="flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#C8102E] hover:bg-[#A00D26] text-white font-medium shadow-sm transition-colors w-full sm:w-auto disabled:opacity-60 disabled:hover:bg-[#C8102E]"
              >
                {readyLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Calendar size={16} />
                    <span>Отправить изменения</span>
                  </>
                )}
                {Object.keys(pendingChanges).length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-white/20">
                    {Object.keys(pendingChanges).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {groupsLoading && <LocalLoader />}

        {/* Accordion список предметов */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <div>
              <h6 className="flex items-center gap-2 text-base font-semibold text-gray-900 m-0">
                <Users size={18} className="text-[#C8102E]" />
                Шаг 1: Выберите предмет для настройки
              </h6>
              <p className="text-xs text-gray-500 mt-1 mb-0 flex items-center gap-2">
                <span>Всего предметов: <strong className="text-gray-900">{filteredSubjects.length}</strong></span>
              </p>
            </div>
          </div>
          
          <div className="p-3 sm:p-4 bg-gray-50/30">
            <div className="flex flex-col">
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => {
                  const isExpanded = selectedSubject === subject;
                  
                  return (
                    <div 
                      key={subject}
                      className={`mb-3 border rounded-xl overflow-hidden transition-all duration-200 group ${
                        isExpanded ? 'border-[#C8102E] shadow-md ring-1 ring-[#C8102E]/10' : 'border-gray-200 bg-white hover:border-[#C8102E]/40 hover:shadow-sm'
                      }`}
                    >
                      {/* Заголовок предмета */}
                      <div
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer transition-colors gap-3 ${
                          isExpanded ? 'bg-red-50/50 border-b border-[#C8102E]/20' : 'bg-transparent'
                        }`}
                        onClick={() => fetchSubjectGroups(subject)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-[#C8102E] text-white shadow-sm' : 'bg-gray-100 text-gray-500 group-hover:bg-[#C8102E]/10 group-hover:text-[#C8102E]'}`}>
                            <BookOpen size={18} />
                          </div>
                          
                          <div className="flex flex-col">
                            <strong className="text-[15px] leading-tight font-bold text-gray-900">{subject}</strong>
                            {!isExpanded && (
                              <span className="text-xs text-gray-500 mt-0.5">Нажмите «Настроить», чтобы увидеть список групп</span>
                            )}
                            {isExpanded && subjectGroups[subject] && (
                              <span className="text-xs font-medium text-[#C8102E] mt-0.5">
                                Загружено групп: {subjectGroups[subject].length}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto mt-2 sm:mt-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchSubjectGroups(subject);
                            }}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                              isExpanded 
                                ? 'bg-white border text-gray-700 hover:bg-gray-50' 
                                : 'bg-[#C8102E] text-white hover:bg-[#A00D26] shadow-sm'
                            }`}
                          >
                            {isExpanded ? 'Свернуть' : 'Настроить'}
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSubject(subject);
                            }}
                            className="flex items-center justify-center p-2.5 text-gray-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors border border-gray-200 hover:border-red-600 bg-white"
                            title="Удалить предмет из списка"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Развернутое содержимое - таблица групп */}
                      {isExpanded && (
                        <div className="p-4 bg-white">
                          {/* Панель управления (Упрощенная) */}
                          <div className="bg-gray-50 rounded-xl p-4 md:p-5 mb-5 border border-gray-100 flex flex-col gap-5">
                            {/* Шаг 2: Массовые действия */}
                            <div className="flex flex-col gap-3 pb-5 border-b border-gray-200">
                              <div className="flex justify-between items-center w-full">
                                <span className="text-sm font-semibold text-gray-800">Шаг 2: Настроить экзамены для всех групп (Массовые действия)</span>
                                
                                {/* Сортировка перемещена сюда */}
                                <div className="hidden sm:flex items-center gap-2">
                                  <ArrowUpDown size={14} className="text-gray-500" />
                                  <select
                                    className="h-8 text-xs text-gray-600 bg-white border border-gray-300 rounded-lg outline-none cursor-pointer px-2"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                  >
                                    <option value="section">Сортировка: По секции</option>
                                    <option value="instructor">Сортировка: По преподавателю</option>
                                    <option value="program">Сортировка: По программе</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                <button
                                  onClick={() => handleToggleAllExams(!subjectGroups[selectedSubject].every(g => g.has_exam))}
                                  className="h-9 px-4 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition-colors shadow-sm"
                                >
                                  {subjectGroups[selectedSubject].every(g => g.has_exam) ? '✕ Снять "Нужен экзамен" у всех' : '✓ Назначить экзамен всем'}
                                </button>
                                <button
                                  onClick={() => handleToggleAllProctors(!subjectGroups[selectedSubject].every(g => g.has_exam && g.has_proctor))}
                                  disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                                  className="h-9 px-4 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                  {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.has_proctor) ? '✕ Снять прокторов у всех' : '✓ Нужен проктор всем'}
                                </button>
                                <button
                                  onClick={() => handleToggleAllRooms(!subjectGroups[selectedSubject].every(g => g.has_exam && g.two_rooms_needed))}
                                  disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                                  className="h-9 px-4 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 transition-colors shadow-sm disabled:opacity-50"
                                >
                                  {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.two_rooms_needed) ? '✕ Снять 2 аудитории' : '✓ Требовать 2 аудитории всем'}
                                </button>
                              </div>
                            </div>

                            {/* Шаг 3: Аудитории */}
                            <div className="flex flex-col gap-3 pb-5 border-b border-gray-200">
                              <span className="text-sm font-semibold text-gray-800">Шаг 3: Поиск свободных слотов</span>
                              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                <div className="flex w-full sm:w-auto">
                                  <input
                                    type="text"
                                    className="w-full sm:w-64 h-10 px-4 text-sm border border-gray-200 border-r-0 rounded-l-xl focus:ring-2 focus:ring-[#C8102E]/20 outline-none placeholder:text-gray-400 z-10 relative"
                                    value={classroomNumber}
                                    onChange={(e) => setClassroomNumber(e.target.value)}
                                    placeholder="Введите номер аудитории (напр. 107)"
                                  />
                                  <button 
                                    className="px-5 sm:px-6 h-10 text-sm font-medium text-[#C8102E] bg-red-50 border border-[#C8102E]/20 hover:bg-[#C8102E] hover:text-white transition-colors rounded-r-xl disabled:opacity-50 z-20 relative -ml-px whitespace-nowrap" 
                                    onClick={fetchFreeSlots} 
                                    disabled={slotsLoading}
                                  >
                                    {slotsLoading ? 'Поиск...' : 'Искать слоты'}
                                  </button>
                                </div>
                                {freeSlots.length > 0 && (
                                  <span className="text-emerald-600 font-medium text-sm bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                    ✓ Найдено слотов: {freeSlots.length}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Шаг 4: Закрепление */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-gray-800">Шаг 4: Закрепление выбранного времени</span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {pendingBookings.length > 0 
                                    ? `Выбрано слотов для ${pendingBookings.length} групп. Нажмите "Закрепить", чтобы применить к расписанию.`
                                    : 'Сначала выберите слоты в таблице ниже для каждой группы.'}
                                </span>
                              </div>
                              
                              <button
                                onClick={handleCommitBookings}
                                disabled={pendingBookings.length === 0 || commitLoading}
                                className="flex w-full sm:w-auto items-center justify-center gap-2 h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:hover:bg-emerald-600"
                              >
                                {commitLoading ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <CheckCircle size={16} />
                                )}
                                Закрепить ({pendingBookings.length})
                              </button>
                            </div>
                          </div>

                          {/* Таблица групп */}
                          <div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm custom-scrollbar">
                            <table className="w-full text-left border-collapse text-[13px] whitespace-nowrap hidden lg:table">
                              <thead className="sticky top-0 bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider z-10 shadow-sm">
                                <tr>
                                  <th className="px-4 py-3 border-b border-gray-100">Секция</th>
                                  <th className="px-4 py-3 border-b border-gray-100">Программа</th>
                                  <th className="px-4 py-3 border-b border-gray-100">Преподаватель</th>
                                  <th className="px-2 py-3 border-b border-gray-100 text-center">Экз</th>
                                  <th className="px-2 py-3 border-b border-gray-100 text-center">Прокт</th>
                                  <th className="px-2 py-3 border-b border-gray-100 text-center">2 Ауд</th>
                                  <th className="px-3 py-3 border-b border-gray-100 text-center">Тип</th>
                                  <th className="px-3 py-3 border-b border-gray-100 text-center">Мин</th>
                                  <th className="px-4 py-3 border-b border-gray-100 min-w-[160px]">Слот</th>
                                  <th className="text-right px-4 py-3 border-b border-gray-100">Действия</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {sortedGroups.length > 0 ? (
                                  sortedGroups.map((group) => {
                                    const isPendingLocal = pendingBookings.some(b => b.sectionId === group.Section);
                                    return (
                                      <tr 
                                        key={group.Section} 
                                        className={`transition-colors hover:bg-gray-50 ${isPendingLocal ? 'bg-emerald-50/50' : 'bg-white'}`}
                                      >
                                        <td className="px-4 py-2.5 font-medium text-gray-900">{group.Section}</td>
                                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[160px]" title={group.EduProgram}>{group.EduProgram}</td>
                                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[180px]" title={group.Instructor}>{group.Instructor}</td>
                                        
                                        <td className="px-2 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={group.has_exam}
                                            onChange={(e) => handleExamToggle(group.Section, e.target.checked)}
                                            className="w-4 h-4 text-[#C8102E] rounded border-gray-300 focus:ring-[#C8102E]/20 focus:ring-opacity-50 cursor-pointer accent-[#C8102E]"
                                          />
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={group.has_proctor}
                                            onChange={(e) => handleProctorToggle(group.Section, e.target.checked)}
                                            disabled={!group.has_exam}
                                            className="w-4 h-4 text-[#C8102E] rounded border-gray-300 focus:ring-[#C8102E]/20 focus:ring-opacity-50 cursor-pointer accent-[#C8102E] disabled:opacity-40"
                                          />
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={group.two_rooms_needed}
                                            onChange={(e) => handleRoomReqToggle(group.Section, e.target.checked)}
                                            disabled={!group.has_exam}
                                            className="w-4 h-4 text-[#C8102E] rounded border-gray-300 focus:ring-[#C8102E]/20 focus:ring-opacity-50 cursor-pointer accent-[#C8102E] disabled:opacity-40"
                                          />
                                        </td>
                                        
                                        <td className="px-3 py-2.5 text-center">
                                          <select
                                            className="h-7 text-[11px] rounded border border-gray-200 bg-white focus:ring-2 focus:ring-[#C8102E]/20 outline-none disabled:opacity-50 transition-shadow"
                                            value={group.classroom_type || 'regular'}
                                            onChange={(e) => handleClassroomTypeChange(group.Section, e.target.value)}
                                            disabled={!group.has_exam}
                                          >
                                            <option value="regular">Обычная</option>
                                            <option value="it_lab">IT Лаб</option>
                                          </select>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                          <select
                                            className="h-7 text-[11px] rounded border border-gray-200 bg-white focus:ring-2 focus:ring-[#C8102E]/20 outline-none disabled:opacity-50 transition-shadow"
                                            value={group.duration || 90}
                                            onChange={(e) => handleDurationChange(group.Section, Number(e.target.value))}
                                            disabled={!group.has_exam}
                                          >
                                            {[30, 60, 90, 120, 150, 180].map(min => (
                                              <option key={min} value={min}>{min}</option>
                                            ))}
                                          </select>
                                        </td>
                                        
                                        <td className="px-4 py-2.5">
                                          <div className="flex items-center gap-2">
                                            <select
                                              className="h-7 text-[11px] rounded border border-gray-200 bg-white focus:ring-2 focus:ring-[#C8102E]/20 outline-none w-full max-w-[150px] transition-shadow disabled:bg-gray-50"
                                              value={selectedSlotForSection[group.Section] ?? (group.bookedSlotId ?? '')}
                                              onChange={(e) => handleSelectSlotForSection(group.Section, e.target.value)}
                                            >
                                              <option value="">— слот —</option>
                                              {freeSlots && freeSlots.length > 0 ? freeSlots.map(slot => (
                                                <option key={slot.id} value={slot.id} disabled={slot.is_booked && !isPendingLocal}>
                                                  {new Date(slot.start_time).toLocaleString('ru', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                                </option>
                                              )) : null}
                                            </select>
                                            {isPendingLocal && (
                                              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-[10px]" title="Слот выбран локально">✓</span>
                                            )}
                                          </div>
                                        </td>
                                        
                                        <td className="px-4 py-2.5 text-right">
                                          <div className="flex justify-end gap-1.5 items-center">
                                            {!isPendingLocal ? (
                                              <button
                                                onClick={() => handleBookSlotLocal(group.Section)}
                                                disabled={!selectedSlotForSection[group.Section]}
                                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded text-[11px] font-medium transition-colors disabled:opacity-50 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 disabled:cursor-not-allowed"
                                              >
                                                Закрепить
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => cancelLocalBooking(group.Section)}
                                                className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded text-[11px] font-medium transition-colors shadow-sm"
                                              >
                                                Отменить
                                              </button>
                                            )}
                                            <button
                                              onClick={() => deleteSection(group.Section)}
                                              disabled={isPendingLocal}
                                              className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                                              title="Удалить секцию"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="10" className="px-4 py-12 text-center text-gray-400">
                                      <div className="flex flex-col items-center justify-center">
                                        <BookOpen size={36} className="opacity-20 mb-3" />
                                        <span className="text-sm font-medium">Нет загруженных групп</span>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>

                            {/* Мобильные карточки (Mobile and Tablet View) */}
                            <div className="lg:hidden flex flex-col divide-y divide-gray-100 bg-gray-50/50">
                              {sortedGroups.length > 0 ? (
                                sortedGroups.map((group) => {
                                  const isPendingLocal = pendingBookings.some(b => b.sectionId === group.Section);
                                  return (
                                    <div key={group.Section} className={`p-4 flex flex-col gap-4 transition-colors ${isPendingLocal ? 'bg-emerald-50/50' : 'bg-white'}`}>
                                      <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-gray-900 text-[15px]">Секция: {group.Section}</span>
                                          <span className="text-sm text-gray-600 mt-1">{group.EduProgram}</span>
                                          <span className="text-sm text-gray-500 mt-0.5 whitespace-normal">Преп: {group.Instructor}</span>
                                        </div>
                                        <button onClick={() => deleteSection(group.Section)} disabled={isPendingLocal} className="p-2 text-gray-400 border border-transparent rounded-lg hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                                          <Trash2 size={18} />
                                        </button>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={group.has_exam} onChange={(e) => handleExamToggle(group.Section, e.target.checked)} className="w-[18px] h-[18px] text-[#C8102E] rounded border-gray-300 focus:ring-[#C8102E]/20 accent-[#C8102E]" />
                                          <span className="text-sm font-medium text-gray-700">Экзамен</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={group.has_proctor} onChange={(e) => handleProctorToggle(group.Section, e.target.checked)} disabled={!group.has_exam} className="w-[18px] h-[18px] text-[#C8102E] rounded border-gray-300 focus:ring-[#C8102E]/20 disabled:opacity-40 accent-[#C8102E]" />
                                          <span className="text-sm font-medium text-gray-700">Проктор</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input type="checkbox" checked={group.two_rooms_needed} onChange={(e) => handleRoomReqToggle(group.Section, e.target.checked)} disabled={!group.has_exam} className="w-[18px] h-[18px] text-[#C8102E] rounded border-gray-300 focus:ring-[#C8102E]/20 disabled:opacity-40 accent-[#C8102E]" />
                                          <span className="text-sm font-medium text-gray-700">2 Ауд</span>
                                        </label>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <select className="h-10 w-full text-sm rounded-lg border border-gray-200 bg-white px-2 focus:ring-2 focus:ring-[#C8102E]/20 disabled:opacity-50" value={group.classroom_type || 'regular'} onChange={(e) => handleClassroomTypeChange(group.Section, e.target.value)} disabled={!group.has_exam}>
                                          <option value="regular">Обычная ауд.</option>
                                          <option value="it_lab">IT Лаб</option>
                                        </select>
                                        <select className="h-10 w-full min-w-[90px] text-sm rounded-lg border border-gray-200 bg-white px-2 focus:ring-2 focus:ring-[#C8102E]/20 disabled:opacity-50" value={group.duration || 90} onChange={(e) => handleDurationChange(group.Section, Number(e.target.value))} disabled={!group.has_exam}>
                                          {[30, 60, 90, 120, 150, 180].map(min => (
                                            <option key={min} value={min}>{min} мин</option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-gray-100">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Выбор времени (Слот)</span>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                          <select className="flex-1 h-11 text-[13px] sm:text-sm rounded-lg border border-gray-200 bg-white px-2 focus:ring-2 focus:ring-[#C8102E]/20 disabled:bg-gray-50" value={selectedSlotForSection[group.Section] ?? (group.bookedSlotId ?? '')} onChange={(e) => handleSelectSlotForSection(group.Section, e.target.value)}>
                                            <option value="">— Выберите слот —</option>
                                            {freeSlots && freeSlots.length > 0 ? freeSlots.map(slot => (
                                              <option key={slot.id} value={slot.id} disabled={slot.is_booked && !isPendingLocal}>
                                                {new Date(slot.start_time).toLocaleString('ru', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                              </option>
                                            )) : null}
                                          </select>
                                          
                                          {!isPendingLocal ? (
                                            <button onClick={() => handleBookSlotLocal(group.Section)} disabled={!selectedSlotForSection[group.Section]} className="px-4 h-11 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 whitespace-nowrap">
                                              Закрепить за секцией
                                            </button>
                                          ) : (
                                            <button onClick={() => cancelLocalBooking(group.Section)} className="px-4 h-11 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap">
                                              Отменить слот
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="px-4 py-12 text-center text-gray-400 flex flex-col items-center">
                                  <BookOpen size={36} className="opacity-20 mb-3" />
                                  <span className="text-sm font-medium">Нет загруженных групп</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <BookOpen size={48} className="opacity-20 mb-3" />
                  <p className="text-sm font-medium text-gray-500">
                    {searchQuery ? 'Ничего не найдено по вашему запросу' : 'У вас пока нет предметов'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagePredSubjectList;
