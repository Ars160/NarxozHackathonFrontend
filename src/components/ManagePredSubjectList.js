import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Trash2, Eye, BookOpen, Users, X } from 'lucide-react';
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

  // --- Слоты / брони ---
  const [classroomNumber, setClassroomNumber] = useState('107');
  const [freeSlots, setFreeSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlotForSection, setSelectedSlotForSection] = useState({}); // sectionId -> slotId
  const [pendingBookings, setPendingBookings] = useState([]); // локальные выборы: { sectionId, slotId, subject }
  const [commitLoading, setCommitLoading] = useState(false); // загрузка глобального commit
  // -------------------------------------

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

        // удалить локальную бронь, если была
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

  // --- слоты ---
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

    toast.info('Слот локально закреплён. Нажмите "Закрепить выбранные" для отправки на сервер.');
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

  // --- НОВОЕ: глобальная кнопка "Закрепить выбранные" -> отправляет массив одним POST'ом ---
  const handleCommitBookings = async () => {
    if (pendingBookings.length === 0) {
      toast.info('Нет локально выбранных бронирований');
      return;
    }

    if (!window.confirm(`Отправить ${pendingBookings.length} бронирований на сервер?`)) return;

    setCommitLoading(true);
    try {
      // Группируем по slot_id + subject, собираем массив sections
      const map = {};
      pendingBookings.forEach(b => {
        const key = `${b.slotId}::${b.subject}`;
        if (!map[key]) map[key] = { slot_id: Number(b.slotId), subject: b.subject, sections: [] };
        map[key].sections.push(b.sectionId);
      });

      const payload = Object.values(map); // массив объектов { slot_id, subject, sections: [...] }

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

      // Успех — пометим группы как окончательно забронированные и очистим pendingBookings
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
  // -------------------------------------

  const filteredSubjects = (subjects || []).filter(subject =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`container-fluid p-0 min-vh-100 ${readyLoading ? 'disabled-page' : ''}`}>
      <Navbar showFilterButton={false} />
      
      <div className="container mt-4">
        {readyLoading && <GlobalLoader />}
        
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <button
            onClick={handleReady}
            className="btn btn-red d-flex gap-2 py-2 px-4"
            disabled={readyLoading}
          >
            {readyLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Отправка...
              </>
            ) : (
              'Готово'
            )}
          </button>
          
          <div className="position-relative">
            <input
              type="text"
              placeholder="Поиск предметов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control border-red py-2"
              style={{ borderColor: '#C8102E', paddingLeft: '2.5rem' }}
            />
            <Search size={20} className="position-absolute top-50 translate-middle-y ms-2 text-muted" />
          </div>
        </div>

        {groupsLoading && <LocalLoader />}

        {isGroupsOpen && selectedSubject && (
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white border-bottom p-4 position-relative">
              <div className="d-flex align-items-center justify-content-between">
                <h2 className="h4 mb-0 d-flex align-items-center gap-2">
                  <BookOpen size={24} style={{ color: '#C8102E' }} />
                  Группы предмета "{selectedSubject}"
                </h2>
                <div className="d-flex gap-2 align-items-center">
                  <div className="input-group me-2">
                    <input
                      type="text"
                      className="form-control"
                      style={{ minWidth: 110 }}
                      value={classroomNumber}
                      onChange={(e) => setClassroomNumber(e.target.value)}
                      placeholder="Аудитория (например 107)"
                    />
                    <button className="btn btn-outline-secondary" type="button" onClick={fetchFreeSlots} disabled={slotsLoading}>
                      {slotsLoading ? 'Загрузка...' : 'Загрузить слоты'}
                    </button>
                  </div>

                  {/* НОВАЯ глобальная кнопка — отправит массив бронирований одним POST'ом */}
                  <div className="me-2">
                    <button
                      onClick={handleCommitBookings}
                      className="btn btn-primary"
                      disabled={pendingBookings.length === 0 || commitLoading}
                      title="Отправить все локально закреплённые слоты на сервер"
                    >
                      {commitLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Отправка...
                        </>
                      ) : (
                        `Закрепить выбранные (${pendingBookings.length})`
                      )}
                    </button>
                  </div>

                  <div className="btn-group">
                    <button
                      onClick={() => handleToggleAllExams(!subjectGroups[selectedSubject].every(g => g.has_exam))}
                      className="btn btn-red"
                    >
                      {subjectGroups[selectedSubject].every(g => g.has_exam) ? 'Отключить все экзамены' : 'Включить все экзамены'}
                    </button>
                    <button
                      onClick={() => handleToggleAllProctors(!subjectGroups[selectedSubject].every(g => g.has_exam && g.has_proctor))}
                      className="btn btn-red"
                      disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                    >
                      {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.has_proctor) ? 'Отключить всех прокторов' : 'Включить всех прокторов'}
                    </button>
                    <button
                      onClick={() => handleToggleAllRooms(!subjectGroups[selectedSubject].every(g => g.has_exam && g.two_rooms_needed))}
                      className="btn btn-red"
                      disabled={!subjectGroups[selectedSubject].some(g => g.has_exam)}
                    >
                      {subjectGroups[selectedSubject].filter(g => g.has_exam).every(g => g.two_rooms_needed) ? 'Отключить все аудитории' : 'Включить все аудитории'}
                    </button>
                  </div>
                  <button
                    onClick={closeGroups}
                    className="btn btn-red"
                    style={{ padding: '8px 12px' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="small text-muted mt-2">
                {freeSlots.length > 0 ? `Загружено ${freeSlots.length} слотов для аудитории ${classroomNumber}` : 'Слоты не загружены'}
                {pendingBookings.length > 0 && <span className="ms-3 text-success">Локально: {pendingBookings.length}</span>}
              </div>
            </div>
            
            <div className="card-body p-4">
              <div className="table-responsive">
                <Table className="table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Секция</th>
                      <th>Программа</th>
                      <th>Преподаватель</th>
                      <th className="text-center">Экзамен</th>
                      <th className="text-center">Проктор</th>
                      <th className="text-center">Аудитория на 2</th>
                      <th className="text-center">Слот</th>
                      <th className="text-end">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subjectGroups[selectedSubject] || []).map((group) => {
                      const isPendingLocal = pendingBookings.some(b => b.sectionId === group.Section);
                      return (
                        <tr key={group.Section} className={isPendingLocal ? 'table-success' : ''}>
                          <td>{group.Section}</td>
                          <td>{group.EduProgram}</td>
                          <td>{group.Instructor}</td>
                          <td className="text-center">
                            <Form.Check 
                              type="switch"
                              checked={group.has_exam}
                              onChange={(e) => handleExamToggle(group.Section, e.target.checked)}
                            />
                          </td>
                          <td className="text-center">
                            <Form.Check 
                              type="switch"
                              checked={group.has_proctor}
                              onChange={(e) => handleProctorToggle(group.Section, e.target.checked)}
                              disabled={!group.has_exam}
                            />
                          </td>
                          <td className="text-center">
                            <Form.Check 
                              type="switch"
                              checked={group.two_rooms_needed}
                              onChange={(e) => handleRoomReqToggle(group.Section, e.target.checked)}
                              disabled={!group.has_exam}
                            />
                          </td>

                          <td className="text-center" style={{ minWidth: 260 }}>
                            <div className="d-flex gap-2 justify-content-center align-items-center">
                              <select
                                className="form-select form-select-sm"
                                value={selectedSlotForSection[group.Section] ?? (group.bookedSlotId ?? '')}
                                onChange={(e) => handleSelectSlotForSection(group.Section, e.target.value)}
                              >
                                <option value="">— выбрать слот —</option>
                                {freeSlots && freeSlots.length > 0 ? freeSlots.map(slot => (
                                  <option key={slot.id} value={slot.id} disabled={slot.is_booked && !isPendingLocal}>
                                    {new Date(slot.start_time).toLocaleString()} — {new Date(slot.end_time).toLocaleTimeString()} {slot.is_booked && !isPendingLocal ? '(занят)' : ''}
                                  </option>
                                )) : (
                                  <option value="">Нет загруженных слотов</option>
                                )}
                              </select>
                              {isPendingLocal && (
                                <div className="small text-muted">Локально: {pendingBookings.find(b => b.sectionId === group.Section)?.slotId}</div>
                              )}
                            </div>
                          </td>

                          <td className="text-end">
                            <div className="d-flex justify-content-end gap-2">
                              {!isPendingLocal ? (
                                <button
                                  onClick={() => handleBookSlotLocal(group.Section)}
                                  className="btn btn-blue btn-sm"
                                  disabled={!selectedSlotForSection[group.Section]}
                                >
                                  Закрепить
                                </button>
                              ) : (
                                <button
                                  onClick={() => cancelLocalBooking(group.Section)}
                                  className="btn btn-outline-secondary btn-sm"
                                >
                                  Отменить
                                </button>
                              )}

                              <button
                                onClick={() => deleteSection(group.Section)}
                                className="btn btn-red btn-sm"
                                disabled={isPendingLocal}
                              >
                                <Trash2 size={16} className="me-1" />
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

        <div className="card shadow-sm">
          <div className="card-header bg-white border-bottom p-4">
            <h2 className="h4 mb-0 d-flex align-items-center gap-2">
              <Users size={24} style={{ color: '#C8102E' }} />
              Список предметов
            </h2>
          </div>
          
          <div className="card-body p-4">
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{ width: '60%' }}>Предмет</th>
                    <th className="text-end">Действия</th>
                  </tr>
                </thead>
                
                <tbody>
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <tr key={subject}>
                        <td>{subject}</td>
                        <td className="text-end">
                          <button
                            onClick={() => 
                              selectedSubject === subject && isGroupsOpen 
                                ? closeGroups() 
                                : fetchSubjectGroups(subject)
                            }
                            className="btn btn-blue btn-sm me-2"
                          >
                            <Eye size={16} className="me-1" />
                            {selectedSubject === subject && isGroupsOpen ? 'Закрыть' : 'Группы'}
                          </button>
                          <button
                            onClick={() => deleteSubject(subject)}
                            className="btn btn-red btn-sm"
                          >
                            <Trash2 size={16} className="me-1" />
                            Удалить
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="text-center py-4 text-muted">
                        {searchQuery ? 'Ничего не найдено' : 'Нет доступных предметов'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagePredSubjectList;
