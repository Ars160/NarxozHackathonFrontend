import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {ChevronLeft} from 'lucide-react';

const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectGroups, setSubjectGroups] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate(); 

  // Загрузка списка предметов
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

  // Загрузка групп для выбранного предмета
  const fetchSubjectGroups = async (subject) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/subjects/${subject}/groups`);
      const data = await response.json();
      if (data.success) {
        setSubjectGroups(data.groups);
        setSelectedSubject(subject);
        toast.success(`Группы для предмета "${subject}" успешно загружены`);
      }
    } catch (error) {
      console.error('Error fetching subject groups:', error);
      toast.error(`Ошибка при загрузке групп для предмета "${subject}"`);
    }
    setLoading(false);
  };

  // Удаление всего предмета
  const deleteSubject = async (subject) => {
    if (window.confirm(`Вы уверены, что хотите удалить все группы предмета "${subject}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/subjects/${subject}/delete`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          // Обновляем список предметов
          fetchSubjects();
          // Сбрасываем выбранный предмет и группы
          setSelectedSubject(null);
          setSubjectGroups({});
          toast.success(`Предмет "${subject}" успешно удален`);
        } else {
          toast.error(`Ошибка при удалении предмета "${subject}"`);
        }
      } catch (error) {
        console.error('Error deleting subject:', error);
        toast.error(`Ошибка при удалении предмета "${subject}"`);
      }
    }
  };

  // Удаление конкретной секции
  const deleteSection = async (subject, section) => {
    if (window.confirm(`Вы уверены, что хотите удалить секцию "${section}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/subjects/${subject}/sections/${section}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (data.success) {
          // Обновляем группы для выбранного предмета
          fetchSubjectGroups(subject);
          toast.success(`Секция "${section}" успешно удалена`);
        } else {
          toast.error(`Ошибка при удалении секции "${section}"`);
        }
      } catch (error) {
        console.error('Error deleting section:', error);
        toast.error(`Ошибка при удалении секции "${section}"`);
      }
    }
  };

  // Фильтрация предметов
  const filteredSubjects = subjects.filter((subject) =>
    subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <ToastContainer />

      <button
        onClick={() => navigate('/')} // Перенаправляем на главную страницу
        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mb-4"
      >
        <ChevronLeft />
        <span>Вернуться на главную</span>
      </button>

      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Группы выбранного предмета */}
      {selectedSubject && subjectGroups && !loading && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold">Группы предмета "{selectedSubject}"</h2>
          </div>
          <div className="p-6">
            {Object.entries(subjectGroups).map(([eduProgram, groups]) => (
              <div key={eduProgram} className="mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  Образовательная программа: {eduProgram}
                </h3>
                <table className="w-full mb-4">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Секция</th>
                      <th className="px-4 py-2 text-left">Преподаватель</th>
                      <th className="px-4 py-2 text-left">Курс</th>
                      <th className="px-4 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <tr key={group.Section} className="border-b">
                        <td className="px-4 py-2">{group.Section}</td>
                        <td className="px-4 py-2">{group.Instructor}</td>
                        <td className="px-4 py-2">{group.Course}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => deleteSection(selectedSubject, group.Section)}
                            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                          >
                            Удалить секцию
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Список предметов */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Список предметов</h2>
          <input
            type="text"
            placeholder="Поиск предметов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2 p-2 border rounded w-full"
          />
        </div>
        <div className="p-6">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Предмет</th>
                <th className="px-4 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubjects.map((subject) => (
                <tr key={subject} className="border-b">
                  <td className="px-4 py-2">{subject}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => fetchSubjectGroups(subject)}
                      className="bg-blue-500 text-white px-4 py-2 rounded mr-2 hover:bg-blue-600"
                    >
                      Просмотр групп
                    </button>
                    <button
                      onClick={() => deleteSubject(subject)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Удалить все группы
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubjectList;