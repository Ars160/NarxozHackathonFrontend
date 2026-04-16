import { useCallback, useEffect, useState } from 'react';
import Navbar from './NavBar';
import { ClipboardList, LogIn, Trash2, CalendarDays, Clock, Hash } from 'lucide-react';
import CreateExamModal from './CreateExamModal';
import { scheduleApi } from '../services/Api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

const CreateExamPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [canCreateExam, setCanCreateExam] = useState(true);
  const navigate = useNavigate();

  const checkDrafts = useCallback(async () => {
    try {
      const response = await scheduleApi.getDraftStatus();
      if (response.have_drafts) {
        setCanCreateExam(false);
        navigate('/admin-manage-list', {
          state: { message: 'Вы уже создали экзамен. Завершите его перед созданием нового.', type: 'error' },
        });
      } else {
        setCanCreateExam(true);
        setShowModal(true);
      }
    } catch (err) {
      toast.error('Ошибка при проверке черновиков');
      console.error(err);
    }
  }, [navigate]);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await scheduleApi.getSessions();
      setSessions(data);
    } catch (err) {
      toast.error('Ошибка при загрузке сессий');
      console.error(err);
    }
  }, []);

  const handleActiveSession = useCallback(async (sessionId) => {
    try {
      await scheduleApi.activateSession(sessionId);
      navigate('/');
    } catch (err) {
      toast.error('Ошибка при активации сессии');
      console.error(err);
    }
  }, [navigate]);

  const deleteSession = useCallback(async (sessionId, title) => {
    if (window.confirm('Вы уверены, что хотите удалить эту сессию?')) {
      try {
        await scheduleApi.deleteSession(sessionId);
        toast.success(`Сессия «${title}» удалена`);
        fetchSessions();
      } catch (err) {
        toast.error('Ошибка при удалении сессии');
        console.error(err);
      }
    }
  }, [fetchSessions]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const formatDate = (dateStr, withTime = false) => {
    const opts = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
    if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; opts.hour12 = false; }
    return new Date(dateStr).toLocaleString('ru-RU', opts);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Управление сессиями</h2>
            <p className="text-sm text-gray-500 mt-0.5">Создайте новую сессию или активируйте существующую</p>
          </div>
          <Button
            onClick={checkDrafts}
            disabled={!canCreateExam}
            className="bg-[#C8102E] hover:bg-[#A00D26] text-white flex items-center gap-2 h-11 px-6 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            <ClipboardList size={18} />
            <span className="font-medium">Создать экзамен</span>
          </Button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#C8102E] hover:bg-[#C8102E]">
                  {['Название', 'Дата создания', 'Дата начала', 'Период', 'Активация', 'Действия'].map(l => (
                    <TableHead key={l} className="text-white font-medium">{l}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? sessions.map((session) => (
                  <TableRow key={session.created_at} className="hover:bg-[#F8E8E8]/40 transition-colors">
                    <TableCell className="font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} className="text-[#C8102E] shrink-0" />
                        {session.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">{formatDate(session.created_at, true)}</TableCell>
                    <TableCell className="text-gray-600 text-sm">{formatDate(session.start_date)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0">
                        {session.days} дн.
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleActiveSession(session.id)}
                        className="bg-[#0066CC] hover:bg-[#0052A3] text-white flex items-center gap-1.5 rounded-lg shadow-sm">
                        <LogIn size={14} /> Активировать
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => deleteSession(session.id, session.title)}
                        className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5 rounded-lg">
                        <Trash2 size={14} /> Удалить
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">😕</span>
                        <span className="text-sm">Нет сессий</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {sessions.length > 0 ? sessions.map((session) => (
            <Card key={session.created_at} className="border-0 shadow-sm rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-gray-900">
                  <CalendarDays size={16} className="text-[#C8102E] shrink-0" />
                  {session.title}
                </div>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-0 shrink-0">
                  {session.days} дн.
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-gray-400" />
                  <span>{formatDate(session.created_at, true)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash size={13} className="text-gray-400" />
                  <span>Начало: {formatDate(session.start_date)}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => handleActiveSession(session.id)}
                  className="flex-1 bg-[#0066CC] hover:bg-[#0052A3] text-white flex items-center justify-center gap-1.5 rounded-xl">
                  <LogIn size={14} /> Активировать
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteSession(session.id, session.title)}
                  className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-1.5 rounded-xl px-3">
                  <Trash2 size={14} />
                </Button>
              </div>
            </Card>
          )) : (
            <div className="text-center py-16 text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <span className="text-4xl">😕</span>
                <span className="text-sm">Нет сессий</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <CreateExamModal show={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default CreateExamPage;