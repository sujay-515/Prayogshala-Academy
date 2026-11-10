import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  ShieldAlert,
  ShieldCheck,
  Search,
  Plus,
  Mail,
  Calendar,
  Sparkles,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { Modal } from '../common/Modal';

interface ManagedUser {
  id: string;
  username: string;
  email: string | null;
  role: 'superadmin' | 'admin' | 'student';
  displayName: string;
  createdAt: string;
  totalAnswered: number;
  totalCorrect: number;
}

interface AdminSubscription {
  id: string;
  userId: string;
  planId: string | null;
  status: string;
  source: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  username?: string;
  displayName?: string;
}

interface UserManagerProps {
  currentUser?: UserAccount | null;
  authToken?: string | null;
}

export const UserManager: React.FC<UserManagerProps> = ({ currentUser, authToken }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'staff' | 'student'>('staff');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Invite Form State
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'student'>('admin');
  const [invitePassword, setInvitePassword] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; tempPassword?: string; message?: string } | null>(null);

  // Subscriptions & Grant Modal State
  const [subscriptions, setSubscriptions] = useState<Record<string, AdminSubscription>>({});
  const [grantTargetUser, setGrantTargetUser] = useState<ManagedUser | null>(null);
  const [grantDurationDays, setGrantDurationDays] = useState<number>(30);
  const [isGranting, setIsGranting] = useState<boolean>(false);

  const isSuperAdmin = currentUser?.role === 'superadmin';

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch('/api/admin/users', { headers });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch('/api/admin/subscriptions', { headers });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.subscriptions)) {
        const map: Record<string, AdminSubscription> = {};
        const now = new Date().toISOString();
        for (const sub of data.subscriptions) {
          if (sub.status === 'active' && sub.expiresAt > now) {
            if (!map[sub.userId] || map[sub.userId].status !== 'active') {
              map[sub.userId] = sub;
            }
          } else if (!map[sub.userId]) {
            map[sub.userId] = sub;
          }
        }
        setSubscriptions(map);
      }
    } catch (e) {
      console.error('Failed to fetch subscriptions:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSubscriptions();
  }, [authToken]);

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantTargetUser) return;
    setIsGranting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/users/${encodeURIComponent(grantTargetUser.id)}/subscription`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ durationDays: grantDurationDays }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.subscription) {
        setSubscriptions((prev) => ({
          ...prev,
          [grantTargetUser.id]: data.subscription,
        }));
        setActionMessage({
          text: `Granted ${grantDurationDays}-day full access to ${grantTargetUser.displayName}.`,
          type: 'success',
        });
        setGrantTargetUser(null);
      } else {
        setActionMessage({ text: data.error || 'Failed to grant subscription.', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Network error granting subscription.', type: 'error' });
    } finally {
      setIsGranting(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleRevokeSubscription = async (user: ManagedUser) => {
    if (!window.confirm(`Revoke full access subscription for ${user.displayName}?`)) {
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/subscription`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubscriptions((prev) => {
          const updated = { ...prev };
          delete updated[user.id];
          return updated;
        });
        setActionMessage({
          text: `Revoked full access for ${user.displayName}.`,
          type: 'success',
        });
      } else {
        setActionMessage({ text: data.error || 'Failed to revoke subscription.', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Network error revoking subscription.', type: 'error' });
    }
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'student') => {
    if (!isSuperAdmin) {
      setActionMessage({ text: 'Only the Head Administrator can modify account roles.', type: 'error' });
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  role: newRole,
                  ...(newRole === 'admin' ? { totalAnswered: 0, totalCorrect: 0 } : {}),
                }
              : u
          )
        );
        setActionMessage({
          text: `Account role updated to ${newRole === 'admin' ? 'Staff Administrator' : 'Student Candidate'}.`,
          type: 'success',
        });
      } else {
        setActionMessage({ text: data.error || 'Failed to update role.', type: 'error' });
      }
    } catch {
      setActionMessage({ text: 'Network error while updating role.', type: 'error' });
    }

    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          displayName: inviteDisplayName,
          email: inviteEmail,
          username: inviteUsername,
          role: inviteRole,
          password: invitePassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setInviteResult({
          success: true,
          tempPassword: data.tempPassword,
          message: 'Staff account created successfully! An invitation email has been dispatched via Resend.',
        });
        fetchUsers();
        // Reset form
        setInviteDisplayName('');
        setInviteEmail('');
        setInviteUsername('');
        setInvitePassword('');
      } else {
        setInviteResult({
          success: false,
          message: data.error || 'Failed to create staff member account.',
        });
      }
    } catch {
      setInviteResult({ success: false, message: 'Server communication error.' });
    } finally {
      setIsInviting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q));

    const matchesRole =
      (roleFilter === 'staff' && (u.role === 'admin' || u.role === 'superadmin')) ||
      (roleFilter === 'student' && u.role === 'student');

    return matchesSearch && matchesRole;
  });

  const staffCount = users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length;
  const studentCount = users.filter((u) => u.role === 'student').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Metric Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-700" />
            <span>Staff & User Administration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pathology faculty staff privileges, candidate accounts, and automated Resend email invites.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh user accounts"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-600' : ''}`} />
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => {
                setIsInviteModalOpen(true);
                setInviteResult(null);
              }}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-700 to-teal-700 hover:from-cyan-800 hover:to-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add / Invite Staff</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered candidates & staff</div>
        </div>

        <div className="p-4 bg-white border border-cyan-200/80 rounded-xl shadow-2xs bg-gradient-to-br from-cyan-50/40 to-transparent">
          <div className="flex items-center justify-between text-xs text-cyan-800 font-medium">
            <span>Pathology Staff & Admins</span>
            <ShieldCheck className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-cyan-950 mt-1">{staffCount}</div>
          <div className="text-[11px] text-cyan-700 mt-0.5">Full QBank & ingestion access</div>
        </div>

        <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Candidate Students</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{studentCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active exam & practice test takers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="w-full bg-slate-50 text-xs sm:text-sm text-slate-900 placeholder-slate-400 rounded-lg pl-9 pr-3 py-1.5 border border-slate-200 focus:bg-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setRoleFilter('staff')}
            aria-pressed={roleFilter === 'staff'}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-all ${
              roleFilter === 'staff' ? 'bg-white text-cyan-950 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff ({staffCount})
          </button>
          <button
            onClick={() => setRoleFilter('student')}
            aria-pressed={roleFilter === 'student'}
            className={`px-3 py-1 rounded-md font-medium cursor-pointer transition-all ${
              roleFilter === 'student' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Students ({studentCount})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Account Holder</th>
                <th className="px-4 py-3">Email Address</th>
                {roleFilter === 'staff' && <th className="px-4 py-3">Current Role</th>}
                {roleFilter === 'student' && <th className="px-4 py-3">Study Progress</th>}
                {roleFilter === 'student' && <th className="px-4 py-3">Access / Plan</th>}
                <th className="px-4 py-3">Joined Date</th>
                {roleFilter === 'staff' && <th className="px-4 py-3 text-right">Privilege Controls</th>}
                {roleFilter === 'student' && <th className="px-4 py-3 text-right">Subscription Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={roleFilter === 'staff' ? 5 : 6} className="px-4 py-8 text-center text-slate-400">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isHead = u.role === 'superadmin';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isHead
                                ? 'bg-slate-900 text-cyan-300'
                                : u.role === 'admin'
                                ? 'bg-cyan-100 text-cyan-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{u.displayName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {u.email ? (
                          <span className="text-slate-700 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{u.email}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No email set</span>
                        )}
                      </td>

                      {roleFilter === 'staff' && (
                        <td className="px-4 py-3">
                          {isHead ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-cyan-300 border border-cyan-400/30">
                              <ShieldAlert className="w-3 h-3 text-cyan-400" />
                              <span>Head Administrator</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
                              <ShieldCheck className="w-3 h-3 text-cyan-700" />
                              <span>Staff Administrator</span>
                            </span>
                          )}
                        </td>
                      )}

                      {roleFilter === 'student' && (
                        <td className="px-4 py-3 text-slate-600">
                          {u.totalAnswered > 0 ? (
                            <span>
                              {u.totalAnswered} MCQs ({Math.round((u.totalCorrect / u.totalAnswered) * 100)}% accuracy)
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}

                      {roleFilter === 'student' && (
                        <td className="px-4 py-3">
                          {(() => {
                            const sub = subscriptions[u.id];
                            const isActive = sub && sub.status === 'active' && new Date(sub.expiresAt) > new Date();
                            if (isActive) {
                              return (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                    <Crown className="w-3 h-3 text-emerald-700" />
                                    <span>Full Access</span>
                                  </span>
                                  <div className="text-[10px] text-slate-500">
                                    Expires {sub.expiresAt.slice(0, 10)}
                                    <span className="text-slate-400"> ({sub.source})</span>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                <span>Free Quota</span>
                              </span>
                            );
                          })()}
                        </td>
                      )}

                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{u.createdAt ? u.createdAt.slice(0, 10) : '—'}</span>
                        </span>
                      </td>

                      {roleFilter === 'staff' && (
                        <td className="px-4 py-3 text-right">
                          {isHead ? (
                            <span className="text-[11px] text-slate-400 italic">Root Authority</span>
                          ) : isSuperAdmin ? (
                            <button
                              onClick={() => handleRoleChange(u.id, 'student')}
                              className="px-2.5 py-1 rounded-md text-[11px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer"
                              title="Demote to Student Candidate"
                            >
                              Demote to Student
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">Restricted</span>
                          )}
                        </td>
                      )}

                      {roleFilter === 'student' && (
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const sub = subscriptions[u.id];
                            const isActive = sub && sub.status === 'active' && new Date(sub.expiresAt) > new Date();
                            return (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGrantTargetUser(u);
                                    setGrantDurationDays(30);
                                  }}
                                  className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer"
                                  title={isActive ? 'Extend Full Access' : 'Grant Full Access'}
                                >
                                  {isActive ? 'Extend' : 'Grant Access'}
                                </button>
                                {isActive && (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeSubscription(u)}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                                    title="Revoke subscription"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Staff Member Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        titleId="invite-staff-modal-title"
        maxWidth="max-w-md"
      >
        <div className="bg-white border border-slate-200 w-full rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
                <ShieldCheck className="w-4 h-4 text-cyan-700" />
              </div>
              <h3 id="invite-staff-modal-title" className="font-semibold text-slate-900 text-sm">
                Add / Invite Pathology Staff
              </h3>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(false)}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

            {inviteResult && (
              <div
                className={`p-3 rounded-xl text-xs font-medium space-y-1 ${
                  inviteResult.success
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-rose-50 text-rose-900 border border-rose-200'
                }`}
              >
                <p>{inviteResult.message}</p>
                {inviteResult.tempPassword && (
                  <p className="font-mono bg-white p-2 rounded border border-emerald-200 select-all">
                    Password: <strong>{inviteResult.tempPassword}</strong>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label htmlFor="invite-display-name" className="block font-semibold text-slate-700 mb-1">
                  Full Name & Title
                </label>
                <input
                  id="invite-display-name"
                  type="text"
                  required
                  aria-required="true"
                  value={inviteDisplayName}
                  onChange={(e) => setInviteDisplayName(e.target.value)}
                  placeholder="e.g. Dr. Priya Sharma, MD (Pathology)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label htmlFor="invite-email" className="block font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  aria-required="true"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. priya.sharma@hospital.org"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Resend will automatically dispatch credentials and login link to this address.
                </span>
              </div>

              <div>
                <label htmlFor="invite-username" className="block font-semibold text-slate-700 mb-1">
                  Staff Username
                </label>
                <input
                  id="invite-username"
                  type="text"
                  required
                  aria-required="true"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="e.g. dr_sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label htmlFor="invite-role" className="block font-semibold text-slate-700 mb-1">
                  Assigned Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="admin">Staff Administrator (Manage QBank & Reports)</option>
                  <option value="student">Student Candidate (Read & Attempt Only)</option>
                </select>
              </div>

              <div>
                <label htmlFor="invite-password" className="block font-semibold text-slate-700 mb-1">
                  Custom Password <span className="font-normal text-slate-400">(Optional — auto-generated if empty)</span>
                </label>
                <input
                  id="invite-password"
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Leave empty for auto-generated temporary key"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-700 to-teal-700 hover:from-cyan-800 hover:to-teal-800 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-xs transition-all cursor-pointer"
                >
                  {isInviting ? 'Sending Invite...' : 'Create & Send Email Invite'}
                </button>
              </div>
            </form>
          </div>
        </Modal>

      {/* Grant Full Access Modal */}
      <Modal
        isOpen={Boolean(grantTargetUser)}
        onClose={() => setGrantTargetUser(null)}
        titleId="grant-subscription-modal-title"
        maxWidth="max-w-md"
      >
        <div className="bg-white border border-slate-200 w-full rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <Crown className="w-4 h-4 text-emerald-700" />
              </div>
              <h3 id="grant-subscription-modal-title" className="font-semibold text-slate-900 text-sm">
                Grant Full Access Subscription
              </h3>
            </div>
            <button
              onClick={() => setGrantTargetUser(null)}
              aria-label="Close dialog"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {grantTargetUser && (
            <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="text-slate-500">Candidate Student:</div>
                <div className="font-semibold text-slate-900 text-sm mt-0.5">{grantTargetUser.displayName}</div>
                <div className="text-slate-400 font-mono text-[11px]">
                  @{grantTargetUser.username} {grantTargetUser.email ? `· ${grantTargetUser.email}` : ''}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5 text-xs">
                  Select Access Duration
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {[
                    { label: '30 Days (1 Mo)', days: 30 },
                    { label: '90 Days (3 Mo)', days: 90 },
                    { label: '180 Days (6 Mo)', days: 180 },
                    { label: '365 Days (1 Yr)', days: 365 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setGrantDurationDays(preset.days)}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        grantDurationDays === preset.days
                          ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-950 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2">
                  <label htmlFor="custom-duration" className="block text-[11px] font-medium text-slate-500 mb-1">
                    Or custom duration (days):
                  </label>
                  <input
                    id="custom-duration"
                    type="number"
                    min={1}
                    max={3660}
                    value={grantDurationDays}
                    onChange={(e) => setGrantDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGrantTargetUser(null)}
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGranting}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{isGranting ? 'Granting...' : `Grant ${grantDurationDays} Days Access`}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
