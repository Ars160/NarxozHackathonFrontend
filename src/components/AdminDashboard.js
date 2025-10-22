import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ChevronDown, ChevronUp, RefreshCcw, Wrench } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./NavBar";
import { LocalLoader } from "./Loaderss";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [conflicts, setConflicts] = useState([]);
  const [resolvedConflicts, setResolvedConflicts] = useState([]); // ✅ новые данные
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  // 📡 Получение конфликтов
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

  // 📡 Получение уже разрешённых конфликтов
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

      if (!res.ok) throw new Error("Ошибка при разрешении конфликтов");

      toast.success("Конфликты успешно разрешены");
      await fetchConflicts(); // 🔁 обновляем таблицу конфликтов
      await fetchResolvedConflicts(); // 🔁 и таблицу разрешённых
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
    <div className="container-fluid p-0 min-vh-100">
      <Navbar showFilterButton={false} />

      <div className="container mt-4">
        {(loading || resolving) && <LocalLoader />}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="fw-bold text-dark">Управление конфликтами</h3>
          <div className="d-flex gap-2">
            <button
              onClick={() => {
                fetchConflicts();
                fetchResolvedConflicts();
              }}
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
              {resolving ? "Обработка..." : "Решить конфликты"}
            </button>
          </div>
        </div>

        {/* Таблица конфликтов */}
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
                  <tr key={idx}>
                    <td>{new Date(conflict.date).toLocaleDateString("ru-RU")}</td>
                    <td className="fw-semibold text-primary">
                      {conflict.student}
                    </td>
                    <td>{conflict.subjects.join(", ")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Таблица разрешённых конфликтов */}
        {resolvedConflicts.length > 0 && (
          <div className="mt-5">
            <h5 className="fw-bold text-dark mb-3">
              📋 Разрешённые конфликты:
            </h5>
            <div className="table-responsive rounded-lg shadow-sm table-container">
              <table className="table table-narxoz">
                <thead>
                  <tr>
                    <th>ID студента</th>
                    <th>Предмет</th>
                    <th>Из группы</th>
                    <th>В группу</th>
                    <th>Дата разрешения</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedConflicts.map((item, i) => (
                    <tr key={i}>
                      <td>{item.student_id}</td>
                      <td>{item.subject}</td>
                      <td className="text-danger">{item.original_section}</td>
                      <td className="text-success">{item.new_section}</td>
                      <td>
                        {new Date(item.resolved_at).toLocaleString("ru-RU")}
                      </td>
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
