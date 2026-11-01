import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, Folder, Search, Star, Trash2 } from 'lucide-react';
import { BookmarkMeta, MCQQuestion, UserStats } from '../../types';
import { isVisibleQuestion } from '../../utils/questionVisibility';
import {
  collectFolders,
  folderFor,
  UNFILED_FOLDER,
  MAX_FOLDER_LENGTH,
  MAX_NOTE_LENGTH,
} from '../../utils/bookmarks';
import { SITE_CONFIG } from '../../config/site';

interface BookmarksLibraryProps {
  stats: UserStats;
  questions: MCQQuestion[];
  onUpdateBookmarkMeta: (id: string, patch: Partial<BookmarkMeta>) => void;
  onToggleBookmark: (id: string) => void;
  onStartPracticeWithQuestions: (questions: MCQQuestion[]) => void;
}

interface NoteEditorProps {
  value: string;
  onSave: (note: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ value, onSave }) => {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const noteId = useId();
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    setStatus('saving');
    const timer = setTimeout(() => {
      saveRef.current(draft);
      setStatus('saved');
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, value]);

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-slate-600 block" htmlFor={noteId}>
        Study note
      </label>
      <textarea
        id={noteId}
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_NOTE_LENGTH))}
        onBlur={() => {
          if (draft !== value) {
            saveRef.current(draft);
            setStatus('saved');
          }
        }}
        rows={2}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Add a mnemonic, pitfall or why you got this wrong..."
        className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500 resize-y"
      />
      <span className="text-[10px] text-slate-400">
        {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved automatically' : 'Autosaves'}
      </span>
    </div>
  );
};

interface BookmarkCardProps {
  question: MCQQuestion;
  meta?: BookmarkMeta;
  onUpdateBookmarkMeta: (id: string, patch: Partial<BookmarkMeta>) => void;
  onToggleBookmark: (id: string) => void;
  onPractice: (question: MCQQuestion) => void;
}

