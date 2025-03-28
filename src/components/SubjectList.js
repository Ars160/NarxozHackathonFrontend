import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, Search, Trash2, Eye, BookOpen, GraduationCap, Users, X} from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/style.css';
import Navbar from './NavBar';
import { GlobalLoader, LocalLoader } from './Loaderss';


const SubjectList = () => {
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
      const response = await fetch('http://localhost:5000/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Ошибка при загрузке списка предметов');
    }
  };

  const fetchSubjectGroups = async (subject) => {
    setGroupsLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/subjects/${subject}/groups`);
      
      if (!response.ok) {
        if (response.status === 404) {
          closeGroups();
          toast.info(`Группы для предмета "${subject}" не найдены`);
          return;
        }
        throw new Error('Failed to fetch groups');
      }
      
      const data = await response.json();
      if (data.success) {
        setSubjectGroups(data.groups);
        setSelectedSubject(subject);
        setIsGroupsOpen(true);
        toast.success(`Группы для предмета "${subject}" успешно загружены`);
      }
    } catch (error) {
      console.error('Error fetching subject groups:', error);
      toast.error(`Ошибка при загрузке групп для предмета "${subject}"`);
    } finally {
      setGroupsLoading(false);
    }
  };

  const closeGroups = () => {
    setSelectedSubject(null)
    setSubjectGroups({})
    setIsGroupsOpen(false)
  }

  const deleteSubject = async (subject) => {
    if (window.confirm(`Вы уверены, что хотите удалить все группы предмета "${subject}"?`)) {
      setScheduleLoading(true)
      try {
        const response = await fetch(`http://localhost:5000/subjects/${subject}/delete`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          fetchSubjects();
          setSelectedSubject(null);
          setSubjectGroups({});
          toast.success(`Предмет "${subject}" успешно удален`);
        } else {
          toast.error(`Ошибка при удалении предмета "${subject}"`);
        }
      } catch (error) {
        console.error('Error deleting subject:', error);
        toast.error(`Ошибка при удалении предмета "${subject}"`);
      } finally {
        setScheduleLoading(false)
      }
    }
  };

  const deleteSection = async (subject, section) => {
    if (window.confirm(`Вы уверены, что хотите удалить секцию "${section}"?`)) {
      setScheduleLoading(true)
      try {
        const response = await fetch(`http://localhost:5000/subjects/${subject}/sections/${section}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (data.success) {
          // Проверяем остались ли секции у предмета
          const groupsResponse = await fetch(`http://localhost:5000/subjects/${subject}/groups`);
          
          if (!groupsResponse.ok) {
            // Если секций нет (404) - удаляем предмет
            await fetch(`http://localhost:5000/subjects/${subject}/delete`, { method: 'DELETE' });
            fetchSubjects(); // Обновляем список предметов
            closeGroups(); // Закрываем окно групп
            toast.success(`Предмет "${subject}" удален, так как секций больше нет`);
          } else {
            // Если секции остались - обновляем список
            const groupsData = await groupsResponse.json();
            setSubjectGroups(groupsData.groups);
            toast.success(`Секция "${section}" успешно удалена`);
          }
        } else {
          toast.error(`Ошибка при удалении секции "${section}"`);
        }
      } catch (error) {
        console.error('Error deleting section:', error);
        toast.error(`Ошибка при удалении секции "${section}"`);
      } finally {
        setScheduleLoading(false)
      }
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
      if (scheduleLoading) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'auto';
      }
    }, [scheduleLoading]);

  return (
    <div className={`container-fluid p-0 min-vh-100 ${scheduleLoading ? 'disabled-page' : ''}`}>
      <Navbar showFilterButton={false} />
      {scheduleLoading && <GlobalLoader />} 
      <div className="container mt-4">
        
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="btn btn-outline-red d-flex align-items-center gap-2"
            style={{ color: '#C8102E', borderColor: '#C8102E' }}
          >
            <ArrowLeft size={20} />
            Вернуться на главную
          </button>
          
          <div className="position-relative">
            <input
              type="text"
              placeholder="Поиск предметов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control border-red"
              style={{ borderColor: '#C8102E', paddingLeft: '2.5rem' }}
            />
            <Search size={20} className="position-absolute top-50 translate-middle-y ms-2 text-muted" />
          </div>
        </div>

        {/* Loading Indicator */}
        {groupsLoading && <LocalLoader />}

        {/* Selected Subject Groups */}
        {isGroupsOpen && selectedSubject && subjectGroups && !groupsLoading && (
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-white border-bottom p-4">
              <h2 className="h4 mb-0 d-flex align-items-center gap-2">
                <BookOpen size={24} style={{ color: '#C8102E' }} />
                Группы предмета "{selectedSubject}"
              </h2>

              <button
                onClick={closeGroups}
                className="btn position-absolute top-0 end-0 m-3"
                style={{ 
                  zIndex: 1, 
                  backgroundColor: '#C8102E', 
                  width: '45px', 
                  height: '35px', 
                  display: 'flex', 
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={25} color="white" /> {/* Белый цвет иконки */}
              </button>

            </div>
            <div className="card-body p-4">
              {Object.entries(subjectGroups).map(([eduProgram, groups]) => (
                <div key={eduProgram} className="mb-4">
                  <h3 className="h5 mb-3 d-flex align-items-center gap-2">
                    <GraduationCap size={20} style={{ color: '#C8102E' }} />
                    Образовательная программа: {eduProgram}
                  </h3>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="bg-light">
                        <tr>
                          <th className="py-3">Секция</th>
                          <th className="py-3">Преподаватель</th>
                          <th className="py-3 text-end">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.map((group) => (
                          <tr key={group.Section}>
                            <td className="py-3">{group.Section}</td>
                            <td className="py-3">{group.Instructor}</td>
                            <td className="py-3 text-end">
                              <button
                                onClick={() => deleteSection(selectedSubject, group.Section)}
                                className="btn btn-red btn-sm d-inline-flex align-items-center gap-2"
                              >
                                <Trash2 size={16} />
                                Удалить секцию
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subjects List */}
        <div className="card shadow-sm">
          <div className="card-header bg-white border-bottom p-4">
            <h2 className="h4 mb-0 d-flex align-items-center gap-2">
              <Users size={24} style={{ color: '#C8102E' }} />
              Список предметов
            </h2>
          </div>
          <div className="card-body p-4">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="py-3" style={{ width: '60%' }}>Предмет</th>
                    <th className="py-3 text-end">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="text-center py-4 text-muted">
                        Предметы не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <tr key={subject}>
                        <td className="py-3">{subject}</td>
                        <td className="py-3 text-end">
                            <button
                              onClick={() => {
                                if (selectedSubject === subject && isGroupsOpen) {
                                  closeGroups(); // Закрыть, если уже открыто
                                } else {
                                  fetchSubjectGroups(subject); // Открыть и загрузить группы
                                }
                              }}
                              className="btn btn-blue btn-sm me-2 d-inline-flex align-items-center gap-2"
                            >
                              <Eye size={16} />
                              {selectedSubject === subject && isGroupsOpen ? 'Закрыть' : 'Просмотр групп'}
                            </button>
                          <button
                            onClick={() => deleteSubject(subject)}
                            className="btn btn-red btn-sm d-inline-flex align-items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Удалить все группы
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectList;