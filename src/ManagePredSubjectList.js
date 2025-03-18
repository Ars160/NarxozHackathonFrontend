import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Search, Trash2, Eye, BookOpen, GraduationCap, Users, X } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import Navbar from './NavBar';
import { scheduleApi } from './Api';

const ManagePredSubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectGroups, setSubjectGroups] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const subjects = await scheduleApi.getSubjects();
      setSubjects(subjects);
    } catch (error) {
      toast.error('Ошибка при загрузке списка предметов');
    }
  };

  const fetchSubjectGroups = async (subject) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/subjects/${subject}/groups`);
      if (!response.ok) {
        if (response.status === 404) {
          // Если группы не найдены, закрываем список групп
          closeGroups();
          toast.info(`Группы для предмета "${subject}" не найдены`);
          return;
        }
        throw new Error('Failed to fetch section info');
      }
      const data = await response.json();
      if (data.success) {
        setSubjectGroups(data.groups);
        setSelectedSubject(subject);
        setIsGroupsOpen(true);
        toast.success(`Группы для предмета "${subject}" успешно загружены`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Ошибка при загрузке групп для предмета "${subject}"`);
    } finally {
      setLoading(false);
    }
  };

  const closeGroups = () => {
    setSelectedSubject(null)
    setSubjectGroups({})
    setIsGroupsOpen(false)
  }

  const deleteSubject = async (subject) => {
    if (window.confirm(`Вы уверены, что хотите удалить все группы предмета "${subject}"?`)) {
      try {
        const response = await scheduleApi.deleteSubject(subject);
        if (response.status === 'success') {
          fetchSubjects();
          closeGroups();
          toast.success(`Предмет "${subject}" успешно удален`);
        } else {
          toast.error(`Ошибка при удалении предмета "${subject}"`);
        }
      } catch (error) {
        toast.error(`Ошибка при удалении предмета "${subject}"`);
      }
    }
  };

  const deleteSection = async (section) => {
    if (window.confirm(`Вы уверены, что хотите удалить секцию "${section}"?`)) {
      try {
        // Удаляем секцию
        const response = await scheduleApi.deleteSection(section);
        if (response.status === 'success') {
          // Проверяем, остались ли секции у предмета
          const groupsResponse = await fetch(`http://localhost:5000/subjects/${selectedSubject}/groups`);
          
          if (!groupsResponse.ok) {
            // Если секций нет (ошибка 404), удаляем предмет
            await scheduleApi.deleteSubject(selectedSubject);
            fetchSubjects(); // Обновляем список предметов
            closeGroups(); // Закрываем окно с группами
            toast.success(`Предмет "${selectedSubject}" удален, так как секций больше нет`);
          } else {
            // Если секции остались, обновляем их список
            const data = await groupsResponse.json();
            setSubjectGroups(data.groups);
            toast.success(`Секция "${section}" успешно удалена`);
          }
        } else {
          toast.error(`Ошибка при удалении секции "${section}"`);
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error(`Ошибка при удалении секции "${section}"`);
      }
    }
  };

  const handleGenerate = async () => {
    try {
      const response = await scheduleApi.generateSchedule();
      if (response.status === 'success') {
        toast.success('Расписание успешно сгенерировано');
        navigate('/');
      } else {
        toast.error('Ошибка при генерации расписания');
      }
    } catch (error) {
      toast.error('Ошибка при генерации расписания');
      console.log(error);
      
    }
  };

  const filteredSubjects = subjects.filter((subject) =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container-fluid p-0 min-vh-100">
      <Navbar showFilterButton={false} />

      <div className="container mt-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">

        <button
            onClick={() => handleGenerate()}
            className="btn btn-red d-flex  gap-2 py-2 px-4"
          >
            Сгенерировать
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

        {/* Loading Indicator */}
        {loading && (
          <div className="d-flex justify-content-center p-4">
            <div className="spinner-border text-red" role="status" style={{ color: '#C8102E' }}>
              <span className="visually-hidden">Загрузка...</span>
            </div>
          </div>
        )}

        {/* Selected Subject Groups */}
        {isGroupsOpen && selectedSubject && subjectGroups && !loading && (
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
                                onClick={() => deleteSection(group.Section)}
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

export default ManagePredSubjectList;