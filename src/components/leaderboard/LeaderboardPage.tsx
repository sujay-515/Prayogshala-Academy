import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, RefreshCw, Trophy } from 'lucide-react';
import { SITE_CONFIG } from '../../config/site';
import { formatCountdown, formatNepalTime } from '../../utils/examWindow';

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  percentage: number;
  correctCount: number;
  total: number;
  timeSpentSeconds: number;
  negativeMarking: boolean;
  completedAt: string;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  window: { isOpen: boolean; opensAt: string; closesAt: string };
  windowStart: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  me: (LeaderboardEntry & { percentile: number }) | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (v: number) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export const LeaderboardPage: React.FC = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('medlab_qbank_auth_token_v1');
    fetch('/api/leaderboard?limit=25', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((payload) => {
        if (!payload?.success) throw new Error(payload?.error || 'Unable to load leaderboard.');
        setData(payload as LeaderboardData);
      })
      .catch((err: Error) => setError(err.message || 'Unable to load leaderboard.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const windowLabel = useMemo(() => {
    if (!data) return '';
    const opens = Date.parse(data.window.opensAt);
    const closes = Date.parse(data.window.closesAt);
    const isOpen = now >= opens && now <= closes;
    return isOpen
      ? `Open now · closes ${formatNepalTime(new Date(closes))} (in ${formatCountdown(closes - now)})`
      : `Closed · opens ${formatNepalTime(new Date(opens))} (in ${formatCountdown(opens - now)})`;
  }, [data, now]);

  const isWindowOpen = data ? now >= Date.parse(data.window.opensAt) && now <= Date.parse(data.window.closesAt) : false;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <title>Grand Test Leaderboard | MedLab QBank</title>
      <meta
        name="description"
        content="Weekly Grand Test leaderboard with national ranking, scores and completion times."
      />
      <link rel="canonical" href={`${SITE_CONFIG.SITE_URL}/leaderboard`} />
      <meta name="robots" content="noindex,nofollow" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Grand Test Leaderboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Best attempt per candidate in this weekly window. Nepal time (UTC+05:45).
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/exam"
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5"
          >
            Take a Grand Test
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </Link>
          <button
            type="button"
            onClick={load}
            aria-label="Refresh leaderboard"
            className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Window status */}
      <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Clock className={`w-4 h-4 ${isWindowOpen ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span className={`font-medium ${isWindowOpen ? 'text-emerald-800' : 'text-amber-800'}`}>
            {windowLabel || 'Loading window...'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">Only signed-in candidates are ranked.</span>
          {data && (
            <span className="text-xs text-slate-500">
              {data.totalParticipants} participant{data.totalParticipants === 1 ? '' : 's'} this window
            </span>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-950 text-xs">
          {error}
        </div>
      )}

      {data?.me && (
        <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 border border-cyan-200">
          <div>
            <span className="text-xs text-slate-500 block">Your standing</span>
            <span className="text-lg font-bold text-slate-900">
              Rank #{data.me.rank} of {data.totalParticipants}
            </span>
            <span className="text-xs text-slate-500 block">
              Top {data.me.percentile}% · best {data.me.percentage}% ({data.me.correctCount}/{data.me.total})
            </span>
          </div>
          <span className="text-xs text-cyan-800 font-medium">Keep going — retake to improve your best score.</span>
        </div>
      )}

      {isLoading && !data ? (
        <div className="glass-panel rounded-2xl p-10 text-center text-xs text-slate-500">
          Loading leaderboard...
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto" />
          <h2 className="text-base font-semibold text-slate-900">No Grand Test attempts yet</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isWindowOpen
              ? 'Be the first to post a score in this window. Complete a 200-question Grand Test to appear here.'
              : 'The window is closed. The leaderboard will populate when the next Grand Test window opens.'}
          </p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Rank</th>
                  <th className="px-4 py-2.5 font-semibold">Candidate</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Score</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Time</th>
                  <th className="px-4 py-2.5 font-semibold text-right hidden sm:table-cell">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.entries.map((entry) => (
                  <tr
                    key={`${entry.rank}-${entry.displayName}`}
                    className={entry.isCurrentUser ? 'bg-cyan-50 font-medium' : ''}
                  >
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full text-[11px] font-bold ${
                          entry.rank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : entry.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : entry.rank === 3
                                ? 'bg-orange-100 text-orange-900'
                                : 'text-slate-500'
                        }`}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-800">
                      {entry.displayName}
                      {entry.isCurrentUser && <span className="ml-1.5 text-[10px] text-cyan-800">(you)</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-semibold text-slate-900">{entry.percentage}%</span>
                      <span className="block text-[10px] text-slate-500">
                        {entry.correctCount}/{entry.total}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                      {formatDuration(entry.timeSpentSeconds)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500 hidden sm:table-cell">
                      {new Date(entry.completedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2.5 text-[11px] text-slate-500 border-t border-slate-100">
            Ranked by percentage, then correct answers, then completion time. Only Grand Tests
            (200 questions, 3 hours) count.
          </p>
        </div>
      )}
    </div>
  );
};
