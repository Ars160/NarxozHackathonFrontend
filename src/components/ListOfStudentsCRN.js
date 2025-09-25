import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Search, User, Calendar, Clock, BookOpen, Users, Hash, Building, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import Navbar from './NavBar';

const ListOfStudentsCRN = () => {
  const [sectionInfo, setSectionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { sectionId } = useParams();
  const navigate = useNavigate();

  const fetchSectionInfo = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/section/${sectionId}`);
      if (!response.ok) throw new Error('Failed to fetch section info');
      const data = await response.json();
      
      const uniqueRooms = [...new Set(data.students.map(student => student.room))].join(', ');
      
      setSectionInfo({
        ...data,
        schedule: { ...data.schedule, Room: uniqueRooms }
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при загрузке информации о секции');
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchSectionInfo();
  }, [fetchSectionInfo]);

  const handleExport = async () => {
    try {
      const response = await fetch(`http://localhost:5000/section/${sectionId}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `section-${sectionId}-students.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Файл успешно экспортирован');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при экспорте файла');
    }
  };

  const filteredStudents = sectionInfo?.students
  .filter(student =>
    student.fake_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.fake_id.toLowerCase().includes(searchQuery.toLowerCase())
  )
  .sort((a, b) => {
    // Преобразуем room в строку перед использованием localeCompare
    const roomComparison = String(a.room).localeCompare(String(b.room), undefined, { numeric: true });
    // Если аудитории одинаковые, сортируем по seat
    return roomComparison || a.seat - b.seat;
  }) || [];

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-red" role="status" style={{ color: '#C8102E' }}>
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!sectionInfo) {
    return (
      <div className="container p-4">
        <div className="alert alert-danger text-center" role="alert">
          Информация о секции не найдена
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0 min-vh-100">
      <Navbar showFilterButton={false} />

      <div className="container mt-4">
        {/* Header Section */}
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-outline-red d-flex align-items-center gap-2"
            style={{ color: '#C8102E', borderColor: '#C8102E' }}
          >
            <ArrowLeft size={20} />
            Назад к расписанию
          </button>
          
          <div className="d-flex gap-3">
            <div className="position-relative">
              <input
                type="text"
                placeholder="Поиск студентов..."
                className="form-control border-red"
                style={{ borderColor: '#C8102E', paddingLeft: '2.5rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search size={20} className="position-absolute top-50 translate-middle-y ms-2 text-muted" />
            </div>
            
            <button
              onClick={handleExport}
              className="btn text-white d-flex align-items-center gap-2"
              style={{ backgroundColor: '#C8102E' }}
            >
              <Download size={20} />
              Экспорт
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="card shadow-sm mb-4">
          {/* Section Header */}
          <div className="card-header bg-white border-bottom p-4">
            <h1 className="h3 mb-0 d-flex align-items-center gap-2">
              <Hash size={24} style={{ color: '#C8102E' }} />
              Секция {sectionId}
            </h1>
          </div>

          {/* Section Info Cards */}
          <div className="card-body p-4">
            <div className="row g-4">
              <InfoCard
                icon={<User size={20} />}
                title="Преподаватель"
                value={sectionInfo.schedule.Instructor}
              />
              <InfoCard
                icon={<BookOpen size={20} />}
                title="Предмет"
                value={sectionInfo.schedule.Subject}
              />
              <InfoCard
                icon={<Users size={20} />}
                title="Количество студентов"
                value={sectionInfo.schedule.Students_Count}
              />
              <InfoCard
                icon={<Calendar size={20} />}
                title="Дата экзамена"
                value={new Date(sectionInfo.schedule.Date).toLocaleDateString('ru-RU')}
              />
              <InfoCard
                icon={<Clock size={20} />}
                title="Время экзамена"
                value={sectionInfo.schedule.Time_Slot}
              />
              <InfoCard
                icon={<Clock size={20} />}
                title="Продолжительность"
                value={`${Math.floor(sectionInfo.schedule.Duration)} мин.`}
              />
              <InfoCard
                icon={<Building size={20} />}
                title="Аудитория"
                value={sectionInfo.schedule.Room}
              />
              <InfoCard
                icon={<CheckCircle size={20} />}
                title="Проктор"
                value={sectionInfo.schedule.Proctor || 'Не указан'}
              />
            </div>
          </div>

          {/* Students Table */}
          <div className="card-body border-top p-4">
            <div className="d-flex align-items-center gap-2 mb-4">
              <Users size={20} style={{ color: '#C8102E' }} />
              <h3 className="h5 mb-0">Список студентов ({filteredStudents.length})</h3>
            </div>

            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{ width: '30%' }} className="py-3">ID студента</th>
                    <th style={{ width: '40%' }} className="py-3">Имя студента</th>
                    <th style={{ width: '15%' }} className="py-3">Аудитория</th>
                    <th style={{ width: '15%' }} className="py-3">Место</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.fake_id}>
                      <td>{student.fake_id}</td>
                      <td>{student.fake_name}</td>
                      <td className="text-danger fw-bold">{student.room}</td>
                      <td className="text-secondary">{student.seat}</td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-4 text-muted">
                        Студенты не найдены
                      </td>
                    </tr>
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

const InfoCard = ({ icon, title, value }) => (
  <div className="col-md-6 col-lg-4">
    <div className="card h-100 border">
      <div className="card-body p-3">
        <div className="d-flex align-items-center gap-3">
          {icon && <div style={{ color: '#C8102E' }}>{icon}</div>}
          <div>
            <h3 className="text-muted small mb-1">{title}</h3>
            <p className="mb-0 h6">{value}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default ListOfStudentsCRN;