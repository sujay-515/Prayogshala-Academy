import React, { useState } from 'react';
import { Plus, Trash2, FolderPlus, Check, X, Edit2 } from 'lucide-react';
import { SubjectCategory, SubjectUnit } from '../../types';
import { SubjectIcon, getSubjectColorClasses } from '../SubjectIcon';

const AVAILABLE_SUBJECT_ICONS = [
  { id: 'FlaskConical', label: 'Chemistry (Flask)' },
  { id: 'Droplets', label: 'Hematology (Droplets)' },
  { id: 'Microscope', label: 'Microbiology (Microscope)' },
  { id: 'ShieldCheck', label: 'Immunology (Shield)' },
  { id: 'HeartPulse', label: 'Blood Bank (Heart)' },
  { id: 'TestTubes', label: 'Body Fluids (Test Tubes)' },
  { id: 'Dna', label: 'Molecular (DNA)' },
  { id: 'ClipboardCheck', label: 'QA / Operations (Clipboard)' },
  { id: 'BookOpen', label: 'General (Book)' },
  { id: 'Layers', label: 'Multidisciplinary (Layers)' },
];

interface CategoryManagerProps {
  categories: SubjectCategory[];
  onUpdateCategories: (categories: SubjectCategory[]) => void;
  onRenameCategoryEntity?: (
    type: 'subject' | 'unit' | 'topic',
    oldName: string,
    newName: string
  ) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onUpdateCategories,
  onRenameCategoryEntity,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(categories[0]?.id || '');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');
  const [newSubjectIcon, setNewSubjectIcon] = useState('FlaskConical');
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);

  // Edit Subject state
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editSubjectName, setEditSubjectName] = useState('');
  const [editSubjectDesc, setEditSubjectDesc] = useState('');
  const [editSubjectIcon, setEditSubjectIcon] = useState('FlaskConical');

  // Add/Edit Unit state
  const [newUnitName, setNewUnitName] = useState('');
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitName, setEditUnitName] = useState('');

  // Add/Edit Topic state
  const [targetUnitId, setTargetUnitId] = useState<string>('');
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopic, setEditingTopic] = useState<{ unitId: string; oldName: string } | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  const currentSubject = categories.find((c) => c.id === selectedSubjectId) || categories[0];
  const currentUnits: SubjectUnit[] = currentSubject?.units || currentSubject?.subjects || [];

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;

    const newSub: SubjectCategory = {
      id: `subject-${Date.now()}`,
      name: newSubjectName.trim(),
      description: newSubjectDesc.trim() || 'Laboratory medicine specialty subject.',
      icon: newSubjectIcon,
      units: [],
      subjects: [],
    };

    const updated = [...categories, newSub];
    onUpdateCategories(updated);
    setSelectedSubjectId(newSub.id);
    setNewSubjectName('');
    setNewSubjectDesc('');
    setShowAddSubjectForm(false);
  };

  const handleStartEditSubject = () => {
    if (!currentSubject) return;
    setEditSubjectName(currentSubject.name);
    setEditSubjectDesc(currentSubject.description);
    setEditSubjectIcon(currentSubject.icon || 'FlaskConical');
    setIsEditingSubject(true);
  };

  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSubject || !editSubjectName.trim()) return;
    const oldName = currentSubject.name;
    const nextName = editSubjectName.trim();
    const updated = categories.map((s) =>
      s.id === currentSubject.id
        ? {
            ...s,
            name: nextName,
            description: editSubjectDesc.trim() || s.description,
            icon: editSubjectIcon,
          }
        : s
    );
    onUpdateCategories(updated);
    if (oldName !== nextName) {
      onRenameCategoryEntity?.('subject', oldName, nextName);
    }
    setIsEditingSubject(false);
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (categories.length <= 1) return;
    const updated = categories.filter((s) => s.id !== subjectId);
    onUpdateCategories(updated);
    if (selectedSubjectId === subjectId && updated[0]) {
      setSelectedSubjectId(updated[0].id);
    }
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !currentSubject) return;

    const newUnitItem: SubjectUnit = {
      id: `unit-${Date.now()}`,
      name: newUnitName.trim(),
      topics: [],
    };

    const updated = categories.map((s) => {
      if (s.id === currentSubject.id) {
        const units = [...(s.units || s.subjects || []), newUnitItem];
        return {
          ...s,
          units,
          subjects: units,
        };
      }
      return s;
    });

    onUpdateCategories(updated);
    setNewUnitName('');
    setShowAddUnitForm(false);
  };

  const handleSaveEditUnit = (unitId: string) => {
    if (!currentSubject || !editUnitName.trim()) return;
    const targetUnit = currentUnits.find((u) => u.id === unitId);
    const oldName = targetUnit?.name || '';
    const nextName = editUnitName.trim();

    const updated = categories.map((s) => {
      if (s.id === currentSubject.id) {
        const units = (s.units || s.subjects || []).map((u) =>
          u.id === unitId ? { ...u, name: nextName } : u
        );
        return {
          ...s,
          units,
          subjects: units,
        };
      }
      return s;
    });
    onUpdateCategories(updated);
    if (oldName && oldName !== nextName) {
      onRenameCategoryEntity?.('unit', oldName, nextName);
    }
    setEditingUnitId(null);
  };

  const handleDeleteUnit = (unitId: string) => {
    if (!currentSubject) return;
    const updated = categories.map((s) => {
      if (s.id === currentSubject.id) {
        const units = (s.units || s.subjects || []).filter((u) => u.id !== unitId);
        return {
          ...s,
          units,
          subjects: units,
        };
      }
      return s;
    });
    onUpdateCategories(updated);
  };

  const handleAddTopic = (unitId: string) => {
    if (!newTopicName.trim() || !currentSubject) return;

    const updated = categories.map((s) => {
      if (s.id === currentSubject.id) {
        const units = (s.units || s.subjects || []).map((u) => {
          if (u.id === unitId) {
            return {
              ...u,
              topics: [...u.topics, newTopicName.trim()],
            };
          }
          return u;
        });
        return {
          ...s,
          units,
          subjects: units,
        };
      }
      return s;
    });

    onUpdateCategories(updated);
    setNewTopicName('');
    setTargetUnitId('');
  };

  const handleSaveEditTopic = (unitId: string, oldTopicName: string) => {
    if (!currentSubject || !editTopicName.trim()) return;
    const nextName = editTopicName.trim();

    const updated = categories.map((s) => {
      if (s.id === currentSubject.id) {
        const units = (s.units || s.subjects || []).map((u) => {
          if (u.id === unitId) {
            return {
              ...u,
              topics: u.topics.map((t) => (t === oldTopicName ? nextName : t)),
            };
          }
          return u;
        });
        return {
          ...s,
          units,
          subjects: units,
        };
      }
      return s;
    });

    onUpdateCategories(updated);
    if (oldTopicName !== nextName) {
      onRenameCategoryEntity?.('topic', oldTopicName, nextName);
    }
    setEditingTopic(null);
  };

  const handleDeleteTopic = (unitId: string, topicName: string) => {
    if (!currentSubject) return;
    const updated = categories.map((s) => {
      if (s.id === currentSubject.id) {
        const units = (s.units || s.subjects || []).map((u) => {
          if (u.id === unitId) {
            return {
              ...u,
              topics: u.topics.filter((t) => t !== topicName),
            };
          }
          return u;
        });
        return {
          ...s,
          units,
          subjects: units,
        };
      }
      return s;
    });
    onUpdateCategories(updated);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Curriculum &amp; Taxonomy Hierarchy</h2>
          <p className="text-xs text-slate-500">
            Manage Specialty Subjects, Unit modules, and Clinical Topics with icons.
          </p>
        </div>

        <button
          onClick={() => setShowAddSubjectForm(true)}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Subject</span>
        </button>
      </div>

      {showAddSubjectForm && (
        <form
          onSubmit={handleAddSubject}
          className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs space-y-3 text-xs"
        >
          <h4 className="font-semibold text-slate-900">Add New Specialty Subject</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cat-new-subject-name" className="block text-slate-700 mb-1">
                Subject Title
              </label>
              <input
                id="cat-new-subject-name"
                type="text"
                required
                aria-required="true"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Clinical Chemistry"
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="cat-new-subject-desc" className="block text-slate-700 mb-1">
                Description
              </label>
              <input
                id="cat-new-subject-desc"
                type="text"
                value={newSubjectDesc}
                onChange={(e) => setNewSubjectDesc(e.target.value)}
                placeholder="Scope and clinical markers..."
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="cat-new-subject-icon" className="block text-slate-700 mb-1">
                Subject Icon
              </label>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <SubjectIcon icon={newSubjectIcon} className="w-4 h-4 text-cyan-800" />
                </div>
                <select
                  id="cat-new-subject-icon"
                  value={newSubjectIcon}
                  onChange={(e) => setNewSubjectIcon(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                >
                  {AVAILABLE_SUBJECT_ICONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddSubjectForm(false)}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 text-white rounded font-medium cursor-pointer"
            >
              Save Subject
            </button>
          </div>
        </form>
      )}

      {/* Two Pane: Subjects on Left, Units & Topics on Right */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Subjects */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1.5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block pb-2 border-b border-slate-100">
            Specialty Subjects ({categories.length})
          </span>
          <div className="space-y-1">
            {categories.map((sub) => {
              const isSelected = sub.id === currentSubject?.id;
              const units = sub.units || sub.subjects || [];
              const colors = getSubjectColorClasses(sub.name);
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSelectedSubjectId(sub.id);
                    setIsEditingSubject(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer gap-2 ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${colors.iconBg} ${colors.iconColor}`}>
                      <SubjectIcon name={sub.name} icon={sub.icon} className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{sub.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono shrink-0">
                    {units.length} {units.length === 1 ? 'unit' : 'units'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Units & Topics */}
        {currentSubject && (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            {isEditingSubject ? (
              <form
                onSubmit={handleSaveEditSubject}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="cat-edit-sub-name" className="block font-semibold text-slate-700 mb-1">
                      Subject Name
                    </label>
                    <input
                      id="cat-edit-sub-name"
                      type="text"
                      required
                      aria-required="true"
                      value={editSubjectName}
                      onChange={(e) => setEditSubjectName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-edit-sub-desc" className="block font-semibold text-slate-700 mb-1">
                      Description
                    </label>
                    <input
                      id="cat-edit-sub-desc"
                      type="text"
                      value={editSubjectDesc}
                      onChange={(e) => setEditSubjectDesc(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-edit-sub-icon" className="block font-semibold text-slate-700 mb-1">
                      Icon
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <SubjectIcon icon={editSubjectIcon} className="w-3.5 h-3.5 text-cyan-800" />
                      </div>
                      <select
                        id="cat-edit-sub-icon"
                        value={editSubjectIcon}
                        onChange={(e) => setEditSubjectIcon(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                      >
                        {AVAILABLE_SUBJECT_ICONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSubject(false)}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-900 text-white rounded font-medium cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-cyan-100/70 text-cyan-800 flex items-center justify-center shrink-0">
                    <SubjectIcon name={currentSubject.name} icon={currentSubject.icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{currentSubject.name}</h3>
                    <p className="text-xs text-slate-500">{currentSubject.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleStartEditSubject}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                    title="Rename or edit subject details"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Subject</span>
                  </button>
                  {categories.length > 1 && (
                    <button
                      onClick={() => handleDeleteSubject(currentSubject.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-200 rounded cursor-pointer"
                      title="Delete subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddUnitForm(true)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Unit</span>
                  </button>
                </div>
              </div>
            )}

            {showAddUnitForm && (
              <form
                onSubmit={handleAddUnit}
                className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center gap-2 text-xs"
              >
                <input
                  type="text"
                  required
                  aria-required="true"
                  aria-label="New Unit Title"
                  placeholder="New Unit Title (e.g. Clinical Enzymology & Hepatic Function)..."
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-slate-900 text-white rounded font-medium cursor-pointer"
                >
                  Save Unit
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUnitForm(false)}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="space-y-3">
              {currentUnits.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No units configured under this subject.</p>
              ) : (
                currentUnits.map((unit) => (
                  <div key={unit.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      {editingUnitId === unit.id ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input
                            type="text"
                            value={editUnitName}
                            onChange={(e) => setEditUnitName(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900"
                          />
                          <button
                            onClick={() => handleSaveEditUnit(unit.id)}
                            className="p-1 bg-slate-900 rounded text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingUnitId(null)}
                            className="p-1 bg-white border border-slate-200 rounded text-slate-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-semibold text-slate-900 text-xs">
                          Unit: {unit.name}
                        </h4>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingUnitId(unit.id);
                            setEditUnitName(unit.name);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title="Rename unit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          title="Delete unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {unit.topics.map((top) => {
                        const isEditingThisTopic =
                          editingTopic?.unitId === unit.id && editingTopic?.oldName === top;
                        if (isEditingThisTopic) {
                          return (
                            <span key={top} className="inline-flex items-center gap-1 text-xs">
                              <input
                                type="text"
                                value={editTopicName}
                                onChange={(e) => setEditTopicName(e.target.value)}
                                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900"
                              />
                              <button
                                onClick={() => handleSaveEditTopic(unit.id, top)}
                                className="p-0.5 bg-slate-900 text-white rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingTopic(null)}
                                className="p-0.5 text-slate-400 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        }

                        return (
                          <span
                            key={top}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700 shadow-2xs group"
                          >
                            <span>{top}</span>
                            <button
                              onClick={() => {
                                setEditingTopic({ unitId: unit.id, oldName: top });
                                setEditTopicName(top);
                              }}
                              className="text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Rename topic"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTopic(unit.id, top)}
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete topic"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}

                      {targetUnitId === unit.id ? (
                        <div className="inline-flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Topic title..."
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTopic(unit.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleAddTopic(unit.id)}
                            className="px-2 py-0.5 bg-slate-900 text-white rounded text-xs cursor-pointer"
                          >
                            Add
                          </button>
                          <button
                            onClick={() => setTargetUnitId('')}
                            className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setTargetUnitId(unit.id)}
                          className="inline-flex items-center gap-0.5 text-[11px] text-cyan-800 hover:text-cyan-950 font-medium cursor-pointer px-1 py-0.5"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Add Topic</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
