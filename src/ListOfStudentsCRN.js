import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Loader } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ListOfStudentsCRN = () => {
  const [sectionInfo, setSectionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const { sectionId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSectionInfo();
  }, [sectionId]);

  const fetchSectionInfo = async () => {
    try {
      const response = await fetch(`http://localhost:5000/section/${sectionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch section info');
      }
      const data = await response.json();
      setSectionInfo(data);
      toast.info(`ВХОД В CRN ${sectionId}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при загрузке информации о секции');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`http://localhost:5000/section/${sectionId}/export`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `section_${sectionId}_info.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Файл успешно экспортирован');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Ошибка при экспорте файла');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!sectionInfo) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-red-600">
          Информация о секции не найдена
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
        <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {/* Верхняя панель с кнопками */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Назад к расписанию</span>
        </button>
        
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
        >
          <Download className="w-5 h-5" />
          <span>Экспорт в Excel</span>
        </button>
      </div>

      {/* Основная информация */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6">
          Информация о секции {sectionInfo.section_id}
        </h2>

        <div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Преподаватель</th>
                  <th className="px-4 py-2 text-left text-gray-600">Предмет</th>
                  <th className="px-4 py-2 text-left text-gray-600">Курс</th>
                  <th className="px-4 py-2 text-left text-gray-600">Образовательная программа</th>
                  <th className="px-4 py-2 text-left text-gray-600">Форма обучения</th>
                  <th className="px-4 py-2 text-left text-gray-600">Всего студентов</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                  <tr  className="hover:bg-gray-100">
                    <td className="px-4 py-2">{sectionInfo.section_info.instructor}</td>
                    <td className="px-4 py-2">{sectionInfo.section_info.subject}</td>
                    <td className="px-4 py-2">{sectionInfo.section_info.course}</td>
                    <td className="px-4 py-2">{sectionInfo.section_info.edu_program}</td>
                    <td className="px-4 py-2">{sectionInfo.section_info.years_of_study}</td>
                    <td className="px-4 py-2">{sectionInfo.section_info.total_students}</td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Информация о расписании */}
        {sectionInfo.schedule && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Расписание экзамена</h3>

        <div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Дата</th>
                  <th className="px-4 py-2 text-left text-gray-600">Время</th>
                  <th className="px-4 py-2 text-left text-gray-600">Аудитория</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                  <tr  className="hover:bg-gray-100">
                    <td className="px-4 py-2">{sectionInfo.schedule.Date}</td>
                    <td className="px-4 py-2">{sectionInfo.schedule.Time_Slot}</td>
                    <td className="px-4 py-2">{sectionInfo.schedule.Room}</td>
                  </tr>
              </tbody>
            </table>
          </div>
        </div>
          </div>
        )}

        {/* Список студентов */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Список студентов</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">ID</th>
                  <th className="px-4 py-2 text-left text-gray-600">Имя</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sectionInfo.students.map((student, index) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="px-4 py-2">{student.fake_id}</td>
                    <td className="px-4 py-2">{student.fake_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListOfStudentsCRN;