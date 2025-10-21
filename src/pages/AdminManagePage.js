import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { CheckCircle, XCircle, Users } from 'lucide-react';
import { Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/style.css';
import Navbar from '../components/NavBar';
import { GlobalLoader } from '../components/Loaderss';
import { scheduleApi } from '../services/Api';

const AdminManagePage = () => {
  // Фиксированный список ролей
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
        console.log(data.has_drafts);
        
        if(!data.has_drafts){
          navigate('/')
        }

        setSubAdmins(
          defaultAdmins.map((defaultAdmin) => {
            const backendAdmin = Array.isArray(data.statuses)
              ? data.statuses.find((admin) => admin.role.toLowerCase() === defaultAdmin.role.toLowerCase())
              : null;
            return backendAdmin
              ? { ...defaultAdmin, ready: backendAdmin.status === 'ready' }
              : defaultAdmin;
          })
        );
      } catch (error) {
        console.error('Error fetching subAdmins:', error);
        toast.error('Ошибка загрузки статусов');
      }
    };
    fetchSubAdmins();
  }, []);

  const handleGenerate = async () => {
    setScheduleLoading(true);
    try {
      const response = await scheduleApi.generateSchedule();
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

  return (
    <div className={`container-fluid p-0 min-vh-100 ${scheduleLoading ? 'disabled-page' : ''}`}>
      <Navbar showFilterButton={false} />
      
      <div className="container mt-4">
        {scheduleLoading && <GlobalLoader />}
        
        <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-4">
          <button
            onClick={handleGenerate}
            className="btn btn-red d-flex gap-2 py-2 px-4"
            disabled={scheduleLoading || !allReady}
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
        </div>

        <div className="card shadow-sm">
          <div className="card-header bg-white border-bottom p-4">
            <h2 className="h4 mb-0 d-flex align-items-center gap-2">
              <Users size={24} style={{ color: '#C8102E' }} />
              Статус subAdmin
            </h2>
          </div>
          
          <div className="card-body p-4">
            <div className="table-responsive">
              <Table className="table-hover mb-0">
                <thead className="bg-light">
                  <tr>
                    <th style={{ width: '70%' }}>SubAdmin</th>
                    <th className="text-center">Готово</th>
                  </tr>
                </thead>
                
                <tbody>
                  {subAdmins.length > 0 ? (
                    subAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td>{admin.role}</td>
                        <td className="text-center">
                          {admin.ready ? (
                            <CheckCircle size={20} style={{ color: 'green' }} />
                          ) : (
                            <XCircle size={20} style={{ color: 'red' }} />
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="text-center py-4 text-muted">
                        Нет subAdmin
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

export default AdminManagePage;