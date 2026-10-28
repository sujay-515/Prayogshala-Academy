import React, { useState } from 'react';
import { Plus, Trash2, FolderPlus, Check, X, Edit2 } from 'lucide-react';
import { UnitCategory } from '../../types';

interface CategoryManagerProps {
  categories: UnitCategory[];
  onUpdateCategories: (categories: UnitCategory[]) => void;
  onRenameCategoryEntity?: (
    type: 'unit' | 'subject' | 'topic',
    oldName: string,
    newName: string
  ) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onUpdateCategories,
  onRenameCategoryEntity,
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string>(categories[0]?.id || '');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitDesc, setNewUnitDesc] = useState('');
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);

  // Edit Unit state
  const [isEditingUnit, setIsEditingUnit] = useState(false);
  const [editUnitName, setEditUnitName] = useState('');
  const [editUnitDesc, setEditUnitDesc] = useState('');

  // Add/Edit Subject state
  const [newSubjectName, setNewSubjectName] = useState('');
  const [showAddSubjectForm, setShowAddSubjectForm] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState('');

  // Add/Edit Topic state
  const [targetSubjectId, setTargetSubjectId] = useState<string>('');
  const [newTopicName, setNewTopicName] = useState('');
  const [editingTopic, setEditingTopic] = useState<{ subjectId: string; oldName: string } | null>(null);
  const [editTopicName, setEditTopicName] = useState('');

  const currentUnit = categories.find((c) => c.id === selectedUnitId) || categories[0];

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    const newUnit: UnitCategory = {
      id: `unit-${Date.now()}`,
      name: newUnitName.trim(),
      description: newUnitDesc.trim() || 'Laboratory medicine unit specialty.',
      subjects: [],
    };

    const updated = [...categories, newUnit];
    onUpdateCategories(updated);
    setSelectedUnitId(newUnit.id);
    setNewUnitName('');
    setNewUnitDesc('');
    setShowAddUnitForm(false);
  };

  const handleStartEditUnit = () => {
    if (!currentUnit) return;
    setEditUnitName(currentUnit.name);
    setEditUnitDesc(currentUnit.description);
    setIsEditingUnit(true);
  };

  const handleSaveEditUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUnit || !editUnitName.trim()) return;
    const oldName = currentUnit.name;
    const nextName = editUnitName.trim();
    const updated = categories.map((u) =>
      u.id === currentUnit.id
        ? { ...u, name: nextName, description: editUnitDesc.trim() || u.description }
        : u
    );
    onUpdateCategories(updated);
    if (oldName !== nextName) {
      onRenameCategoryEntity?.('unit', oldName, nextName);
    }
    setIsEditingUnit(false);
  };

  const handleDeleteUnit = (unitId: string) => {
    if (categories.length <= 1) return;
    const updated = categories.filter((u) => u.id !== unitId);
    onUpdateCategories(updated);
    if (selectedUnitId === unitId && updated[0]) {
      setSelectedUnitId(updated[0].id);
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !currentUnit) return;

    const newSubject = {
      id: `sub-${Date.now()}`,
      name: newSubjectName.trim(),
      topics: [],
    };

    const updated = categories.map((u) => {
      if (u.id === currentUnit.id) {
        return {
          ...u,
          subjects: [...u.subjects, newSubject],
        };
      }
      return u;
    });

    onUpdateCategories(updated);
    setNewSubjectName('');
    setShowAddSubjectForm(false);
  };

  const handleSaveEditSubject = (subjectId: string) => {
    if (!currentUnit || !editSubjectName.trim()) return;
    const targetSub = currentUnit.subjects.find((s) => s.id === subjectId);
    const oldName = targetSub?.name || '';
    const nextName = editSubjectName.trim();

    const updated = categories.map((u) => {
      if (u.id === currentUnit.id) {
        return {
          ...u,
          subjects: u.subjects.map((s) => (s.id === subjectId ? { ...s, name: nextName } : s)),
        };
      }
      return u;
    });
    onUpdateCategories(updated);
    if (oldName && oldName !== nextName) {
      onRenameCategoryEntity?.('subject', oldName, nextName);
    }
    setEditingSubjectId(null);
  };

  const handleAddTopic = (subjectId: string) => {
    if (!newTopicName.trim() || !currentUnit) return;

    const updated = categories.map((u) => {
      if (u.id === currentUnit.id) {
        return {
          ...u,
          subjects: u.subjects.map((s) => {
            if (s.id === subjectId) {
              return {
                ...s,
                topics: [...s.topics, newTopicName.trim()],
              };
            }
            return s;
          }),
        };
      }
      return u;
    });

    onUpdateCategories(updated);
    setNewTopicName('');
    setTargetSubjectId('');
  };

  const handleSaveEditTopic = (subjectId: string, oldTopicName: string) => {
    if (!currentUnit || !editTopicName.trim()) return;
    const nextName = editTopicName.trim();

    const updated = categories.map((u) => {
      if (u.id === currentUnit.id) {
        return {
          ...u,
          subjects: u.subjects.map((s) => {
            if (s.id === subjectId) {
              return {
                ...s,
                topics: s.topics.map((t) => (t === oldTopicName ? nextName : t)),
              };
            }
            return s;
          }),
        };
      }
      return u;
    });

    onUpdateCategories(updated);
    if (oldTopicName !== nextName) {
      onRenameCategoryEntity?.('topic', oldTopicName, nextName);
    }
    setEditingTopic(null);
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (!currentUnit) return;
    const updated = categories.map((u) => {
      if (u.id === currentUnit.id) {
        return {
          ...u,
          subjects: u.subjects.filter((s) => s.id !== subjectId),
        };
      }
      return u;
    });
    onUpdateCategories(updated);
  };

  const handleDeleteTopic = (subjectId: string, topicName: string) => {
    if (!currentUnit) return;
    const updated = categories.map((u) => {
      if (u.id === currentUnit.id) {
        return {
          ...u,
          subjects: u.subjects.map((s) => {
            if (s.id === subjectId) {
              return {
                ...s,
                topics: s.topics.filter((t) => t !== topicName),
              };
            }
            return s;
          }),
        };
      }
      return u;
    });
    onUpdateCategories(updated);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Category Hierarchy</h2>
          <p className="text-xs text-slate-500">
            Create or edit Units, Subjects, and Topics directly without code changes.
          </p>
        </div>

        <button
          onClick={() => setShowAddUnitForm(true)}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Unit</span>
        </button>
      </div>

      {showAddUnitForm && (
        <form
          onSubmit={handleAddUnit}
          className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs space-y-3 text-xs"
        >
          <h4 className="font-semibold text-slate-900">Add New Specialty Unit</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cat-new-unit-name" className="block text-slate-700 mb-1">
                Unit Title
              </label>
              <input
                id="cat-new-unit-name"
                type="text"
                required
                aria-required="true"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="e.g. Molecular Pathology"
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="cat-new-unit-desc" className="block text-slate-700 mb-1">
                Description
              </label>
              <input
                id="cat-new-unit-desc"
                type="text"
                value={newUnitDesc}
                onChange={(e) => setNewUnitDesc(e.target.value)}
                placeholder="Clinical scope..."
                className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddUnitForm(false)}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-900 text-white rounded font-medium cursor-pointer"
            >
              Save Unit
            </button>
          </div>
        </form>
      )}

      {/* Two Pane */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Units */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1.5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block pb-2 border-b border-slate-100">
            Units ({categories.length})
          </span>
          <div className="space-y-1">
            {categories.map((unit) => {
              const isSelected = unit.id === currentUnit?.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => {
                    setSelectedUnitId(unit.id);
                    setIsEditingUnit(false);
                  }}
                  className={`w-full text-left p-2.5 rounded text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{unit.name}</span>
                  <span className="text-xs text-slate-400 font-mono">
                    {unit.subjects.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Subjects & Topics */}
        {currentUnit && (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
            {isEditingUnit ? (
              <form
                onSubmit={handleSaveEditUnit}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="cat-edit-unit-name" className="block font-semibold text-slate-700 mb-1">
                      Unit Name
                    </label>
                    <input
                      id="cat-edit-unit-name"
                      type="text"
                      required
                      aria-required="true"
                      value={editUnitName}
                      onChange={(e) => setEditUnitName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label htmlFor="cat-edit-unit-desc" className="block font-semibold text-slate-700 mb-1">
                      Description
                    </label>
                    <input
                      id="cat-edit-unit-desc"
                      type="text"
                      value={editUnitDesc}
                      onChange={(e) => setEditUnitDesc(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingUnit(false)}
                    className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-slate-900 text-white rounded font-medium cursor-pointer"
                  >
                    Save Unit
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{currentUnit.name}</h3>
                  <p className="text-xs text-slate-500">{currentUnit.description}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleStartEditUnit}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                    title="Rename or edit unit description"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Unit</span>
                  </button>
                  {categories.length > 1 && (
                    <button
                      onClick={() => handleDeleteUnit(currentUnit.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 border border-slate-200 rounded cursor-pointer"
                      title="Delete unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddSubjectForm(true)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Subject</span>
                  </button>
                </div>
              </div>
            )}

            {showAddSubjectForm && (
              <form
                onSubmit={handleAddSubject}
                className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center gap-2 text-xs"
              >
                <input
                  type="text"
                  required
                  aria-required="true"
                  aria-label="New Subject Title"
                  placeholder="New Subject Title..."
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded p-1.5 text-slate-900"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-slate-900 text-white rounded font-medium cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubjectForm(false)}
                  className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            <div className="space-y-3">
              {currentUnit.subjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No subjects configured.</p>
              ) : (
                currentUnit.subjects.map((sub) => (
                  <div key={sub.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      {editingSubjectId === sub.id ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input
                            type="text"
                            value={editSubjectName}
                            onChange={(e) => setEditSubjectName(e.target.value)}
                            className="flex-1 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900"
                          />
                          <button
                            onClick={() => handleSaveEditSubject(sub.id)}
                            className="p-1 bg-slate-900 rounded text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingSubjectId(null)}
                            className="p-1 bg-white border border-slate-200 rounded text-slate-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <h4 className="font-semibold text-slate-900 text-xs">{sub.name}</h4>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSubjectId(sub.id);
                            setEditSubjectName(sub.name);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          title="Rename subject"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                          title="Delete subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {sub.topics.map((top) => {
                        const isEditingThisTopic =
                          editingTopic?.subjectId === sub.id && editingTopic?.oldName === top;
                        if (isEditingThisTopic) {
                          return (
                            <span key={top} className="inline-flex items-center gap-1 text-xs">
                              <input
                                type="text"
                                value={editTopicName}
                                onChange={(e) => setEditTopicName(e.target.value)}
                                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900"
                              />
                              <button
                                onClick={() => handleSaveEditTopic(sub.id, top)}
                                className="p-1 bg-slate-900 rounded text-white cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingTopic(null)}
                                className="p-1 bg-white border border-slate-200 rounded text-slate-500 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        }

                        return (
                          <span
                            key={top}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white text-slate-700 border border-slate-200"
                          >
                            <span
                              onClick={() => {
                                setEditingTopic({ subjectId: sub.id, oldName: top });
                                setEditTopicName(top);
                              }}
                              className="cursor-pointer hover:underline"
                              title="Click to rename topic"
                            >
                              {top}
                            </span>
                            <button
                              onClick={() => handleDeleteTopic(sub.id, top)}
                              className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}

                      {targetSubjectId === sub.id ? (
                        <div className="flex items-center gap-1 text-xs">
                          <input
                            type="text"
                            placeholder="Topic title..."
                            value={newTopicName}
                            onChange={(e) => setNewTopicName(e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs text-slate-900"
                          />
                          <button
                            onClick={() => handleAddTopic(sub.id)}
                            className="p-1 bg-slate-900 rounded text-white cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setTargetSubjectId('')}
                            className="p-1 bg-white border border-slate-200 rounded text-slate-500 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setTargetSubjectId(sub.id);
                            setNewTopicName('');
                          }}
                          className="px-2 py-0.5 rounded text-xs text-slate-600 hover:bg-slate-100 border border-dashed border-slate-300 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
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
