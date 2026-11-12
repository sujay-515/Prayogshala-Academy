import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Edit,
  Copy,
  Archive,
  Trash2,
  History,
  CheckSquare,
  Square,
  Globe,
  ChevronDown,
  CheckCircle2,
  X,
} from 'lucide-react';
import { MCQQuestion, UnitCategory, QuestionStatus, ExamCategory, DifficultyLevel } from '../../types';
import { QuestionFormModal } from './QuestionFormModal';
import { generateNextQuestionCode } from '../../utils/mcqParser';
import { GENERAL_EXAM_LABEL, normalizeExamCategories, questionMatchesExamCategory } from '../../utils/examCategories';
import { SubjectIcon } from '../SubjectIcon';
import { Modal } from '../common/Modal';

interface ManualQuestionManagerProps {
  questions: MCQQuestion[];
  categories: UnitCategory[];
  onSaveQuestion: (question: MCQQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onBulkDeleteQuestions: (ids: string[]) => boolean;
  onBulkSaveQuestions: (questions: MCQQuestion[]) => void;
  onBulkUpdateStatus: (ids: string[], newStatus: QuestionStatus) => void;
  initialEditingQuestion?: MCQQuestion | null;
  onClearInitialEditingQuestion?: () => void;
}

const ALL_EXAMS: ExamCategory[] = ['ASCP', 'NHPC', 'PSC', 'DHA', 'AIMS', 'CEE-UG'];

export const ManualQuestionManager: React.FC<ManualQuestionManagerProps> = ({
  questions,
  categories,
  onSaveQuestion,
  onDeleteQuestion,
  onBulkDeleteQuestions,
  onBulkSaveQuestions,
  onBulkUpdateStatus,
  initialEditingQuestion,
  onClearInitialEditingQuestion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [selectedUnit, setSelectedUnit] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedExam, setSelectedExam] = useState('All');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [bulkCategorySubject, setBulkCategorySubject] = useState<string>('');
  const [bulkCategoryUnit, setBulkCategoryUnit] = useState<string>('');
  const [bulkCategoryTopic, setBulkCategoryTopic] = useState<string>('');
  const [bulkCategoryDifficulty, setBulkCategoryDifficulty] = useState<string>('');
  const [bulkCategoryExams, setBulkCategoryExams] = useState<ExamCategory[]>([]);
  const [bulkClearCategoryExams, setBulkClearCategoryExams] = useState<boolean>(false);
  const [isBulkExamDropdownOpen, setIsBulkExamDropdownOpen] = useState<boolean>(false);
  const bulkExamDropdownRef = useRef<HTMLDivElement>(null);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MCQQuestion | null>(null);
  const [viewHistoryQuestion, setViewHistoryQuestion] = useState<MCQQuestion | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState<boolean>(false);
  const [questionToDelete, setQuestionToDelete] = useState<MCQQuestion | null>(null);

  // Open modal automatically if redirected from Student Reports
  useEffect(() => {
    if (initialEditingQuestion) {
      setEditingQuestion(initialEditingQuestion);
      setIsFormModalOpen(true);
      onClearInitialEditingQuestion?.();
    }
  }, [initialEditingQuestion, onClearInitialEditingQuestion]);

  // Prune selectedIds if questions are deleted externally
  useEffect(() => {
    const validIds = new Set(questions.map((q) => q.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [questions]);

  // Close exam categories dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkExamDropdownRef.current && !bulkExamDropdownRef.current.contains(event.target as Node)) {
        setIsBulkExamDropdownOpen(false);
      }
    };
    if (isBulkExamDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBulkExamDropdownOpen]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSubject, selectedUnit, selectedStatus, selectedDifficulty, selectedExam]);

