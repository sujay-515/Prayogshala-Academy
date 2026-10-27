import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Trash2,
  CheckSquare,
  Square,
  ArrowRight,
  Eye,
  X,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { ExtractedMCQDraft, MCQQuestion, MCQOption, UnitCategory, ExamCategory, DifficultyLevel } from '../../types';
import {
  parseRawMCQText,
  validateExtractedQuestion,
  findDuplicateQuestion,
  generateNextQuestionCode,
} from '../../utils/mcqParser';
import { SAMPLE_MEDICINE_PDF_TEXT } from '../../data/samplePdfs';

interface PdfImportWorkflowProps {
  existingQuestions: MCQQuestion[];
  categories: UnitCategory[];
  onImportApprovedQuestions: (questionsToImport: MCQQuestion[]) => void;
  authToken?: string | null;
}

const STAGED_STORAGE_KEY = 'medlab_qbank_staged_drafts_v1';
const ALL_EXAMS: ExamCategory[] = ['NHPC', 'PSC', 'ASCP', 'DHA', 'AIMS'];

export const PdfImportWorkflow: React.FC<PdfImportWorkflowProps> = ({
  existingQuestions,
  categories,
  onImportApprovedQuestions,
  authToken,
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string>('Clinical_Pathology_Board_Review_2026.pdf');
  const [sourcePreviewText, setSourcePreviewText] = useState<string>(SAMPLE_MEDICINE_PDF_TEXT);
  const [sourcePdfDataUri, setSourcePdfDataUri] = useState<string | null>(null);
  const [showSourceViewer, setShowSourceViewer] = useState<boolean>(false);

  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionWarning, setExtractionWarning] = useState<string | null>(null);
  const [savedPdfs, setSavedPdfs] = useState<{ filename: string; mimeType: string; uploadedAt: string }[]>([]);

  const [stagedQuestions, setStagedQuestions] = useState<ExtractedMCQDraft[]>(() => {
    try {
      const cached = localStorage.getItem(STAGED_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage error
    }
    return [];
  });
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'flagged' | 'ready' | 'selected'>('all');

  const [editingDraft, setEditingDraft] = useState<ExtractedMCQDraft | null>(null);

  const [bulkUnit, setBulkUnit] = useState<string>('');
  const [bulkSubject, setBulkSubject] = useState<string>('');
  const [bulkTopic, setBulkTopic] = useState<string>('');
  const [bulkDifficulty, setBulkDifficulty] = useState<string>('');
  const [bulkExam, setBulkExam] = useState<string>('');

  const [showFinalConfirmation, setShowFinalConfirmation] = useState<boolean>(false);
  const [showClearStagingModal, setShowClearStagingModal] = useState<boolean>(false);
  const [importReport, setImportReport] = useState<{
    importedCount: number;
    stagedRemaining: number;
    auditLog: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authToken || localStorage.getItem('medlab_qbank_auth_token_v1');
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  // Load saved PDFs list and server-side staged drafts on mount
  useEffect(() => {
    const headers = buildAuthHeaders();
    fetch('/api/pdfs', { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (Array.isArray(list)) setSavedPdfs(list);
      })
      .catch(() => {});

    if (stagedQuestions.length === 0) {
      fetch('/api/staging', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && Array.isArray(data.drafts) && data.drafts.length > 0) {
            setStagedQuestions(data.drafts);
            if (data.sourceFilename) setSelectedFileName(data.sourceFilename);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Persist stagedQuestions in localStorage so switching tabs doesn't lose progress
  useEffect(() => {
    try {
      if (stagedQuestions.length > 0) {
        localStorage.setItem(STAGED_STORAGE_KEY, JSON.stringify(stagedQuestions));
      } else {
        localStorage.removeItem(STAGED_STORAGE_KEY);
      }
    } catch {
      // Ignore quota errors
    }
  }, [stagedQuestions]);

  const syncStagingToServer = (drafts: ExtractedMCQDraft[], filename = selectedFileName) => {
    if (drafts.length === 0) {
      fetch('/api/staging', { method: 'DELETE', headers: buildAuthHeaders() }).catch(() => {});
    } else {
      fetch('/api/staging', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          id: 'default-staging',
          sourceFilename: filename,
          drafts,
        }),
      }).catch(() => {});
    }
  };

  const handleStartExtraction = async (textSource: string, customFileName?: string, pdfUri?: string | null) => {
    setIsExtracting(true);
    setImportReport(null);
    setExtractionWarning(null);

    const docName = customFileName || selectedFileName;
    const rawContent = textSource;
    setSelectedFileName(docName);
    setSourcePreviewText(rawContent);
    setSourcePdfDataUri(pdfUri || null);

    if (!rawContent || !rawContent.trim()) {
      setStagedQuestions([]);
      setExtractionWarning(`No readable text content found in "${docName}".`);
      setIsExtracting(false);
      return;
    }

    try {
      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          textContent: rawContent,
          filename: docName,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.drafts)) {
        setStagedQuestions(data.drafts);
        if (data.drafts.length === 0) {
          setExtractionWarning(
            `No structured MCQs were detected in "${docName}". Verify that the document contains numbered questions or A–D answer options.`
          );
        }
      } else {
        const clientParsed = parseRawMCQText(rawContent, docName, existingQuestions);
        setStagedQuestions(clientParsed);
        if (clientParsed.length === 0) {
          setExtractionWarning(
            `No structured MCQs were detected in "${docName}". Verify that the document contains numbered questions or A–D answer options.`
          );
        }
      }
    } catch {
      const clientParsed = parseRawMCQText(rawContent, docName, existingQuestions);
      setStagedQuestions(clientParsed);
      if (clientParsed.length === 0) {
        setExtractionWarning(`No structured MCQs were detected in "${docName}".`);
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLoadStoredPdf = async (filename: string) => {
    setIsExtracting(true);
    setImportReport(null);
    setExtractionWarning(null);
    setSelectedFileName(filename);

    try {
      const pdfRes = await fetch(`/api/pdfs/${encodeURIComponent(filename)}`, {
        headers: buildAuthHeaders(),
      });
      if (!pdfRes.ok) {
        setExtractionWarning(`Could not load stored PDF "${filename}".`);
        setIsExtracting(false);
        return;
      }
      const pdfRecord = await pdfRes.json();
      if (pdfRecord.base64Data) {
        setSourcePdfDataUri(`data:${pdfRecord.mimeType || 'application/pdf'};base64,${pdfRecord.base64Data}`);
        const extractRes = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            pdfBase64: pdfRecord.base64Data,
            filename,
          }),
        });
        const data = await extractRes.json();
        if (data.extractedText) {
          setSourcePreviewText(data.extractedText);
        }
        if (data.success && Array.isArray(data.drafts)) {
          setStagedQuestions(data.drafts);
          if (data.drafts.length === 0) {
            setExtractionWarning(`No structured MCQs were detected in "${filename}".`);
          }
        }
      } else if (pdfRecord.textContent) {
        await handleStartExtraction(pdfRecord.textContent, filename, null);
      }
    } catch {
      setExtractionWarning(`Failed to extract questions from stored PDF "${filename}".`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setSelectedFileName(file.name);
    setImportReport(null);
    setExtractionWarning(null);
    const reader = new FileReader();
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      reader.onload = () => {
        const fullDataUrl = reader.result as string;
        const base64Data = fullDataUrl.split(',')[1];
        setSourcePdfDataUri(fullDataUrl);
        setSourcePreviewText(`[Binary PDF Document: ${file.name}]`);
        setIsExtracting(true);
        fetch('/api/extract-pdf', {
          method: 'POST',
          headers: buildAuthHeaders(),
          body: JSON.stringify({
            pdfBase64: base64Data,
            filename: file.name,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.extractedText) {
              setSourcePreviewText(data.extractedText);
            }
            if (data.success && Array.isArray(data.drafts)) {
              setStagedQuestions(data.drafts);
              if (data.drafts.length === 0) {
                setExtractionWarning(
                  `0 questions extracted from "${file.name}". The PDF may be a scanned image without selectable text or a non-MCQ document.`
                );
              }
            } else {
              setStagedQuestions([]);
              setExtractionWarning(data.error || `Could not extract questions from "${file.name}".`);
            }
            // Refresh saved PDFs list
            fetch('/api/pdfs', { headers: buildAuthHeaders() })
              .then((r) => (r.ok ? r.json() : []))
              .then((list) => {
                if (Array.isArray(list)) setSavedPdfs(list);
              })
              .catch(() => {});
          })
          .catch(() => {
            setStagedQuestions([]);
            setExtractionWarning(`Network or parsing error while extracting "${file.name}".`);
          })
          .finally(() => setIsExtracting(false));
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        handleStartExtraction((reader.result as string) || '', file.name, null);
      };
      reader.readAsText(file);
    }
  };

  const toggleSelectQuestion = (id: string) => {
    setStagedQuestions((prev) => {
      const next = prev.map((q) => (q.id === id ? { ...q, selectedForImport: !q.selectedForImport } : q));
      syncStagingToServer(next);
      return next;
    });
  };

  const selectAll = (select: boolean) => {
    setStagedQuestions((prev) => {
      const next = prev.map((q) => ({ ...q, selectedForImport: select }));
      syncStagingToServer(next);
      return next;
    });
  };

  const handleDeleteDraft = (id: string) => {
    setStagedQuestions((prev) => {
      const next = prev.filter((q) => q.id !== id);
      syncStagingToServer(next);
      return next;
    });
  };

  const handleClearAllStaging = () => {
    setStagedQuestions([]);
    syncStagingToServer([], '');
    setSelectedFileName('Uploaded_Document.pdf');
    setSourcePdfDataUri(null);
    setSourcePreviewText('');
    setShowClearStagingModal(false);
    try {
      localStorage.removeItem(STAGED_STORAGE_KEY);
    } catch {}
  };

  const handleDiscardSelected = () => {
    setStagedQuestions((prev) => {
      const remaining = prev.filter((q) => !q.selectedForImport);
      syncStagingToServer(remaining);
      return remaining;
    });
  };

  const handleSaveDraftChanges = (updated: ExtractedMCQDraft) => {
    const validationErrors = validateExtractedQuestion(updated);
    const duplicate = findDuplicateQuestion(updated.questionText, existingQuestions);
    if (duplicate) {
      validationErrors.push(
        `High similarity (${Math.round(duplicate.similarityScore * 100)}%) with existing question ${duplicate.existingCode}.`
      );
    }

    const finalized: ExtractedMCQDraft = {
      ...updated,
      validationErrors,
      duplicateWarning: duplicate,
    };

    setStagedQuestions((prev) => {
      const next = prev.map((q) => (q.id === finalized.id ? finalized : q));
      syncStagingToServer(next);
      return next;
    });
    setEditingDraft(null);
  };

  const handleApplyBulkCategories = () => {
    setStagedQuestions((prev) => {
      const next = prev.map((q) => {
        if (!q.selectedForImport) return q;
        const updated = { ...q };
        if (bulkUnit) updated.unit = bulkUnit;
        if (bulkSubject) updated.subject = bulkSubject;
        if (bulkTopic.trim()) updated.topic = bulkTopic.trim();
        if (bulkDifficulty) updated.difficulty = bulkDifficulty as DifficultyLevel;
        if (bulkExam && !updated.examCategories.includes(bulkExam as ExamCategory)) {
          updated.examCategories = [...updated.examCategories, bulkExam as ExamCategory];
        }
        updated.validationErrors = validateExtractedQuestion(updated);
        return updated;
      });
      syncStagingToServer(next);
      return next;
    });
  };

  const displayedDrafts = stagedQuestions.filter((q) => {
    if (activeTabFilter === 'flagged') return q.validationErrors.length > 0;
    if (activeTabFilter === 'ready') return q.validationErrors.length === 0;
    if (activeTabFilter === 'selected') return q.selectedForImport;
    return true;
  });

  const selectedDrafts = stagedQuestions.filter((q) => q.selectedForImport);
  const selectedCount = selectedDrafts.length;
  const flaggedCount = stagedQuestions.filter((q) => q.validationErrors.length > 0).length;
  const incompleteSelectedDrafts = selectedDrafts.filter(
    (q) => !q.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(q.correctAnswer) || q.options.length < 2
  );

  const bulkUnitObj = categories.find((c) => c.name === bulkUnit);
  const bulkSubjectsList = bulkUnitObj?.subjects || [];

  const handleDeselectIncomplete = () => {
    setStagedQuestions((prev) => {
      const next = prev.map((q) => {
        if (!q.selectedForImport) return q;
        const isIncomplete =
          !q.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(q.correctAnswer) || q.options.length < 2;
        return isIncomplete ? { ...q, selectedForImport: false } : q;
      });
      syncStagingToServer(next);
      return next;
    });
  };

  const handleExecuteImport = () => {
    const selected = stagedQuestions.filter((q) => q.selectedForImport);
    if (selected.length === 0) return;

    const timestamp = new Date().toISOString();
    const defaultUnit = categories[0]?.name || 'Clinical Chemistry';
    const defaultSubject = categories[0]?.subjects[0]?.name || 'Clinical Enzymology & Hepatic Function';
    const defaultTopic = categories[0]?.subjects[0]?.topics[0] || 'Transaminases (ALT/AST)';

    const importedMCQs: MCQQuestion[] = selected.map((d, index) => {
      const validAnswer = (
        ['A', 'B', 'C', 'D', 'E'].includes(d.correctAnswer) ? d.correctAnswer : d.options[0]?.id || 'A'
      ) as 'A' | 'B' | 'C' | 'D' | 'E';

      return {
        id: `lab-${Date.now()}-${index + 1}`,
        code: generateNextQuestionCode(existingQuestions, index),
        questionText: d.questionText,
        options: d.options,
        correctAnswer: validAnswer,
        explanation:
          d.explanation ||
          `Correct Answer: Option ${validAnswer}. Verify clinical rationale before publishing.`,
        reference: d.reference || `Extracted from ${d.sourceDocument}`,
        clinicalCase: d.clinicalCase,
        tableData: d.tableData,
        imageUrl: d.imageUrl,
        unit: d.unit || defaultUnit,
        subject: d.subject || defaultSubject,
        topic: d.topic || defaultTopic,
        subtopic: d.subtopic,
        difficulty: d.difficulty || 'Conceptual',
        examCategories: d.examCategories.length > 0 ? d.examCategories : ['ASCP', 'NHPC'],
        status: 'Draft',
        sourceDocument: d.sourceDocument,
        pageNumber: d.pageNumber,
        createdAt: timestamp,
        updatedAt: timestamp,
        versionHistory: [
          {
            timestamp,
            author: 'Administrator (PDF Ingestion Workflow)',
            action: `Extracted and imported from ${d.sourceDocument}`,
          },
        ],
      };
    });

    onImportApprovedQuestions(importedMCQs);

    const remaining = stagedQuestions.filter((q) => !q.selectedForImport);
    setStagedQuestions(remaining);
    syncStagingToServer(remaining);
    setShowFinalConfirmation(false);

    setImportReport({
      importedCount: importedMCQs.length,
      stagedRemaining: remaining.length,
      auditLog: [
        `${importedMCQs.length} questions imported as unpublished Drafts.`,
        `${remaining.length} questions skipped or remaining in staging for further review.`,
        `Preserved original PDF source traceability for ${selectedFileName}.`,
      ],
    });
  };

  const editingUnitObj = editingDraft
    ? categories.find((c) => c.name === editingDraft.unit)
    : undefined;
  const editingSubjectsList = editingUnitObj?.subjects || [];

  const handleAddOptionToEditingDraft = () => {
    if (!editingDraft || editingDraft.options.length >= 5) return;
    const usedIds = new Set(editingDraft.options.map((o) => o.id));
    const nextId = (['A', 'B', 'C', 'D', 'E'] as const).find((id) => !usedIds.has(id));
    if (!nextId) return;
    const nextOptions: MCQOption[] = [...editingDraft.options, { id: nextId, text: '' }].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    setEditingDraft({ ...editingDraft, options: nextOptions });
  };

  const handleRemoveOptionFromEditingDraft = (idToRemove: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (!editingDraft || editingDraft.options.length <= 2) return;
    const nextOptions = editingDraft.options.filter((o) => o.id !== idToRemove);
    const nextCorrect = editingDraft.correctAnswer === idToRemove ? '' : editingDraft.correctAnswer;
    setEditingDraft({ ...editingDraft, options: nextOptions, correctAnswer: nextCorrect });
  };

  return (
    <div className="space-y-6">
      {/* 10-Stage Pipeline Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-800">PDF Ingestion Pipeline</span>
          <span>10-Stage Audited Workflow</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs text-slate-600">
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="font-bold block text-slate-800">1–2</span> Upload & OCR
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="font-bold block text-slate-800">3–4</span> Structure & Category
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="font-bold block text-slate-800">5–6</span> Review & Edit
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="font-bold block text-slate-800">7–8</span> Validate & Select
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-200">
            <span className="font-bold block text-slate-800">9–10</span> Import & Verify
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Upload PDF Document</h3>
          <p className="text-xs text-slate-500">
            Upload selectable or scanned question papers, answer keys, and syllabus documents.
          </p>
        </div>

        <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center space-y-3 bg-slate-50/50 transition-colors">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.txt,.md,.json"
            className="hidden"
          />
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />

          <div className="text-xs text-slate-600">
            Select a PDF from your computer, re-open a stored PDF, or test with the built-in clinical sample
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-md shadow-xs cursor-pointer"
            >
              Browse Local PDF File
            </button>

            <button
              onClick={() =>
                handleStartExtraction(
                  SAMPLE_MEDICINE_PDF_TEXT,
                  'Clinical_Pathology_Board_Review_2026.pdf',
                  null
                )
              }
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-xs cursor-pointer"
            >
              Load Sample Clinical Exam PDF
            </button>

            {savedPdfs.map((pdf) => (
              <button
                key={pdf.filename}
                onClick={() => handleLoadStoredPdf(pdf.filename)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer"
                title={`Uploaded ${new Date(pdf.uploadedAt).toLocaleString()}`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                <span>Load {pdf.filename}</span>
              </button>
            ))}
          </div>
        </div>

        {isExtracting && (
          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs text-slate-600 text-center">
            Processing document and extracting MCQ records...
          </div>
        )}

        {extractionWarning && !isExtracting && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Extraction Notice</span>
                <span>{extractionWarning}</span>
              </div>
            </div>
            <button
              onClick={() => setExtractionWarning(null)}
              className="text-amber-700 hover:text-amber-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Import Verification Report */}
      {importReport && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-5 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Step 10: Import Verification Complete</span>
          </div>
          <div className="text-emerald-950">
            <strong>{importReport.importedCount}</strong> questions successfully saved to the SQLite database with status{' '}
            <strong>Draft (Unpublished)</strong>.{' '}
            {importReport.stagedRemaining > 0 && (
              <span>
                <strong>{importReport.stagedRemaining}</strong> skipped/remaining records require further attention.
              </span>
            )}
          </div>
          <ul className="text-emerald-800 list-disc pl-4 space-y-0.5">
            {importReport.auditLog.map((log, i) => (
              <li key={i}>{log}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Staging & Review Queue */}
      {stagedQuestions.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Staged Question Queue ({stagedQuestions.length})
              </h3>
              <p className="text-xs text-slate-500">
                Questions remain unpublished until approved. Review against original source, correct, or bulk-categorize.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowSourceViewer(!showSourceViewer)}
                className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 cursor-pointer ${
                  showSourceViewer
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showSourceViewer ? 'Hide Source PDF' : 'Compare with Source'}</span>
              </button>

              <button
                onClick={() => selectAll(true)}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Select all questions for import"
              >
                <CheckSquare className="w-3.5 h-3.5 text-slate-700" />
                <span>Select All ({stagedQuestions.length})</span>
              </button>

              <button
                onClick={() => selectAll(false)}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                title="Clear selection so no questions are imported"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear Selection</span>
              </button>

              <button
                onClick={() => setShowClearStagingModal(true)}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-700 border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Discard all staged questions and cancel this PDF import"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Discard Staged PDF</span>
              </button>

              <button
                disabled={selectedCount === 0}
                onClick={() => setShowFinalConfirmation(true)}
                className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Import Selected ({selectedCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Source PDF / Text Side-by-Side Traceability Viewer */}
          {showSourceViewer && (
            <div className="bg-slate-50 border border-slate-300 rounded p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span className="font-semibold text-slate-900">
                    Preserved Source Document: {selectedFileName}
                  </span>
                </div>
                <button
                  onClick={() => setShowSourceViewer(false)}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Close Viewer
                </button>
              </div>
              {sourcePdfDataUri ? (
                <iframe
                  src={sourcePdfDataUri}
                  title="Original PDF Reference"
                  className="w-full h-80 rounded border border-slate-200 bg-white"
                />
              ) : (
                <pre className="w-full max-h-64 overflow-y-auto p-3 rounded border border-slate-200 bg-white text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {sourcePreviewText}
                </pre>
              )}
            </div>
          )}

          {/* Bulk Assign Row (Unit, Subject, Topic, Difficulty, Exam) */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-700">
              Bulk Categorize ({selectedCount} selected):
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkUnit}
                onChange={(e) => {
                  setBulkUnit(e.target.value);
                  setBulkSubject('');
                }}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
              >
                <option value="">Assign Unit...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {bulkSubjectsList.length > 0 && (
                <select
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
                >
                  <option value="">Assign Subject...</option>
                  {bulkSubjectsList.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={bulkTopic}
                onChange={(e) => setBulkTopic(e.target.value)}
                placeholder="Assign Topic..."
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs w-full sm:w-32"
              />

              <select
                value={bulkDifficulty}
                onChange={(e) => setBulkDifficulty(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
              >
                <option value="">Difficulty...</option>
                <option value="Memory-based">Memory-based</option>
                <option value="Conceptual">Conceptual</option>
                <option value="Advanced">Advanced</option>
              </select>

              <select
                value={bulkExam}
                onChange={(e) => setBulkExam(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
              >
                <option value="">Add Exam Category...</option>
                {ALL_EXAMS.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>

              <button
                disabled={
                  selectedCount === 0 ||
                  (!bulkUnit && !bulkSubject && !bulkTopic.trim() && !bulkDifficulty && !bulkExam)
                }
                onClick={handleApplyBulkCategories}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded text-xs font-medium cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Subtabs for filter */}
          <div className="flex items-center justify-between gap-1.5 text-xs pb-1 border-b border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveTabFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTabFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({stagedQuestions.length})
              </button>
              <button
                onClick={() => setActiveTabFilter('flagged')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTabFilter === 'flagged'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Flagged ({flaggedCount})
              </button>
              <button
                onClick={() => setActiveTabFilter('ready')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTabFilter === 'ready'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Ready ({stagedQuestions.length - flaggedCount})
              </button>
              <button
                onClick={() => setActiveTabFilter('selected')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  activeTabFilter === 'selected'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Selected ({selectedCount})
              </button>
            </div>

            {selectedCount > 0 && selectedCount < stagedQuestions.length && (
              <button
                onClick={handleDiscardSelected}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
              >
                Remove {selectedCount} selected from staging
              </button>
            )}
          </div>

          {/* Staged Question Cards */}
          <div className="space-y-3">
            {displayedDrafts.map((draft) => {
              const hasErrors = draft.validationErrors.length > 0;

              return (
                <div
                  key={draft.id}
                  className={`bg-white rounded-lg p-4 border text-xs space-y-2.5 transition-all ${
                    draft.selectedForImport ? 'border-slate-400 shadow-xs' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleSelectQuestion(draft.id)}
                        className="text-slate-700 cursor-pointer"
                      >
                        {draft.selectedForImport ? (
                          <CheckSquare className="w-4 h-4 text-slate-900" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <span className="font-semibold text-slate-900">{draft.tempCode}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-700 font-medium">{draft.unit}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{draft.subject}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{draft.topic}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">{draft.difficulty}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingDraft(draft)}
                        className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Discard"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {hasErrors && (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 space-y-0.5">
                      <div className="flex items-center gap-1 font-semibold text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Validation Notice:</span>
                      </div>
                      <ul className="list-disc pl-4 text-xs">
                        {draft.validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {draft.clinicalCase && (
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-700 italic">
                      <span className="font-semibold not-italic text-slate-800">Clinical Case: </span>
                      {draft.clinicalCase}
                    </div>
                  )}

                  <p className="font-medium text-slate-900 leading-snug">{draft.questionText}</p>

                  {draft.imageUrl && (
                    <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded text-center">
                      <img
                        src={draft.imageUrl}
                        alt={`Extracted specimen image for ${draft.tempCode}`}
                        className="max-h-60 max-w-full mx-auto object-contain rounded border border-slate-200 bg-white"
                      />
                    </div>
                  )}

                  {draft.tableData && draft.tableData.rows.length > 0 && (
                    <div className="overflow-x-auto border border-slate-200 rounded">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200">
                            {draft.tableData.headers.map((h, i) => (
                              <th key={i} className="py-1.5 px-2.5 font-semibold text-slate-700">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {draft.tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="py-1 px-2.5 text-slate-700">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {draft.options.map((opt) => {
                      const isCorrect = opt.id === draft.correctAnswer;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded border flex items-start gap-1.5 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                              : 'bg-slate-50/60 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-semibold">{opt.id}.</span>
                          <span>{opt.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {draft.explanation && (
                    <div className="p-2 rounded bg-slate-50 border border-slate-100 text-xs text-slate-600">
                      <strong className="text-slate-700">Rationale: </strong>
                      {draft.explanation}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                    <div>
                      <strong className="text-slate-800">Answer Key: </strong>
                      {draft.correctAnswer || 'None'}
                    </div>
                    <div>Source: {draft.sourceDocument}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Staged Draft Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded p-4 sm:p-6 shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">
                Edit Extracted Question ({editingDraft.tempCode})
              </h3>
              <button
                onClick={() => setEditingDraft(null)}
                className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Question Stem</label>
                <textarea
                  rows={3}
                  value={editingDraft.questionText}
                  onChange={(e) => setEditingDraft({ ...editingDraft, questionText: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Clinical Case Vignette (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingDraft.clinicalCase || ''}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, clinicalCase: e.target.value || undefined })
                  }
                  placeholder="Optional patient presentation or laboratory scenario..."
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={editingDraft.unit}
                    onChange={(e) => {
                      const nextUnit = e.target.value;
                      const unitObj = categories.find((c) => c.name === nextUnit);
                      const nextSubject = unitObj?.subjects[0]?.name || editingDraft.subject;
                      const nextTopic = unitObj?.subjects[0]?.topics[0] || editingDraft.topic;
                      setEditingDraft({
                        ...editingDraft,
                        unit: nextUnit,
                        subject: nextSubject,
                        topic: nextTopic,
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  >
                    {!categories.some((c) => c.name === editingDraft.unit) && editingDraft.unit && (
                      <option value={editingDraft.unit}>{editingDraft.unit}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  {editingSubjectsList.length > 0 ? (
                    <select
                      value={editingDraft.subject}
                      onChange={(e) => setEditingDraft({ ...editingDraft, subject: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    >
                      {!editingSubjectsList.some((s) => s.name === editingDraft.subject) &&
                        editingDraft.subject && (
                          <option value={editingDraft.subject}>{editingDraft.subject}</option>
                        )}
                      {editingSubjectsList.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingDraft.subject}
                      onChange={(e) => setEditingDraft({ ...editingDraft, subject: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Topic</label>
                  <input
                    type="text"
                    value={editingDraft.topic}
                    onChange={(e) => setEditingDraft({ ...editingDraft, topic: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subtopic (Optional)</label>
                  <input
                    type="text"
                    value={editingDraft.subtopic || ''}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, subtopic: e.target.value || undefined })
                    }
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">Answer Options</label>
                  {editingDraft.options.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddOptionToEditingDraft}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  )}
                </div>
                {editingDraft.options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="w-4 font-bold text-slate-500">{opt.id}</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...editingDraft.options];
                        newOpts[idx] = { ...opt, text: e.target.value };
                        setEditingDraft({ ...editingDraft, options: newOpts });
                      }}
                      className="flex-1 bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    />
                    {editingDraft.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionFromEditingDraft(opt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title={`Remove Option ${opt.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Answer Key</label>
                  <select
                    value={editingDraft.correctAnswer}
                    onChange={(e) => setEditingDraft({ ...editingDraft, correctAnswer: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  >
                    <option value="">Select...</option>
                    {editingDraft.options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
                  <select
                    value={editingDraft.difficulty}
                    onChange={(e) => setEditingDraft({ ...editingDraft, difficulty: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  >
                    <option value="Memory-based">Memory-based</option>
                    <option value="Conceptual">Conceptual</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Licensing Exams</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_EXAMS.map((exam) => {
                    const active = editingDraft.examCategories.includes(exam);
                    return (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => {
                          const nextExams = active
                            ? editingDraft.examCategories.filter((e) => e !== exam)
                            : [...editingDraft.examCategories, exam];
                          setEditingDraft({ ...editingDraft, examCategories: nextExams });
                        }}
                        className={`px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {exam}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Explanation</label>
                <textarea
                  rows={3}
                  value={editingDraft.explanation}
                  onChange={(e) => setEditingDraft({ ...editingDraft, explanation: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference</label>
                  <input
                    type="text"
                    value={editingDraft.reference}
                    onChange={(e) => setEditingDraft({ ...editingDraft, reference: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Diagnostic Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editingDraft.imageUrl || ''}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, imageUrl: e.target.value || undefined })
                    }
                    placeholder="https://... or data:image/..."
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  />
                  {editingDraft.imageUrl && (
                    <div className="mt-2 p-1.5 border border-slate-200 rounded bg-slate-50 text-center">
                      <img
                        src={editingDraft.imageUrl}
                        alt="Specimen figure preview"
                        className="max-h-36 max-w-full mx-auto object-contain rounded bg-white border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingDraft(null)}
                className="px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveDraftChanges(editingDraft)}
                className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-medium cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Submission Modal */}
      {showFinalConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded p-6 shadow-xl space-y-4">
            <h3 className="font-semibold text-slate-900 text-base">Confirm Import</h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Import <strong className="text-slate-900">{selectedCount}</strong> selected questions into the SQLite database as{' '}
              <strong>Drafts (Unpublished)</strong>.
            </p>

            {incompleteSelectedDrafts.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">
                      {incompleteSelectedDrafts.length} selected question(s) are missing an answer key or options
                    </span>
                    <span className="text-xs">
                      Codes: {incompleteSelectedDrafts.map((d) => d.tempCode).join(', ')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeselectIncomplete}
                  className="px-2.5 py-1 rounded bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium cursor-pointer"
                >
                  Deselect Incomplete Questions ({incompleteSelectedDrafts.length})
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowFinalConfirmation(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={selectedCount === 0}
                onClick={handleExecuteImport}
                className="px-4 py-1.5 rounded bg-slate-900 disabled:opacity-40 text-white text-xs font-medium cursor-pointer"
              >
                Import {selectedCount} questions
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearStagingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-8 h-8 rounded bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-base">Discard Staged PDF?</h3>
                <p className="text-xs text-slate-500">Document: {selectedFileName}</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you do not want to import this PDF? This will remove all{' '}
              <strong className="text-slate-900">{stagedQuestions.length}</strong> staged drafts from the review queue and clear the staging cache.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowClearStagingModal(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllStaging}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
              >
                Discard document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
