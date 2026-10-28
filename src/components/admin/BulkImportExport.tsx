import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { MCQQuestion, ExtractedMCQDraft, UnitCategory, DifficultyLevel } from '../../types';
import {
  generateCSVTemplate,
  parseCSVToMCQ,
  validateExtractedQuestion,
  findDuplicateQuestion,
  generateNextQuestionCode,
} from '../../utils/mcqParser';
import { Modal } from '../common/Modal';

interface BulkImportExportProps {
  questions: MCQQuestion[];
  categories?: UnitCategory[];
  onImportBulkQuestions: (newQuestions: MCQQuestion[]) => void;
  authToken?: string | null;
}

export const BulkImportExport: React.FC<BulkImportExportProps> = ({
  questions,
  categories = [],
  onImportBulkQuestions,
  authToken,
}) => {
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
    const token = authToken || localStorage.getItem('medlab_qbank_auth_token_v1');
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const handleDownloadCSVTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'medlab_mcq_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadJSONTemplate = () => {
    const jsonTemplate = [
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
          'GGT is markedly elevated in biliary tract disorders and hepatobiliary obstruction but is absent in bone tissue. It is the primary test to confirm hepatic origin of elevated alkaline phosphatase.',
        reference: 'Tietz Textbook of Clinical Chemistry and Molecular Diagnostics, 7th Ed.',
        clinicalCase: '52-year-old male presenting with acute biliary symptoms.',
        unit: 'Clinical Chemistry',
        subject: 'Clinical Enzymology & Hepatic Function',
        topic: 'Alkaline Phosphatase & GGT',
        subtopic: 'Hepatobiliary vs Bone Isoenzymes',
        difficulty: 'Conceptual',
        examCategories: ['ASCP', 'NHPC', 'PSC', 'DHA', 'AIMS'],
      },
    ];
    const blob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'medlab_mcq_import_template.json');
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
        link.setAttribute('download', `medlab_qbank_backup_${new Date().toISOString().slice(0, 10)}.json`);
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
    link.setAttribute('download', `medlab_qbank_export_${new Date().toISOString().slice(0, 10)}.json`);
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
                unit: item.unit || 'Clinical Chemistry',
                subject: item.subject || 'Clinical Enzymology & Hepatic Function',
                topic: item.topic || 'Transaminases (ALT/AST)',
                subtopic: item.subtopic,
                difficulty: item.difficulty || 'Conceptual',
                examCategories: item.examCategories || ['ASCP', 'NHPC'],
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
            setImportSummary(`Parsed ${drafts.length} questions from ${file.name}. Review and approve below before saving.`);
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
        const drafts = parseCSVToMCQ(reader.result as string, file.name, questions);
        setImportedDrafts(drafts);
        setImportSummary(`Parsed ${drafts.length} questions from ${file.name}. Review and approve below before saving.`);
      };
      reader.readAsText(file);
    }
    if (e.target) e.target.value = '';
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
        unit: d.unit || 'Clinical Chemistry',
        subject: d.subject || 'Clinical Enzymology & Hepatic Function',
        topic: d.topic || 'General Diagnostic Parameters',
        subtopic: d.subtopic,
        difficulty: d.difficulty || 'Conceptual',
        examCategories: d.examCategories.length > 0 ? d.examCategories : ['ASCP', 'NHPC'],
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
          Download standardized import spreadsheets, backup current records, or review and stage bulk questions before saving.
        </p>
      </div>

      {/* Templates & Backup */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900 text-xs">CSV Import Template</h4>
            <p className="text-xs text-slate-500">
              Columns for QuestionStem, Options A-D, AnswerKey, Rationale, and Categories.
            </p>
          </div>
          <button
            onClick={handleDownloadCSVTemplate}
            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900 text-xs">JSON Import Template</h4>
            <p className="text-xs text-slate-500">
              Structured JSON supporting vignettes, tables, and multiple exam tags.
            </p>
          </div>
          <button
            onClick={handleDownloadJSONTemplate}
            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Template</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <h4 className="font-semibold text-slate-900 text-xs">Backup & Restore Database</h4>
            <p className="text-xs text-slate-500">
              Export or restore all {questions.length} question records, categories, and audit histories.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportDatabaseJSON}
              className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
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
              className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center justify-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Upload Filled Batch File
        </h3>

        <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center space-y-2 bg-slate-50/50">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.json"
            className="hidden"
          />
          <p className="text-xs text-slate-600">
            Select a CSV or JSON file containing MCQs to stage and review before importing
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium shadow-xs cursor-pointer"
          >
            Select Batch File
          </button>
        </div>

        {errorBanner && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {importSummary && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSummary}</span>
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
                      <span className="text-slate-600">{draft.unit}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{draft.subject}</span>
                    </div>

                    <div className="flex items-center gap-2">
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
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={editingDraft.unit}
                    onChange={(e) => setEditingDraft({ ...editingDraft, unit: e.target.value })}
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
