import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, RefreshCcw, Wrench } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./NavBar";
import { LocalLoader } from "./Loaderss";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [conflicts, setConflicts] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [resolveData, setResolveData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const fetchConflicts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/report/conflicts`);
      const data = await res.json();
      setConflicts(data.conflicts || []);
      toast.success("Конфликты успешно загружены");
    } catch (err) {
      toast.error("Ошибка при загрузке конфликтов");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 🔧 Разрешение конфликтов
  const resolveConflicts = async () => {
    try {
      setResolving(true);
      const res = await fetch(`${API_URL}/resolve-day-conflicts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setResolveData(data.changes || []);
      toast.success("Конфликты успешно разрешены");
    } catch (err) {
      toast.error("Ошибка при разрешении конфликтов");
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
  }, []);


  return (
    <div className="container-fluid p-0 min-vh-100">
      <Navbar showFilterButton={false} />
     
      <div className="container mt-4"> {(loading || resolving) && <LocalLoader />}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fw-bold text-dark">Управление конфликтами</h3>
          <div className="d-flex gap-2">
            <button
              onClick={fetchConflicts}
              className="btn btn-outline-secondary d-flex align-items-center gap-2"
              disabled={loading || resolving}
            >
              <RefreshCcw size={18} /> Обновить
            </button>
            <button
              onClick={resolveConflicts}
              disabled={loading || resolving}
              className="btn text-white d-flex align-items-center gap-2"
              style={{ backgroundColor: "#C8102E" }}
            >
              <Wrench size={18} />
              {resolving ? "Обработка..." : "Решать конфликты"}
            </button>
          </div>
        </div>

        <div className="table-responsive rounded-lg shadow-sm table-container">
          <table className="table table-narxoz">
            <thead>
              <tr>
                <th>Дата</th>
                <th>ID студента</th>
                <th>Предметы в конфликте</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-3 text-muted">
                    Конфликтов не найдено
                  </td>
                </tr>
              ) : (
                conflicts.map((conflict, idx) => (
                  <>
                    <tr key={idx}>
                      <td>{new Date(conflict.date).toLocaleDateString("ru-RU")}</td>
                      <td className="fw-semibold text-primary">
                        {conflict.student}
                      </td>
                      <td>{conflict.subjects.join(", ")}</td>
                    </tr>

                    {expanded[conflict.student] && (
                      <tr>
                        <td colSpan="4">
                          <div
                            className="bg-light p-3 rounded"
                          >
                            <table className="table table-sm mb-0">
                              <thead className="table-secondary">
                                <tr>
                                  <th>Предмет</th>
                                </tr>
                              </thead>
                              <tbody>
                                {conflict.subjects.map((subj, i) => (
                                  <tr key={i}>
                                    <td>{subj}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 🔽 Блок результатов после Resolve */}
        {resolveData.length > 0 && (
          <div className="mt-5">
            <h5 className="fw-bold text-dark mb-3">📋 Изменения после разрешения:</h5>
            <div className="table-responsive rounded-lg shadow-sm table-container">
              <table className="table table-narxoz">
                <thead>
                  <tr>
                    <th>Студент</th>
                    <th>Предмет</th>
                    <th>Из группы</th>
                    <th>В группу</th>
                  </tr>
                </thead>
                <tbody>
                  {resolveData.map((ch, i) => (
                    <tr key={i}>
                      <td>{ch.student}</td>
                      <td>{ch.switched.subject}</td>
                      <td className="text-danger">{ch.switched.from}</td>
                      <td className="text-success">{ch.switched.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
