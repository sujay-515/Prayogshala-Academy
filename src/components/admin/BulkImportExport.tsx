import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  X,
  FileCheck,
  AlertCircle,
  GraduationCap,
  Layers,
  FileSpreadsheet,
  FileCode,
  Tag,
  BookOpen,
} from 'lucide-react';
import { MCQQuestion, ExtractedMCQDraft, UnitCategory, DifficultyLevel, ExamCategory } from '../../types';
import {
  generateCSVTemplate,
  parseCSVToMCQ,
  validateExtractedQuestion,
  findDuplicateQuestion,
  generateNextQuestionCode,
} from '../../utils/mcqParser';
import { normalizeExamCategories } from '../../utils/examCategories';
import { Modal } from '../common/Modal';

interface BulkImportExportProps {
  questions: MCQQuestion[];
  categories?: UnitCategory[];
  onImportBulkQuestions: (newQuestions: MCQQuestion[]) => void;
  authToken?: string | null;
  initialUploadMode?: 'mock' | 'subject';
}

export const BulkImportExport: React.FC<BulkImportExportProps> = ({
  questions,
  categories = [],
  onImportBulkQuestions,
  authToken,
  initialUploadMode = 'mock',
}) => {
  const [uploadMode, setUploadMode] = useState<'mock' | 'subject'>(initialUploadMode);

  // Mock Test Mode parameters
  const [mockExamCategory, setMockExamCategory] = useState<string>('CEE-UG');
  const [mockPaperTitle, setMockPaperTitle] = useState<string>('CEE-UG Entrance Mock 2026');

  // Subject-Wise Mode parameters
  const [targetSubject, setTargetSubject] = useState<string>(categories[0]?.name || 'Clinical Chemistry');
  const activeSubjectObj = categories.find((c) => c.name === targetSubject) || categories[0];
  const subjectUnits = activeSubjectObj?.units || activeSubjectObj?.subjects || [];
  const [targetUnit, setTargetUnit] = useState<string>(subjectUnits[0]?.name || 'Clinical Enzymology & Hepatic Function');
  const activeUnitObj = subjectUnits.find((u) => u.name === targetUnit) || subjectUnits[0];
  const unitTopics = activeUnitObj?.topics || [];
  const [targetTopic, setTargetTopic] = useState<string>(unitTopics[0] || '');

  // Keep targetUnit and targetTopic in sync when subject changes
  const handleSubjectChange = (newSub: string) => {
    setTargetSubject(newSub);
    const sObj = categories.find((c) => c.name === newSub);
    const units = sObj?.units || sObj?.subjects || [];
    const firstUnit = units[0]?.name || '';
    setTargetUnit(firstUnit);
    setTargetTopic(units[0]?.topics?.[0] || '');
  };

  const handleUnitChange = (newUnit: string) => {
    setTargetUnit(newUnit);
    const uObj = subjectUnits.find((u) => u.name === newUnit);
    setTargetTopic(uObj?.topics?.[0] || '');
  };

  useEffect(() => {
    if (initialUploadMode) {
      setUploadMode(initialUploadMode);
    }
  }, [initialUploadMode]);

  const [importedDrafts, setImportedDrafts] = useState<ExtractedMCQDraft[]>([]);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'flagged' | 'ready'>('all');
  const [editingDraft, setEditingDraft] = useState<ExtractedMCQDraft | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [importReport, setImportReport] = useState<{
    importedCount: number;
    skippedCount: number;
    stagedRemaining: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const buildAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authToken || localStorage.getItem('prayogshala_auth_token_v1');
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const handleDownloadCSVTemplate = (mode: 'all' | 'mock' | 'subject' = uploadMode) => {
    const csvContent = generateCSVTemplate(mode);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename =
      mode === 'mock'
        ? 'prayogshala_mock_exam_template.csv'
        : mode === 'subject'
        ? 'prayogshala_subject_wise_template.csv'
        : 'prayogshala_mcq_import_template.csv';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSONTemplate = (mode: 'mock' | 'subject' = uploadMode) => {
    const jsonTemplate =
      mode === 'mock'
        ? [
            {
              questionText:
                'A 52-year-old male with acute right upper quadrant pain presents with jaundice. Serum alkaline phosphatase (ALP) is 450 U/L and total bilirubin is 6.2 mg/dL. Which enzyme test is most specific to differentiate hepatobiliary from osseous elevation?',
              options: [
                { id: 'A', text: 'Aspartate aminotransferase (AST)' },
                { id: 'B', text: 'Gamma-glutamyl transferase (GGT)' },
                { id: 'C', text: 'Creatine kinase (CK-MB)' },
                { id: 'D', text: 'Lactate dehydrogenase (LDH)' },
              ],
              correctAnswer: 'B',
              explanation:
                'GGT is markedly elevated in biliary tract disorders and hepatobiliary obstruction but is absent in bone tissue. It confirms hepatic origin of elevated alkaline phosphatase.',
              reference: 'Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Ed.',
              examCategories: [mockExamCategory !== 'General' ? mockExamCategory : 'CEE-UG'],
              pastPaper: mockPaperTitle.trim() || 'CEE-UG Entrance Mock 2026',
              difficulty: 'Conceptual',
              subject: 'Clinical Chemistry',
              unit: 'Clinical Enzymology & Hepatic Function',
              topic: 'Alkaline Phosphatase & GGT',
              isHighYield: true,
            },
          ]
        : [
            {
              questionText:
                'What is the primary indicator of acute coronary syndrome that rises within 3-6 hours and remains elevated for up to 10-14 days?',
              options: [
                { id: 'A', text: 'Cardiac Troponin I / T' },
                { id: 'B', text: 'Myoglobin' },
                { id: 'C', text: 'Creatine Kinase-MB' },
                { id: 'D', text: 'Lactate Dehydrogenase-1' },
              ],
              correctAnswer: 'A',
              explanation:
                'Cardiac troponins (cTnI and cTnT) are gold standard biomarkers for myocardial infarction with high cardiac specificity.',
              reference: 'Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 6th Ed.',
              subject: targetSubject,
              unit: targetUnit,
              topic: targetTopic || 'High-Sensitivity Troponin',
              difficulty: 'Conceptual',
              examCategories: [],
              isHighYield: true,
            },
          ];

    const blob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename =
      mode === 'mock' ? 'prayogshala_mock_test_template.json' : 'prayogshala_subject_wise_template.json';
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportDatabaseJSON = async () => {
    try {
      const res = await fetch('/api/backup/export', { headers: buildAuthHeaders() });
      if (res.ok) {
        const snapshot = await res.json();
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `prayogshala_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    } catch {
      // Fallback to local questions export
    }

    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `prayogshala_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreDatabaseJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify(Array.isArray(parsed) ? { questions: parsed } : parsed),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.questions)) {
            onImportBulkQuestions(data.questions);
          }
          setImportSummary(`Restored database backup from ${file.name}.`);
          setErrorBanner(null);
          return;
        }
      } catch {
        // Fallback
      }
      setErrorBanner('Invalid backup JSON file.');
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorBanner(null);
    setImportSummary(null);
    setImportReport(null);

    const reader = new FileReader();

    if (file.name.toLowerCase().endsWith('.json')) {
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          let itemsArray: any[] | null = null;

          if (Array.isArray(parsed)) {
            itemsArray = parsed;
          } else if (parsed && Array.isArray(parsed.questions)) {
            itemsArray = parsed.questions;
          }

          if (itemsArray) {
            const drafts: ExtractedMCQDraft[] = itemsArray.map((item: any, idx: number) => {
              const rawExams = normalizeExamCategories(item.examCategories);
              const resolvedExams =
                rawExams.length > 0
                  ? rawExams
                  : uploadMode === 'mock' && mockExamCategory !== 'General'
                  ? [mockExamCategory as ExamCategory]
                  : [];

              const resolvedPastPaper =
                typeof item.pastPaper === 'string' && item.pastPaper.trim()
                  ? item.pastPaper.trim()
                  : uploadMode === 'mock'
                  ? mockPaperTitle.trim() || undefined
                  : undefined;

              const resolvedSubject =
                item.subject?.trim() ||
                (uploadMode === 'subject' ? targetSubject : 'Clinical Chemistry');
              const resolvedUnit =
                item.unit?.trim() ||
                (uploadMode === 'subject'
                  ? targetUnit
                  : `${mockExamCategory} Mock Examination`);
              const resolvedTopic =
                item.topic?.trim() ||
                (uploadMode === 'subject' ? targetTopic || 'General Topic' : 'Mock Paper');

              const draft: ExtractedMCQDraft = {
                id: `json-${Date.now()}-${idx}`,
                tempCode: `JSON-${String(idx + 1).padStart(4, '0')}`,
                questionText: item.questionText || '',
                options: item.options || [],
                correctAnswer: item.correctAnswer || '',
                explanation: item.explanation || '',
                reference: item.reference || `Imported from ${file.name}`,
                clinicalCase: item.clinicalCase,
                tableData: item.tableData,
                imageUrl: item.imageUrl,
                subject: resolvedSubject,
                unit: resolvedUnit,
                topic: resolvedTopic,
                subtopic: item.subtopic,
                difficulty: item.difficulty || 'Conceptual',
                examCategories: resolvedExams,
                isHighYield: Boolean(item.isHighYield),
                pastPaper: resolvedPastPaper,
                sourceDocument: file.name,
                confidenceScore: 1.0,
                validationErrors: [],
                selectedForImport: true,
                status: 'Staged',
              };
              draft.validationErrors = validateExtractedQuestion(draft);
              const dup = findDuplicateQuestion(draft.questionText, questions);
              if (dup) {
                draft.duplicateWarning = dup;
                draft.validationErrors.push(
                  `Duplicate check: Matches ${dup.existingCode} (${Math.round(dup.similarityScore * 100)}%)`
                );
              }
              return draft;
            });
            setImportedDrafts(drafts);
            setImportSummary(
              `Parsed ${drafts.length} questions from ${file.name} for ${
                uploadMode === 'mock'
                  ? `Mock Test (${mockExamCategory})`
                  : `Subject-Wise (${targetSubject} > ${targetUnit})`
              }. Review and approve below before saving.`
            );
          } else {
            setErrorBanner('JSON file must contain an array of questions or a { questions: [...] } object.');
          }
        } catch {
          setErrorBanner('Failed to parse JSON file. Ensure valid JSON syntax.');
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const defaults =
          uploadMode === 'mock'
            ? {
                examCategories:
                  mockExamCategory !== 'General' ? [mockExamCategory as ExamCategory] : [],
                pastPaper: mockPaperTitle.trim() || undefined,
                unit: 'Clinical Chemistry',
                subject: `${mockExamCategory} Mock Examination`,
                topic: 'Mock Paper',
              }
            : {
                unit: targetUnit,
                subject: targetSubject,
                topic: targetTopic.trim() || undefined,
              };
        const drafts = parseCSVToMCQ(reader.result as string, file.name, questions, defaults);
        setImportedDrafts(drafts);
        setImportSummary(
          `Parsed ${drafts.length} questions from ${file.name} for ${
            uploadMode === 'mock'
              ? `Mock Test (${mockExamCategory})`
              : `Subject-Wise (${targetSubject} > ${targetUnit})`
          }. Review and approve below before saving.`
        );
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleApplyCurrentModeToAllStaged = () => {
    if (importedDrafts.length === 0) return;
    setImportedDrafts((prev) =>
      prev.map((d) => {
        if (uploadMode === 'mock') {
          const nextExams =
            mockExamCategory !== 'General' ? [mockExamCategory as ExamCategory] : [];
          return {
            ...d,
            examCategories: nextExams,
            pastPaper: mockPaperTitle.trim() || d.pastPaper,
          };
        } else {
          return {
            ...d,
            subject: targetSubject,
            unit: targetUnit,
            topic: targetTopic.trim() || d.topic,
          };
        }
      })
    );
    setImportSummary(
      `Updated all ${importedDrafts.length} staged questions with current ${
        uploadMode === 'mock'
          ? `Mock Test (${mockExamCategory} - ${mockPaperTitle})`
          : `Subject-Wise (${targetSubject} > ${targetUnit})`
      } settings.`
    );
  };

  const handleToggleSelectDraft = (id: string) => {
    setImportedDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, selectedForImport: !d.selectedForImport } : d))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setImportedDrafts((prev) => prev.map((d) => ({ ...d, selectedForImport: select })));
  };

  const handleDeleteDraft = (id: string) => {
    setImportedDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveEditedDraft = (updated: ExtractedMCQDraft) => {
    const errors = validateExtractedQuestion(updated);
    const withErrors: ExtractedMCQDraft = {
      ...updated,
      validationErrors: errors,
    };
    const dup = findDuplicateQuestion(withErrors.questionText, questions);
    if (dup) {
      withErrors.duplicateWarning = dup;
      withErrors.validationErrors.push(
        `Duplicate check: Matches ${dup.existingCode} (${Math.round(dup.similarityScore * 100)}%)`
      );
    } else {
      withErrors.duplicateWarning = undefined;
    }
    setImportedDrafts((prev) => prev.map((d) => (d.id === updated.id ? withErrors : d)));
    setEditingDraft(null);
  };

  const handleExecuteImport = () => {
    const selected = importedDrafts.filter((d) => d.selectedForImport);
    if (selected.length === 0) return;

    const timestamp = new Date().toISOString();
    const newItems: MCQQuestion[] = selected.map((d, index) => {
      const validAnswer = (
        ['A', 'B', 'C', 'D', 'E'].includes(d.correctAnswer) ? d.correctAnswer : d.options[0]?.id || 'A'
      ) as 'A' | 'B' | 'C' | 'D' | 'E';

      return {
        id: `lab-${Date.now()}-${index + 1}`,
        code: generateNextQuestionCode(questions, index),
        questionText: d.questionText,
        options: d.options,
        correctAnswer: validAnswer,
        explanation:
          d.explanation || `Correct Answer: Option ${validAnswer}. Review clinical rationale before publishing.`,
        reference: d.reference || `Bulk imported from ${d.sourceDocument}`,
        clinicalCase: d.clinicalCase,
        tableData: d.tableData,
        imageUrl: d.imageUrl,
        subject: d.subject || 'Clinical Chemistry',
        unit: d.unit || 'Clinical Enzymology & Hepatic Function',
        topic: d.topic || 'General Diagnostic Parameters',
        subtopic: d.subtopic,
        difficulty: d.difficulty || 'Conceptual',
        examCategories: normalizeExamCategories(d.examCategories),
        isHighYield: Boolean(d.isHighYield),
        pastPaper: d.pastPaper,
        status: 'Draft',
        sourceDocument: d.sourceDocument,
        createdAt: timestamp,
        updatedAt: timestamp,
        versionHistory: [
          {
            timestamp,
            author: 'Administrator (Bulk Import)',
            action: `Imported from ${d.sourceDocument}`,
          },
        ],
      };
    });

    onImportBulkQuestions(newItems);

    const remaining = importedDrafts.filter((d) => !d.selectedForImport);
    setImportedDrafts(remaining);
    setShowConfirmModal(false);

    setImportReport({
      importedCount: newItems.length,
      skippedCount: remaining.length,
      stagedRemaining: remaining.length,
    });
    setImportSummary(`Successfully imported ${newItems.length} questions into the question bank as unpublished Drafts.`);
  };

  const flaggedCount = importedDrafts.filter(
    (d) => d.validationErrors.length > 0 || Boolean(d.duplicateWarning)
  ).length;
  const readyCount = importedDrafts.length - flaggedCount;
  const selectedCount = importedDrafts.filter((d) => d.selectedForImport).length;

  const filteredDrafts = importedDrafts.filter((d) => {
    if (activeTabFilter === 'flagged') {
      return d.validationErrors.length > 0 || Boolean(d.duplicateWarning);
    }
    if (activeTabFilter === 'ready') {
      return d.validationErrors.length === 0 && !d.duplicateWarning;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Bulk Upload & Database Archival</h2>
        <p className="text-xs text-slate-500">
          Upload bulk questions via CSV or JSON spreadsheets, backup database records, or review and stage questions before saving.
        </p>
      </div>

      {/* 2-Option Upload Pathway Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Select Upload Pathway
          </span>
          <p className="text-xs text-slate-500 mt-0.5">
            Choose whether you are uploading a complete mock test examination paper or subject-wise curriculum questions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Option 1: Mock Test */}
          <button
            type="button"
            onClick={() => setUploadMode('mock')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              uploadMode === 'mock'
                ? 'bg-cyan-50/60 border-cyan-600 ring-2 ring-cyan-600/30 shadow-xs'
                : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                uploadMode === 'mock' ? 'bg-cyan-700 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}
            >
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">1. Mock Test Upload</span>
                {uploadMode === 'mock' && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-700 text-white tracking-wide">
                    Active Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Upload complete mock examination papers (e.g. CEE-UG 200Q, ASCP, NHPC, PSC, DHA, Grand Tests).
                Automatically sets exam categories and past paper names.
              </p>
            </div>
          </button>

          {/* Option 2: Subject Wise */}
          <button
            type="button"
            onClick={() => setUploadMode('subject')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
              uploadMode === 'subject'
                ? 'bg-teal-50/60 border-teal-600 ring-2 ring-teal-600/30 shadow-xs'
                : 'bg-slate-50/50 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                uploadMode === 'subject' ? 'bg-teal-700 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900">2. Subject-Wise Upload</span>
                {uploadMode === 'subject' && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white tracking-wide">
                    Active Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Upload questions organized by Laboratory Unit and Subject for curriculum-based topic practice, chapter quizzes, and deep revision.
              </p>
            </div>
          </button>
        </div>

        {/* Dynamic Mode Configuration & Templates */}
        {uploadMode === 'mock' ? (
          <div className="p-4 bg-cyan-50/40 border border-cyan-200 rounded-xl space-y-3.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-cyan-800" />
              <h4 className="text-xs font-semibold text-cyan-950 uppercase tracking-wider">
                Mock Test Parameters &amp; Template
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Examination Board</label>
                <select
                  value={mockExamCategory}
                  onChange={(e) => setMockExamCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="CEE-UG">CEE-UG Entrance Mock (200 Questions / 180 min)</option>
                  <option value="ASCP">ASCP Board of Certification Mock</option>
                  <option value="NHPC">NHPC Licensure Mock</option>
                  <option value="PSC">PSC Medical Lab Technology Mock</option>
                  <option value="DHA">DHA Prometric Mock</option>
                  <option value="AIMS">AIMS Professional Mock</option>
                  <option value="General">General / Comprehensive Grand Test Mock</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Mock Paper Title / Source Name</label>
                <input
                  type="text"
                  value={mockPaperTitle}
                  onChange={(e) => setMockPaperTitle(e.target.value)}
                  placeholder="e.g. CEE-UG Entrance Mock 2026, ASCP Model Paper 1"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-cyan-200/60">
              <span className="text-[11px] text-cyan-900 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-700" />
                <span>
                  Uploaded questions will be tagged as <strong>{mockExamCategory}</strong> past paper:{' '}
                  <strong>"{mockPaperTitle || 'Untitled Paper'}"</strong>
                </span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCSVTemplate('mock')}
                  className="px-3 py-1.5 bg-white hover:bg-cyan-50 text-cyan-900 border border-cyan-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Download Mock Test CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadJSONTemplate('mock')}
                  className="px-3 py-1.5 bg-white hover:bg-cyan-50 text-cyan-900 border border-cyan-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Download Mock Test JSON</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-teal-50/40 border border-teal-200 rounded-xl space-y-3.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-800" />
              <h4 className="text-xs font-semibold text-teal-950 uppercase tracking-wider">
                Subject-Wise Parameters &amp; Template
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Specialty Subject</label>
                <select
                  value={targetSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Unit / Module</label>
                <select
                  value={targetUnit}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  {subjectUnits.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Default Topic (Optional)</label>
                <input
                  type="text"
                  value={targetTopic}
                  onChange={(e) => setTargetTopic(e.target.value)}
                  placeholder="e.g. Transaminases, Troponin"
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-teal-200/60">
              <span className="text-[11px] text-teal-900 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-700" />
                <span>
                  Uploaded questions will be mapped to <strong>{targetSubject}</strong> &gt;{' '}
                  <strong>{targetUnit}</strong>
                </span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCSVTemplate('subject')}
                  className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>Download Subject-Wise CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadJSONTemplate('subject')}
                  className="px-3 py-1.5 bg-white hover:bg-teal-50 text-teal-900 border border-teal-300 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-700" />
                  <span>Download Subject-Wise JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Upload {uploadMode === 'mock' ? 'Mock Test' : 'Subject-Wise'} Batch File
            </h3>
            <span className="text-[11px] text-slate-500">Supports .csv and .json</span>
          </div>

          <div
            className={`border-2 border-dashed rounded-xl p-7 text-center space-y-3 transition-colors ${
              uploadMode === 'mock'
                ? 'border-cyan-300 hover:border-cyan-500 bg-cyan-50/20'
                : 'border-teal-300 hover:border-teal-500 bg-teal-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,.json"
              className="hidden"
            />

            <div className="flex justify-center">
              <div
                className={`p-3 rounded-full ${
                  uploadMode === 'mock' ? 'bg-cyan-100 text-cyan-800' : 'bg-teal-100 text-teal-800'
                }`}
              >
                <Upload className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Choose a batch file to upload for{' '}
                <span className={uploadMode === 'mock' ? 'text-cyan-800' : 'text-teal-800'}>
                  {uploadMode === 'mock' ? `Mock Test (${mockExamCategory})` : `Subject Wise (${targetSubject})`}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                CSV rows and JSON records will be parsed, checked for duplicates, and staged for review before publishing.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`px-5 py-2 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all ${
                uploadMode === 'mock'
                  ? 'bg-cyan-700 hover:bg-cyan-800'
                  : 'bg-teal-700 hover:bg-teal-800'
              }`}
            >
              Select Batch File ({uploadMode === 'mock' ? 'Mock Test' : 'Subject-Wise'})
            </button>
          </div>

          {errorBanner && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          {importSummary && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{importSummary}</span>
              </div>
              {importedDrafts.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyCurrentModeToAllStaged}
                  className="px-2 py-1 text-[11px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 cursor-pointer"
                  title="Re-tag all currently staged questions with the active upload settings above"
                >
                  Apply Current Settings to Staged
                </button>
              )}
            </div>
          )}

          {importReport && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
              <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-700" />
                <span>Import Verification Receipt</span>
              </div>
              <div className="text-emerald-800 flex flex-wrap gap-4 pt-1">
                <span>Successfully Imported: <strong>{importReport.importedCount}</strong></span>
                <span>Skipped / Excluded: <strong>{importReport.skippedCount}</strong></span>
                <span>Remaining in Staging: <strong>{importReport.stagedRemaining}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Backup & Restore Utility */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <h4 className="font-semibold text-slate-900">Full Database Backup &amp; Restore</h4>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Export a full JSON snapshot of all {questions.length} questions or restore from an archival backup file.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportDatabaseJSON}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
          <input
            type="file"
            ref={restoreInputRef}
            onChange={handleRestoreDatabaseJSON}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => restoreInputRef.current?.click()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-medium flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
        </div>
      </div>

      {/* Staged Review & Correction Area (app.pdf Section 1.D) */}
      {importedDrafts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Staged Question Review & Approval ({importedDrafts.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Validate and correct questions before submitting them to the database as unpublished Drafts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSelectAll(true)}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Select All
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
              >
                Deselect All
              </button>
              <button
                disabled={selectedCount === 0}
                onClick={() => setShowConfirmModal(true)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  selectedCount > 0
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Import Approved ({selectedCount})</span>
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              onClick={() => setActiveTabFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTabFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records ({importedDrafts.length})
            </button>
            <button
              onClick={() => setActiveTabFilter('ready')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                activeTabFilter === 'ready'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Ready for Import ({readyCount})
            </button>
            {flaggedCount > 0 && (
              <button
                onClick={() => setActiveTabFilter('flagged')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTabFilter === 'flagged'
                    ? 'bg-amber-800 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Flagged / Duplicates ({flaggedCount})
              </button>
            )}
          </div>

          {/* List of drafts */}
          <div className="space-y-2.5 max-h-[60dvh] sm:max-h-[32rem] overflow-y-auto pr-1">
            {filteredDrafts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No questions matching this filter tab.
              </div>
            ) : (
              filteredDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className={`p-3.5 rounded-lg border text-xs transition-colors space-y-2 ${
                    draft.selectedForImport ? 'bg-white border-slate-300' : 'bg-slate-50 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectDraft(draft.id)}
                        className="text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        {draft.selectedForImport ? (
                          <CheckSquare className="w-4 h-4 text-cyan-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <span className="font-semibold text-slate-800">{draft.tempCode}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 font-medium">{draft.subject}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{draft.unit}</span>
                      {draft.examCategories && draft.examCategories.length > 0 && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200 font-semibold text-[10px]">
                            {draft.examCategories.join(', ')}
                          </span>
                        </>
                      )}
                      {draft.pastPaper && (
                        <>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 italic text-[11px] truncate max-w-[180px]" title={draft.pastPaper}>
                            {draft.pastPaper}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {draft.isHighYield && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                          High-Yield
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                        Ans: {draft.correctAnswer || 'Missing'}
                      </span>
                      <button
                        onClick={() => setEditingDraft(draft)}
                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                        title="Edit question"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="Delete from staging"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed pl-6">
                    {draft.questionText}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-6 text-xs text-slate-600">
                    {draft.options.map((opt) => (
                      <div
                        key={opt.id}
                        className={`px-2 py-1 rounded border ${
                          opt.id === draft.correctAnswer
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <span className="font-bold mr-1">{opt.id}:</span> {opt.text}
                      </div>
                    ))}
                  </div>

                  {draft.validationErrors.length > 0 && (
                    <div className="pl-6">
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{draft.validationErrors.join(' · ')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Editing Modal for Staged Draft */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-slate-900 text-sm">
                Edit Staged MCQ ({editingDraft.tempCode})
              </h3>
              <button
                onClick={() => setEditingDraft(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Stem</label>
                <textarea
                  value={editingDraft.questionText}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, questionText: e.target.value })
                  }
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Answer Options</label>
                <div className="space-y-2">
                  {editingDraft.options.map((opt, oIdx) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <span className="font-bold w-6 text-center text-slate-700">{opt.id}</span>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => {
                          const newOpts = [...editingDraft.options];
                          newOpts[oIdx] = { ...opt, text: e.target.value };
                          setEditingDraft({ ...editingDraft, options: newOpts });
                        }}
                        className="flex-1 bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingDraft({ ...editingDraft, correctAnswer: opt.id as any })
                        }
                        className={`px-2 py-1 text-xs rounded font-semibold cursor-pointer ${
                          editingDraft.correctAnswer === opt.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {editingDraft.correctAnswer === opt.id ? 'Correct' : 'Mark Correct'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scientific Explanation</label>
                <textarea
                  value={editingDraft.explanation}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, explanation: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specialty Subject</label>
                  <select
                    value={editingDraft.subject}
                    onChange={(e) => setEditingDraft({ ...editingDraft, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editingDraft.difficulty}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        difficulty: e.target.value as DifficultyLevel,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-slate-900"
                  >
                    <option value="Memory-based">Memory-based</option>
                    <option value="Conceptual">Conceptual</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingDraft(null)}
                className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEditedDraft(editingDraft)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Bulk Question Import Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        titleId="confirm-bulk-import-title"
        maxWidth="max-w-md"
      >
        <div className="bg-white border border-slate-200 w-full rounded shadow-xl p-5 space-y-4">
          <div>
            <h3 id="confirm-bulk-import-title" className="font-semibold text-slate-900 text-sm">
              Confirm Bulk Question Import
            </h3>
            <p className="text-xs text-slate-500">
              Please verify before saving records to the database.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Selected Questions to Import:</span>
              <span className="font-bold text-slate-900">{selectedCount}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Skipped / Unselected Questions:</span>
              <span className="font-bold text-slate-600">
                {importedDrafts.length - selectedCount}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Initial Publication Status:</span>
              <span className="font-bold text-amber-700">Draft (Unpublished)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Imported questions will be added to the question bank as unpublished Drafts. You can preview, edit, or publish them at any time in the Manual Question Manager.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteImport}
              className="px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
            >
              Import {selectedCount} questions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
