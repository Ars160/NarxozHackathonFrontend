import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { RefreshCcw, AlertCircle, Clock, BookOpen, Users, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "./NavBar";
import { LocalLoader } from "./Loaderss";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

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
    if (newExpanded.has(idx)) newExpanded.delete(idx);
    else newExpanded.add(idx);
    setExpandedRows(newExpanded);
  };

  useEffect(() => {
    fetchConflicts();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar showFilterButton={false} />

      <main className="container mx-auto px-4 py-8">
        {loading && <LocalLoader />}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Конфликты расписания</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Обнаружено конфликтов:{" "}
              <span className="font-semibold text-[#C8102E]">{conflicts.length}</span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchConflicts}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border-gray-200 hover:bg-gray-50"
          >
            <RefreshCcw size={16} />
            Обновить
          </Button>
        </div>

        {/* Table Card */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 hover:bg-gray-50">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Дата</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Студент</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Конфликтующие экзамены</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {conflicts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle size={40} className="opacity-30" />
                      <p className="text-sm">Конфликтов не найдено</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                conflicts.map((conflict, idx) => (
                  <>
                    <TableRow
                      key={idx}
                      onClick={() => toggleRow(idx)}
                      className={`cursor-pointer transition-colors ${expandedRows.has(idx) ? 'bg-gray-50/80' : 'hover:bg-gray-50/50'}`}
                    >
                      <TableCell className="text-sm text-gray-500 font-medium">
                        {new Date(conflict.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-50 text-blue-700 border-0 font-medium hover:bg-blue-50">
                          {conflict.student}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2 items-center">
                          {(conflict.exams || []).map((exam, examIdx) => (
                            <div
                              key={examIdx}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs"
                              title={`${exam.Subject}\n${exam.Section}\nАудитория: ${exam.Room}\nПреподаватель: ${exam.Instructor}`}
                            >
                              <Clock size={12} className="text-amber-500" />
                              <span className="font-semibold text-gray-800">{exam.Time_Slot}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-600 max-w-[180px] truncate">{exam.Section}</span>
                            </div>
                          ))}
                          <Badge className="bg-[#C8102E] text-white border-0 text-xs hover:bg-[#C8102E]">
                            {conflict.exams?.length || 0}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <button className="text-gray-400">
                          {expandedRows.has(idx) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded detail rows */}
                    {expandedRows.has(idx) && (
                      <TableRow className="bg-gray-50/60 hover:bg-gray-50/60">
                        <TableCell colSpan={4} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(conflict.exams || []).map((exam, examIdx) => (
                              <div key={examIdx} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <h6 className="font-bold text-gray-900 text-sm leading-tight">{exam.Subject}</h6>
                                  <Badge className="bg-amber-100 text-amber-700 border-0 text-xs hover:bg-amber-100">
                                    Экзамен {examIdx + 1}
                                  </Badge>
                                </div>
                                <Badge variant="outline" className="mb-3 text-xs">
                                  {exam.Section}
                                </Badge>
                                <div className="space-y-1 text-xs text-gray-500">
                                  <div className="flex items-center gap-2"><Clock size={12} /><span>{exam.Time_Slot} ({exam.Duration} мин)</span></div>
                                  <div className="flex items-center gap-2"><MapPin size={12} /><span>Аудитория {exam.Room}</span></div>
                                  <div className="flex items-center gap-2"><Users size={12} /><span>{exam.Students_Count} студентов</span></div>
                                  <div className="flex items-center gap-2"><BookOpen size={12} /><span className="truncate">{exam.Instructor}</span></div>
                                </div>
                                {exam.EduProgram && (
                                  <p className="mt-2 pt-2 border-t text-xs text-gray-400">{exam.EduProgram}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;