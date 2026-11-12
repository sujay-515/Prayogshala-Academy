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
  ChevronDown,
  Maximize2,
  Minimize2,
  ExternalLink,
  Columns2,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ChevronUp,
  Upload,
  GraduationCap,
  Layers,
  BookOpen,
  Tag,
} from 'lucide-react';
import { ExtractedMCQDraft, MCQQuestion, MCQOption, UnitCategory, ExamCategory, DifficultyLevel } from '../../types';
import { getSafeImageUrl, getSafePdfUri } from '../../utils/urlSecurity';
import {
  parseRawMCQText,
  validateExtractedQuestion,
  findDuplicateQuestion,
  generateNextQuestionCode,
} from '../../utils/mcqParser';
import { SAMPLE_MEDICINE_PDF_TEXT } from '../../data/samplePdfs';
import { formatExamCategories, GENERAL_EXAM_LABEL, normalizeExamCategories } from '../../utils/examCategories';
import { Modal } from '../common/Modal';

interface PdfImportWorkflowProps {
  existingQuestions: MCQQuestion[];
  categories: UnitCategory[];
  onImportApprovedQuestions: (questionsToImport: MCQQuestion[]) => void;
  authToken?: string | null;
  onCompareModeChange?: (isCompareMode: boolean) => void;
  initialUploadMode?: 'mock' | 'subject';
}

const STAGED_STORAGE_KEY = 'prayogshala_staged_drafts_v1';
const ALL_EXAMS: ExamCategory[] = ['NHPC', 'PSC', 'ASCP', 'DHA', 'AIMS', 'CEE-UG'];

