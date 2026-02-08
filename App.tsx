
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { INITIAL_SUBJECTS, INITIAL_SEMESTERS, GRADUATION_REQUIREMENTS } from './constants';
import { Subject, Semester, SubjectType } from './types';

// Helper Components
const RequirementProgress: React.FC<{ 
  current: number; 
  required: number; 
  label: string; 
  color: string;
}> = ({ current, required, label, color }) => {
  const percentage = Math.min((current / required) * 100, 100);
  const isComplete = current >= required;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-500 uppercase">{label}</span>
        <span className={isComplete ? 'text-green-600' : 'text-slate-600'}>
          {current} / {required}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function App() {
  const [subjects, setSubjects] = useState<Subject[]>(INITIAL_SUBJECTS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Range State
  const [startYear, setStartYear] = useState(25);
  const [startTerm, setStartTerm] = useState<1 | 2>(2);
  const [endYear, setEndYear] = useState(27);
  const [endTerm, setEndTerm] = useState<1 | 2>(1);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Modal & Interaction States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteChoice, setDeleteChoice] = useState<{ subjectId: string, semesterId: string | null } | null>(null);
  const [globalDeleteTarget, setGlobalDeleteTarget] = useState<string | null>(null);

  // Dynamic Semesters Generation
  const generatedSemesters = useMemo(() => {
    const sems: Semester[] = [];
    let currY = startYear;
    let currT = startTerm;

    while (currY < endYear || (currY === endYear && currT <= endTerm)) {
      sems.push({
        id: `sem${currY}-${currT}`,
        year: currY,
        term: currT as 1 | 2,
        assignedSubjectIds: []
      });
      if (currT === 2) {
        currY++;
        currT = 1;
      } else {
        currT = 2;
      }
    }
    return sems;
  }, [startYear, startTerm, endYear, endTerm]);

  // Merge generated semesters with existing assignments
  const [semesters, setSemesters] = useState<Semester[]>(INITIAL_SEMESTERS);

  useEffect(() => {
    setSemesters(prev => {
      return generatedSemesters.map(gen => {
        const existing = prev.find(p => p.id === gen.id);
        return existing ? existing : gen;
      });
    });
  }, [generatedSemesters]);

  const unassignedSubjects = useMemo(() => {
    const assignedIds = new Set(semesters.flatMap(s => s.assignedSubjectIds));
    return subjects.filter(s => !assignedIds.has(s.id));
  }, [subjects, semesters]);

  const filteredUnassigned = useMemo(() => {
    if (!searchQuery.trim()) return unassignedSubjects;
    const lowerQuery = searchQuery.toLowerCase();
    return unassignedSubjects.filter(s => 
      s.name.toLowerCase().includes(lowerQuery) || 
      s.id.toLowerCase().includes(lowerQuery)
    );
  }, [unassignedSubjects, searchQuery]);

  const groupedUnassigned = useMemo(() => {
    const term1 = filteredUnassigned
      .filter(s => s.offeredTerm === 1)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    const term2 = filteredUnassigned
      .filter(s => s.offeredTerm === 2)
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    return { term1, term2 };
  }, [filteredUnassigned]);

  const stats = useMemo(() => {
    let mandatory = 0;
    let elective = 0;
    semesters.forEach(sem => {
      sem.assignedSubjectIds.forEach(id => {
        const sub = subjects.find(s => s.id === id);
        if (sub) {
          if (sub.type === SubjectType.MANDATORY) mandatory += sub.credits;
          else elective += sub.credits;
        }
      });
    });
    return { 
      mandatory, 
      elective, 
      isGraduationReady: mandatory >= GRADUATION_REQUIREMENTS.mandatory && elective >= GRADUATION_REQUIREMENTS.elective 
    };
  }, [semesters, subjects]);

  const validatePlacement = (subjectId: string, targetSemesterId: string): boolean => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return false;
    const targetSemester = semesters.find(s => s.id === targetSemesterId);
    if (!targetSemester) return true;

    if (subject.offeredTerm !== targetSemester.term) {
      setErrorMessage(`${subject.name}은(는) ${subject.offeredTerm}학기 개설 과목입니다.`);
      return false;
    }

    if (subject.prerequisites.length > 0) {
      const targetSemIndex = semesters.findIndex(s => s.id === targetSemesterId);
      const previousSemesters = semesters.slice(0, targetSemIndex);
      const previouslyEarnedSubjectIds = new Set(previousSemesters.flatMap(s => s.assignedSubjectIds));

      for (const preReqId of subject.prerequisites) {
        if (!previouslyEarnedSubjectIds.has(preReqId)) {
          const preReqName = subjects.find(s => s.id === preReqId)?.name || '선수 과목';
          setErrorMessage(`${subject.name}을(를) 듣기 위해 ${preReqName}을(를) 이전 학기에 먼저 이수해야 합니다.`);
          return false;
        }
      }
    }
    setErrorMessage(null);
    return true;
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('subjectId', id);
  };

  const handleDrop = (e: React.DragEvent, semesterId: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('subjectId');
    if (!semesterId) {
      setSemesters(prev => prev.map(s => ({ ...s, assignedSubjectIds: s.assignedSubjectIds.filter(sid => sid !== id) })));
      return;
    }
    if (validatePlacement(id, semesterId)) {
      setSemesters(prev => {
        const removed = prev.map(s => ({ ...s, assignedSubjectIds: s.assignedSubjectIds.filter(sid => sid !== id) }));
        return removed.map(s => s.id === semesterId ? { ...s, assignedSubjectIds: [...s.assignedSubjectIds, id] } : s);
      });
    }
  };

  const saveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setSubjects(prev => {
      const exists = prev.find(s => s.id === editingSubject.id);
      return exists ? prev.map(s => s.id === editingSubject.id ? editingSubject : s) : [...prev, editingSubject];
    });
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  const triggerDelete = (subjectId: string, semesterId: string | null) => {
    if (semesterId === null) {
      setGlobalDeleteTarget(subjectId);
    } else {
      setDeleteChoice({ subjectId, semesterId });
    }
  };

  const confirmGlobalDelete = () => {
    if (!globalDeleteTarget) return;
    const id = globalDeleteTarget;
    setSubjects(prev => prev.filter(s => s.id !== id));
    setSemesters(prev => prev.map(sem => ({
      ...sem,
      assignedSubjectIds: sem.assignedSubjectIds.filter(sid => sid !== id)
    })));
    setGlobalDeleteTarget(null);
  };

  const performDeleteChoice = (choice: 'move' | 'delete') => {
    if (!deleteChoice) return;
    const { subjectId, semesterId } = deleteChoice;

    if (choice === 'delete') {
      setGlobalDeleteTarget(subjectId);
      setDeleteChoice(null);
    } else if (choice === 'move' && semesterId) {
      setSemesters(prev => prev.map(sem => sem.id === semesterId ? {
        ...sem,
        assignedSubjectIds: sem.assignedSubjectIds.filter(id => id !== subjectId)
      } : sem));
      setDeleteChoice(null);
    }
  };

  return (
    <div className="h-screen bg-[#f1f5f9] flex flex-col overflow-hidden">
      {/* Top Navigation / Range Selector */}
      <header className="bg-white border-b border-slate-200 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 flex-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-900">🎓 바이오의공학 로드맵</h1>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">START:</span>
            <input type="number" value={startYear} onChange={e => setStartYear(parseInt(e.target.value))} className="w-12 bg-transparent font-bold text-blue-800 outline-none" />
            <select value={startTerm} onChange={e => setStartTerm(parseInt(e.target.value) as 1 | 2)} className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer">
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </div>
          <div className="w-px h-4 bg-slate-300" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">END:</span>
            <input type="number" value={endYear} onChange={e => setEndYear(parseInt(e.target.value))} className="w-12 bg-transparent font-bold text-blue-800 outline-none" />
            <select value={endTerm} onChange={e => setEndTerm(parseInt(e.target.value) as 1 | 2)} className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer">
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          <div className="w-32"><RequirementProgress current={stats.mandatory} required={GRADUATION_REQUIREMENTS.mandatory} label="전공필수" color="bg-rose-500" /></div>
          <div className="w-32"><RequirementProgress current={stats.elective} required={GRADUATION_REQUIREMENTS.elective} label="전공선택" color="bg-emerald-500" /></div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase ${stats.isGraduationReady ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {stats.isGraduationReady ? 'Graduation Ready' : 'In Progress'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        <aside 
          className={`absolute inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-slate-700">전체 개설 과목</h2>
              <button onClick={() => setEditingSubject({ id: '', name: '', credits: 3, type: SubjectType.ELECTIVE, offeredTerm: 1, prerequisites: [] }) || setIsModalOpen(true)} className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>
            
            {/* Sidebar Search Bar - FIXED TEXT COLOR */}
            <div className="relative group">
              <input 
                type="text" 
                placeholder="과목명 또는 학수번호 검색..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all"
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 transition-colors group-focus-within:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-300 hover:text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scroll-smooth"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, null)}
          >
            {filteredUnassigned.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">
                  {searchQuery ? '검색 결과가 없습니다.' : '배치 가능한 과목이 없습니다.'}
                </div>
            ) : (
              <>
                {groupedUnassigned.term1.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 border-b border-slate-100 pb-1">1학기 개설 과목</h3>
                    <div className="flex flex-col gap-3">
                      {groupedUnassigned.term1.map(s => (
                        <SubjectCard 
                          key={s.id} 
                          subject={s} 
                          allSubjects={subjects}
                          onDragStart={e => handleDragStart(e, s.id)}
                          onToggleType={() => setSubjects(prev => prev.map(x => x.id === s.id ? { ...x, type: x.type === SubjectType.MANDATORY ? SubjectType.ELECTIVE : SubjectType.MANDATORY } : x))}
                          onEdit={() => setEditingSubject(s) || setIsModalOpen(true)}
                          onDelete={() => triggerDelete(s.id, null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {groupedUnassigned.term2.length > 0 && (
                  <div>
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 border-b border-slate-100 pb-1">2학기 개설 과목</h3>
                    <div className="flex flex-col gap-3">
                      {groupedUnassigned.term2.map(s => (
                        <SubjectCard 
                          key={s.id} 
                          subject={s} 
                          allSubjects={subjects}
                          onDragStart={e => handleDragStart(e, s.id)}
                          onToggleType={() => setSubjects(prev => prev.map(x => x.id === s.id ? { ...x, type: x.type === SubjectType.MANDATORY ? SubjectType.ELECTIVE : SubjectType.MANDATORY } : x))}
                          onEdit={() => setEditingSubject(s) || setIsModalOpen(true)}
                          onDelete={() => triggerDelete(s.id, null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {errorMessage && (
            <div className="p-4 bg-rose-50 border-t border-rose-100 shrink-0">
              <p className="text-[11px] text-rose-600 font-bold leading-snug">⚠️ {errorMessage}</p>
            </div>
          )}
        </aside>

        <main className={`flex-1 transition-all duration-300 overflow-y-auto p-6 ${isSidebarOpen ? 'ml-72' : 'ml-0'}`}>
          <div className="max-w-6xl mx-auto flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {semesters.map(semester => (
                <div 
                  key={semester.id}
                  className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col group min-h-[350px] overflow-hidden"
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-50/50'); }}
                  onDragLeave={e => e.currentTarget.classList.remove('bg-blue-50/50')}
                  onDrop={e => { e.currentTarget.classList.remove('bg-blue-50/50'); handleDrop(e, semester.id); }}
                >
                  <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">{semester.year}년 {semester.term}학기</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-white border border-slate-200 text-slate-400 px-2 py-0.5 rounded-full font-bold">TOTAL</span>
                      <span className="text-lg font-black text-blue-600">
                        {semester.assignedSubjectIds.reduce((sum, id) => sum + (subjects.find(s => s.id === id)?.credits || 0), 0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-6 flex flex-wrap gap-3 content-start">
                    {semester.assignedSubjectIds.map(id => {
                      const sub = subjects.find(s => s.id === id);
                      if (!sub) return null;
                      return (
                        <div key={sub.id} className="w-full sm:w-[calc(50%-6px)]">
                          <SubjectCard 
                            subject={sub} 
                            allSubjects={subjects}
                            isMinimal={true}
                            onDragStart={e => handleDragStart(e, sub.id)}
                            onToggleType={() => setSubjects(prev => prev.map(x => x.id === sub.id ? { ...x, type: x.type === SubjectType.MANDATORY ? SubjectType.ELECTIVE : SubjectType.MANDATORY } : x))}
                            onEdit={() => setEditingSubject(sub) || setIsModalOpen(true)}
                            onDelete={() => triggerDelete(sub.id, semester.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-12">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">졸업 이수 종합 현황</h2>
                <div className={`px-6 py-2 rounded-2xl text-sm font-black shadow-lg ${stats.isGraduationReady ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                  {stats.isGraduationReady ? '졸업 가능' : '이수 조건 미달'}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest">구분</th>
                      {semesters.map(s => <th key={s.id} className="py-4 px-2 text-sm font-bold text-slate-600">{s.year}-{s.term}</th>)}
                      <th className="py-4 px-4 bg-blue-50/50 text-sm font-black text-blue-600">현재 총합</th>
                      <th className="py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest text-center">졸업 기준</th>
                      <th className="py-4 px-2 text-xs font-black text-slate-400 uppercase tracking-widest text-right">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-2 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm" />
                        <span className="font-bold text-slate-700">전공필수</span>
                      </td>
                      {semesters.map(s => (
                        <td key={s.id} className="py-6 px-2 text-slate-400 font-medium">
                          {s.assignedSubjectIds.reduce((acc, id) => subjects.find(x => x.id === id)?.type === SubjectType.MANDATORY ? acc + (subjects.find(x => x.id === id)?.credits || 0) : acc, 0) || '-'}
                        </td>
                      ))}
                      <td className="py-6 px-4 bg-blue-50/50 font-black text-blue-700">{stats.mandatory}</td>
                      <td className="py-6 px-2 text-center font-bold text-slate-600">{GRADUATION_REQUIREMENTS.mandatory}</td>
                      <td className="py-6 px-2 text-right">
                        <StatusBadge active={stats.mandatory >= GRADUATION_REQUIREMENTS.mandatory} />
                      </td>
                    </tr>
                    <tr className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6 px-2 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                        <span className="font-bold text-slate-700">전공선택</span>
                      </td>
                      {semesters.map(s => (
                        <td key={s.id} className="py-6 px-2 text-slate-400 font-medium">
                          {s.assignedSubjectIds.reduce((acc, id) => subjects.find(x => x.id === id)?.type === SubjectType.ELECTIVE ? acc + (subjects.find(x => x.id === id)?.credits || 0) : acc, 0) || '-'}
                        </td>
                      ))}
                      <td className="py-6 px-4 bg-blue-50/50 font-black text-blue-700">{stats.elective}</td>
                      <td className="py-6 px-2 text-center font-bold text-slate-600">{GRADUATION_REQUIREMENTS.elective}</td>
                      <td className="py-6 px-2 text-right">
                        <StatusBadge active={stats.elective >= GRADUATION_REQUIREMENTS.elective} />
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white">
                      <td className="py-6 px-4 font-black rounded-l-2xl">학기별 총계</td>
                      {semesters.map(s => (
                        <td key={s.id} className="py-6 px-2 font-black text-blue-400">
                          {s.assignedSubjectIds.reduce((acc, id) => acc + (subjects.find(x => x.id === id)?.credits || 0), 0)}
                        </td>
                      ))}
                      <td className="py-6 px-4 bg-blue-600 font-black">{stats.mandatory + stats.elective}</td>
                      <td className="py-6 px-2 text-center font-black">{GRADUATION_REQUIREMENTS.mandatory + GRADUATION_REQUIREMENTS.elective}</td>
                      <td className="py-6 px-4 text-right rounded-r-2xl">
                        <span className="text-xs font-black uppercase tracking-widest">{stats.isGraduationReady ? 'COMPLETE' : 'INCOMPLETE'}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Custom Confirmation Modal for Global Delete (1-1) */}
      {globalDeleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 p-8 flex flex-col gap-6">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-xl font-black text-slate-900 text-center">커리큘럼 내에서 삭제하시겠습니까?</h2>
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              이 과목을 시스템에서 아예 제거합니다.<br/>삭제한 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={confirmGlobalDelete}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black hover:bg-rose-600 transition-all shadow-lg shadow-rose-100"
              >
                삭제
              </button>
              <button 
                onClick={() => setGlobalDeleteTarget(null)}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Choice Modal for Semester Item Deletion (1-2) */}
      {deleteChoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 p-8 flex flex-col gap-6">
            <h2 className="text-xl font-black text-slate-900 text-center">과목 관리</h2>
            <p className="text-sm text-slate-500 text-center leading-relaxed">
              선택한 과목을 학기에서 뺄 것인지,<br/>아니면 커리큘럼에서 아예 삭제할지 선택해주세요.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => performDeleteChoice('move')}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                개설 과목 리스트로 이동
              </button>
              <button 
                onClick={() => performDeleteChoice('delete')}
                className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black hover:bg-rose-100 transition-all border border-rose-200"
              >
                커리큘럼에서 아예 삭제
              </button>
              <button 
                onClick={() => setDeleteChoice(null)}
                className="w-full py-3 bg-white text-slate-400 font-bold hover:text-slate-600"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && editingSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-2xl font-black text-slate-900">과목 마스터</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={saveSubject} className="p-8 flex flex-col gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">학수번호 (ID)</label>
                <input type="text" value={editingSubject.id} onChange={e => setEditingSubject({...editingSubject, id: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-slate-900" placeholder="예: BMED202" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">과목명</label>
                <input type="text" value={editingSubject.name} onChange={e => setEditingSubject({...editingSubject, name: e.target.value})} className="w-full px-5 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold text-slate-900" placeholder="예: 공학수학II" required />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-widest">학점</label>
                  <input type="number" value={editingSubject.credits} onChange={e => setEditingSubject({...editingSubject, credits: parseInt(e.target.value) || 0})} className={`w-full px-5 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-900 ${editingSubject.isRetake ? 'opacity-50' : ''}`} min="0" max="15" disabled={editingSubject.isRetake} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-widest">개설 학기</label>
                  <select value={editingSubject.offeredTerm} onChange={e => setEditingSubject({...editingSubject, offeredTerm: parseInt(e.target.value) as 1 | 2})} className="w-full px-5 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-900 appearance-none">
                    <option value={1}>1학기 개설</option>
                    <option value={2}>2학기 개설</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">과목 설정</label>
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  <button type="button" onClick={() => setEditingSubject({...editingSubject, type: SubjectType.MANDATORY})} className={`py-2 rounded-xl text-[11px] font-black transition-all ${editingSubject.type === SubjectType.MANDATORY ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'}`}>전공필수</button>
                  <button type="button" onClick={() => setEditingSubject({...editingSubject, type: SubjectType.ELECTIVE})} className={`py-2 rounded-xl text-[11px] font-black transition-all ${editingSubject.type === SubjectType.ELECTIVE ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'}`}>전공선택</button>
                  <button 
                    type="button" 
                    onClick={() => {
                        const newRetake = !editingSubject.isRetake;
                        setEditingSubject({
                            ...editingSubject, 
                            isRetake: newRetake,
                            credits: newRetake ? 0 : (INITIAL_SUBJECTS.find(s => s.id === editingSubject.id)?.credits || 3)
                        });
                    }} 
                    className={`py-2 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 ${editingSubject.isRetake ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    재수강
                    {editingSubject.isRetake && <span className="bg-white/20 px-1 rounded text-[9px]">0P</span>}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-widest">선수 과목 학수번호 (쉼표 구분)</label>
                <input type="text" value={editingSubject.prerequisites.join(', ')} onChange={e => setEditingSubject({...editingSubject, prerequisites: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})} className="w-full px-5 py-3 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-slate-900 text-sm" placeholder="BMED205, BMED217" />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 transform active:scale-[0.98]">
                커리큘럼에 저장
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const SubjectCard: React.FC<{ 
  subject: Subject; 
  allSubjects: Subject[];
  onDragStart: (e: React.DragEvent) => void;
  onToggleType: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isMinimal?: boolean;
}> = ({ subject, allSubjects, onDragStart, onToggleType, onEdit, onDelete, isMinimal = false }) => {
  const isMandatory = subject.type === SubjectType.MANDATORY;

  const colorClasses = useMemo(() => {
    if (subject.isRetake) {
      return 'border-slate-200 border-l-[10px] border-l-slate-400 bg-white';
    }
    if (isMandatory) {
      return 'border-rose-100 border-l-[10px] border-l-rose-500 bg-white';
    }
    return 'border-emerald-100 border-l-[10px] border-l-emerald-500 bg-white';
  }, [subject.isRetake, isMandatory]);

  const prerequisiteNames = useMemo(() => {
    return subject.prerequisites
      .map(id => allSubjects.find(s => s.id === id)?.name || id)
      .join(', ');
  }, [subject.prerequisites, allSubjects]);

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`notion-card rounded-3xl border-2 flex flex-col relative group cursor-grab active:cursor-grabbing transition-shadow ${
        isMinimal ? 'p-3' : 'p-4'
      } ${colorClasses} ${subject.isRetake ? 'opacity-90 ring-1 ring-slate-200 shadow-sm' : ''}`}
    >
      <div className="flex justify-between items-start gap-2 relative overflow-visible">
        <div className="flex-1 min-w-0">
          <h4 className={`font-black text-slate-900 leading-tight whitespace-normal break-words ${isMinimal ? 'text-[12px]' : 'text-[13px]'}`}>
            {subject.name}
          </h4>
          {!isMinimal && (
            <span className="text-[10px] text-slate-400 font-bold tracking-tight block truncate mt-0.5">{subject.id}</span>
          )}
        </div>
        
        {/* Actions - Ensure buttons are clickable and visible */}
        <div className={`flex gap-1 shrink-0 bg-white/95 backdrop-blur-sm rounded-lg p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-all border border-slate-100 z-10`}>
          <button 
            type="button"
            title="수정"
            onClick={e => { e.stopPropagation(); e.preventDefault(); onEdit(); }} 
            className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button 
            type="button"
            title="삭제"
            onClick={e => { e.stopPropagation(); e.preventDefault(); onDelete(); }} 
            className="p-1 hover:bg-rose-50 rounded-full text-rose-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-auto pt-2">
        <div className="flex gap-1 flex-wrap items-center">
          {!isMinimal && !subject.isRetake && (
            <button 
              type="button"
              onClick={e => { e.stopPropagation(); onToggleType(); }} 
              className={`text-[9px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${isMandatory ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}
            >
              {subject.type.substring(2)}
            </button>
          )}
          {subject.isRetake && <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-slate-100 text-slate-600 border border-slate-200 uppercase">Retake</span>}
          
          {!isMinimal && prerequisiteNames && (
            <div className="flex items-center gap-1.5 overflow-hidden max-w-[120px]">
              <div className="w-1 h-1 rounded-full bg-blue-300 flex-none" />
              <span className="text-[8px] font-bold text-slate-400 truncate tracking-tighter" title={prerequisiteNames}>
                {prerequisiteNames}
              </span>
            </div>
          )}
        </div>
        <span className={`font-black px-2 py-0.5 rounded-lg shrink-0 ${isMinimal ? 'text-[11px]' : 'text-xs'} ${subject.credits === 0 ? 'bg-slate-100 text-slate-400 line-through font-normal' : 'bg-slate-100 text-slate-700'}`}>{subject.credits}P</span>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
    {active ? 'Complete' : 'Pending'}
  </span>
);
