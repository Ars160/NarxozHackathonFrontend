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

const ManagePredSubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectGroups, setSubjectGroups] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
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
      const response = await fetch(`http://localhost:5000/subjects/${encodeURIComponent(subject)}/groups`);
      
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
              has_exam: group.has_exam ?? true
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
    setSubjectGroups({});
    setIsGroupsOpen(false);
  };

  const deleteSubject = async (subject) => {
    if (window.confirm(`Удалить все группы предмета "${subject}"?`)) {
      try {
        await scheduleApi.deleteSubject(subject);
        fetchSubjects();
        closeGroups();
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
        const updatedGroups = { ...subjectGroups };
        updatedGroups[selectedSubject] = updatedGroups[selectedSubject].filter(
          g => g.Section !== section
        );
        setSubjectGroups(updatedGroups);
        toast.success(`Секция "${section}" удалена`);
      } catch (error) {
        toast.error(`Ошибка удаления секции "${section}"`);
      }
    }
  };

  const handleGenerate = async () => {
    setScheduleLoading(true);
    try {
      const response = await scheduleApi.generateSchedule();
      if (response.status === 'success') {
        toast.success('Расписание успешно сгенерировано');
        navigate('/');
      }
    } catch (error) {
      toast.error('Ошибка при генерации расписания');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleExamToggle = async (sectionId, checked) => {
    try {
      const updatedGroups = subjectGroups[selectedSubject].map(group => 
        group.Section === sectionId ? { ...group, has_exam: checked } : group
      );

      await scheduleApi.updateExamStatus({
        exams: [{ section_id: sectionId, has_exam: checked }]
      });

      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: updatedGroups
      }));
      
    } catch (error) {
      toast.error('Ошибка обновления статуса экзамена');
    }
  };

  const handleToggleAllExams = async (enable) => {
    if (!selectedSubject) return;

    const updatedGroups = subjectGroups[selectedSubject].map(group => ({
      ...group,
      has_exam: enable
    }));

    try {
      await scheduleApi.updateExamStatus({
        exams: updatedGroups.map(group => ({
          section_id: group.Section,
          has_exam: enable
        }))
      });

      setSubjectGroups(prev => ({
        ...prev,
        [selectedSubject]: updatedGroups
      }));

    } catch (error) {
      toast.error('Ошибка обновления статуса экзаменов');
    }
  };

  const filteredSubjects = (subjects || []).filter(subject =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`container-fluid p-0 min-vh-100 ${scheduleLoading ? 'disabled-page' : ''}`}>
      <Navbar showFilterButton={false} />
      
      <div className="container mt-4">
        {scheduleLoading && <GlobalLoader />}
        
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <button
            onClick={handleGenerate}
            className="btn btn-red d-flex gap-2 py-2 px-4"
            disabled={scheduleLoading}
          >
            {scheduleLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Генерация...
              </>
            ) : (
              'Сгенерировать'
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
                  <button
                    onClick={() => handleToggleAllExams(!subjectGroups[selectedSubject].every(g => g.has_exam))}
                    className="btn btn-red"
                  >
                    {subjectGroups[selectedSubject].every(g => g.has_exam) ? 'Отключить все' : 'Включить все'}
                  </button>
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