export const PdfImportWorkflow: React.FC<PdfImportWorkflowProps> = ({
  existingQuestions,
  categories,
  onImportApprovedQuestions,
  authToken,
  onCompareModeChange,
  initialUploadMode = 'mock',
}) => {
  const [uploadMode, setUploadMode] = useState<'mock' | 'subject'>(initialUploadMode);

  // Mock Test Mode parameters
  const [mockExamCategory, setMockExamCategory] = useState<string>('CEE-UG');
  const [mockPaperTitle, setMockPaperTitle] = useState<string>('CEE-UG Entrance Mock 2026');

  // Subject-Wise Mode parameters
  const [subjectUnit, setSubjectUnit] = useState<string>(categories[0]?.name || 'Clinical Chemistry');
  const activeSubjectObj = categories.find((c) => c.name === subjectUnit) || categories[0];
  const unitSubjects = activeSubjectObj?.units || activeSubjectObj?.subjects || [];
  const [subjectName, setSubjectName] = useState<string>(unitSubjects[0]?.name || 'Clinical Enzymology & Hepatic Function');
  const activeUnitObj = unitSubjects.find((s) => s.name === subjectName) || unitSubjects[0];
  const subjectTopics = activeUnitObj?.topics || [];
  const [subjectTopic, setSubjectTopic] = useState<string>(subjectTopics[0] || '');

  const handleUnitChange = (newSubject: string) => {
    setSubjectUnit(newSubject);
    const sObj = categories.find((c) => c.name === newSubject);
    const units = sObj?.units || sObj?.subjects || [];
    const firstUnit = units[0]?.name || '';
    setSubjectName(firstUnit);
    setSubjectTopic(units[0]?.topics?.[0] || '');
  };

  const handleSubjectChange = (newUnit: string) => {
    setSubjectName(newUnit);
    const uObj = unitSubjects.find((s) => s.name === newUnit);
    setSubjectTopic(uObj?.topics?.[0] || '');
  };

  useEffect(() => {
    if (initialUploadMode) {
      setUploadMode(initialUploadMode);
    }
  }, [initialUploadMode]);
  const [selectedFileName, setSelectedFileName] = useState<string>('Clinical_Pathology_Board_Review_2026.pdf');
  const [sourcePreviewText, setSourcePreviewText] = useState<string>(SAMPLE_MEDICINE_PDF_TEXT);
  const [sourcePdfDataUri, setSourcePdfDataUri] = useState<string | null>(null);
  const [showSourceViewer, setShowSourceViewer] = useState<boolean>(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState<boolean>(false);
  const [splitRatio, setSplitRatio] = useState<'50-50' | '60-40' | '70-30'>('60-40');
  const [highlightedDraftId, setHighlightedDraftId] = useState<string | null>(null);
  const [textFilterQuery, setTextFilterQuery] = useState<string>('');
  const [showPdfInEditModal, setShowPdfInEditModal] = useState<boolean>(true);
  const [isUploadSectionOpen, setIsUploadSectionOpen] = useState<boolean>(false);
  const [showBulkTools, setShowBulkTools] = useState<boolean>(false);

  useEffect(() => {
    onCompareModeChange?.(showSourceViewer);
    return () => {
      onCompareModeChange?.(false);
    };
  }, [showSourceViewer, onCompareModeChange]);

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
  const [bulkExams, setBulkExams] = useState<ExamCategory[]>([]);
  const [bulkClearExams, setBulkClearExams] = useState<boolean>(false);
  const [isBulkExamDropdownOpen, setIsBulkExamDropdownOpen] = useState<boolean>(false);
  const bulkExamDropdownRef = useRef<HTMLDivElement>(null);

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
    const token = authToken || localStorage.getItem('prayogshala_auth_token_v1');
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

  const applyUploadModeToDrafts = (drafts: ExtractedMCQDraft[]): ExtractedMCQDraft[] => {
    return drafts.map((d) => {
      if (uploadMode === 'mock') {
        const rawExams = d.examCategories || [];
        const nextExams =
          rawExams.length > 0
            ? rawExams
            : mockExamCategory !== 'General'
            ? [mockExamCategory as ExamCategory]
            : [];
        return {
          ...d,
          examCategories: nextExams,
          pastPaper: d.pastPaper || mockPaperTitle.trim() || undefined,
        };
      } else {
        return {
          ...d,
          subject: d.subject || subjectUnit,
          unit: d.unit || subjectName,
          topic: d.topic || subjectTopic || d.topic,
        };
      }
    });
  };

  const handleApplyCurrentModeToAllStaged = () => {
    if (stagedQuestions.length === 0) return;
    const updated = applyUploadModeToDrafts(stagedQuestions);
    setStagedQuestions(updated);
    syncStagingToServer(updated);
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
        const tailored = applyUploadModeToDrafts(data.drafts);
        setStagedQuestions(tailored);
        syncStagingToServer(tailored);
        if (tailored.length > 0) {
          setIsUploadSectionOpen(false);
        }
        if (data.drafts.length === 0) {
          setExtractionWarning(
            `No structured MCQs were detected in "${docName}". Verify that the document contains numbered questions or A–D answer options.`
          );
        }
      } else {
        const clientParsed = parseRawMCQText(rawContent, docName, existingQuestions);
        const tailored = applyUploadModeToDrafts(clientParsed);
        setStagedQuestions(tailored);
        syncStagingToServer(tailored);
        if (tailored.length > 0) {
          setIsUploadSectionOpen(false);
        }
        if (clientParsed.length === 0) {
          setExtractionWarning(
            `No structured MCQs were detected in "${docName}". Verify that the document contains numbered questions or A–D answer options.`
          );
        }
      }
    } catch {
      const clientParsed = parseRawMCQText(rawContent, docName, existingQuestions);
      const tailored = applyUploadModeToDrafts(clientParsed);
      setStagedQuestions(tailored);
      syncStagingToServer(tailored);
      if (tailored.length > 0) {
        setIsUploadSectionOpen(false);
      }
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
          const tailored = applyUploadModeToDrafts(data.drafts);
          setStagedQuestions(tailored);
          syncStagingToServer(tailored);
          if (tailored.length > 0) {
            setIsUploadSectionOpen(false);
          }
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
              const tailored = applyUploadModeToDrafts(data.drafts);
              setStagedQuestions(tailored);
              syncStagingToServer(tailored);
              if (tailored.length > 0) {
                setIsUploadSectionOpen(false);
              }
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
        if (bulkSubject) updated.subject = bulkSubject;
        if (bulkUnit) updated.unit = bulkUnit;
        if (bulkTopic.trim()) updated.topic = bulkTopic.trim();
        if (bulkDifficulty) updated.difficulty = bulkDifficulty as DifficultyLevel;
        if (bulkClearExams) {
          // Explicitly strip examination tags so the question becomes "General".
          updated.examCategories = [];
        } else if (bulkExams.length > 0) {
          const currentExams = new Set(updated.examCategories || []);
          bulkExams.forEach((ex) => currentExams.add(ex));
          updated.examCategories = Array.from(currentExams);
        }
        updated.validationErrors = validateExtractedQuestion(updated);
        return updated;
      });
      syncStagingToServer(next);
      return next;
    });
    setBulkClearExams(false);
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

  const bulkSubjectObj = categories.find((c) => c.name === bulkSubject);
  const bulkUnitsList = bulkSubjectObj?.units || bulkSubjectObj?.subjects || [];

  const openDocumentInNewTab = () => {
    if (sourcePdfDataUri) {
      try {
        if (sourcePdfDataUri.startsWith('data:')) {
          const parts = sourcePdfDataUri.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
          const binaryStr = atob(parts[1]);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: mime });
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          return;
        }
        window.open(sourcePdfDataUri, '_blank');
      } catch {
        window.open(sourcePdfDataUri, '_blank');
      }
    } else if (sourcePreviewText) {
      const blob = new Blob([sourcePreviewText], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    }
  };

  const scrollToQuestion = (draftId: string) => {
    const el = document.getElementById(`staged-card-${draftId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedDraftId(draftId);
      setTimeout(() => {
        setHighlightedDraftId((current) => (current === draftId ? null : current));
      }, 2500);
    }
  };

  const jumpToRelativeQuestion = (direction: 'prev' | 'next') => {
    if (displayedDrafts.length === 0) return;
    const currentIdx = highlightedDraftId
      ? displayedDrafts.findIndex((d) => d.id === highlightedDraftId)
      : -1;
    let nextIdx = 0;
    if (direction === 'prev') {
      nextIdx = currentIdx > 0 ? currentIdx - 1 : displayedDrafts.length - 1;
    } else {
      nextIdx = currentIdx >= 0 && currentIdx < displayedDrafts.length - 1 ? currentIdx + 1 : 0;
    }
    const targetDraft = displayedDrafts[nextIdx];
    if (targetDraft) {
      scrollToQuestion(targetDraft.id);
    }
  };

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
        ['A', 'B', 'C', 'D', 'E'].includes(d.correctAnswer) ? d.correctAnswer : ''
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
        examCategories: normalizeExamCategories(d.examCategories),
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

  const editingSubjectObj = editingDraft
    ? categories.find((c) => c.name === editingDraft.subject)
    : undefined;
  const editingUnitsList = editingSubjectObj?.units || editingSubjectObj?.subjects || [];

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

  const renderSourceViewerPanel = () => (
    <div
      className={`h-full min-h-0 flex flex-col bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden ${
        splitRatio === '70-30'
          ? 'lg:col-span-8'
          : splitRatio === '60-40'
          ? 'lg:col-span-7'
          : 'lg:col-span-6'
      }`}
    >
      {/* Panel Header */}
      <div className="bg-slate-900 text-white px-3 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-white truncate max-w-[170px] sm:max-w-xs" title={selectedFileName}>
            {selectedFileName}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700 shrink-0 font-medium">
            {sourcePdfDataUri ? 'Original PDF' : 'Extracted Text'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Split Ratio Selector on desktop */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded p-0.5 border border-slate-700 text-[10px]">
            <button
              type="button"
              onClick={() => setSplitRatio('50-50')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                splitRatio === '50-50' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Split 50% PDF / 50% Questions"
            >
              50:50
            </button>
            <button
              type="button"
              onClick={() => setSplitRatio('60-40')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                splitRatio === '60-40' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Wider PDF (60% PDF / 40% Questions)"
            >
              60:40
            </button>
            <button
              type="button"
              onClick={() => setSplitRatio('70-30')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                splitRatio === '70-30' ? 'bg-cyan-700 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
              title="Large PDF (70% PDF / 30% Questions)"
            >
              70:30 (Large)
            </button>
          </div>

          {/* Open in New Window/Tab */}
          <button
            type="button"
            onClick={openDocumentInNewTab}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
            title="Open original document in a new browser tab for dual monitors or browser zoom/search"
          >
            <ExternalLink className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">New Tab</span>
          </button>

          {/* Fullscreen Modal Toggle */}
          <button
            type="button"
            onClick={() => setIsPdfFullscreen(true)}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
            title="Maximize PDF to fullscreen overlay"
          >
            <Maximize2 className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          {/* Close Comparison Viewer */}
          <button
            type="button"
            onClick={() => setShowSourceViewer(false)}
            className="p-1 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700 cursor-pointer transition-colors"
            title="Close comparison viewer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Panel Viewer Body */}
      <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden bg-slate-100 flex flex-col">
        {getSafePdfUri(sourcePdfDataUri) ? (
          <iframe
            src={getSafePdfUri(sourcePdfDataUri)!}
            title="Original PDF Reference"
            className="w-full h-full flex-1 min-h-0 block border-0 bg-white"
            style={{ width: '100%', height: '100%', minHeight: '100%' }}
          />
        ) : (
          <div className="flex flex-col h-full w-full">
            <div className="p-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={textFilterQuery}
                onChange={(e) => setTextFilterQuery(e.target.value)}
                placeholder="Find question text or key terms in extracted source..."
                className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-cyan-500"
              />
              {textFilterQuery && (
                <button
                  type="button"
                  onClick={() => setTextFilterQuery('')}
                  className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <pre className="w-full flex-1 min-h-0 p-3.5 overflow-y-auto text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
              {sourcePreviewText}
            </pre>
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="shrink-0 p-1.5 px-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PDF scroll box (scrollable independently)</span>
        </div>
        <button
          type="button"
          onClick={openDocumentInNewTab}
          className="text-cyan-700 hover:text-cyan-900 font-medium cursor-pointer"
        >
          Pop out ↗
        </button>
      </div>
    </div>
  );

  const renderUnifiedControlsBar = () => (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-1 border-b border-slate-100">
      {/* Left: Filter tabs + Bulk categorize toggle */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
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
          type="button"
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
          type="button"
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
          type="button"
          onClick={() => setActiveTabFilter('selected')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
            activeTabFilter === 'selected'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Selected ({selectedCount})
        </button>

        <span className="text-slate-200">|</span>

        <button
          type="button"
          onClick={() => setShowBulkTools((prev) => !prev)}
          className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
            showBulkTools
              ? 'bg-slate-100 text-slate-800 border-slate-300'
              : 'text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
          title="Toggle bulk unit/subject/topic categorization tool"
        >
          <SlidersHorizontal className="w-3 h-3 text-slate-600" />
          <span>Bulk Categorize</span>
          {showBulkTools ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
        </button>

        {selectedCount > 0 && selectedCount < stagedQuestions.length && (
          <button
            type="button"
            onClick={handleDiscardSelected}
            className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer ml-1"
          >
            Remove {selectedCount}
          </button>
        )}
      </div>

      {/* Right: Compact Fast Navigator */}
      <div className="flex items-center gap-1.5 ml-auto">
        <span className="text-slate-500 text-[11px] font-medium hidden sm:inline">Jump:</span>
        <select
          value={highlightedDraftId || ''}
          onChange={(e) => {
            if (e.target.value) scrollToQuestion(e.target.value);
          }}
          className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs max-w-[150px] sm:max-w-[200px] truncate cursor-pointer"
        >
          <option value="">#{1}–#{displayedDrafts.length}...</option>
          {displayedDrafts.map((d, i) => (
            <option key={d.id} value={d.id}>
              #{i + 1}: {d.questionText.slice(0, 36)}...
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => jumpToRelativeQuestion('prev')}
          className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 cursor-pointer"
          title="Previous question"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => jumpToRelativeQuestion('next')}
          className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 cursor-pointer"
          title="Next question"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  const renderBulkAssignRow = () => (
    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-slate-700">
        Bulk Categorize ({selectedCount} selected):
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={bulkSubject}
          onChange={(e) => {
            setBulkSubject(e.target.value);
            setBulkUnit('');
          }}
          className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
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
            value={bulkUnit}
            onChange={(e) => setBulkUnit(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs"
          >
            <option value="">Assign Unit...</option>
            {bulkUnitsList.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
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

        <div className="relative" ref={bulkExamDropdownRef}>
          <button
            type="button"
            onClick={() => setIsBulkExamDropdownOpen((prev) => !prev)}
            title="Examination categories are optional — leave empty for General questions"
            className={`bg-white border ${
              bulkExams.length > 0 || bulkClearExams ? 'border-slate-400 bg-slate-50/50' : 'border-slate-300'
            } rounded px-2.5 py-1 text-slate-800 text-xs flex items-center justify-between gap-1.5 hover:border-slate-400 focus:outline-none transition-colors cursor-pointer min-w-[170px]`}
          >
            <span className="truncate max-w-[145px] text-left">
              {bulkClearExams ? (
                <span className="font-medium text-slate-900">General (no exam tag)</span>
              ) : bulkExams.length === 0 ? (
                <span className="text-slate-600">Add Exam Category...</span>
              ) : (
                <span className="font-medium text-slate-900">
                  {bulkExams.length === ALL_EXAMS.length
                    ? 'All Exam Categories'
                    : bulkExams.join(', ')}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {(bulkExams.length > 0 || bulkClearExams) && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setBulkExams([]);
                    setBulkClearExams(false);
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
                <span className="font-semibold text-slate-700 text-[11px]">Select Categories (Optional)</span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkExams([...ALL_EXAMS]);
                      setBulkClearExams(false);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkExams([]);
                      setBulkClearExams(false);
                    }}
                    className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <label
                className={`flex items-start justify-between px-2 py-1.5 mb-1 rounded cursor-pointer transition-colors ${
                  bulkClearExams ? 'bg-slate-100 font-medium text-slate-900' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={bulkClearExams}
                    onChange={(e) => {
                      setBulkClearExams(e.target.checked);
                      if (e.target.checked) setBulkExams([]);
                    }}
                    className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>
                    <span className="block">No exam category</span>
                    <span className="block text-[10px] text-slate-500 font-normal">
                      General question — available for every exam
                    </span>
                  </span>
                </div>
                {bulkClearExams && <CheckCircle2 className="w-3.5 h-3.5 text-slate-800 mt-0.5" />}
              </label>

              <div className="border-t border-slate-100 mb-1" />

              <div className="space-y-0.5">
                {ALL_EXAMS.map((ex) => {
                  const checked = bulkExams.includes(ex);
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
                            setBulkClearExams(false);
                            if (checked) {
                              setBulkExams(bulkExams.filter((e) => e !== ex));
                            } else {
                              setBulkExams([...bulkExams, ex]);
                            }
                          }}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>{ex}</span>
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
            selectedCount === 0 ||
            (!bulkUnit &&
              !bulkSubject &&
              !bulkTopic.trim() &&
              !bulkDifficulty &&
              bulkExams.length === 0 &&
              !bulkClearExams)
          }
          onClick={handleApplyBulkCategories}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded text-xs font-medium cursor-pointer"
        >
          Apply
        </button>
      </div>
    </div>
  );

  const renderQuestionCards = () => (
    <div className="space-y-3">
      {displayedDrafts.map((draft, idx) => {
        const hasErrors = draft.validationErrors.length > 0;
        const isHighlighted = highlightedDraftId === draft.id;

        return (
          <div
            key={draft.id}
            id={`staged-card-${draft.id}`}
            className={`bg-white rounded-lg p-4 border text-xs space-y-2.5 transition-all ${
              isHighlighted
                ? 'ring-2 ring-cyan-500 bg-cyan-50/20 border-cyan-400 shadow-md'
                : draft.selectedForImport
                ? 'border-slate-400 shadow-xs'
                : 'border-slate-200'
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
                <span className="font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                  #{idx + 1}
                </span>
                <span className="font-semibold text-slate-900">{draft.tempCode}</span>
                {draft.pageNumber && (
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium text-[10px]">
                    Page {draft.pageNumber}
                  </span>
                )}
                {(!draft.correctAnswer || !['A', 'B', 'C', 'D', 'E'].includes(draft.correctAnswer)) && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px]">
                    Needs answer key
                  </span>
                )}
                <span className="text-slate-400">·</span>
                <span className="text-slate-700 font-medium">{draft.subject}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{draft.unit}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{draft.topic}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{draft.difficulty}</span>
                <span className="text-slate-400">·</span>
                <span
                  className={`px-1.5 py-0.5 rounded border font-medium text-[10px] ${
                    normalizeExamCategories(draft.examCategories).length > 0
                      ? 'bg-slate-50 text-slate-700 border-slate-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                  title="Examination categories are optional"
                >
                  {formatExamCategories(draft.examCategories)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!showSourceViewer) setShowSourceViewer(true);
                    scrollToQuestion(draft.id);
                  }}
                  className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  title="Compare question against original source document"
                >
                  <Eye className="w-3 h-3 text-cyan-600" />
                  <span>Compare</span>
                </button>
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

            {getSafeImageUrl(draft.imageUrl) && (
              <div className="my-2 p-2 bg-slate-50 border border-slate-200 rounded text-center">
                <img
                  src={getSafeImageUrl(draft.imageUrl)!}
                  alt={draft.tempCode ? `Image for question ${draft.tempCode}` : 'Image for question'}
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
                {draft.correctAnswer && ['A', 'B', 'C', 'D', 'E'].includes(draft.correctAnswer) ? (
                  draft.correctAnswer
                ) : (
                  <span className="text-rose-600 font-semibold">Needs answer key</span>
                )}
              </div>
              <div>Source: {draft.sourceDocument}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFullscreenPdfModal = () => {
    return (
      <Modal
        isOpen={isPdfFullscreen}
        onClose={() => setIsPdfFullscreen(false)}
        titleId="fullscreen-pdf-title"
        maxWidth="max-w-none w-screen h-screen p-0"
        className="h-full"
      >
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col w-screen h-screen overflow-hidden">
          <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
              <span id="fullscreen-pdf-title" className="font-semibold text-white truncate max-w-md">
                {selectedFileName}
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">(Fullscreen Mode)</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={openDocumentInNewTab}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open in Browser Tab</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPdfFullscreen(false)}
                className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-800 text-white font-medium flex items-center gap-1.5 cursor-pointer text-xs transition-colors shadow-xs"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden bg-slate-900 flex flex-col">
            {getSafePdfUri(sourcePdfDataUri) ? (
              <iframe
                src={getSafePdfUri(sourcePdfDataUri)!}
                title="Fullscreen PDF Reference"
                className="w-full h-full flex-1 min-h-0 block border-0 bg-white"
                style={{ width: '100%', height: '100%', minHeight: '100%' }}
              />
            ) : (
              <pre className="w-full h-full flex-1 min-h-0 p-6 overflow-y-auto text-xs font-mono text-slate-100 whitespace-pre-wrap leading-relaxed">
                {sourcePreviewText}
              </pre>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className={`space-y-3.5 transition-all ${showSourceViewer ? 'w-full' : 'max-w-5xl mx-auto'}`}>
      {/* Upload Zone (Collapsed Summary when Questions are Staged) */}
      {stagedQuestions.length > 0 && !isUploadSectionOpen ? (
        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1 rounded bg-slate-100 text-slate-600 shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-500 text-xs hidden sm:inline">Source Document:</span>
              <span className="font-medium text-slate-800 truncate max-w-[200px] sm:max-w-md" title={selectedFileName}>
                {selectedFileName || 'Source PDF Document'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold text-[11px] shrink-0">
                {stagedQuestions.length} staged
              </span>
              <span
                className={`px-2 py-0.5 rounded-full border font-semibold text-[10px] shrink-0 ${
                  uploadMode === 'mock'
                    ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                    : 'bg-teal-50 text-teal-800 border-teal-200'
                }`}
              >
                {uploadMode === 'mock'
                  ? `Mock Test: ${mockExamCategory}`
                  : `Subject-Wise: ${subjectUnit}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleApplyCurrentModeToAllStaged}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-xs font-medium cursor-pointer transition-colors hidden md:inline-flex"
              title="Apply current upload mode parameters to all staged drafts"
            >
              Re-apply Mode Tags
            </button>
            <button
              type="button"
              onClick={() => setIsUploadSectionOpen(true)}
              className="px-2.5 py-1 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Expand to choose upload pathway or load a different PDF"
            >
              <Upload className="w-3.5 h-3.5 text-slate-600" />
              <span>Change / Upload PDF</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Upload PDF Document</h3>
              <p className="text-xs text-slate-500">
                Ingest question papers from PDF. Choose between uploading a Mock Test or Subject-Wise questions.
              </p>
            </div>
            {stagedQuestions.length > 0 && (
              <button
                type="button"
                onClick={() => setIsUploadSectionOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium px-2.5 py-1 rounded hover:bg-slate-100 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <span>Collapse</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2-Option Upload Pathway Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Mock Test PDF */}
            <button
              type="button"
              onClick={() => setUploadMode('mock')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
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
                  <span className="text-sm font-semibold text-slate-900">1. Mock Test PDF</span>
                  {uploadMode === 'mock' && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-700 text-white tracking-wide">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Upload complete mock exam papers (CEE-UG entrance, ASCP, NHPC, PSC, DHA, Grand Tests).
                  Questions inherit board categories and mock paper titles.
                </p>
              </div>
            </button>

            {/* Option 2: Subject-Wise PDF */}
            <button
              type="button"
              onClick={() => setUploadMode('subject')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
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
                  <span className="text-sm font-semibold text-slate-900">2. Subject-Wise PDF</span>
                  {uploadMode === 'subject' && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-700 text-white tracking-wide">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Upload specialty question sets and chapter study guides organized by Unit and Subject for curriculum mastery and focused practice.
                </p>
              </div>
            </button>
          </div>

          {/* Mode Configuration Card */}
          {uploadMode === 'mock' ? (
            <div className="p-3.5 bg-cyan-50/40 border border-cyan-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-cyan-950 font-semibold uppercase tracking-wider text-[11px]">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-800" />
                <span>Mock Test Target Settings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Examination Board</label>
                  <select
                    value={mockExamCategory}
                    onChange={(e) => setMockExamCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  >
                    <option value="CEE-UG">CEE-UG Entrance Mock (MECEE-BL 200 Questions)</option>
                    <option value="ASCP">ASCP Board of Certification Mock</option>
                    <option value="NHPC">NHPC Licensure Mock</option>
                    <option value="PSC">PSC Medical Lab Technology Mock</option>
                    <option value="DHA">DHA Prometric Mock</option>
                    <option value="AIMS">AIMS Professional Mock</option>
                    <option value="General">General / Comprehensive Grand Test</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mock Exam Paper Title</label>
                  <input
                    type="text"
                    value={mockPaperTitle}
                    onChange={(e) => setMockPaperTitle(e.target.value)}
                    placeholder="e.g. CEE-UG Entrance Mock 2026, ASCP Paper 1"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-cyan-600"
                  />
                </div>
              </div>
              <div className="text-[11px] text-cyan-900 flex items-center gap-1.5 pt-0.5">
                <Tag className="w-3 h-3 text-cyan-700" />
                <span>
                  Extracted questions will be tagged under <strong>{mockExamCategory}</strong> past paper:{' '}
                  <strong>"{mockPaperTitle || 'Untitled Paper'}"</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-teal-50/40 border border-teal-200 rounded-xl space-y-3 text-xs">
              <div className="flex items-center gap-1.5 text-teal-950 font-semibold uppercase tracking-wider text-[11px]">
                <Layers className="w-3.5 h-3.5 text-teal-800" />
                <span>Subject-Wise Target Settings</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Target Specialty Subject</label>
                  <select
                    value={subjectUnit}
                    onChange={(e) => handleUnitChange(e.target.value)}
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
                    value={subjectName}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    {unitSubjects.map((s) => (
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
                    value={subjectTopic}
                    onChange={(e) => setSubjectTopic(e.target.value)}
                    placeholder="e.g. Transaminases, Troponin"
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>
              <div className="text-[11px] text-teal-900 flex items-center gap-1.5 pt-0.5">
                <BookOpen className="w-3 h-3 text-teal-700" />
                <span>
                  Extracted questions will be assigned to <strong>{subjectUnit}</strong> &gt;{' '}
                  <strong>{subjectName}</strong>
                </span>
              </div>
            </div>
          )}

          {/* PDF Dropzone */}
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center space-y-2.5 transition-colors ${
              uploadMode === 'mock'
                ? 'border-cyan-300 hover:border-cyan-500 bg-cyan-50/20'
                : 'border-teal-300 hover:border-teal-500 bg-teal-50/20'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.txt,.md,.json"
              className="hidden"
            />
            <FileText
              className={`w-7 h-7 mx-auto ${
                uploadMode === 'mock' ? 'text-cyan-600' : 'text-teal-600'
              }`}
            />

            <div className="text-xs text-slate-600">
              Select a PDF question document from your device to extract for{' '}
              <strong className={uploadMode === 'mock' ? 'text-cyan-900' : 'text-teal-900'}>
                {uploadMode === 'mock' ? `Mock Test (${mockExamCategory})` : `Subject-Wise (${subjectUnit})`}
              </strong>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors ${
                  uploadMode === 'mock'
                    ? 'bg-cyan-700 hover:bg-cyan-800'
                    : 'bg-teal-700 hover:bg-teal-800'
                }`}
              >
                Browse Local PDF File ({uploadMode === 'mock' ? 'Mock Test' : 'Subject-Wise'})
              </button>

              <button
                type="button"
                onClick={() =>
                  handleStartExtraction(
                    SAMPLE_MEDICINE_PDF_TEXT,
                    'Clinical_Pathology_Board_Review_2026.pdf',
                    null
                  )
                }
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium rounded-lg shadow-2xs cursor-pointer"
              >
                Load Sample Clinical Exam PDF
              </button>

              {savedPdfs.map((pdf) => (
                <button
                  key={pdf.filename}
                  type="button"
                  onClick={() => handleLoadStoredPdf(pdf.filename)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer"
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
      )}

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
        <div
          className={`bg-white border border-slate-200 rounded-xl shadow-xs transition-all ${
            showSourceViewer
              ? 'p-2.5 sm:p-3.5 h-[calc(100vh-100px)] min-h-[680px] flex flex-col overflow-hidden'
              : 'p-3.5 sm:p-5 space-y-3'
          }`}
        >
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Staged Question Queue ({stagedQuestions.length})
              </h3>
              {showSourceViewer && (
                <span className="px-2 py-0.5 rounded text-[11px] bg-cyan-50 text-cyan-700 border border-cyan-200 font-medium">
                  Dual-Scroll Comparison
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowSourceViewer(!showSourceViewer)}
                className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showSourceViewer
                    ? 'bg-cyan-700 hover:bg-cyan-800 text-white border-cyan-700 shadow-2xs font-semibold'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Toggle side-by-side comparison view with original PDF"
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>{showSourceViewer ? 'Hide Comparison View' : 'Compare with Source PDF'}</span>
              </button>

              <button
                onClick={() => selectAll(true)}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 flex items-center gap-1 cursor-pointer"
                title="Select all questions for import"
              >
                <CheckSquare className="w-3.5 h-3.5 text-slate-700" />
                <span>Select All ({stagedQuestions.length})</span>
              </button>

              <button
                onClick={() => selectAll(false)}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 border border-slate-300 flex items-center gap-1 cursor-pointer"
                title="Clear selection so no questions are imported"
              >
                <Square className="w-3.5 h-3.5 text-slate-400" />
                <span>Clear</span>
              </button>

              <button
                onClick={() => setShowClearStagingModal(true)}
                className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-700 border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Discard all staged questions and cancel this PDF import"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Discard PDF</span>
              </button>

              <button
                disabled={selectedCount === 0 || incompleteSelectedDrafts.length > 0}
                onClick={() => setShowFinalConfirmation(true)}
                className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-medium rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer"
                title={incompleteSelectedDrafts.length > 0 ? 'Questions needing an answer key cannot be approved' : undefined}
              >
                <span>Approve & Import Selected ({selectedCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showSourceViewer ? (
            <div className="flex-1 min-h-0 pt-2.5 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch overflow-hidden">
              {renderSourceViewerPanel()}
              <div
                className={`h-full min-h-0 flex flex-col bg-slate-50/80 border border-slate-300 rounded-xl overflow-hidden shadow-xs ${
                  splitRatio === '70-30'
                    ? 'lg:col-span-4'
                    : splitRatio === '60-40'
                    ? 'lg:col-span-5'
                    : 'lg:col-span-6'
                }`}
              >
                {/* Fixed controls header inside Right Box */}
                <div className="shrink-0 p-2 sm:p-2.5 bg-white border-b border-slate-200 space-y-2">
                  {renderUnifiedControlsBar()}
                  {showBulkTools && renderBulkAssignRow()}
                </div>

                {/* Independent Scrollable Questions List inside Right Box */}
                <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 space-y-3 bg-slate-50/70">
                  {renderQuestionCards()}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {renderUnifiedControlsBar()}
              {showBulkTools && renderBulkAssignRow()}
              {renderQuestionCards()}
            </div>
          )}
        </div>
      )}

      {renderFullscreenPdfModal()}

      {/* Edit Staged Draft Modal */}
      <Modal
        isOpen={!!editingDraft}
        onClose={() => setEditingDraft(null)}
        titleId="edit-draft-modal-title"
        maxWidth={
          showPdfInEditModal && (sourcePdfDataUri || sourcePreviewText)
            ? 'max-w-6xl'
            : 'max-w-2xl'
        }
      >
        {editingDraft && (
          <div className="bg-white border border-slate-200 w-full rounded p-4 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] overflow-y-auto transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 id="edit-draft-modal-title" className="font-semibold text-slate-900 text-sm">
                  Edit Extracted Question ({editingDraft.tempCode})
                </h3>
                {editingDraft.pageNumber && (
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                    Source Page {editingDraft.pageNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(sourcePdfDataUri || sourcePreviewText) && (
                  <button
                    type="button"
                    onClick={() => setShowPdfInEditModal(!showPdfInEditModal)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 cursor-pointer transition-colors ${
                      showPdfInEditModal
                        ? 'bg-cyan-700 text-white border-cyan-700'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                    title="Toggle source document preview side-by-side inside this editor"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    <span>{showPdfInEditModal ? 'Hide PDF' : 'Show PDF'}</span>
                  </button>
                )}
                <button
                  onClick={() => setEditingDraft(null)}
                  className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div
              className={`grid gap-5 ${
                showPdfInEditModal && (sourcePdfDataUri || sourcePreviewText)
                  ? 'grid-cols-1 lg:grid-cols-12'
                  : 'grid-cols-1'
              }`}
            >
              {showPdfInEditModal && (sourcePdfDataUri || sourcePreviewText) && (
                <div className="lg:col-span-5 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex flex-col h-[450px] lg:h-[620px]">
                  <div className="p-2 bg-slate-900 text-white text-xs font-medium flex items-center justify-between">
                    <span className="truncate max-w-[180px]">{selectedFileName}</span>
                    <button
                      type="button"
                      onClick={openDocumentInNewTab}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Pop out</span>
                    </button>
                  </div>
                  {getSafePdfUri(sourcePdfDataUri) ? (
                    <iframe
                      src={getSafePdfUri(sourcePdfDataUri)!}
                      title="Edit Modal PDF Preview"
                      className="w-full flex-1 border-0"
                    />
                  ) : (
                    <pre className="w-full flex-1 p-3 overflow-y-auto text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {sourcePreviewText}
                    </pre>
                  )}
                </div>
              )}

              <div
                className={`space-y-3 text-xs ${
                  showPdfInEditModal && (sourcePdfDataUri || sourcePreviewText)
                    ? 'lg:col-span-7 overflow-y-auto max-h-[620px] pr-1'
                    : ''
                }`}
              >
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
                  <label className="block font-semibold text-slate-700 mb-1">Specialty Subject</label>
                  <select
                    value={editingDraft.subject}
                    onChange={(e) => {
                      const nextSubject = e.target.value;
                      const sObj = categories.find((c) => c.name === nextSubject);
                      const units = sObj?.units || sObj?.subjects || [];
                      const nextUnit = units[0]?.name || editingDraft.unit;
                      const nextTopic = units[0]?.topics?.[0] || editingDraft.topic;
                      setEditingDraft({
                        ...editingDraft,
                        subject: nextSubject,
                        unit: nextUnit,
                        topic: nextTopic,
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                  >
                    {!categories.some((c) => c.name === editingDraft.subject) && editingDraft.subject && (
                      <option value={editingDraft.subject}>{editingDraft.subject}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / Module</label>
                  {editingUnitsList.length > 0 ? (
                    <select
                      value={editingDraft.unit}
                      onChange={(e) => {
                        const nextUnit = e.target.value;
                        const uObj = editingUnitsList.find((u) => u.name === nextUnit);
                        const nextTopic = uObj?.topics?.[0] || editingDraft.topic;
                        setEditingDraft({
                          ...editingDraft,
                          unit: nextUnit,
                          topic: nextTopic,
                        });
                      }}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    >
                      {!editingUnitsList.some((u) => u.name === editingDraft.unit) &&
                        editingDraft.unit && (
                          <option value={editingDraft.unit}>{editingDraft.unit}</option>
                        )}
                      {editingUnitsList.map((u) => (
                        <option key={u.id} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editingDraft.unit}
                      onChange={(e) => setEditingDraft({ ...editingDraft, unit: e.target.value })}
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
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block font-semibold text-slate-700">
                    Target Licensing Exams <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  {normalizeExamCategories(editingDraft.examCategories).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditingDraft({ ...editingDraft, examCategories: [] })}
                      className="text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDraft({ ...editingDraft, examCategories: [] })}
                    className={`px-2.5 py-1 rounded border text-xs font-medium cursor-pointer ${
                      normalizeExamCategories(editingDraft.examCategories).length === 0
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                    title="No exam tag — this question is available for every exam"
                  >
                    {GENERAL_EXAM_LABEL}
                  </button>
                  {ALL_EXAMS.map((exam) => {
                    const activeExams = normalizeExamCategories(editingDraft.examCategories);
                    const active = activeExams.includes(exam);
                    return (
                      <button
                        key={exam}
                        type="button"
                        onClick={() => {
                          const nextExams = active
                            ? activeExams.filter((e) => e !== exam)
                            : [...activeExams, exam];
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
                <p className="mt-1 text-[11px] text-slate-500">
                  Leave this empty to keep the question untagged (General). It will still be available in
                  every exam filter.
                </p>
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
                  {getSafeImageUrl(editingDraft.imageUrl) && (
                    <div className="mt-2 p-1.5 border border-slate-200 rounded bg-slate-50 text-center">
                      <img
                        src={getSafeImageUrl(editingDraft.imageUrl)!}
                        alt={editingDraft.tempCode ? `Image for question ${editingDraft.tempCode}` : 'Image for question'}
                        className="max-h-36 max-w-full mx-auto object-contain rounded bg-white border border-slate-200"
                      />
                    </div>
                  )}
                </div>
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
        )}
      </Modal>

      {/* Final Submission Modal */}
      <Modal
        isOpen={showFinalConfirmation}
        onClose={() => setShowFinalConfirmation(false)}
        titleId="confirm-final-import-title"
        maxWidth="max-w-md"
      >
        <div className="bg-white border border-slate-200 w-full rounded p-6 shadow-xl space-y-4">
          <h3 id="confirm-final-import-title" className="font-semibold text-slate-900 text-base">
            Confirm Import
          </h3>

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
              disabled={selectedCount === 0 || incompleteSelectedDrafts.length > 0}
              onClick={handleExecuteImport}
              className="px-4 py-1.5 rounded bg-slate-900 disabled:opacity-40 text-white text-xs font-medium cursor-pointer"
            >
              Approve & Import {selectedCount} questions
            </button>
          </div>
        </div>
      </Modal>

      {/* Discard Staged PDF Confirmation Modal */}
      <Modal
        isOpen={showClearStagingModal}
        onClose={() => setShowClearStagingModal(false)}
        titleId="clear-staging-modal-title"
        maxWidth="max-w-md"
      >
        <div className="bg-white border border-slate-200 w-full rounded p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <div className="w-8 h-8 rounded bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 id="clear-staging-modal-title" className="font-semibold text-slate-900 text-base">
                Discard Staged PDF?
              </h3>
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
      </Modal>
    </div>
  );
};