const BookmarkCard: React.FC<BookmarkCardProps> = ({
  question,
  meta,
  onUpdateBookmarkMeta,
  onToggleBookmark,
  onPractice,
}) => {
  const [folderDraft, setFolderDraft] = useState(meta?.folder || UNFILED_FOLDER);

  useEffect(() => {
    setFolderDraft(meta?.folder || UNFILED_FOLDER);
  }, [meta?.folder, question.id]);

  const commitFolder = () => {
    onUpdateBookmarkMeta(question.id, { folder: folderDraft });
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-cyan-800 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200/60">
          {question.code}
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-slate-700 font-medium">{question.unit}</span>
        <span aria-hidden="true">·</span>
        <span>{question.subject}</span>
        <span aria-hidden="true">·</span>
        <span>{question.topic}</span>
        <span aria-hidden="true">·</span>
        <span>{question.difficulty}</span>
        {question.isHighYield && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            High-Yield
          </span>
        )}
      </div>

      <p className="text-sm font-medium text-slate-900 leading-snug">{question.questionText}</p>

      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,220px)_1fr] gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600 block" htmlFor={`folder-${question.id}`}>
            Folder
          </label>
          <input
            id={`folder-${question.id}`}
            list="bookmark-folder-options"
            value={folderDraft}
            maxLength={MAX_FOLDER_LENGTH}
            onChange={(e) => setFolderDraft(e.target.value)}
            onBlur={commitFolder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitFolder();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="e.g. Hematology"
            className="w-full bg-white/70 border border-slate-200/90 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500"
          />
        </div>
        <NoteEditor value={meta?.note || ''} onSave={(note) => onUpdateBookmarkMeta(question.id, { note })} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[10px] text-slate-400">
          {meta?.updatedAt ? `Updated ${new Date(meta.updatedAt).toLocaleDateString()}` : 'Saved bookmark'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleBookmark(question.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-medium cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
          <button
            type="button"
            onClick={() => onPractice(question)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
          >
            Practice
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const BookmarksLibrary: React.FC<BookmarksLibraryProps> = ({
  stats,
  questions,
  onUpdateBookmarkMeta,
  onToggleBookmark,
  onStartPracticeWithQuestions,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [query, setQuery] = useState('');

  const bookmarked = useMemo(() => {
    const ids = new Set(stats.bookmarkedIds || []);
    return questions.filter((q) => ids.has(q.id) && isVisibleQuestion(q));
  }, [questions, stats.bookmarkedIds]);

  const unavailableCount = Math.max(0, (stats.bookmarkedIds || []).length - bookmarked.length);
  const folders = useMemo(
    () => collectFolders(stats.bookmarkMeta, stats.bookmarkedIds),
    [stats.bookmarkMeta, stats.bookmarkedIds]
  );

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { [UNFILED_FOLDER]: 0 };
    for (const q of bookmarked) {
      const folder = folderFor(stats.bookmarkMeta, q.id);
      counts[folder] = (counts[folder] || 0) + 1;
    }
    return counts;
  }, [bookmarked, stats.bookmarkMeta]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return bookmarked.filter((q) => {
      const folder = folderFor(stats.bookmarkMeta, q.id);
      if (selectedFolder !== 'All' && folder !== selectedFolder) return false;
      if (!needle) return true;
      const note = stats.bookmarkMeta?.[q.id]?.note || '';
      return (
        q.questionText.toLowerCase().includes(needle) ||
        q.code.toLowerCase().includes(needle) ||
        q.subject.toLowerCase().includes(needle) ||
        q.topic.toLowerCase().includes(needle) ||
        note.toLowerCase().includes(needle)
      );
    });
  }, [bookmarked, selectedFolder, query, stats.bookmarkMeta]);

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <title>Bookmarks & Notes | MedLab QBank</title>
      <meta
        name="description"
        content="Saved laboratory medicine questions with personal study notes, folders and bookmark-only practice."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/bookmarks`} />
      <meta name="robots" content="noindex,nofollow" />

      <datalist id="bookmark-folder-options">
        {folders.map((folder) => (
          <option key={folder} value={folder} />
        ))}
      </datalist>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-600" />
            Bookmark library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {bookmarked.length} saved question{bookmarked.length === 1 ? '' : 's'} · {folders.length} folder
            {folders.length === 1 ? '' : 's'} · notes save automatically
          </p>
        </div>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => onStartPracticeWithQuestions(filtered)}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-2 cursor-pointer shrink-0"
          >
            Practice {filtered.length} bookmark{filtered.length === 1 ? '' : 's'}
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        )}
      </div>

      {bookmarked.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-3">
          <Bookmark className="w-9 h-9 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">No bookmarks yet</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tap the bookmark icon on any question in Browse, Practice, the daily question or a mock review
            to save it here with notes and folders.
          </p>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium"
          >
            Browse questions
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </Link>
        </div>
      ) : (
        <>
          <div className="glass-panel rounded-xl p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bookmarks and notes..."
                aria-label="Search bookmarks and notes"
                className="w-full bg-white/70 border border-slate-200/90 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-xs text-slate-500 shrink-0">
              {filtered.length} of {bookmarked.length}
            </span>
          </div>

          {/* Folder chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {['All', UNFILED_FOLDER, ...folders].map((folder) => {
              const count = folder === 'All' ? bookmarked.length : folderCounts[folder] || 0;
              return (
                <button
                  key={folder}
                  type="button"
                  onClick={() => setSelectedFolder(folder)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    selectedFolder === folder
                      ? 'bg-cyan-700 text-white border-cyan-700'
                      : 'bg-white/70 text-slate-700 border-slate-200/90 hover:bg-white'
                  }`}
                >
                  {folder !== 'All' && <Folder className="w-3 h-3" />}
                  {folder}
                  <span className={selectedFolder === folder ? 'text-cyan-100' : 'text-slate-400'}>{count}</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center text-xs text-slate-500">
              No bookmarks match this folder or search.
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((question) => (
                <BookmarkCard
                  key={question.id}
                  question={question}
                  meta={stats.bookmarkMeta?.[question.id]}
                  onUpdateBookmarkMeta={onUpdateBookmarkMeta}
                  onToggleBookmark={onToggleBookmark}
                  onPractice={(q) => onStartPracticeWithQuestions([q])}
                />
              ))}
            </div>
          )}

          {unavailableCount > 0 && (
            <p className="text-xs text-amber-700">
              {unavailableCount} saved question{unavailableCount === 1 ? ' is' : 's are'} no longer in the
              published bank and cannot be opened.
            </p>
          )}
        </>
      )}
    </div>
  );
};
