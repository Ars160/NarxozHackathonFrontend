import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Search, User, Calendar, Clock, BookOpen, Users, Hash, Building, CheckCircle, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-toastify';
import Navbar from './NavBar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const InfoCard = ({ icon, title, value }) => (
  <div className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
    <div className="w-9 h-9 rounded-xl bg-[#F8E8E8] flex items-center justify-center shrink-0">
      <span className="text-[#C8102E]">{icon}</span>
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{title}</p>
      <p className="text-sm font-semibold text-gray-900 truncate">{value || '—'}</p>
    </div>
  </div>
);

const ListOfStudentsCRN = () => {
  const [sectionInfo, setSectionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const { sectionId } = useParams();
  const navigate = useNavigate();

  const fetchSectionInfo = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/section/${sectionId}`);
      if (!response.ok) throw new Error('Failed to fetch section info');
      const data = await response.json();
      const uniqueRooms = [...new Set(data.students.map(student => student.room))].join(', ');
      setSectionInfo({ ...data, schedule: { ...data.schedule, Room: uniqueRooms } });
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
        headers: { 'Content-Type': 'application/json' },
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
      const roomComparison = String(a.room).localeCompare(String(b.room), undefined, { numeric: true });
      return roomComparison || a.seat - b.seat;
    }) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!sectionInfo) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center px-6 py-10 bg-white rounded-2xl shadow-sm border border-red-100">
          <p className="text-red-600 font-medium">Информация о секции не найдена</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar showFilterButton={false} />

      <main className="container mx-auto px-4 py-6 sm:py-8 space-y-5">
        {/* Header & Back Button */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-[#C8102E] transition-colors mb-4 text-sm font-medium w-fit bg-white hover:bg-red-50 border border-gray-100 pr-4 pl-3 py-1.5 rounded-full shadow-sm"
          >
            <ArrowLeft size={16} /> Назад
          </button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#C8102E] flex items-center justify-center shrink-0 shadow-sm">
                <Hash size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">Секция {sectionId}</h2>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{sectionInfo.schedule.Subject}</p>
              </div>
            </div>
            <div className="flex flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по студентам (Имя, ID)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl border-gray-200 focus-visible:ring-[#C8102E] h-10 shadow-sm text-sm"
                />
              </div>
              <Button
                onClick={handleExport}
                className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-2 rounded-xl shadow-sm h-10 px-4"
                title="Экспорт списка студентов"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Экспорт</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Collapsible Info Toggle (Mobile Only) */}
        <button
          onClick={() => setShowInfo(o => !o)}
          className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 text-sm font-medium text-gray-800"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[#C8102E]" />
            Детали экзамена
          </div>
          {showInfo ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {/* Info Cards Grid */}
        <div className={`${showInfo ? 'grid' : 'hidden'} md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 transition-all`}>
          <InfoCard icon={<User size={18} />} title="Преподаватель" value={sectionInfo.schedule.Instructor} />
          <InfoCard icon={<BookOpen size={18} />} title="Предмет" value={sectionInfo.schedule.Subject} />
          <InfoCard icon={<Users size={18} />} title="Студенты" value={sectionInfo.schedule.Students_Count} />
          <InfoCard icon={<Calendar size={18} />} title="Дата экзамена" value={new Date(sectionInfo.schedule.Date).toLocaleDateString('ru-RU')} />
          <InfoCard icon={<Clock size={18} />} title="Время" value={sectionInfo.schedule.Time_Slot} />
          <InfoCard icon={<Clock size={18} />} title="Длительность" value={`${Math.floor(sectionInfo.schedule.Duration)} мин.`} />
          <InfoCard icon={<Building size={18} />} title="Аудитория" value={sectionInfo.schedule.Room} />
          <InfoCard icon={<CheckCircle size={18} />} title="Проктор" value={sectionInfo.schedule.Proctor || 'Не указан'} />
        </div>

        {/* Students Table */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-[#F8E8E8] flex items-center justify-center">
              <Users size={16} className="text-[#C8102E]" />
            </div>
            <h3 className="font-semibold text-gray-900">
              Список студентов
              <Badge variant="secondary" className="ml-2 bg-gray-100 text-gray-600 border-0">
                {filteredStudents.length}
              </Badge>
            </h3>
          </div>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50 border-b border-gray-100">
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-[30%]">ID студента</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-[40%]">Имя студента</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-[15%]">Аудитория</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-[15%]">Место</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.fake_id} className="hover:bg-[#F8E8E8]/30 transition-colors">
                      <TableCell className="font-mono text-sm text-gray-600">{student.fake_id}</TableCell>
                      <TableCell className="font-medium text-gray-900">{student.fake_name}</TableCell>
                      <TableCell>
                        <Badge className="bg-[#F8E8E8] text-[#C8102E] font-semibold border-0 hover:bg-[#F8E8E8]">
                          {student.room}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium">{student.seat}</TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-gray-400 text-sm">
                        Студенты не найдены
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col p-3 gap-3 bg-gray-50/50">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Студенты не найдены</div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.fake_id} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1.5 relative overflow-hidden">
                    <div className="flex items-start justify-between gap-3 relative z-10 w-full pr-16" style={{ width: "calc(100% - 4.5rem)" }}>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm leading-tight mb-1">{student.fake_name}</p>
                        <p className="font-mono text-xs text-gray-500 flex items-center gap-1.5 w-fit">
                          {student.fake_id}
                        </p>
                      </div>
                    </div>
                    {/* Fixed positioning for Badges */}
                    <div className="flex flex-col items-end gap-1.5 absolute top-3.5 right-3.5 z-20">
                      <Badge className="bg-[#F8E8E8] text-[#C8102E] font-bold border-0 text-[11px] px-2.5 py-0.5 rounded-md w-fit">
                        {student.room}
                      </Badge>
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md w-fit">
                        Место {student.seat}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ListOfStudentsCRN;