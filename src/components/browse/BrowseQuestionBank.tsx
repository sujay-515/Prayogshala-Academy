import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Flag,
  CheckCircle2,
} from 'lucide-react';
import { MCQQuestion, ExamCategory } from '../../types';

interface BrowseQuestionBankProps {
  questions: MCQQuestion[];
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onReportQuestion: (question: MCQQuestion) => void;
  onStartPracticeWithFilter: (unit?: string, exam?: ExamCategory, customQuestions?: MCQQuestion[]) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  initialUnit?: string;
}

export const BrowseQuestionBank: React.FC<BrowseQuestionBankProps> = ({
  questions,
  bookmarkedIds,
  onToggleBookmark,
  onReportQuestion,
  onStartPracticeWithFilter,
  searchQuery,
  setSearchQuery,
  initialUnit,
}) => {
  const [selectedUnit, setSelectedUnit] = useState<string>(initialUnit || 'All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('All');
  const [selectedExam, setSelectedExam] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  useEffect(() => {
    if (initialUnit) {
      setSelectedUnit(initialUnit);
      setSelectedSubject('All');
      setSelectedTopic('All');
      setSelectedSubtopic('All');
      setCurrentPage(1);
    }
  }, [initialUnit]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUnit, selectedSubject, selectedTopic, selectedSubtopic, selectedExam, selectedDifficulty, searchQuery, pageSize]);

  const publishedOnly = useMemo(() => {
    return questions.filter((q) => q.status === 'Published');
  }, [questions]);

  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of publishedOnly) {
      counts[q.unit] = (counts[q.unit] || 0) + 1;
    }
    return counts;
  }, [publishedOnly]);

  const unitsList = ['All', ...Object.keys(unitCounts)];

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of publishedOnly) {
      if (selectedUnit === 'All' || q.unit === selectedUnit) {
        counts[q.subject] = (counts[q.subject] || 0) + 1;
      }
    }
    return counts;
  }, [publishedOnly, selectedUnit]);

  const subjectsList = ['All', ...Object.keys(subjectCounts)];

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of publishedOnly) {
      if (
        (selectedUnit === 'All' || q.unit === selectedUnit) &&
        (selectedSubject === 'All' || q.subject === selectedSubject)
      ) {
        counts[q.topic] = (counts[q.topic] || 0) + 1;
      }
    }
    return counts;
  }, [publishedOnly, selectedUnit, selectedSubject]);

  const topicsList = ['All', ...Object.keys(topicCounts)];

  const subtopicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of publishedOnly) {
      if (
        (selectedUnit === 'All' || q.unit === selectedUnit) &&
        (selectedSubject === 'All' || q.subject === selectedSubject) &&
        (selectedTopic === 'All' || q.topic === selectedTopic) &&
        q.subtopic
      ) {
        counts[q.subtopic] = (counts[q.subtopic] || 0) + 1;
      }
    }
    return counts;
  }, [publishedOnly, selectedUnit, selectedSubject, selectedTopic]);

  const subtopicsList = ['All', ...Object.keys(subtopicCounts)];

  const examCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of publishedOnly) {
      for (const e of q.examCategories) {
        counts[e] = (counts[e] || 0) + 1;
      }
    }
    return counts;
  }, [publishedOnly]);

  const examsList: ('All' | ExamCategory)[] = ['All', 'ASCP', 'NHPC', 'PSC', 'DHA', 'AIMS'];

  const filteredQuestions = useMemo(() => {
    return publishedOnly.filter((q) => {
      if (selectedUnit !== 'All' && q.unit !== selectedUnit) return false;
      if (selectedSubject !== 'All' && q.subject !== selectedSubject) return false;
      if (selectedTopic !== 'All' && q.topic !== selectedTopic) return false;
      if (selectedSubtopic !== 'All' && q.subtopic !== selectedSubtopic) return false;
      if (selectedExam !== 'All' && !q.examCategories.includes(selectedExam as ExamCategory)) return false;
      if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.questionText.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          (q.subtopic && q.subtopic.toLowerCase().includes(query)) ||
          q.options.some((o) => o.text.toLowerCase().includes(query)) ||
          q.code.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [publishedOnly, selectedUnit, selectedSubject, selectedTopic, selectedSubtopic, selectedExam, selectedDifficulty, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {/* Title & Practice Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            Question bank
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {publishedOnly.length} published questions across {Object.keys(unitCounts).length} specialty units
          </p>
        </div>

        <button
          disabled={filteredQuestions.length === 0}
          onClick={() =>
            onStartPracticeWithFilter(
              selectedUnit !== 'All' ? selectedUnit : undefined,
              selectedExam !== 'All' ? (selectedExam as ExamCategory) : undefined,
              filteredQuestions
            )
          }
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Practice Filtered ({filteredQuestions.length})</span>
        </button>
      </div>

      {/* Filter Controls (Keywords, Unit, Subject, Topic, Exam, Difficulty) */}
      <div className="glass-panel rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Keywords</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stem, disease..."
                className="w-full bg-white/70 border border-slate-200/90 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 shadow-2xs transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Specialty Unit</label>
            <select
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setSelectedSubject('All');
                setSelectedTopic('All');
              }}
              className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
            >
              {unitsList.map((u) => (
                <option key={u} value={u}>
                  {u === 'All' ? `All Units (${publishedOnly.length})` : `${u} (${unitCounts[u] || 0})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedTopic('All');
              }}
              className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
            >
              {subjectsList.map((s) => (
                <option key={s} value={s}>
                  {s === 'All' ? 'All Subjects' : `${s} (${subjectCounts[s] || 0})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                setSelectedSubtopic('All');
              }}
              className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
            >
              {topicsList.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Topics' : `${t} (${topicCounts[t] || 0})`}
                </option>
              ))}
            </select>
          </div>

          {subtopicsList.length > 1 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subtopic</label>
              <select
                value={selectedSubtopic}
                onChange={(e) => setSelectedSubtopic(e.target.value)}
                className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
              >
                {subtopicsList.map((st) => (
                  <option key={st} value={st}>
                    {st === 'All' ? 'All Subtopics' : `${st} (${subtopicCounts[st] || 0})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Exam Category</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
            >
              {examsList.map((e) => (
                <option key={e} value={e}>
                  {e === 'All' ? 'All Examination Boards' : `${e} (${examCounts[e] || 0})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 shadow-2xs transition-all"
            >
              <option value="All">All Difficulties</option>
              <option value="Memory-based">Memory-based</option>
              <option value="Conceptual">Conceptual</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Clear filters action */}
        {(selectedUnit !== 'All' ||
          selectedSubject !== 'All' ||
          selectedTopic !== 'All' ||
          selectedSubtopic !== 'All' ||
          selectedExam !== 'All' ||
          selectedDifficulty !== 'All' ||
          searchQuery) && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredQuestions.length} matching questions</span>
            <button
              onClick={() => {
                setSelectedUnit('All');
                setSelectedSubject('All');
                setSelectedTopic('All');
                setSelectedSubtopic('All');
                setSelectedExam('All');
                setSelectedDifficulty('All');
                setSearchQuery('');
              }}
              className="text-slate-800 hover:underline font-medium cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-3.5">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
            {questions.length === 0
              ? 'No questions are currently available in the question bank. Please check back later.'
              : 'No questions match your current filter settings.'}
          </div>
        ) : (
          filteredQuestions
            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
            .map((q) => {
            const isExpanded = expandedQuestionId === q.id;
            const isBookmarked = bookmarkedIds.includes(q.id);

            return (
              <div
                key={q.id}
                className="glass-panel glass-panel-hover rounded-2xl p-5 sm:p-6 space-y-3.5"
              >
                {/* Unboxed Metadata Line */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/60">{q.code}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-700 font-medium">{q.unit}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topic}</span>
                    {q.subtopic && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{q.subtopic}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-400">{q.difficulty}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleBookmark(q.id)}
                      className={`p-1 rounded transition-colors cursor-pointer ${
                        isBookmarked ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-600' : ''}`} />
                    </button>
                    <button
                      onClick={() => onReportQuestion(q)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Report issue"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {q.clinicalCase && (
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-xs text-slate-700">
                    <span className="font-semibold text-slate-900 block mb-0.5">Clinical Case:</span>
                    {q.clinicalCase}
                  </div>
                )}

                {q.tableData && (
                  <div className="overflow-x-auto rounded border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          {q.tableData.headers.map((h, idx) => (
                            <th key={idx} className="px-3.5 py-2 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                        {q.tableData.rows.map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3.5 py-1.5 font-mono">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {q.imageUrl && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <img
                      src={q.imageUrl}
                      alt={q.code ? `Specimen image or clinical chart for question ${q.code}` : "Clinical laboratory diagnostic specimen or chart"}
                      className="max-h-64 rounded object-contain mx-auto"
                    />
                  </div>
                )}

                <p className="text-sm font-medium text-slate-900 leading-snug">{q.questionText}</p>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded border flex items-start gap-2 break-words ${
                        isExpanded && opt.id === q.correctAnswer
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold shrink-0">{opt.id}.</span>
                      <span className="leading-relaxed">{opt.text}</span>
                    </div>
                  ))}
                </div>

                {/* Toggle details */}
                <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                    className="text-xs font-semibold text-slate-700 hover:text-cyan-700 flex items-center gap-1 cursor-pointer py-1 transition-colors"
                  >
                    <span>{isExpanded ? 'Hide Answer & Explanation' : 'View Answer & Clinical Pearl'}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-cyan-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                  </button>

                  <div className="text-xs text-slate-400">
                    {q.examCategories.join(' · ')}
                  </div>
                </div>

                {/* Expanded Box */}
                {isExpanded && (
                  <div className="bg-slate-50 p-3.5 rounded border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Correct Answer: Option {q.correctAnswer}</span>
                    </div>
                    <div>
                      <strong className="text-slate-900 block mb-0.5">Clinical Discussion:</strong>
                      <p className="leading-relaxed break-words">{q.explanation}</p>
                    </div>
                    {q.reference && (
                      <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 break-words">
                        Reference: {q.reference}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {filteredQuestions.length > pageSize && (
        <div className="glass-panel rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>
              Showing{' '}
              <strong className="text-slate-900">
                {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredQuestions.length)}
              </strong>{' '}
              of <strong className="text-slate-900">{filteredQuestions.length}</strong> questions
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
            >
              <option value={15}>15 / page</option>
              <option value={30}>30 / page</option>
              <option value={60}>60 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 text-slate-600">
              Page <strong className="text-slate-900">{currentPage}</strong> of{' '}
              <strong className="text-slate-900">{Math.ceil(filteredQuestions.length / pageSize)}</strong>
            </span>
            <button
              disabled={currentPage >= Math.ceil(filteredQuestions.length / pageSize)}
              onClick={() =>
                setCurrentPage((p) => Math.min(Math.ceil(filteredQuestions.length / pageSize), p + 1))
              }
              className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
