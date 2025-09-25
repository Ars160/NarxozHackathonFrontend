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
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
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
            groupsArray.push(...data.groups[eduProgram].map(group => ({
              ...group,
              EduProgram: eduProgram,
              has_exam: group.has_exam ?? true,
              has_proctor: group.has_proctor ?? true,
              two_rooms_needed: group.two_rooms_needed ?? false // Используем two_rooms_needed
            })));
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
        
        toast.success(`Секция "${section}" удалена`);
      } catch (error) {
        toast.error(`Ошибка удаления секции "${section}"`);
      }
    }
  };

  const handleReady = async () => {
    if (!window.confirm('Подтвердить готовность?')) return;
    const userRole = localStorage.getItem('role');
    
    const allowedRoles = ['admin-gum', 'admin-sdt', 'admin-sem', 'admin-spigu'];
    if (!allowedRoles.includes(userRole)) {
      toast.error('Эта функция доступна только для subAdmin');
      return;
    }
    setReadyLoading(true);
    try {
      await scheduleApi.setSubAdminStatus({ status: 'ready' });
      toast.success('Готово отправлено');
      navigate('/');
    } catch (error) {
      toast.error('Ошибка при отправке готовности');
    } finally {
      setReadyLoading(false);
    }
  };

  const handleExamToggle = async (sectionId, checked) => {
    try {
      const updatedGroups = subjectGroups[selectedSubject].map(group => {
        if (group.Section === sectionId) {
          return { 
            ...group, 
            has_exam: checked,
            has_proctor: checked ? group.has_proctor : false,
            two_rooms_needed: checked ? group.two_rooms_needed : false // Используем two_rooms_needed
          };
        }
        return group;
      });

      await scheduleApi.updateExamStatus({
        exams: [{ section_id: sectionId, has_exam: checked }]
      });

      if (!checked) {
        await scheduleApi.updateProctorStatus({
          exams: [{ section_id: sectionId, has_proctor: false }]
        });
        
        await scheduleApi.updateRoomReqStatus({
          exams: [{ section_id: sectionId, two_rooms_needed: false }]
        });
      } else {
        await scheduleApi.updateProctorStatus({
          exams: [{ section_id: sectionId, has_proctor: true }]
        });
      }

      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: updatedGroups
      }));
      
    } catch (error) {
      toast.error('Ошибка обновления статуса экзамена');
    }
  };

  const handleProctorToggle = async (sectionId, checked) => {
    try {
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
  
      await scheduleApi.updateProctorStatus({
        exams: [{ section_id: sectionId, has_proctor: checked }]
      });
  
    } catch (error) {
      toast.error('Ошибка обновления статуса проктора');
      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: subjectGroups[selectedSubject]
      }));
    }
  };

  const handleRoomReqToggle = async (sectionId, checked) => {
    try {
      console.log(checked);
      
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
  
      await scheduleApi.updateRoomReqStatus({
        exams: [{ section_id: sectionId, two_rooms_needed: checked }]
      });
  
    } catch (error) {
      toast.error('Ошибка обновления требования аудитории');
      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: subjectGroups[selectedSubject]
      }));
    }
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
          two_rooms_needed: false // Используем two_rooms_needed
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
        two_rooms_needed: enable ? group.two_rooms_needed : false // Используем two_rooms_needed
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
      toast.error('Ошибка обновления статуса прокторов');
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
        two_rooms_needed: enable // Используем two_rooms_needed
      }));

      await scheduleApi.updateRoomReqStatus({ exams: roomUpdates });

      const updatedGroups = subjectGroups[selectedSubject].map(group => ({
        ...group,
        two_rooms_needed: group.has_exam ? enable : false // Используем two_rooms_needed
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
                <div className="d-flex gap-2">
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
                      <th className="text-end">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(subjectGroups[selectedSubject] || []).map((group) => (
                      <tr key={group.Section}>
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
                            checked={group.two_rooms_needed} // Используем two_rooms_needed
                            onChange={(e) => handleRoomReqToggle(group.Section, e.target.checked)}
                            disabled={!group.has_exam}
                          />
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => deleteSection(group.Section)}
                            className="btn btn-red btn-sm"
                          >
                            <Trash2 size={16} /> Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
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