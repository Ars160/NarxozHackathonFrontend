import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Trash2, Eye, BookOpen, Users, X, Calendar } from 'lucide-react';
import { Form, Table } from 'react-bootstrap';
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
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
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
    setGroupsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/subjects/${encodeURIComponent(subject)}/groups`, authHeaders());
      
      if (!response.ok) {
        closeGroups();
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
                bookedSlotId: group.bookedSlotId ?? null
              };
            }));
          }
        }
      }

      setSubjectGroups(prev => ({ ...prev, [subject]: groupsArray }));
      setSelectedSubject(subject);
      setIsGroupsOpen(true);

    } catch (error) {
      toast.error(`Ошибка при загрузке групп для предмета "${subject}"`);
    } finally {
      setGroupsLoading(false);
    }
  };

  const closeGroups = () => {
    setSelectedSubject(null);
    setIsGroupsOpen(false);
    setFreeSlots([]);
    setSelectedSlotForSection({});
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
          setIsGroupsOpen(false);
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
      two_rooms_needed: changes.two_rooms_needed
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

  const handleToggleAllExams = async (enable) => {
    if (!selectedSubject) return;

    try {
      const examUpdates = subjectGroups[selectedSubject].map(group => ({
        section_id: group.Section,
        has_exam: enable
      }));

      await scheduleApi.updateExamStatus({ exams: examUpdates });

      if (!enable) {
        const proctorAndRoomUpdates = subjectGroups[selectedSubject].map(group => ({
          section_id: group.Section,
          has_proctor: false,
          two_rooms_needed: false
        }));

        await Promise.all([
          scheduleApi.updateProctorStatus({ 
            exams: proctorAndRoomUpdates.map(item => ({ 
              section_id: item.section_id, 
              has_proctor: item.has_proctor 
            }))
          }),
          scheduleApi.updateRoomReqStatus({ 
            exams: proctorAndRoomUpdates.map(item => ({ 
              section_id: item.section_id, 
              two_rooms_needed: item.two_rooms_needed
            }))
          })
        ]);
      } else {
        const proctorUpdates = subjectGroups[selectedSubject].map(group => ({
          section_id: group.Section,
          has_proctor: true
        }));

        await scheduleApi.updateProctorStatus({ exams: proctorUpdates });
      }

      const updatedGroups = subjectGroups[selectedSubject].map(group => ({
        ...group,
        has_exam: enable,
        has_proctor: enable ? true : false,
        two_rooms_needed: enable ? group.two_rooms_needed : false
      }));

      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: updatedGroups
      }));

      toast.success(`Все экзамены ${enable ? 'включены' : 'отключены'}`);
    } catch (error) {
      toast.error('Ошибка обновления статуса экзаменов');
    }
  };

  const handleToggleAllProctors = async (enable) => {
    if (!selectedSubject) return;

    try {
      const groupsWithExam = subjectGroups[selectedSubject].filter(group => group.has_exam);
      
      if (groupsWithExam.length === 0) {
        toast.warning('Нет групп с включенными экзаменами');
        return;
      }

      const proctorUpdates = groupsWithExam.map(group => ({
        section_id: group.Section,
        has_proctor: enable
      }));

      await scheduleApi.updateProctorStatus({ exams: proctorUpdates });

      const updatedGroups = subjectGroups[selectedSubject].map(group => ({
        ...group,
        has_proctor: group.has_exam ? enable : false
      }));

      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: updatedGroups
      }));

      toast.success(`Все прокторы ${enable ? 'включены' : 'отключены'}`);
    } catch (error) {
      toast.error('Ошибка обновления статусов прокторов');
    }
  };

  const handleToggleAllRooms = async (enable) => {
    if (!selectedSubject) return;

    try {
      const groupsWithExam = subjectGroups[selectedSubject].filter(group => group.has_exam);
      
      if (groupsWithExam.length === 0) {
        toast.warning('Нет групп с включенными экзаменами');
        return;
      }

      const roomUpdates = groupsWithExam.map(group => ({
        section_id: group.Section,
        two_rooms_needed: enable
      }));

      await scheduleApi.updateRoomReqStatus({ exams: roomUpdates });

      const updatedGroups = subjectGroups[selectedSubject].map(group => ({
        ...group,
        two_rooms_needed: group.has_exam ? enable : false
      }));

      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: updatedGroups
      }));

      toast.success(`Все требования аудиторий ${enable ? 'включены' : 'отключены'}`);
    } catch (error) {
      toast.error('Ошибка обновления требований аудиторий');
    }
  };

  const fetchFreeSlots = async () => {
    if (!classroomNumber) {
      toast.warning('Введите номер аудитории');
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/classroom/${encodeURIComponent(classroomNumber)}/free-slots`, authHeaders());
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

  return (
    <div className={`min-vh-100 ${readyLoading ? 'disabled-page' : ''}`} style={{ backgroundColor: '#f8f9fa' }}>
      <Navbar showFilterButton={false} />
      
      <div className="container-fluid px-4 py-4">
        {readyLoading && <GlobalLoader />}
        
        {/* Верхняя панель */}
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3 mb-4">
          <button
            onClick={handleReady}
            className="btn btn-red d-flex align-items-center gap-2 px-4 py-2 shadow-sm"
            disabled={readyLoading}
            style={{ minWidth: '160px', fontWeight: '500' }}
          >
            {readyLoading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" />
                Отправка...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Готово
              </>
            )}
          </button>
          
          <div className="position-relative" style={{ minWidth: '300px' }}>
            <Search size={20} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
            <input
              type="text"
              placeholder="Поиск предметов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control ps-5 py-2 shadow-sm"
              style={{ 
                borderColor: '#dee2e6',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>

        {groupsLoading && <LocalLoader />}

        {/* Панель групп предмета */}
        {isGroupsOpen && selectedSubject && (
          <div className="card shadow-sm mb-4" style={{ borderRadius: '12px', border: 'none' }}>
            <div className="card-header bg-white p-4" style={{ borderBottom: '2px solid #e9ecef', borderRadius: '12px 12px 0 0' }}>
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="h5 mb-0 d-flex align-items-center gap-2 fw-bold">
                    <BookOpen size={24} style={{ color: '#C8102E' }} />
                    Группы предмета: <span style={{ color: '#C8102E' }}>"{selectedSubject}"</span>
                  </h2>
                  <button
                    onClick={closeGroups}
                    className="btn btn-outline-secondary d-flex align-items-center gap-2"
                    style={{ borderRadius: '8px' }}
                  >
                    <X size={18} />
                    Закрыть
                  </button>
                </div>

                {/* Панель управления слотами */}
                <div className="d-flex flex-wrap gap-2 align-items-center p-3 bg-light rounded">
                  <div className="input-group" style={{ maxWidth: '320px' }}>
                    <input
                      type="text"
                      className="form-control"
                      value={classroomNumber}
                      onChange={(e) => setClassroomNumber(e.target.value)}
                      placeholder="Номер аудитории"
                      style={{ borderRadius: '8px 0 0 8px' }}
                    />
                    <button 
                      className="btn btn-outline-primary" 
                      onClick={fetchFreeSlots} 
                      disabled={slotsLoading}
                      style={{ borderRadius: '0 8px 8px 0' }}
                    >
                      {slotsLoading ? 'Загрузка...' : 'Загрузить слоты'}
                    </button>
                  </div>

                  <button
                    onClick={handleCommitBookings}
                    className="btn btn-success d-flex align-items-center gap-2 shadow-sm"
                    disabled={pendingBookings.length === 0 || commitLoading}
                    style={{ borderRadius: '8px', fontWeight: '500' }}
                  >
                    {commitLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Calendar size={18} />
                        Закрепить выбранные ({pendingBookings.length})
                      </>
                    )}
                  </button>

                  <div className="ms-auto d-flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleToggleAllExams(!subjectGroups[selectedSubject].every(g => g.has_exam))}
                      className="btn btn-sm btn-outline-primary"
                      style={{ borderRadius: '8px' }}
                    >
                      {subjectGroups[selectedSubject].every(g => g.has_exam) ? 'Выкл все экзамены' : 'Вкл все экзамены'}
                    </button>
                    <button
                      onClick={() => handleToggleAllProctors(!subjectGroups[selectedSubject].every(g => g.has_exam && g.has_proctor))}
                      className="btn btn-sm btn-outline-primary"
                      disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                      style={{ borderRadius: '8px' }}
                    >
                      {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.has_proctor) ? 'Выкл всех прокторов' : 'Вкл всех прокторов'}
                    </button>
                    <button
                      onClick={() => handleToggleAllRooms(!subjectGroups[selectedSubject].every(g => g.has_exam && g.two_rooms_needed))}
                      className="btn btn-sm btn-outline-primary"
                      disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                      style={{ borderRadius: '8px' }}
                    >
                      {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.two_rooms_needed) ? 'Выкл все аудитории' : 'Вкл все аудитории'}
                    </button>
                  </div>
                </div>

                <div className="small text-muted">
                  {freeSlots.length > 0 ? (
                    <>✓ Загружено {freeSlots.length} слотов для аудитории {classroomNumber}</>
                  ) : (
                    'Слоты не загружены'
                  )}
                  {pendingBookings.length > 0 && (
                    <span className="ms-3 badge bg-success">Локально выбрано: {pendingBookings.length}</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Таблица групп с горизонтальным скроллингом */}
            <div className="card-body p-0">
              <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
                <Table className="mb-0" style={{ minWidth: '1200px' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <tr>
                      <th className="text-end px-4 py-3" style={{ fontWeight: '600', fontSize: '14px', minWidth: '200px' }}>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subjectGroups[selectedSubject] || []).map((group, index) => {
                      const isPendingLocal = pendingBookings.some(b => b.sectionId === group.Section);
                      return (
                        <tr 
                          key={group.Section} 
                          style={{ 
                            backgroundColor: isPendingLocal ? '#d4edda' : index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                            transition: 'background-color 0.2s'
                          }}
                          className="hover-row"
                        >
                          <td className="px-4 py-3" style={{ fontWeight: '500' }}>{group.Section}</td>
                          <td className="px-4 py-3">{group.EduProgram}</td>
                          <td className="px-4 py-3">{group.Instructor}</td>
                          <td className="text-center px-3 py-3">
                            <Form.Check 
                              type="switch"
                              checked={group.has_exam}
                              onChange={(e) => handleExamToggle(group.Section, e.target.checked)}
                              style={{ display: 'inline-block' }}
                            />
                          </td>
                          <td className="text-center px-3 py-3">
                            <Form.Check 
                              type="switch"
                              checked={group.has_proctor}
                              onChange={(e) => handleProctorToggle(group.Section, e.target.checked)}
                              disabled={!group.has_exam}
                              style={{ display: 'inline-block' }}
                            />
                          </td>
                          <td className="text-center px-3 py-3">
                            <Form.Check 
                              type="switch"
                              checked={group.two_rooms_needed}
                              onChange={(e) => handleRoomReqToggle(group.Section, e.target.checked)}
                              disabled={!group.has_exam}
                              style={{ display: 'inline-block' }}
                            />
                          </td>

                          <td className="px-4 py-3">
                            <div className="d-flex gap-2 align-items-center">
                              <select
                                className="form-select form-select-sm"
                                value={selectedSlotForSection[group.Section] ?? (group.bookedSlotId ?? '')}
                                onChange={(e) => handleSelectSlotForSection(group.Section, e.target.value)}
                                style={{ borderRadius: '6px', fontSize: '13px' }}
                              >
                                <option value="">— выбрать слот —</option>
                                {freeSlots && freeSlots.length > 0 ? freeSlots.map(slot => (
                                  <option key={slot.id} value={slot.id} disabled={slot.is_booked && !isPendingLocal}>
                                    {new Date(slot.start_time).toLocaleString()} — {new Date(slot.end_time).toLocaleTimeString()} {slot.is_booked && !isPendingLocal ? '(занят)' : ''}
                                  </option>
                                )) : (
                                  <option value="">Нет слотов</option>
                                )}
                              </select>
                              {isPendingLocal && (
                                <span className="badge bg-success" style={{ fontSize: '11px' }}>
                                  Локально
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="text-end px-4 py-3">
                            <div className="d-flex justify-content-end gap-2">
                              {!isPendingLocal ? (
                                <button
                                  onClick={() => handleBookSlotLocal(group.Section)}
                                  className="btn btn-sm btn-primary"
                                  disabled={!selectedSlotForSection[group.Section]}
                                  style={{ borderRadius: '6px', fontSize: '13px', minWidth: '80px' }}
                                >
                                  Закрепить
                                </button>
                              ) : (
                                <button
                                  onClick={() => cancelLocalBooking(group.Section)}
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ borderRadius: '6px', fontSize: '13px', minWidth: '80px' }}
                                >
                                  Отменить
                                </button>
                              )}

                              <button
                                onClick={() => deleteSection(group.Section)}
                                className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                                disabled={isPendingLocal}
                                style={{ borderRadius: '6px', fontSize: '13px' }}
                              >
                                <Trash2 size={14} />
                                Удалить
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Таблица предметов */}
        <div className="card shadow-sm" style={{ borderRadius: '12px', border: 'none' }}>
          <div className="card-header bg-white p-4" style={{ borderBottom: '2px solid #e9ecef', borderRadius: '12px 12px 0 0' }}>
            <h2 className="h5 mb-0 d-flex align-items-center gap-2 fw-bold">
              <Users size={24} style={{ color: '#C8102E' }} />
              Список предметов
            </h2>
            <p className="small text-muted mb-0 mt-2">
              Всего предметов: <strong>{filteredSubjects.length}</strong>
            </p>
          </div>
          
          <div className="card-body p-0">
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table className="mb-0">
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 5, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <tr>
                    <th className="px-4 py-3" style={{ fontWeight: '600', fontSize: '14px' }}>Предмет</th>
                    <th className="text-end px-4 py-3" style={{ fontWeight: '600', fontSize: '14px', minWidth: '200px' }}>Действия</th>
                  </tr>
                </thead>
                
                <tbody>
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject, index) => (
                      <tr 
                        key={subject}
                        style={{ 
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          transition: 'background-color 0.2s'
                        }}
                        className="hover-row"
                      >
                        <td className="px-4 py-3" style={{ fontWeight: '500', fontSize: '14px' }}>
                          {subject}
                        </td>
                        <td className="text-end px-4 py-3">
                          <div className="d-flex justify-content-end gap-2">
                            <button
                              onClick={() => 
                                selectedSubject === subject && isGroupsOpen 
                                  ? closeGroups() 
                                  : fetchSubjectGroups(subject)
                              }
                              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                              style={{ borderRadius: '6px', fontSize: '13px', minWidth: '90px' }}
                            >
                              <Eye size={14} />
                              {selectedSubject === subject && isGroupsOpen ? 'Закрыть' : 'Группы'}
                            </button>
                            <button
                              onClick={() => deleteSubject(subject)}
                              className="btn btn-sm btn-danger d-flex align-items-center gap-1"
                              style={{ borderRadius: '6px', fontSize: '13px' }}
                            >
                              <Trash2 size={14} />
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="text-center py-5 text-muted">
                        <div className="d-flex flex-column align-items-center gap-2">
                          <BookOpen size={48} style={{ opacity: 0.3 }} />
                          <p className="mb-0" style={{ fontSize: '16px' }}>
                            {searchQuery ? 'Ничего не найдено' : 'Нет доступных предметов'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .hover-row:hover {
          background-color: #e9ecef !important;
          cursor: pointer;
        }

        .btn-red {
          background-color: #C8102E;
          border-color: #C8102E;
          color: white;
        }

        .btn-red:hover:not(:disabled) {
          background-color: #a00d25;
          border-color: #a00d25;
          color: white;
        }

        .btn-red:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-blue {
          background-color: #0d6efd;
          border-color: #0d6efd;
          color: white;
        }

        .btn-blue:hover:not(:disabled) {
          background-color: #0b5ed7;
          border-color: #0b5ed7;
          color: white;
        }

        .card {
          transition: box-shadow 0.3s ease;
        }

        .card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
        }

        .form-control:focus,
        .form-select:focus {
          border-color: #C8102E;
          box-shadow: 0 0 0 0.2rem rgba(200, 16, 46, 0.15);
        }

        .disabled-page {
          pointer-events: none;
          opacity: 0.6;
        }

        /* Стиль для скроллбара */
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        *::-webkit-scrollbar-thumb {
          background: #c8c8c8;
          border-radius: 4px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default ManagePredSubjectList;