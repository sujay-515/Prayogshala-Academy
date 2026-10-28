import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  PlusCircle,
  Layers,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { MCQQuestion, UnitCategory } from '../../types';

interface AdminDashboardProps {
  questions: MCQQuestion[];
  categories: UnitCategory[];
  onNavigateSubtab: (subtab: 'dashboard' | 'pdf' | 'manual' | 'categories' | 'bulk' | 'reports') => void;
  pendingReportsCount: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  questions,
  categories,
  onNavigateSubtab,
  pendingReportsCount,
}) => {
  const totalCount = questions.length;
  const publishedCount = questions.filter((q) => q.status === 'Published').length;
  const draftCount = questions.filter((q) => q.status === 'Draft').length;
  const underReviewCount = questions.filter((q) => q.status === 'Under-Review').length;
  const archivedCount = questions.filter((q) => q.status === 'Archived').length;

  const unitStats: Record<string, number> = {};
  for (const q of questions) {
    unitStats[q.unit] = (unitStats[q.unit] || 0) + 1;
  }

  const diffStats = {
    'Memory-based': questions.filter((q) => q.difficulty === 'Memory-based').length,
    Conceptual: questions.filter((q) => q.difficulty === 'Conceptual').length,
    Advanced: questions.filter((q) => q.difficulty === 'Advanced').length,
  };

  const examStats: Record<string, number> = {
    ASCP: questions.filter((q) => q.examCategories.includes('ASCP')).length,
    NHPC: questions.filter((q) => q.examCategories.includes('NHPC')).length,
    PSC: questions.filter((q) => q.examCategories.includes('PSC')).length,
    DHA: questions.filter((q) => q.examCategories.includes('DHA')).length,
    AIMS: questions.filter((q) => q.examCategories.includes('AIMS')).length,
  };

  const [breakdownSearch, setBreakdownSearch] = useState('');
  const [expandedUnitNames, setExpandedUnitNames] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.name))
  );

  const toggleUnitExpanded = (unitName: string) => {
    setExpandedUnitNames((prev) => {
      const next = new Set(prev);
      if (next.has(unitName)) next.delete(unitName);
      else next.add(unitName);
      return next;
    });
  };

  // Detailed hierarchical counts: Unit -> Subject -> Topic -> count
  const hierarchyCounts = useMemo(() => {
    const data: Record<
      string,
      {
        total: number;
        published: number;
        draft: number;
        subjects: Record<
          string,
          {
            total: number;
            published: number;
            topics: Record<string, { total: number; published: number }>;
          }
        >;
      }
    > = {};

    for (const cat of categories) {
      data[cat.name] = { total: 0, published: 0, draft: 0, subjects: {} };
      for (const subj of cat.subjects) {
        data[cat.name].subjects[subj.name] = { total: 0, published: 0, topics: {} };
        for (const top of subj.topics) {
          data[cat.name].subjects[subj.name].topics[top] = { total: 0, published: 0 };
        }
      }
    }

    for (const q of questions) {
      if (!data[q.unit]) {
        data[q.unit] = { total: 0, published: 0, draft: 0, subjects: {} };
      }
      data[q.unit].total++;
      if (q.status === 'Published') data[q.unit].published++;
      else data[q.unit].draft++;

      if (q.subject) {
        if (!data[q.unit].subjects[q.subject]) {
          data[q.unit].subjects[q.subject] = { total: 0, published: 0, topics: {} };
        }
        data[q.unit].subjects[q.subject].total++;
        if (q.status === 'Published') data[q.unit].subjects[q.subject].published++;

        if (q.topic) {
          if (!data[q.unit].subjects[q.subject].topics[q.topic]) {
            data[q.unit].subjects[q.subject].topics[q.topic] = { total: 0, published: 0 };
          }
          data[q.unit].subjects[q.subject].topics[q.topic].total++;
          if (q.status === 'Published') data[q.unit].subjects[q.subject].topics[q.topic].published++;
        }
      }
    }

    return data;
  }, [categories, questions]);

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded">
          <span className="text-xs font-medium text-slate-500 block">Total MCQs</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{totalCount}</span>
          <span className="text-xs text-slate-500">Total in repository</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded">
          <span className="text-xs font-medium text-slate-500 block">Published</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{publishedCount}</span>
          <span className="text-xs text-emerald-700">Live to students</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded">
          <span className="text-xs font-medium text-slate-500 block">Draft / Staging</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{draftCount}</span>
          <span className="text-xs text-amber-700">Pending review</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded">
          <span className="text-xs font-medium text-slate-500 block">Under Review</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{underReviewCount}</span>
          <span className="text-xs text-slate-500">In verification</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded">
          <span className="text-xs font-medium text-slate-500 block">Archived</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{archivedCount}</span>
          <span className="text-xs text-slate-500">Inactive records</span>
        </div>

        <div className="bg-white border border-slate-200 p-3.5 rounded">
          <span className="text-xs font-medium text-slate-500 block">Student Reports</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{pendingReportsCount}</span>
          <span className="text-xs text-rose-700">Flagged issues</span>
        </div>
      </div>

      {/* Operational Workspace Toolbar */}
      <div className="bg-white border border-slate-200 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold text-slate-900 text-xs sm:text-sm">Administrative Workspaces</h4>
          <p className="text-xs text-slate-500 mt-0.5">Ingest examinations from PDF, author or revise MCQs, and configure the specialty taxonomy.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateSubtab('pdf')}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>PDF Ingestion</span>
          </button>

          <button
            onClick={() => onNavigateSubtab('manual')}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Question Editor</span>
          </button>

          <button
            onClick={() => onNavigateSubtab('categories')}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-slate-600" />
            <span>Taxonomy Hierarchy</span>
          </button>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unit Breakdown */}
        <div className="bg-white border border-slate-200 rounded p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Questions by Laboratory Unit
          </h3>

          <div className="space-y-2.5">
            {categories.map((cat) => {
              const count = unitStats[cat.name] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={cat.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{cat.name}</span>
                    <span className="text-slate-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cognitive Difficulty & Exam Coverage */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Cognitive Difficulty
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Memory-based</span>
                <span className="text-base font-bold text-slate-900">{diffStats['Memory-based']}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Conceptual</span>
                <span className="text-base font-bold text-slate-900">{diffStats['Conceptual']}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <span className="text-slate-500 block mb-0.5">Advanced</span>
                <span className="text-base font-bold text-slate-900">{diffStats['Advanced']}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Licensing Syllabus Coverage
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center text-xs">
              {Object.entries(examStats).map(([exam, count]) => (
                <div key={exam} className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="font-semibold text-slate-800 block">{exam}</span>
                  <span className="text-slate-600 font-medium">{count} Qs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchical Counts by Unit, Subject, and Topic */}
      <div className="bg-white border border-slate-200 rounded p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Hierarchical Breakdown by Unit, Subject & Topic
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live census of all question records across curriculum categories and publication states
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={breakdownSearch}
                onChange={(e) => setBreakdownSearch(e.target.value)}
                placeholder="Search subject or topic..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-48 sm:w-60"
              />
            </div>
            <button
              onClick={() => {
                if (expandedUnitNames.size === categories.length) {
                  setExpandedUnitNames(new Set());
                } else {
                  setExpandedUnitNames(new Set(categories.map((c) => c.name)));
                }
              }}
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap"
            >
              {expandedUnitNames.size === categories.length ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {categories.map((cat) => {
            const unitData = hierarchyCounts[cat.name] || { total: 0, published: 0, draft: 0, subjects: {} };
            const isExpanded = expandedUnitNames.has(cat.name);

            // Filter subjects if search query is present
            const subjectsList = Object.entries(unitData.subjects).filter(([subjName, subjData]) => {
              if (!breakdownSearch.trim()) return true;
              const q = breakdownSearch.toLowerCase();
              if (subjName.toLowerCase().includes(q)) return true;
              if (cat.name.toLowerCase().includes(q)) return true;
              return Object.keys(subjData.topics).some((top) => top.toLowerCase().includes(q));
            });

            if (breakdownSearch.trim() && subjectsList.length === 0 && !cat.name.toLowerCase().includes(breakdownSearch.toLowerCase())) {
              return null;
            }

            return (
              <div key={cat.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleUnitExpanded(cat.name)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                    <span className="font-semibold text-slate-900 text-xs sm:text-sm">{cat.name}</span>
                    <span className="text-xs text-slate-500">
                      ({Object.keys(unitData.subjects).length} subjects)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                      {unitData.published} Published
                    </span>
                    {unitData.draft > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
                        {unitData.draft} Draft/Review
                      </span>
                    )}
                    <span className="font-semibold text-slate-700 text-xs">
                      Total: {unitData.total}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-3 bg-white divide-y divide-slate-100 space-y-2">
                    {subjectsList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 px-2">No subjects matching filter.</p>
                    ) : (
                      subjectsList.map(([subjName, subjData]) => (
                        <div key={subjName} className="pt-2 first:pt-0 space-y-1.5">
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="font-medium text-slate-800">{subjName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-700">
                                {subjData.published} pub
                              </span>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs font-semibold text-slate-600">
                                {subjData.total} Qs
                              </span>
                            </div>
                          </div>

                          {/* Topics List */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-2">
                            {Object.entries(subjData.topics).map(([topName, topData]) => (
                              <div
                                key={topName}
                                className="bg-slate-50/70 border border-slate-100 rounded px-2.5 py-1 flex items-center justify-between text-xs"
                              >
                                <span className="text-slate-700 truncate mr-2" title={topName}>
                                  {topName}
                                </span>
                                <span className="font-mono text-slate-500 font-medium shrink-0">
                                  {topData.total}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
