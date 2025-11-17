import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCcw, AlertCircle, Clock, BookOpen, Users, MapPin } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./NavBar";
import { LocalLoader } from "./Loaderss";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

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

  const toggleRow = (idx) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedRows(newExpanded);
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f5f7fa" }}>
      <Navbar showFilterButton={false} />

      <div className="container-fluid px-4 py-3">
        {loading && <LocalLoader />}
        
        {/* Компактный заголовок */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h4 className="fw-bold text-dark mb-0">Конфликты расписания</h4>
            <small className="text-muted">Обнаружено конфликтов: {conflicts.length}</small>
          </div>
          <button
            onClick={fetchConflicts}
            className="btn btn-sm btn-light border d-flex align-items-center gap-2"
            disabled={loading}
            style={{ borderRadius: "6px" }}
          >
            <RefreshCcw size={16} /> Обновить
          </button>
        </div>

        {/* Компактная таблица */}
        <div className="card border-0 shadow-sm" style={{ borderRadius: "10px" }}>
          <div className="table-responsive">
            <table className="table table-hover mb-0" style={{ fontSize: "0.9rem" }}>
              <thead style={{ backgroundColor: "#f8f9fa" }}>
                <tr>
                  <th className="border-0 py-2 ps-3" style={{ width: "100px", fontSize: "0.8rem", color: "#6c757d", fontWeight: "600" }}>Дата</th>
                  <th className="border-0 py-2" style={{ width: "120px", fontSize: "0.8rem", color: "#6c757d", fontWeight: "600" }}>Студент</th>
                  <th className="border-0 py-2" style={{ fontSize: "0.8rem", color: "#6c757d", fontWeight: "600" }}>Конфликтующие экзамены</th>
                  <th className="border-0 py-2 pe-3" style={{ width: "60px", fontSize: "0.8rem", color: "#6c757d", fontWeight: "600" }}></th>
                </tr>
              </thead>
              <tbody>
                {conflicts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-5">
                      <AlertCircle size={40} className="text-muted mb-2" style={{ opacity: 0.3 }} />
                      <p className="text-muted mb-0 small">Конфликтов не найдено</p>
                    </td>
                  </tr>
                ) : (
                  conflicts.map((conflict, idx) => (
                    <>
                      <tr 
                        key={idx} 
                        style={{ 
                          borderBottom: expandedRows.has(idx) ? "none" : "1px solid #f0f0f0",
                          cursor: "pointer",
                          backgroundColor: expandedRows.has(idx) ? "#fafbfc" : "transparent"
                        }}
                        onClick={() => toggleRow(idx)}
                      >
                        <td className="py-2 ps-3 align-middle">
                          <small className="text-muted">
                            {new Date(conflict.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                          </small>
                        </td>
                        <td className="py-2 align-middle">
                          <span className="badge" style={{ 
                            backgroundColor: "#e8f4fd", 
                            color: "#0c5a8a",
                            padding: "4px 10px",
                            borderRadius: "5px",
                            fontWeight: "500",
                            fontSize: "0.8rem"
                          }}>
                            {conflict.student}
                          </span>
                        </td>
                        <td className="py-2 align-middle">
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            {(conflict.exams || []).map((exam, examIdx) => (
                              <div 
                                key={examIdx}
                                className="d-inline-flex align-items-center gap-2 px-2 py-1"
                                style={{
                                  backgroundColor: "#fff3cd",
                                  borderRadius: "5px",
                                  border: "1px solid #ffc107",
                                  fontSize: "0.8rem"
                                }}
                                title={`${exam.Subject}\n${exam.Section}\nАудитория: ${exam.Room}\nПреподаватель: ${exam.Instructor}`}
                              >
                                <Clock size={14} className="text-warning" />
                                <span className="fw-semibold text-dark">{exam.Time_Slot}</span>
                                <span className="text-muted">•</span>
                                <span className="text-truncate" style={{ maxWidth: "200px" }}>
                                  {exam.Section}
                                </span>
                              </div>
                            ))}
                            <span className="badge bg-danger">{conflict.exams?.length || 0}</span>
                          </div>
                        </td>
                        <td className="py-2 pe-3 align-middle text-end">
                          <button 
                            className="btn btn-sm btn-link text-decoration-none p-0"
                            style={{ fontSize: "0.75rem", color: "#6c757d" }}
                          >
                            {expandedRows.has(idx) ? "▲" : "▼"}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Развернутая информация */}
                      {expandedRows.has(idx) && (
                        <tr style={{ backgroundColor: "#fafbfc", borderBottom: "1px solid #f0f0f0" }}>
                          <td colSpan="4" className="p-3">
                            <div className="row g-3">
                              {(conflict.exams || []).map((exam, examIdx) => (
                                <div key={examIdx} className="col-md-6">
                                  <div className="card border" style={{ borderRadius: "8px", borderColor: "#ffc107" }}>
                                    <div className="card-body p-3">
                                      <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h6 className="mb-0 fw-bold" style={{ fontSize: "0.9rem", color: "#212529" }}>
                                          {exam.Subject}
                                        </h6>
                                        <span className="badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
                                          Экзамен {examIdx + 1}
                                        </span>
                                      </div>
                                      
                                      <div className="mb-2">
                                        <span className="badge bg-light text-dark border" style={{ fontSize: "0.75rem" }}>
                                          {exam.Section}
                                        </span>
                                      </div>

                                      <div className="d-flex flex-column gap-1" style={{ fontSize: "0.8rem" }}>
                                        <div className="d-flex align-items-center gap-2 text-muted">
                                          <Clock size={14} />
                                          <span>{exam.Time_Slot} ({exam.Duration} мин)</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 text-muted">
                                          <MapPin size={14} />
                                          <span>Аудитория {exam.Room}</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 text-muted">
                                          <Users size={14} />
                                          <span>{exam.Students_Count} студентов</span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 text-muted">
                                          <BookOpen size={14} />
                                          <span className="text-truncate">{exam.Instructor}</span>
                                        </div>
                                      </div>

                                      <div className="mt-2 pt-2 border-top">
                                        <small className="text-muted d-block">{exam.EduProgram}</small>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;