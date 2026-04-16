import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Users, Loader2, Zap } from 'lucide-react';
import '../styles/style.css';
import Navbar from '../components/NavBar';
import { GlobalLoader } from '../components/Loaderss';
import { scheduleApi } from '../services/Api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';

const AdminManagePage = () => {
  const defaultAdmins = [
    { id: 1, role: 'Admin-SDT', ready: false },
    { id: 2, role: 'Admin-SEM', ready: false },
    { id: 3, role: 'Admin-GUM', ready: false },
    { id: 4, role: 'Admin-SPIGU', ready: false },
  ];

  const [subAdmins, setSubAdmins] = useState(defaultAdmins);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubAdmins = async () => {
      try {
        const data = await scheduleApi.getSubAdminsStatus();
        if (!data.has_drafts) navigate('/');
        setSubAdmins(
          defaultAdmins.map((defaultAdmin) => {
            const backendAdmin = Array.isArray(data.statuses)
              ? data.statuses.find((admin) => admin.role.toLowerCase() === defaultAdmin.role.toLowerCase())
              : null;
            return backendAdmin ? { ...defaultAdmin, ready: backendAdmin.status === 'ready' } : defaultAdmin;
          })
        );
      } catch (error) {
        console.error('Error fetching subAdmins:', error);
        toast.error('Ошибка загрузки статусов');
      }
    };
    fetchSubAdmins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    setScheduleLoading(true);
    try {
      await scheduleApi.generateSchedule();
      toast.success('Расписание успешно сгенерировано');
      navigate('/');
    } catch (error) {
      console.error('Error generating schedule:', error);
      toast.error('Ошибка при генерации расписания');
    } finally {
      setScheduleLoading(false);
    }
  };

  const allReady = subAdmins.every((admin) => admin.ready);
  const readyCount = subAdmins.filter(a => a.ready).length;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar showFilterButton={false} />

      {scheduleLoading && <GlobalLoader />}

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Управление расписанием</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Готово администраторов:{' '}
              <span className={`font-semibold ${allReady ? 'text-emerald-600' : 'text-[#C8102E]'}`}>
                {readyCount} / {subAdmins.length}
              </span>
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={scheduleLoading || !allReady}
            className={`flex items-center gap-2 h-11 px-6 rounded-xl font-semibold shadow-md transition-all
              ${allReady
                ? 'bg-[#C8102E] hover:bg-[#A00D26] text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {scheduleLoading ? (
              <><Loader2 size={18} className="animate-spin" /> Генерация...</>
            ) : (
              <><Zap size={18} /> Сгенерировать расписание</>
            )}
          </Button>
        </div>

        {!allReady && (
          <div className="mb-6 px-4 py-3 border border-amber-200 bg-amber-50 rounded-xl text-amber-700 text-sm flex items-center gap-2">
            <Loader2 size={16} className="animate-spin shrink-0" />
            Ожидаем подтверждения от всех администраторов факультетов...
          </div>
        )}

        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-[#F8E8E8] flex items-center justify-center">
              <Users size={18} className="text-[#C8102E]" />
            </div>
            <h3 className="font-semibold text-gray-900">Статус администраторов</h3>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Администратор</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-36">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subAdmins.length > 0 ? (
                  subAdmins.map((admin) => (
                    <TableRow key={admin.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-gray-800">{admin.role}</TableCell>
                      <TableCell className="text-center">
                        {admin.ready ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-0 gap-1.5 hover:bg-emerald-50">
                            <CheckCircle size={13} />
                            Готов
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 border-0 gap-1.5 hover:bg-gray-100">
                            <XCircle size={13} />
                            Ожидание
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-10 text-gray-400 text-sm">
                      Нет администраторов
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminManagePage;