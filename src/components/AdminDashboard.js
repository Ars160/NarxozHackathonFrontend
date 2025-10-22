import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, RefreshCcw, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./NavBar";
import { LocalLoader } from "./Loaderss";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [conflicts, setConflicts] = useState([]);
  const [resolvedConflicts, setResolvedConflicts] = useState([]);
  const [expanded, setExpanded] = useState({});
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

  const fetchResolvedConflicts = async () => {
    try {
      const res = await fetch(`${API_URL}/resolved_conflicts`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      setResolvedConflicts(data || []);
    } catch (err) {
      console.error("Ошибка при загрузке разрешённых конфликтов:", err);
    }
  };

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

      if (!res.ok) throw new Error("Ошибка при разрешении конфликтов");

      toast.success("Конфликты успешно разрешены");
      await fetchConflicts();
      await fetchResolvedConflicts();
    } catch (err) {
      toast.error("Ошибка при разрешении конфликтов");
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    fetchConflicts();
    fetchResolvedConflicts();
  }, []);

  return (
    <div className="container-fluid p-0 min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
      <Navbar showFilterButton={false} />

      <div className="container mt-4 pb-5">
        {(loading || resolving) && <LocalLoader />}
        
        {/* Заголовок с кнопками */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold text-dark mb-1">Управление конфликтами</h3>
            <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
              Отслеживание и разрешение конфликтов расписания
            </p>
          </div>
          <div className="d-flex gap-2">
            <button
              onClick={() => {
                fetchConflicts();
                fetchResolvedConflicts();
              }}
              className="btn btn-light border d-flex align-items-center gap-2"
              disabled={loading || resolving}
              style={{ 
                borderRadius: "8px",
                padding: "8px 16px",
                transition: "all 0.2s"
              }}
            >
              <RefreshCcw size={18} /> Обновить
            </button>
            <button
              onClick={resolveConflicts}
              disabled={loading || resolving}
              className="btn text-white d-flex align-items-center gap-2"
              style={{ 
                backgroundColor: "#C8102E",
                borderRadius: "8px",
                padding: "8px 20px",
                border: "none",
                transition: "all 0.2s"
              }}
            >
              <Wrench size={18} />
              {resolving ? "Обработка..." : "Решить конфликты"}
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
              <div className="card-body d-flex align-items-center">
                <div className="p-3 rounded-circle me-3" style={{ backgroundColor: "#ffe5e5" }}>
                  <AlertCircle size={24} color="#C8102E" />
                </div>
                <div>
                  <h6 className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>Активные конфликты</h6>
                  <h3 className="mb-0 fw-bold">{conflicts.length}</h3>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
              <div className="card-body d-flex align-items-center">
                <div className="p-3 rounded-circle me-3" style={{ backgroundColor: "#e8f5e9" }}>
                  <CheckCircle2 size={24} color="#28a745" />
                </div>
                <div>
                  <h6 className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>Решенные конфликты</h6>
                  <h3 className="mb-0 fw-bold">{resolvedConflicts.length}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Таблица конфликтов */}
        <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: "12px" }}>
          <div className="card-header bg-white border-0 py-3" style={{ borderRadius: "12px 12px 0 0" }}>
            <h5 className="mb-0 fw-semibold">Текущие конфликты</h5>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table className="table table-hover mb-0">
                <thead style={{ backgroundColor: "#f8f9fa", position: "sticky", top: 0, zIndex: 1 }}>
                  <tr>
                    <th className="border-0 py-3 ps-4" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>Дата</th>
                    <th className="border-0 py-3" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>ID студента</th>
                    <th className="border-0 py-3 pe-4" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>Предметы в конфликте</th>
                  </tr>
                </thead>
                <tbody>
                  {conflicts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-5">
                        <AlertCircle size={48} className="text-muted mb-2" style={{ opacity: 0.3 }} />
                        <p className="text-muted mb-0">Конфликтов не найдено</p>
                      </td>
                    </tr>
                  ) : (
                    conflicts.map((conflict, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td className="py-3 ps-4">{new Date(conflict.date).toLocaleDateString("ru-RU")}</td>
                        <td className="py-3">
                          <span className="badge" style={{ 
                            backgroundColor: "#e3f2fd", 
                            color: "#1976d2",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontWeight: "500"
                          }}>
                            {conflict.student}
                          </span>
                        </td>
                        <td className="py-3 pe-4">{conflict.subjects.join(", ")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Таблица разрешённых конфликтов */}
        {resolvedConflicts.length > 0 && (
          <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
            <div className="card-header bg-white border-0 py-3" style={{ borderRadius: "12px 12px 0 0" }}>
              <h5 className="mb-0 fw-semibold">Разрешённые конфликты</h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="table table-hover mb-0">
                  <thead style={{ backgroundColor: "#f8f9fa", position: "sticky", top: 0, zIndex: 1 }}>
                    <tr>
                      <th className="border-0 py-3 ps-4" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>ID студента</th>
                      <th className="border-0 py-3" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>Предмет</th>
                      <th className="border-0 py-3" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>Из группы</th>
                      <th className="border-0 py-3" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>В группу</th>
                      <th className="border-0 py-3 pe-4" style={{ fontSize: "0.85rem", color: "#6c757d", fontWeight: "600" }}>Дата разрешения</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedConflicts.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td className="py-3 ps-4">
                          <span className="badge" style={{ 
                            backgroundColor: "#e3f2fd", 
                            color: "#1976d2",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontWeight: "500"
                          }}>
                            {item.student_id}
                          </span>
                        </td>
                        <td className="py-3">{item.subject}</td>
                        <td className="py-3">
                          <span className="badge" style={{ 
                            backgroundColor: "#ffebee", 
                            color: "#c62828",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontWeight: "500"
                          }}>
                            {item.original_section}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="badge" style={{ 
                            backgroundColor: "#e8f5e9", 
                            color: "#2e7d32",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontWeight: "500"
                          }}>
                            {item.new_section}
                          </span>
                        </td>
                        <td className="py-3 pe-4" style={{ fontSize: "0.9rem", color: "#6c757d" }}>
                          {new Date(item.resolved_at).toLocaleString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;