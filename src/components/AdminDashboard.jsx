import React, { useEffect, useState, useMemo } from "react";
import { RefreshCcw, AlertCircle, Clock, BookOpen, Users, MapPin, ChevronDown, ChevronUp, ArrowLeft, Filter, Search } from "lucide-react";
import { InlineAlert, useAlert } from './ui/InlineAlert';
import Navbar from "./NavBar";
import { GlobalLoader } from "./Loaderss";
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api";

const AdminDashboard = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const { alert, showAlert, clearAlert } = useAlert();
  
  // Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCount, setFilterCount] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [sortBy, setSortBy] = useState('exams_desc');

  const navigate = useNavigate();

  // Optimization: Parse dates only once
  const parsedConflicts = useMemo(() => {
    return conflicts.map(c => ({
      ...c,
      _timestamp: Date.parse(c.date) || 0,
      _formatDate: new Date(c.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
    }));
  }, [conflicts]);

  const uniqueDates = useMemo(() => {
    return [...new Set(parsedConflicts.map(c => c._formatDate))].sort((a,b) => {
      const [d1, m1, y1] = a.split('.');
      const [d2, m2, y2] = b.split('.');
      return new Date(`${y1}-${m1}-${d1}`) - new Date(`${y2}-${m2}-${d2}`);
    });
  }, [parsedConflicts]);

  const filteredConflicts = useMemo(() => {
    return parsedConflicts.filter(c => {
      if (searchQuery && !c.student?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterCount === '2' && (c.exams?.length || 0) !== 2) return false;
      if (filterCount === '3' && (c.exams?.length || 0) < 3) return false;
      if (filterDate !== 'all' && c._formatDate !== filterDate) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'exams_desc') {
        const lenDiff = (b.exams?.length || 0) - (a.exams?.length || 0);
        if (lenDiff !== 0) return lenDiff;
        return a._timestamp - b._timestamp;
      }
      if (sortBy === 'date_asc') return a._timestamp - b._timestamp;
      if (sortBy === 'date_desc') return b._timestamp - a._timestamp;
      return 0;
    });
  }, [parsedConflicts, searchQuery, filterCount, filterDate, sortBy]);

  const activeFiltersCount = (filterCount !== 'all' ? 1 : 0) + (filterDate !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0) + (sortBy !== 'exams_desc' ? 1 : 0);

  const resetFilters = () => {
    setSearchQuery("");
    setFilterCount("all");
    setFilterDate("all");
    setSortBy("exams_desc");
    setExpandedRow(null);
  };

  const fetchConflicts = async (force = false) => {
    try {
      if (!force) {
        const cached = sessionStorage.getItem("conflicts_data");
        if (cached) {
          setConflicts(JSON.parse(cached));
          return;
        }
      }

      setLoading(true);
      const res = await fetch(`${API_URL}/report/conflicts`);
      const data = await res.json();
      setConflicts(data.conflicts || []);
      sessionStorage.setItem("conflicts_data", JSON.stringify(data.conflicts || []));
      
      if (force) showAlert('Конфликты успешно обновлены', 'success');
    } catch (err) {
      showAlert('Ошибка при загрузке конфликтов', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (idx) => {
    setExpandedRow((prev) => (prev === idx ? null : idx));
  };

  useEffect(() => {
    fetchConflicts(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Navbar showFilterButton={false} />

      <main className="container mx-auto px-4 py-8 relative">
        {loading && <GlobalLoader />}

        <InlineAlert {...alert} onClose={clearAlert} />

        {/* Header & Back Button */}
        <div className="mb-6 flex flex-col gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-[#C8102E] transition-colors w-fit bg-white hover:bg-red-50 border border-gray-100 pr-4 pl-3 py-1.5 rounded-full shadow-sm"
          >
            <ArrowLeft size={16} /> Назад
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Конфликты расписания</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Отображено конфликтов:{" "}
                <span className="font-semibold text-[#C8102E]">{filteredConflicts.length}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 h-10 border rounded-xl text-sm font-medium transition-colors w-full sm:w-auto ${activeFiltersCount > 0 ? 'bg-red-50 border-red-200 text-[#C8102E]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              >
                <Filter size={16} />
                <span>Фильтры</span>
                {activeFiltersCount > 0 && (
                  <Badge className="bg-[#C8102E] hover:bg-[#C8102E] text-white border-0 px-1.5 py-0 text-xs ml-1 shadow-sm">
                    {activeFiltersCount}
                  </Badge>
                )}
                <ChevronDown size={14} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <Button
                variant="outline"
                onClick={() => fetchConflicts(true)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border-gray-200 hover:bg-gray-50 h-10 px-4 sm:px-5 bg-white shrink-0"
              >
                <RefreshCcw size={16} />
                <span className="hidden sm:inline">Обновить</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Collapsible Filter Section */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[800px] mb-6 opacity-100' : 'max-h-0 mb-0 opacity-0'}`}>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h4 className="font-bold text-gray-900 text-sm">Параметры фильтрации</h4>
              {activeFiltersCount > 0 && (
                <button onClick={resetFilters} className="text-xs font-bold text-[#C8102E] hover:text-red-700 transition px-2 py-1 bg-red-50 hover:bg-red-100 rounded-md">
                  Сбросить всё
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Search */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">Поиск студента</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="ID студента..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-[#C8102E]/20 outline-none transition-shadow placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Exam Count */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">Количество экзаменов</label>
                <select
                  value={filterCount} 
                  onChange={(e) => { setFilterCount(e.target.value); setExpandedRow(null); }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#C8102E]/20 outline-none text-gray-700 cursor-pointer"
                >
                  <option value="all">Все конфликты</option>
                  <option value="2">Только 2 экзамена</option>
                  <option value="3">3 и более экзаменов</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">Дата</label>
                <select
                  value={filterDate} 
                  onChange={(e) => { setFilterDate(e.target.value); setExpandedRow(null); }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#C8102E]/20 outline-none text-gray-700 cursor-pointer"
                >
                  <option value="all">Все даты</option>
                  {uniqueDates.map(date => <option key={date} value={date}>{date}</option>)}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 mb-2 block uppercase tracking-wider">Сортировка</label>
                <select
                  value={sortBy} 
                  onChange={(e) => { setSortBy(e.target.value); setExpandedRow(null); }}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-[#C8102E]/20 outline-none text-gray-700 cursor-pointer"
                >
                  <option value="exams_desc">Больше конфликтов (сначала 3+)</option>
                  <option value="date_asc">Сначала старые (по дате)</option>
                  <option value="date_desc">Сначала новые (по дате)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table Card */}
        <div className="hidden md:block">
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
                {filteredConflicts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <AlertCircle size={40} className="opacity-30" />
                        <p className="text-sm">Конфликтов не найдено</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConflicts.map((conflict, idx) => (
                    <React.Fragment key={idx}>
                      <TableRow
                        onClick={() => toggleRow(idx)}
                        className={`cursor-pointer transition-colors ${expandedRow === idx ? 'bg-[#F8E8E8]/40 border-l-[3px] border-l-[#C8102E]' : 'hover:bg-gray-50/50 border-l-[3px] border-l-transparent'}`}
                      >
                        <TableCell className="text-sm text-gray-500 font-medium pl-4">
                          {new Date(conflict.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-50 text-blue-700 border-0 font-medium hover:bg-blue-50 cursor-pointer">
                            {conflict.student}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2 items-center">
                            {(conflict.exams || []).map((exam, examIdx) => (
                              <div
                                key={examIdx}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${expandedRow === idx ? 'bg-white border-red-200 text-red-900 shadow-sm' : 'bg-amber-50 border-amber-200 text-gray-800'}`}
                                title={`${exam.Subject}\n${exam.Section}\nАудитория: ${exam.Room}\nПреподаватель: ${exam.Instructor}`}
                              >
                                <Clock size={12} className={expandedRow === idx ? 'text-[#C8102E]' : 'text-amber-500'} />
                                <span className="font-semibold">{exam.Time_Slot}</span>
                                <span className={expandedRow === idx ? 'text-red-300' : 'text-gray-400'}>•</span>
                                <span className="max-w-[180px] truncate">{exam.Section}</span>
                              </div>
                            ))}
                            <Badge className="bg-[#C8102E] text-white border-0 text-xs hover:bg-[#C8102E] shadow-sm">
                              {conflict.exams?.length || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <button className={`p-1.5 rounded-full transition-colors ${expandedRow === idx ? 'bg-red-100 text-[#C8102E]' : 'text-gray-400 hover:bg-gray-100'}`}>
                            {expandedRow === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail rows */}
                      {expandedRow === idx && (
                        <TableRow className="bg-gradient-to-b from-[#F8E8E8]/20 to-transparent">
                          <TableCell colSpan={4} className="p-5 border-l-[3px] border-l-[#C8102E]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(conflict.exams || []).map((exam, examIdx) => (
                                <div key={examIdx} className="bg-white border-l-[3px] border-l-[#C8102E] border-y border-r border-gray-100 rounded-r-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-start mb-2 gap-2">
                                    <h6 className="font-bold text-gray-900 text-sm leading-tight flex-1">{exam.Subject}</h6>
                                    <Badge className="bg-[#F8E8E8] text-[#C8102E] border-0 text-xs hover:bg-[#F8E8E8] shrink-0">
                                      Экзамен {examIdx + 1}
                                    </Badge>
                                  </div>
                                  <Badge variant="outline" className="mb-3 text-xs bg-gray-50 text-gray-600 border-gray-200">
                                    {exam.Section}
                                  </Badge>
                                  <div className="space-y-1.5 text-xs text-gray-500">
                                    <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /><span><time className="font-medium text-gray-700">{exam.Time_Slot}</time> ({exam.Duration} мин)</span></div>
                                    <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span>Аудитория <span className="font-medium text-gray-700">{exam.Room}</span></span></div>
                                    <div className="flex items-center gap-2"><Users size={14} className="text-gray-400" /><span>{exam.Students_Count} студентов</span></div>
                                    <div className="flex items-center gap-2"><BookOpen size={14} className="text-gray-400" /><span className="truncate">{exam.Instructor}</span></div>
                                  </div>
                                  {exam.EduProgram && (
                                    <p className="mt-3 pt-3 border-t text-[11px] text-gray-400 font-mono tracking-tight">{exam.EduProgram}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex flex-col gap-3">
          {filteredConflicts.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-2 text-gray-400 text-center shadow-sm">
              <AlertCircle size={40} className="opacity-30" />
              <p className="text-sm">Конфликтов не найдено</p>
            </div>
          ) : (
            filteredConflicts.map((conflict, idx) => (
              <Card key={idx} className={`border rounded-xl overflow-hidden transition-colors bg-white cursor-pointer ${expandedRow === idx ? 'border-[#C8102E] shadow-md ring-1 ring-[#C8102E]/20' : 'border-gray-100 shadow-sm hover:border-gray-200'}`}>
                <div 
                  onClick={() => toggleRow(idx)}
                  className="p-4 bg-white active:bg-gray-50 flex flex-col gap-3 relative"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                       <p className="text-sm font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                         {(new Date(conflict.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }))}
                       </p>
                       <Badge className="bg-blue-50 text-blue-700 border-0 font-bold px-2 py-1 text-xs hover:bg-blue-50">
                         {conflict.student}
                       </Badge>
                    </div>
                    <button className={`p-1.5 shrink-0 rounded-full transition-colors ${expandedRow === idx ? 'bg-red-100 text-[#C8102E]' : 'bg-gray-50 text-gray-400'}`}>
                      {expandedRow === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(conflict.exams || []).map((exam, examIdx) => (
                      <div
                        key={examIdx}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${expandedRow === idx ? 'bg-white border-red-200 text-red-900 shadow-sm' : 'bg-amber-50 border-amber-200 text-gray-800'}`}
                      >
                        <Clock size={12} className={expandedRow === idx ? 'text-[#C8102E]' : 'text-amber-500 shrink-0'} />
                        <span className="font-semibold">{exam.Time_Slot}</span>
                        <span className={expandedRow === idx ? 'text-red-300' : 'text-gray-400'}>•</span>
                        <span className="truncate max-w-[120px]">{exam.Section}</span>
                      </div>
                    ))}
                    <span className="text-xs font-semibold text-white ml-1 bg-[#C8102E] px-2.5 py-1 rounded-lg shadow-sm">
                      {conflict.exams?.length || 0} экз.
                    </span>
                  </div>
                </div>
                
                {/* Mobile Expanded Details */}
                {expandedRow === idx && (
                   <div className="bg-gradient-to-b from-[#F8E8E8]/30 to-white pt-1 pb-4 px-3 border-t border-red-100">
                     <div className="flex flex-col gap-2.5 mt-2">
                       {(conflict.exams || []).map((exam, examIdx) => (
                         <div key={examIdx} className="bg-white border-l-4 border-l-[#C8102E] border-y border-r border-gray-100 rounded-r-xl p-3.5 shadow-sm hover:shadow-md transition-shadow">
                           <div className="flex justify-between items-start mb-2.5 gap-2">
                             <h6 className="font-bold text-gray-900 text-[13px] leading-tight flex-1">{exam.Subject}</h6>
                             <Badge className="bg-[#F8E8E8] text-[#C8102E] border-0 text-[10px] px-2 py-0.5 shrink-0 rounded-md">
                               Экз. {examIdx + 1}
                             </Badge>
                           </div>
                           <Badge variant="outline" className="mb-2.5 text-[11px] bg-gray-50 border-gray-200 text-gray-600 font-medium">
                             {exam.Section}
                           </Badge>
                           <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-500 mt-1">
                             <div className="flex items-center gap-1.5"><Clock size={13} className="text-gray-400 shrink-0"/> <span className="truncate font-medium text-gray-700">{exam.Time_Slot}</span></div>
                             <div className="flex items-center gap-1.5"><MapPin size={13} className="text-gray-400 shrink-0"/> <span className="truncate">Ауд. <span className="font-medium text-gray-700">{exam.Room}</span></span></div>
                             <div className="flex items-center gap-1.5"><Users size={13} className="text-gray-400 shrink-0"/> <span className="truncate">{exam.Students_Count} студ.</span></div>
                             <div className="flex items-center gap-1.5 col-span-2"><BookOpen size={13} className="text-gray-400 shrink-0"/> <span className="truncate">{exam.Instructor}</span></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;