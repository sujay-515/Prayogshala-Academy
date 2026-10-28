import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, Save, Plus, Trash2, Image as ImageIcon, Table as TableIcon } from 'lucide-react';
import { MCQQuestion, UnitCategory, ExamCategory, DifficultyLevel, QuestionStatus, TableData } from '../../types';
import { generateNextQuestionCode } from '../../utils/mcqParser';
import { isSafeImageUrl, getSafeImageUrl } from '../../utils/urlSecurity';

interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestion: (question: MCQQuestion) => void;
  categories: UnitCategory[];
  editingQuestion: MCQQuestion | null;
  totalQuestionCount: number;
  existingQuestions?: MCQQuestion[];
}

export const QuestionFormModal: React.FC<QuestionFormModalProps> = ({
  isOpen,
  onClose,
  onSaveQuestion,
  categories,
  editingQuestion,
  totalQuestionCount,
  existingQuestions = [],
}) => {
  const [stem, setStem] = useState('');
  const [clinicalCase, setClinicalCase] = useState('');
  const [options, setOptions] = useState<{ id: 'A' | 'B' | 'C' | 'D' | 'E'; text: string }[]>([
    { id: 'A', text: '' },
    { id: 'B', text: '' },
    { id: 'C', text: '' },
    { id: 'D', text: '' },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
  const [explanation, setExplanation] = useState('');
  const [reference, setReference] = useState('');
  const [unit, setUnit] = useState(categories[0]?.name || 'Clinical Chemistry');
  const [subject, setSubject] = useState(categories[0]?.subjects[0]?.name || 'Clinical Enzymology & Hepatic Function');
  const [topic, setTopic] = useState('Transaminases (ALT/AST)');
  const [subtopic, setSubtopic] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Conceptual');
  const [selectedExams, setSelectedExams] = useState<ExamCategory[]>(['ASCP', 'NHPC']);
  const [status, setStatus] = useState<QuestionStatus>('Published');
  const [auditNote, setAuditNote] = useState('');

  // Image attachment support
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Table support
  const [hasTable, setHasTable] = useState(false);
  const [tableData, setTableData] = useState<TableData>({
    headers: ['Analyte', 'Patient Result', 'Reference Range'],
    rows: [
      ['Total Bilirubin', '6.8 mg/dL', '0.2 - 1.2 mg/dL'],
      ['Direct Bilirubin', '5.4 mg/dL', '0.0 - 0.3 mg/dL'],
    ],
  });

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    setImageError('');
    if (editingQuestion) {
      setStem(editingQuestion.questionText);
      setClinicalCase(editingQuestion.clinicalCase || '');
      setOptions(
        editingQuestion.options.length >= 2
          ? editingQuestion.options
          : [
              { id: 'A', text: editingQuestion.options[0]?.text || '' },
              { id: 'B', text: editingQuestion.options[1]?.text || '' },
              { id: 'C', text: '' },
              { id: 'D', text: '' },
            ]
      );
      setCorrectAnswer(editingQuestion.correctAnswer || 'A');
      setExplanation(editingQuestion.explanation);
      setReference(editingQuestion.reference);
      setUnit(editingQuestion.unit);
      setSubject(editingQuestion.subject);
      setTopic(editingQuestion.topic);
      setSubtopic(editingQuestion.subtopic || '');
      setDifficulty(editingQuestion.difficulty);
      setSelectedExams(editingQuestion.examCategories);
      setStatus(editingQuestion.status);
      setImageUrl(editingQuestion.imageUrl || '');
      if (editingQuestion.tableData) {
        setHasTable(true);
        setTableData(editingQuestion.tableData);
      } else {
        setHasTable(false);
      }
      setAuditNote('');
    } else {
      setStem('');
      setClinicalCase('');
      setOptions([
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ]);
      setCorrectAnswer('A');
      setExplanation('');
      setReference('CLSI Guidelines & Medical Pathology Standards');
      setUnit(categories[0]?.name || 'Clinical Chemistry');
      setSubject(categories[0]?.subjects[0]?.name || 'Clinical Enzymology & Hepatic Function');
      setTopic(categories[0]?.subjects[0]?.topics[0] || 'Transaminases (ALT/AST)');
      setSubtopic('');
      setDifficulty('Conceptual');
      setSelectedExams(['ASCP', 'NHPC']);
      setStatus('Published');
      setImageUrl('');
      setHasTable(false);
      setAuditNote('');
    }
  }, [editingQuestion, categories, isOpen]);

  if (!isOpen) return null;

  const currentUnitObj = categories.find((c) => c.name === unit);
  const availableSubjects = currentUnitObj?.subjects || [];
  const currentSubjectObj = availableSubjects.find((s) => s.name === subject);
  const availableTopics = currentSubjectObj?.topics || [];

  const toggleExam = (exam: ExamCategory) => {
    setSelectedExams((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setImageError('');
    };
    reader.readAsDataURL(file);
  };

  const handleAddTableRow = () => {
    setTableData((prev) => ({
      ...prev,
      rows: [...prev.rows, prev.headers.map(() => '')],
    }));
  };

  const handleRemoveTableRow = (rowIdx: number) => {
    setTableData((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== rowIdx),
    }));
  };

  const handleAddTableColumn = () => {
    setTableData((prev) => ({
      headers: [...prev.headers, `Column ${prev.headers.length + 1}`],
      rows: prev.rows.map((r) => [...r, '']),
    }));
  };

  const handleRemoveTableColumn = (colIdx: number) => {
    if (tableData.headers.length <= 1) return;
    setTableData((prev) => ({
      headers: prev.headers.filter((_, idx) => idx !== colIdx),
      rows: prev.rows.map((r) => r.filter((_, idx) => idx !== colIdx)),
    }));
  };

  const handleUpdateTableCell = (rowIdx: number, colIdx: number, val: string) => {
    setTableData((prev) => {
      const nextRows = prev.rows.map((r, rIdx) =>
        rIdx === rowIdx ? r.map((c, cIdx) => (cIdx === colIdx ? val : c)) : r
      );
      return { ...prev, rows: nextRows };
    });
  };

  const handleUpdateTableHeader = (colIdx: number, val: string) => {
    setTableData((prev) => ({
      ...prev,
      headers: prev.headers.map((h, idx) => (idx === colIdx ? val : h)),
    }));
  };

  const handleAddOption = () => {
    if (options.length >= 5) return;
    const usedIds = new Set(options.map((o) => o.id));
    const nextId = (['A', 'B', 'C', 'D', 'E'] as const).find((id) => !usedIds.has(id));
    if (!nextId) return;
    setOptions([...options, { id: nextId, text: '' }].sort((a, b) => a.id.localeCompare(b.id)));
  };

  const handleRemoveOption = (idToRemove: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (options.length <= 2) return;
    const nextOptions = options.filter((o) => o.id !== idToRemove);
    setOptions(nextOptions);
    if (correctAnswer === idToRemove) {
      setCorrectAnswer(nextOptions[0]?.id || 'A');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSafeImageUrl(imageUrl)) {
      setImageError('Image URL must start with https://, http://, /, or data:image/');
      return;
    }

    const timestamp = new Date().toISOString();
    const qId = editingQuestion ? editingQuestion.id : `lab-${Date.now()}`;
    const qCode = editingQuestion
      ? editingQuestion.code
      : existingQuestions.length > 0
      ? generateNextQuestionCode(existingQuestions, 0)
      : `LAB-${String(totalQuestionCount + 1).padStart(4, '0')}`;

    const versionHistory = editingQuestion
      ? [
          ...editingQuestion.versionHistory,
          {
            timestamp,
            author: 'Administrator',
            action: 'Question updated in manual manager',
            note: auditNote || 'Clinical details revised',
          },
        ]
      : [
          {
            timestamp,
            author: 'Administrator',
            action: 'Question created manually',
            note: auditNote || 'Initial creation',
          },
        ];

    const questionRecord: MCQQuestion = {
      id: qId,
      code: qCode,
      questionText: stem,
      clinicalCase: clinicalCase.trim() ? clinicalCase.trim() : undefined,
      options,
      correctAnswer,
      explanation,
      reference,
      tableData: hasTable ? tableData : undefined,
      imageUrl: imageUrl.trim() ? imageUrl.trim() : undefined,
      unit,
      subject,
      topic,
      subtopic: subtopic.trim() ? subtopic.trim() : undefined,
      difficulty,
      examCategories: selectedExams.length > 0 ? selectedExams : ['ASCP'],
      status,
      sourceDocument: editingQuestion?.sourceDocument || 'Direct Manual Entry',
      createdAt: editingQuestion ? editingQuestion.createdAt : timestamp,
      updatedAt: timestamp,
      versionHistory,
    };

    onSaveQuestion(questionRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60">
      <div className="bg-white border border-slate-200 w-full max-w-3xl rounded shadow-xl flex flex-col max-h-[92dvh] overflow-hidden">
        <div className="bg-white px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              {editingQuestion ? `Edit Question (${editingQuestion.code})` : 'Create New Laboratory Question'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="px-2.5 sm:px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-800 font-medium border border-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isPreviewMode ? 'Back to Editor' : 'Live Preview'}</span>
              <span className="sm:hidden">{isPreviewMode ? 'Editor' : 'Preview'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body or Preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-5">
          {isPreviewMode ? (
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-900">{unit}</span>
                <span>·</span>
                <span>{subject}</span>
                <span>·</span>
                <span>{topic}</span>
                {subtopic && (
                  <>
                    <span>·</span>
                    <span>{subtopic}</span>
                  </>
                )}
                <span>·</span>
                <span className="text-slate-600">{difficulty}</span>
              </div>

              {clinicalCase && (
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs text-slate-700">
                  <strong className="block text-slate-900 mb-1">Clinical Vignette:</strong>
                  {clinicalCase}
                </div>
              )}

              {hasTable && (
                <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        {tableData.headers.map((h, idx) => (
                          <th key={idx} className="px-3.5 py-2 font-semibold">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {tableData.rows.map((row, rIdx) => (
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

              {getSafeImageUrl(imageUrl) && (
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 block mb-1.5">
                    Diagnostic Figure / Microscopy:
                  </span>
                  <img
                    src={getSafeImageUrl(imageUrl)!}
                    alt="Clinical specimen image"
                    className="max-h-64 rounded object-contain mx-auto border border-slate-100"
                  />
                </div>
              )}

              <p className="text-sm font-semibold text-slate-900">{stem || '(No question stem provided)'}</p>

              <div className="space-y-2">
                {options.map((opt) => (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      opt.id === correctAnswer
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-semibold">{opt.id}.</span>
                    <span>{opt.text || '(Empty option)'}</span>
                  </div>
                ))}
              </div>

              <div className="bg-white p-4 rounded-lg text-xs space-y-1.5 border border-slate-200">
                <span className="font-semibold text-slate-900 block">Explanation:</span>
                <p className="text-slate-600">{explanation || '(No explanation provided)'}</p>
                {reference && (
                  <span className="text-slate-500 text-xs block pt-2 border-t border-slate-100">
                    Ref: {reference}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <form id="question-form" onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Question Stem */}
              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">
                  Question Stem (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  value={stem}
                  onChange={(e) => setStem(e.target.value)}
                  placeholder="State the clinical question, laboratory finding, or diagnostic problem..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Clinical Case Vignette (Optional) */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Clinical Vignette / Patient Case Information (Optional)
                </label>
                <textarea
                  rows={2}
                  value={clinicalCase}
                  onChange={(e) => setClinicalCase(e.target.value)}
                  placeholder="e.g. A 48-year-old male with severe jaundice and dark urine..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Rich Attachments: Clinical Table & Image */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">
                    Rich Clinical Attachments (Tables & Diagnostic Figures)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setHasTable(!hasTable)}
                      className={`px-2.5 py-1 rounded border text-xs font-medium flex items-center gap-1 cursor-pointer ${
                        hasTable
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span>{hasTable ? 'Remove Lab Table' : 'Attach Lab Table'}</span>
                    </button>

                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                    </button>
                  </div>
                </div>

                {/* Image URL input or preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setImageError('');
                      }}
                      placeholder="Or paste diagnostic image URL / base64 data URI..."
                      className="flex-1 bg-white border border-slate-300 rounded-md p-1.5 text-slate-900"
                    />
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setImageError('');
                        }}
                        className="px-2 py-1 text-rose-600 hover:underline text-xs cursor-pointer"
                      >
                        Clear Image
                      </button>
                    )}
                  </div>
                  {imageError && <p className="text-xs text-rose-600">{imageError}</p>}
                </div>

                {/* Interactive Table Builder */}
                {hasTable && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 text-xs uppercase">
                        Laboratory Values Table
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddTableColumn}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Column
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTableRow}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Row
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            {tableData.headers.map((h, colIdx) => (
                              <th key={colIdx} className="p-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={h}
                                    onChange={(e) => handleUpdateTableHeader(colIdx, e.target.value)}
                                    className="w-full bg-slate-100 font-semibold border border-slate-300 rounded px-2 py-1 text-slate-900"
                                  />
                                  {tableData.headers.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTableColumn(colIdx)}
                                      className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                      title="Remove Column"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="w-6" />
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-1">
                                  <input
                                    type="text"
                                    value={cell}
                                    onChange={(e) => handleUpdateTableCell(rIdx, cIdx, e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 font-mono text-slate-800"
                                  />
                                </td>
                              ))}
                              <td className="p-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTableRow(rIdx)}
                                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Categorization Dropdowns (Unit -> Subject -> Topic -> Subtopic) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      const uObj = categories.find((c) => c.name === e.target.value);
                      if (uObj?.subjects[0]) {
                        setSubject(uObj.subjects[0].name);
                        if (uObj.subjects[0].topics[0]) {
                          setTopic(uObj.subjects[0].topics[0]);
                        }
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    {!categories.some((c) => c.name === unit) && unit && (
                      <option value={unit}>{unit}</option>
                    )}
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      const sObj = availableSubjects.find((s) => s.name === e.target.value);
                      if (sObj?.topics[0]) setTopic(sObj.topics[0]);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    {!availableSubjects.some((s) => s.name === subject) && subject && (
                      <option value={subject}>{subject}</option>
                    )}
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Topic</label>
                  <input
                    type="text"
                    required
                    list="available-topics-list"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                  <datalist id="available-topics-list">
                    {availableTopics.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subtopic (Optional)</label>
                  <input
                    type="text"
                    value={subtopic}
                    onChange={(e) => setSubtopic(e.target.value)}
                    placeholder="e.g. Isoenzymes"
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Difficulty & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    <option value="Memory-based">Memory-based</option>
                    <option value="Conceptual">Conceptual</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Publication Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as QuestionStatus)}
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    <option value="Draft">Draft (Unpublished)</option>
                    <option value="Under-Review">Under-Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Published">Published (Live to Students)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Exam Category Checkboxes */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">
                  Relevant Examination Categories (Multi-select)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  {(['ASCP', 'NHPC', 'PSC', 'DHA', 'AIMS'] as ExamCategory[]).map((cat) => (
                    <label key={cat} className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedExams.includes(cat)}
                        onChange={() => toggleExam(cat)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Options & Answer Key */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-slate-800 font-semibold block">
                      Answer Options & Correct Answer
                    </label>
                    <span className="text-slate-500 text-xs">
                      Select the radio button for the correct answer
                    </span>
                  </div>
                  {options.length < 5 && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Option E
                    </button>
                  )}
                </div>

                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-answer"
                      checked={correctAnswer === opt.id}
                      onChange={() => setCorrectAnswer(opt.id)}
                      className="text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <span className="font-semibold text-slate-600 w-4 text-center">{opt.id}</span>
                    <input
                      type="text"
                      required
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...options];
                        newOpts[idx] = { ...opt, text: e.target.value };
                        setOptions(newOpts);
                      }}
                      placeholder={`Option ${opt.id} text...`}
                      className="flex-1 bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(opt.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title={`Remove Option ${opt.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Clinical Explanation & Reference */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1.5">
                    Scientific Explanation & Clinical Rationale
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Provide diagnostic rationale, mechanism, and why other options are excluded..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5">
                    Authoritative Reference / Citation
                  </label>
                  <input
                    type="text"
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. Tietz Textbook of Clinical Chemistry, 6th Ed., Ch. 44"
                    className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-900 focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Version History Note */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Revision / Audit Note
                </label>
                <input
                  type="text"
                  value={auditNote}
                  onChange={(e) => setAuditNote(e.target.value)}
                  placeholder="Describe reason for edit or initial source notes..."
                  className="w-full bg-white border border-slate-300 rounded-md p-2 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
                />
              </div>
            </form>
          )}
        </div>

        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
          {!isPreviewMode && (
            <button
              type="submit"
              form="question-form"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