  const filterSubjectObj = categories.find((c) => c.name === selectedSubject);
  const filterUnitsList = filterSubjectObj?.units || filterSubjectObj?.subjects || [];

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (selectedSubject !== 'All' && q.subject !== selectedSubject) return false;
      if (selectedUnit !== 'All' && q.unit !== selectedUnit) return false;
      if (selectedStatus !== 'All' && q.status !== selectedStatus) return false;
      if (selectedDifficulty !== 'All' && q.difficulty !== selectedDifficulty) return false;
      if (selectedExam !== 'All' && !questionMatchesExamCategory(q.examCategories, selectedExam as ExamCategory)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          q.questionText.toLowerCase().includes(query) ||
          q.code.toLowerCase().includes(query) ||
          q.subject.toLowerCase().includes(query) ||
          (q.unit || '').toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          (q.subtopic || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, selectedSubject, selectedUnit, selectedStatus, selectedDifficulty, selectedExam, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFiltered = useMemo(() => {
    return filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filtered, safePage, pageSize]);

  const handleAddNew = () => {
    setEditingQuestion(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (q: MCQQuestion) => {
    setEditingQuestion(q);
    setIsFormModalOpen(true);
  };

  const handleDuplicate = (q: MCQQuestion) => {
    const timestamp = new Date().toISOString();
    const duplicated: MCQQuestion = {
      ...q,
      id: `lab-${Date.now()}`,
      code: generateNextQuestionCode(questions, 0),
      status: 'Draft',
      questionText: `${q.questionText} (Copy)`,
      createdAt: timestamp,
      updatedAt: timestamp,
      versionHistory: [
        {
          timestamp,
          author: 'Administrator',
          action: `Duplicated from ${q.code}`,
        },
      ],
    };
    onSaveQuestion(duplicated);
  };

  const handleTogglePublish = (q: MCQQuestion) => {
    const newStatus: QuestionStatus = q.status === 'Published' ? 'Draft' : 'Published';
    const timestamp = new Date().toISOString();
    const updated: MCQQuestion = {
      ...q,
      status: newStatus,
      updatedAt: timestamp,
      versionHistory: [
        ...q.versionHistory,
        {
          timestamp,
          author: 'Administrator',
          action: `Status changed to ${newStatus}`,
        },
      ],
    };
    onSaveQuestion(updated);
  };

  const handleArchive = (q: MCQQuestion) => {
    const timestamp = new Date().toISOString();
    const updated: MCQQuestion = {
      ...q,
      status: 'Archived',
      updatedAt: timestamp,
      versionHistory: [
        ...q.versionHistory,
        {
          timestamp,
          author: 'Administrator',
          action: 'Archived question',
        },
      ],
    };
    onSaveQuestion(updated);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (select: boolean) => {
    if (select) {
      setSelectedIds(new Set(filtered.map((q) => q.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkStatusAction = (newStatus: QuestionStatus) => {
    if (selectedIds.size === 0) return;
    onBulkUpdateStatus(Array.from(selectedIds), newStatus);
    setSelectedIds(new Set());
  };

  const handleBulkCategorizeSelected = () => {
    if (selectedIds.size === 0) return;
    if (
      !bulkCategorySubject &&
      !bulkCategoryUnit &&
      !bulkCategoryTopic &&
      !bulkCategoryDifficulty &&
      bulkCategoryExams.length === 0 &&
      !bulkClearCategoryExams
    )
      return;

    const timestamp = new Date().toISOString();
    const targetSubjectObj = categories.find((c) => c.name === bulkCategorySubject);
    const targetUnits = targetSubjectObj?.units || targetSubjectObj?.subjects || [];
    const updatedItems: MCQQuestion[] = questions
      .filter((q) => selectedIds.has(q.id))
      .map((q) => {
        let nextUnit = bulkCategoryUnit || q.unit;
        // Keep unit consistent with newly assigned subject
        if (!bulkCategoryUnit && targetSubjectObj && !targetUnits.some((u) => u.name === q.unit)) {
          nextUnit = targetUnits[0]?.name || q.unit;
        }

        let nextExams = normalizeExamCategories(q.examCategories);
        if (bulkClearCategoryExams) {
          nextExams = [];
        } else if (bulkCategoryExams.length > 0) {
          const examSet = new Set(nextExams);
          bulkCategoryExams.forEach((e) => examSet.add(e));
          nextExams = Array.from(examSet);
        }

        return {
          ...q,
          subject: bulkCategorySubject || q.subject,
          unit: nextUnit,
          topic: bulkCategoryTopic || q.topic,
          difficulty: (bulkCategoryDifficulty as DifficultyLevel) || q.difficulty,
          examCategories: nextExams,
          updatedAt: timestamp,
          versionHistory: [
            ...q.versionHistory,
            {
              timestamp,
              author: 'Administrator',
              action: 'Bulk category/topic/exam update',
            },
          ],
        };
      });
    onBulkSaveQuestions(updatedItems);
    setSelectedIds(new Set());
    setBulkCategorySubject('');
    setBulkCategoryUnit('');
    setBulkCategoryTopic('');
    setBulkCategoryDifficulty('');
    setBulkCategoryExams([]);
    setBulkClearCategoryExams(false);
  };

  const bulkSubjectObj = categories.find((c) => c.name === bulkCategorySubject);
  const bulkUnitsList = bulkSubjectObj?.units || bulkSubjectObj?.subjects || [];
  const bulkUnitItem = bulkUnitsList.find((u) => u.name === bulkCategoryUnit);
  const bulkTopicsList = bulkUnitItem?.topics || [];

  return (
    <div className="space-y-5">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Question Bank Records</h2>
          <p className="text-xs text-slate-500">
            Add, edit, duplicate, archive, and manage live publication status.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Search</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Code, stem, analyte..."
                className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-900 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Specialty Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setSelectedUnit('All');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs text-slate-800 focus:bg-white"
            >
              <option value="All">All Subjects</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Unit / Section</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs text-slate-800 focus:bg-white"
            >
              <option value="All">All Units</option>
              {(selectedSubject === 'All'
                ? categories.flatMap((c) => c.units || c.subjects || [])
                : filterUnitsList
              ).map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs text-slate-800 focus:bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft (Unpublished)</option>
              <option value="Under-Review">Under-Review</option>
              <option value="Approved">Approved</option>
              <option value="Published">Published (Active)</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs text-slate-800 focus:bg-white"
            >
              <option value="All">All Difficulties</option>
              <option value="Memory-based">Memory-based</option>
              <option value="Conceptual">Conceptual</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Exam</label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md p-1.5 text-xs text-slate-800 focus:bg-white"
            >
              <option value="All">All Exams</option>
              <option value="ASCP">ASCP</option>
              <option value="NHPC">NHPC</option>
              <option value="PSC">PSC</option>
              <option value="DHA">DHA</option>
              <option value="AIMS">AIMS</option>
              <option value="CEE-UG">CEE-UG (Entrance)</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{selectedIds.size}</strong> question(s) selected
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleBulkStatusAction('Published')}
                  className="px-2.5 py-1 bg-slate-900 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Publish Selected
                </button>
                <button
                  onClick={() => handleBulkStatusAction('Approved')}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded text-xs font-medium cursor-pointer"
                >
                  Mark Approved
                </button>
                <button
                  onClick={() => handleBulkStatusAction('Under-Review')}
                  className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 rounded text-xs font-medium cursor-pointer"
                >
                  Under-Review
                </button>
                <button
                  onClick={() => handleBulkStatusAction('Draft')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-xs cursor-pointer"
                >
                  Unpublish (Draft)
                </button>
                <button
                  onClick={() => handleBulkStatusAction('Archived')}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-xs cursor-pointer"
                >
                  Archive
                </button>
                <button
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-xs font-medium cursor-pointer"
                >
                  Delete Selected
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-slate-500">Bulk Re-categorize:</span>
              <select
                value={bulkCategorySubject}
                onChange={(e) => {
                  setBulkCategorySubject(e.target.value);
                  setBulkCategoryUnit('');
                  setBulkCategoryTopic('');
                }}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
              >
                <option value="">Assign Subject...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {bulkUnitsList.length > 0 && (
                <select
                  value={bulkCategoryUnit}
                  onChange={(e) => {
                    setBulkCategoryUnit(e.target.value);
                    setBulkCategoryTopic('');
                  }}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                >
                  <option value="">Assign Unit...</option>
                  {bulkUnitsList.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              )}

              {bulkTopicsList.length > 0 && (
                <select
                  value={bulkCategoryTopic}
                  onChange={(e) => setBulkCategoryTopic(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                >
                  <option value="">Assign Topic...</option>
                  {bulkTopicsList.map((top) => (
                    <option key={top} value={top}>
                      {top}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={bulkCategoryDifficulty}
                onChange={(e) => setBulkCategoryDifficulty(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
              >
                <option value="">Assign Difficulty...</option>
                <option value="Memory-based">Memory-based</option>
                <option value="Conceptual">Conceptual</option>
                <option value="Advanced">Advanced</option>
              </select>

              <div className="relative" ref={bulkExamDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsBulkExamDropdownOpen((prev) => !prev)}
                  title="Exam tags are optional — choose General to remove tags"
                  className={`bg-slate-50 border ${
                    bulkCategoryExams.length > 0 || bulkClearCategoryExams
                      ? 'border-slate-400 bg-white'
                      : 'border-slate-200'
                  } rounded px-2.5 py-1 text-slate-800 text-xs flex items-center justify-between gap-1.5 hover:border-slate-400 focus:outline-none transition-colors cursor-pointer min-w-[150px]`}
                >
                  <span className="truncate max-w-[130px] text-left">
                    {bulkClearCategoryExams ? (
                      <span className="font-medium text-slate-900">General (no exam tag)</span>
                    ) : bulkCategoryExams.length === 0 ? (
                      <span className="text-slate-600">Tag Exam Board...</span>
                    ) : (
                      <span className="font-medium text-slate-900">
                        {bulkCategoryExams.length === ALL_EXAMS.length
                          ? 'All Exam Boards'
                          : bulkCategoryExams.join(', ')}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {(bulkCategoryExams.length > 0 || bulkClearCategoryExams) && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBulkCategoryExams([]);
                          setBulkClearCategoryExams(false);
                        }}
                        className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                        title="Clear selections"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-150 ${
                        isBulkExamDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {isBulkExamDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-30 p-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 px-1">
                      <span className="font-semibold text-slate-700 text-[11px]">Select Exam Boards (Optional)</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setBulkCategoryExams([...ALL_EXAMS]);
                            setBulkClearCategoryExams(false);
                          }}
                          className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                        >
                          All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkCategoryExams([]);
                            setBulkClearCategoryExams(false);
                          }}
                          className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <label
                      className={`flex items-start justify-between px-2 py-1.5 mb-1 rounded cursor-pointer transition-colors ${
                        bulkClearCategoryExams
                          ? 'bg-slate-100 font-medium text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={bulkClearCategoryExams}
                          onChange={(e) => {
                            setBulkClearCategoryExams(e.target.checked);
                            if (e.target.checked) setBulkCategoryExams([]);
                          }}
                          className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>
                          <span className="block">No exam board</span>
                          <span className="block text-[10px] text-slate-500 font-normal">
                            {GENERAL_EXAM_LABEL} question — removes existing tags
                          </span>
                        </span>
                      </div>
                      {bulkClearCategoryExams && <CheckCircle2 className="w-3.5 h-3.5 text-slate-800 mt-0.5" />}
                    </label>

                    <div className="border-t border-slate-100 mb-1" />

                    <div className="space-y-0.5">
                      {ALL_EXAMS.map((ex) => {
                        const checked = bulkCategoryExams.includes(ex);
                        return (
                          <label
                            key={ex}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                              checked ? 'bg-slate-100 font-medium text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setBulkClearCategoryExams(false);
                                  if (checked) {
                                    setBulkCategoryExams(bulkCategoryExams.filter((e) => e !== ex));
                                  } else {
                                    setBulkCategoryExams([...bulkCategoryExams, ex]);
                                  }
                                }}
                                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>Tag {ex}</span>
                            </div>
                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-slate-800" />}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <button
                disabled={
                  !bulkCategoryUnit &&
                  !bulkCategorySubject &&
                  !bulkCategoryTopic &&
                  !bulkCategoryDifficulty &&
                  bulkCategoryExams.length === 0 &&
                  !bulkClearCategoryExams
                }
                onClick={handleBulkCategorizeSelected}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded text-xs font-medium cursor-pointer"
              >
                Apply Category
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-3 py-2.5 w-8">
                  <button
                    onClick={() => toggleSelectAll(selectedIds.size !== filtered.length)}
                    className="cursor-pointer"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filtered.length ? (
                      <CheckSquare className="w-4 h-4 text-slate-900" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-2.5">Code</th>
                <th className="px-3 py-2.5">Question Stem</th>
                <th className="px-3 py-2.5">Subject &amp; Unit</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {paginatedFiltered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No questions match these filters.
                  </td>
                </tr>
              ) : (
                paginatedFiltered.map((q) => {
                  const isSelected = selectedIds.has(q.id);

                  let statusText = 'text-slate-500';
                  if (q.status === 'Published') statusText = 'text-emerald-700 font-medium';
                  if (q.status === 'Approved') statusText = 'text-teal-700 font-medium';
                  if (q.status === 'Draft') statusText = 'text-amber-700 font-medium';
                  if (q.status === 'Under-Review') statusText = 'text-cyan-700 font-medium';

                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <button onClick={() => toggleSelect(q.id)} className="cursor-pointer">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-cyan-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {q.code}
                      </td>
                      <td className="px-3 py-2.5 max-w-sm">
                        <p className="line-clamp-2 text-slate-900 leading-snug">{q.questionText}</p>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>Ans: {q.correctAnswer} · {q.options.length} options</span>
                          {q.isHighYield && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                              High-Yield
                            </span>
                          )}
                          {q.pastPaper && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium">
                              {q.pastPaper}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          <SubjectIcon name={q.subject} className="w-3.5 h-3.5 text-slate-500" />
                          {q.subject}
                        </span>
                        <span className="text-xs text-slate-500 block">{q.unit}</span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`text-xs ${statusText}`}>{q.status}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleTogglePublish(q)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 cursor-pointer"
                            title={q.status === 'Published' ? 'Unpublish' : 'Publish'}
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(q)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(q)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setViewHistoryQuestion(q)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleArchive(q)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Archive"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setQuestionToDelete(q)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Showing{' '}
                <strong className="text-slate-900">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)}
                </strong>{' '}
                of <strong className="text-slate-900">{filtered.length}</strong> records
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700"
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-medium cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2">
                Page <strong className="text-slate-900">{safePage}</strong> of{' '}
                <strong className="text-slate-900">{totalPages}</strong>
              </span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-medium cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <QuestionFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSaveQuestion={onSaveQuestion}
        categories={categories}
        editingQuestion={editingQuestion}
        totalQuestionCount={questions.length}
        existingQuestions={questions}
      />

      {/* History Modal */}
      <Modal
        isOpen={!!viewHistoryQuestion}
        onClose={() => setViewHistoryQuestion(null)}
        titleId="view-history-modal-title"
        maxWidth="max-w-md"
      >
        {viewHistoryQuestion && (
          <div className="bg-white border border-slate-200 w-full rounded p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 id="view-history-modal-title" className="font-semibold text-slate-900 text-sm">
                History: {viewHistoryQuestion.code}
              </h3>
              <button
                onClick={() => setViewHistoryQuestion(null)}
                aria-label="Close dialog"
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
              {viewHistoryQuestion.versionHistory.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                  <div className="flex items-center justify-between text-slate-500 text-xs">
                    <span className="font-semibold text-slate-800">{item.author}</span>
                    <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-slate-900">{item.action}</div>
                  {item.note && <div className="text-slate-500 italic text-xs">{item.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Single Question In-App Confirmation Modal */}
      <Modal
        isOpen={!!questionToDelete}
        onClose={() => setQuestionToDelete(null)}
        titleId="delete-question-modal-title"
        maxWidth="max-w-md"
      >
        {questionToDelete && (
          <div className="bg-white border border-slate-200 w-full rounded p-5 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <h3 id="delete-question-modal-title" className="font-semibold text-slate-900 text-sm">
              Delete Question ({questionToDelete.code})?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this question from the question bank?
              <span className="block mt-2 font-mono text-xs text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200 line-clamp-3">
                {questionToDelete.questionText}
              </span>
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setQuestionToDelete(null)}
                className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteQuestion(questionToDelete.id);
                  setQuestionToDelete(null);
                }}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
              >
                Delete question
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Delete Selected In-App Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        titleId="bulk-delete-modal-title"
        maxWidth="max-w-md"
      >
        <div className="bg-white border border-slate-200 w-full rounded p-6 shadow-xl space-y-4">
          <h3 id="bulk-delete-modal-title" className="font-semibold text-slate-900 text-sm">
            Delete {selectedIds.size} Selected Questions?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete these <strong className="text-slate-900">{selectedIds.size}</strong> selected questions from the question bank? This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setBulkDeleteConfirmOpen(false)}
              className="px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onBulkDeleteQuestions(Array.from(selectedIds));
                setSelectedIds(new Set());
                setBulkDeleteConfirmOpen(false);
              }}
              className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
            >
              Delete {selectedIds.size} questions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
