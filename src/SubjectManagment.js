import React, { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SubjectManagement = () => {
  const [subjects, setSubjects] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groupData, setGroupData] = useState({});

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/subjects');
      const data = await response.json();
      if (data.success) {
        setSubjects(data.subjects);
      } else {
        toast.error('Ошибка при загрузке предметов');
      }
    } catch (error) {
      toast.error('Ошибка сервера при загрузке предметов');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectGroups = async (subject) => {
    try {
      const response = await fetch(`http://localhost:5000/subjects/${subject}/groups`);
      const data = await response.json();
      if (data.success) {
        setGroupData(prev => ({ ...prev, [subject]: data.groups }));
      } else {
        toast.error(`Ошибка при загрузке групп предмета ${subject}`);
      }
    } catch (error) {
      toast.error('Ошибка сервера при загрузке групп');
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (window.confirm(`Вы уверены, что хотите удалить предмет "${subject}" и все его группы?`)) {
      try {
        const response = await fetch(`http://localhost:5000/subjects/${subject}/delete`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`Предмет "${subject}" успешно удален`);
          fetchSubjects();
        } else {
          toast.error(`Ошибка при удалении предмета: ${data.error}`);
        }
      } catch (error) {
        toast.error('Ошибка сервера при удалении предмета');
      }
    }
  };

  const handleDeleteSection = async (subject, section) => {
    if (window.confirm(`Вы уверены, что хотите удалить секцию "${section}"?`)) {
      try {
        const response = await fetch(`http://localhost:5000/subjects/${subject}/sections/${section}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`Секция "${section}" успешно удалена`);
          fetchSubjectGroups(subject);
        } else {
          toast.error(`Ошибка при удалении секции: ${data.error}`);
        }
      } catch (error) {
        toast.error('Ошибка сервера при удалении секции');
      }
    }
  };

  const handleExpandSubject = async (subject) => {
    if (expandedSubject === subject) {
      setExpandedSubject(null);
    } else {
      setExpandedSubject(subject);
      if (!groupData[subject]) {
        await fetchSubjectGroups(subject);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Управление предметами</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : subjects.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Предметы не найдены
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject) => (
                <div key={subject} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleExpandSubject(subject)}
                      className="flex items-center gap-2 text-lg font-semibold"
                    >
                      {expandedSubject === subject ? <ChevronUp /> : <ChevronDown />}
                      {subject}
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(subject)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {expandedSubject === subject && groupData[subject] && (
                    <div className="mt-4 pl-6">
                      {Object.entries(groupData[subject]).map(([program, groups]) => (
                        <div key={program} className="mb-4">
                          <h4 className="font-medium mb-2">{program}</h4>
                          <div className="grid gap-2">
                            {groups.map((group, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <p className="font-medium">Секция: {group.Section}</p>
                                  <p className="text-sm text-gray-600">
                                    Преподаватель: {group.Instructor}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Курс: {group.Course}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteSection(subject, group.Section)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectManagement;