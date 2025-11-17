import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Trash2, BookOpen, Users, Calendar, CheckCircle, ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { Form, Table, Badge } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
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
  const [viewedSubjects, setViewedSubjects] = useState(new Set());

  const [classroomNumber, setClassroomNumber] = useState('107');
  const [freeSlots, setFreeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotForSection, setSelectedSlotForSection] = useState({});
  const [pendingBookings, setPendingBookings] = useState([]);
  const [commitLoading, setCommitLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
    const viewed = localStorage.getItem('viewedSubjects');
    if (viewed) {
      setViewedSubjects(new Set(JSON.parse(viewed)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('viewedSubjects', JSON.stringify([...viewedSubjects]));
  }, [viewedSubjects]);

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
    setViewedSubjects(prev => new Set([...prev, subject]));
    
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
    <div className={`min-vh-100 ${readyLoading ? 'disabled-page' : ''}`} style={{ backgroundColor: '#f8f9fa' }}>
      <Navbar showFilterButton={false} />
      
      <div className="container-fluid px-3 py-3">
        {readyLoading && <GlobalLoader />}
        
        {/* Компактная верхняя панель */}
        <div className="card shadow-sm mb-3 border-0" style={{ borderRadius: '10px' }}>
          <div className="card-body p-3">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <button
                  onClick={handleReady}
                  className="btn btn-red d-flex align-items-center gap-2 px-3 py-2"
                  disabled={readyLoading}
                  style={{ fontSize: '14px', borderRadius: '6px' }}
                >
                  {readyLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Calendar size={16} />
                      Готово
                    </>
                  )}
                </button>
                
                {Object.keys(pendingChanges).length > 0 && (
                  <Badge bg="warning" text="dark" className="py-1 px-2" style={{ fontSize: '12px' }}>
                    Изменений: {Object.keys(pendingChanges).length}
                  </Badge>
                )}
              </div>
              
              <div className="position-relative" style={{ width: '280px' }}>
                <input
                  type="text"
                  placeholder="Поиск предметов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control form-control-sm ps-4"
                  style={{ borderRadius: '6px', fontSize: '13px' }}
                />
              </div>
            </div>
          </div>
        </div>

        {groupsLoading && <LocalLoader />}

        {/* Accordion список предметов */}
        <div className="card shadow-sm border-0" style={{ borderRadius: '10px' }}>
          <div className="card-header bg-white p-3" style={{ borderBottom: '1px solid #e9ecef', borderRadius: '10px 10px 0 0' }}>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <Users size={18} style={{ color: '#0d6efd' }} />
                  Список предметов
                </h6>
                <p className="small text-muted mb-0 mt-1" style={{ fontSize: '12px' }}>
                  Всего: <strong>{filteredSubjects.length}</strong>
                  {viewedSubjects.size > 0 && (
                    <span className="ms-2">• Просмотрено: <strong>{viewedSubjects.size}</strong></span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="card-body p-2">
            <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
              {filteredSubjects.length > 0 ? (
                filteredSubjects.map((subject) => {
                  const isViewed = viewedSubjects.has(subject);
                  const isExpanded = selectedSubject === subject;
                  
                  return (
                    <div 
                      key={subject}
                      className="mb-2"
                      style={{
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Заголовок предмета */}
                      <div
                        className="d-flex align-items-center justify-content-between p-3"
                        style={{
                          cursor: 'pointer',
                          borderBottom: isExpanded ? '1px solid #dee2e6' : 'none',
                          backgroundColor: isExpanded ? '#e7f3ff' : 'white',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => fetchSubjectGroups(subject)}
                      >
                        <div className="d-flex align-items-center gap-2">
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          {isViewed ? (
                            <CheckCircle size={16} style={{ color: '#28a745' }} />
                          ) : (
                            <div style={{ 
                              width: '16px', 
                              height: '16px', 
                              borderRadius: '50%', 
                              border: '2px solid #dee2e6'
                            }} />
                          )}
                          <strong style={{ fontSize: '14px' }}>{subject}</strong>
                          {isExpanded && subjectGroups[subject] && (
                            <Badge bg="secondary" style={{ fontSize: '11px' }}>
                              {subjectGroups[subject].length} групп
                            </Badge>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSubject(subject);
                          }}
                          className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}
                        >
                          <Trash2 size={12} />
                          Удалить
                        </button>
                      </div>

                      {/* Развернутое содержимое - таблица групп */}
                      {isExpanded && (
                        <div className="p-3" style={{ backgroundColor: '#f8f9fa' }}>
                          {/* Панель управления */}
                          <div className="card mb-3 border-0 shadow-sm">
                            <div className="card-body p-2">
                              <div className="d-flex flex-wrap gap-2 align-items-center" style={{ fontSize: '12px' }}>
                                {/* Сортировка */}
                                <div className="d-flex align-items-center gap-1">
                                  <ArrowUpDown size={14} />
                                  <select
                                    className="form-select form-select-sm"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ width: 'auto', fontSize: '12px', borderRadius: '6px' }}
                                  >
                                    <option value="section">По секции</option>
                                    <option value="instructor">По преподавателю</option>
                                    <option value="program">По программе</option>
                                  </select>
                                </div>

                                {/* Слоты */}
                                <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={classroomNumber}
                                    onChange={(e) => setClassroomNumber(e.target.value)}
                                    placeholder="№ аудитории"
                                    style={{ borderRadius: '6px 0 0 6px', fontSize: '12px' }}
                                  />
                                  <button 
                                    className="btn btn-outline-primary btn-sm" 
                                    onClick={fetchFreeSlots} 
                                    disabled={slotsLoading}
                                    style={{ borderRadius: '0 6px 6px 0', fontSize: '12px' }}
                                  >
                                    {slotsLoading ? 'Загр...' : 'Слоты'}
                                  </button>
                                </div>

                                {/* Закрепить */}
                                <button
                                  onClick={handleCommitBookings}
                                  className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                  disabled={pendingBookings.length === 0 || commitLoading}
                                  style={{ borderRadius: '6px', fontSize: '12px' }}
                                >
                                  {commitLoading ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} />
                                      Отправка
                                    </>
                                  ) : (
                                    <>
                                      Закрепить ({pendingBookings.length})
                                    </>
                                  )}
                                </button>

                                {/* Массовые действия */}
                                <div className="ms-auto d-flex gap-1 flex-wrap">
                                  <button
                                    onClick={() => handleToggleAllExams(!subjectGroups[selectedSubject].every(g => g.has_exam))}
                                    className="btn btn-sm btn-outline-secondary"
                                    style={{ borderRadius: '6px', fontSize: '11px', padding: '4px 8px' }}
                                  >
                                    {subjectGroups[selectedSubject].every(g => g.has_exam) ? '✕ Экз' : '✓ Экз'}
                                  </button>
                                  <button
                                    onClick={() => handleToggleAllProctors(!subjectGroups[selectedSubject].every(g => g.has_exam && g.has_proctor))}
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                                    style={{ borderRadius: '6px', fontSize: '11px', padding: '4px 8px' }}
                                  >
                                    {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.has_proctor) ? '✕ Прокт' : '✓ Прокт'}
                                  </button>
                                  <button
                                    onClick={() => handleToggleAllRooms(!subjectGroups[selectedSubject].every(g => g.has_exam && g.two_rooms_needed))}
                                    className="btn btn-sm btn-outline-secondary"
                                    disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                                    style={{ borderRadius: '6px', fontSize: '11px', padding: '4px 8px' }}
                                  >
                                    {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.two_rooms_needed) ? '✕ Ауд' : '✓ Ауд'}
                                  </button>
                                </div>
                              </div>

                              <div className="small text-muted mt-2" style={{ fontSize: '11px' }}>
                                {freeSlots.length > 0 ? (
                                  <>✓ Слотов: {freeSlots.length} (ауд. {classroomNumber})</>
                                ) : (
                                  'Слоты не загружены'
                                )}
                                {pendingBookings.length > 0 && (
                                  <Badge bg="success" className="ms-2" style={{ fontSize: '10px' }}>Выбрано: {pendingBookings.length}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Таблица групп */}
                          <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
                            <Table className="mb-0 table-sm" hover style={{ minWidth: '1200px', fontSize: '13px' }}>
                              <thead style={{ 
                                position: 'sticky', 
                                top: 0, 
                                backgroundColor: '#f1f3f5', 
                                zIndex: 10
                              }}>
                                <tr>
                                  <th className="px-3 py-2" style={{ fontWeight: '600', minWidth: '150px' }}>Секция</th>
                                  <th className="px-3 py-2" style={{ fontWeight: '600', minWidth: '140px' }}>Программа</th>
                                  <th className="px-3 py-2" style={{ fontWeight: '600', minWidth: '140px' }}>Преподаватель</th>
                                  <th className="px-2 py-2 text-center" style={{ fontWeight: '600', width: '60px' }}>Экз</th>
                                  <th className="px-2 py-2 text-center" style={{ fontWeight: '600', width: '60px' }}>Прокт</th>
                                  <th className="px-2 py-2 text-center" style={{ fontWeight: '600', width: '60px' }}>2 Ауд</th>
                                  <th className="px-2 py-2 text-center" style={{ fontWeight: '600', width: '110px' }}>Тип</th>
                                  <th className="px-2 py-2 text-center" style={{ fontWeight: '600', width: '90px' }}>Мин</th>
                                  <th className="px-3 py-2" style={{ fontWeight: '600', minWidth: '200px' }}>Слот</th>
                                  <th className="text-end px-3 py-2" style={{ fontWeight: '600', minWidth: '160px' }}>Действия</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedGroups.length > 0 ? (
                                  sortedGroups.map((group) => {
                                    const isPendingLocal = pendingBookings.some(b => b.sectionId === group.Section);
                                    return (
                                      <tr 
                                        key={group.Section} 
                                        style={{ 
                                          backgroundColor: isPendingLocal ? '#d4edda' : 'inherit'
                                        }}
                                      >
                                        <td className="px-3 py-2" style={{ fontWeight: '500' }}>{group.Section}</td>
                                        <td className="px-3 py-2">{group.EduProgram}</td>
                                        <td className="px-3 py-2">{group.Instructor}</td>
                                        <td className="text-center px-2 py-2">
                                          <Form.Check 
                                            type="switch"
                                            checked={group.has_exam}
                                            onChange={(e) => handleExamToggle(group.Section, e.target.checked)}
                                            style={{ display: 'inline-block', transform: 'scale(0.9)' }}
                                          />
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          <Form.Check 
                                            type="switch"
                                            checked={group.has_proctor}
                                            onChange={(e) => handleProctorToggle(group.Section, e.target.checked)}
                                            disabled={!group.has_exam}
                                            style={{ display: 'inline-block', transform: 'scale(0.9)' }}
                                          />
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          <Form.Check 
                                            type="switch"
                                            checked={group.two_rooms_needed}
                                            onChange={(e) => handleRoomReqToggle(group.Section, e.target.checked)}
                                            disabled={!group.has_exam}
                                            style={{ display: 'inline-block', transform: 'scale(0.9)' }}
                                          />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                          <select
                                            className="form-select form-select-sm"
                                            value={group.classroom_type || 'regular'}
                                            onChange={(e) => handleClassroomTypeChange(group.Section, e.target.value)}
                                            disabled={!group.has_exam}
                                            style={{ borderRadius: '4px', fontSize: '12px' }}
                                          >
                                            <option value="regular">Обычная</option>
                                            <option value="it_lab">IT Лаб</option>
                                          </select>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                          <select
                                            className="form-select form-select-sm"
                                            value={group.duration || 90}
                                            onChange={(e) => handleDurationChange(group.Section, Number(e.target.value))}
                                            disabled={!group.has_exam}
                                            style={{ borderRadius: '4px', fontSize: '12px' }}
                                          >
                                            {[30, 60, 90, 120, 150, 180].map(min => (
                                              <option key={min} value={min}>{min}</option>
                                            ))}
                                          </select>
                                        </td>
                                        <td className="px-3 py-2">
                                          <div className="d-flex gap-1 align-items-center">
                                            <select
                                              className="form-select form-select-sm"
                                              value={selectedSlotForSection[group.Section] ?? (group.bookedSlotId ?? '')}
                                              onChange={(e) => handleSelectSlotForSection(group.Section, e.target.value)}
                                              style={{ borderRadius: '4px', fontSize: '11px' }}
                                            >
                                              <option value="">— слот —</option>
                                              {freeSlots && freeSlots.length > 0 ? freeSlots.map(slot => (
                                                <option key={slot.id} value={slot.id} disabled={slot.is_booked && !isPendingLocal}>
                                                  {new Date(slot.start_time).toLocaleString('ru', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                                                </option>
                                              )) : null}
                                            </select>
                                            {isPendingLocal && (
                                              <Badge bg="success" style={{ fontSize: '9px' }}>✓</Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td className="text-end px-3 py-2">
                                          <div className="d-flex justify-content-end gap-1">
                                            {!isPendingLocal ? (
                                              <button
                                                onClick={() => handleBookSlotLocal(group.Section)}
                                                className="btn btn-sm btn-primary"
                                                disabled={!selectedSlotForSection[group.Section]}
                                                style={{ borderRadius: '4px', fontSize: '11px', padding: '4px 8px' }}
                                              >
                                                Закрепить
                                              </button>
                                            ) : (
                                              <button
                                                onClick={() => cancelLocalBooking(group.Section)}
                                                className="btn btn-sm btn-outline-secondary"
                                                style={{ borderRadius: '4px', fontSize: '11px', padding: '4px 8px' }}
                                              >
                                                Отменить
                                              </button>
                                            )}
                                            <button
                                              onClick={() => deleteSection(group.Section)}
                                              className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                                              disabled={isPendingLocal}
                                              style={{ borderRadius: '4px', fontSize: '11px', padding: '4px 8px' }}
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan="10" className="text-center py-4 text-muted">
                                      <BookOpen size={32} style={{ opacity: 0.3 }} />
                                      <p className="mb-0 mt-2" style={{ fontSize: '13px' }}>Нет групп</p>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-5 text-muted">
                  <BookOpen size={48} style={{ opacity: 0.3 }} />
                  <p className="mb-0 mt-2" style={{ fontSize: '14px' }}>
                    {searchQuery ? 'Ничего не найдено' : 'Нет предметов'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .btn-red {
          background: #dc3545;
          border: none;
          color: white;
        }

        .btn-red:hover:not(:disabled) {
          background: #c82333;
          color: white;
        }

        .btn-red:disabled {
          opacity: 0.6;
        }

        .card {
          transition: box-shadow 0.2s ease;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #0d6efd;
          box-shadow: 0 0 0 0.15rem rgba(13, 110, 253, 0.15);
        }

        .disabled-page {
          pointer-events: none;
          opacity: 0.6;
        }

        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        *::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        .btn {
          transition: all 0.15s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .form-check-input:checked {
          background-color: #0d6efd;
          border-color: #0d6efd;
        }

        .badge {
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default ManagePredSubjectList;