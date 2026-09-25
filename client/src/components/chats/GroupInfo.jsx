import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectChats,
  updateGroupSettings,
  manageGroupAdmins,
  removeGroupMember,
  generateGroupInviteLink
} from '../../redux/slices/chatsSlice';
import { selectUser } from '../../redux/slices/authSlice';
import { useNotification } from '../../hooks/useNotification';
import { CHAT_ROUTES } from '../../../routes/routes';
import AppHeader from '../layout/AppHeader';
import { getImageUrl } from '../../lib/imageUtils';
import {
  Users,
  Shield,
  Copy,
  RefreshCw,
  LogOut,
  Check,
  Pencil,
  X,
  UserX,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export default function GroupInfo() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  
  const user = useSelector(selectUser);
  const chats = useSelector(selectChats);
  const group = chats.find((c) => c._id === groupId);

  // Editing state for group name & description
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group?.groupName || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editedDesc, setEditedDesc] = useState(group?.groupDescription || '');

  // Loading/submitting states
  const [submitting, setSubmitting] = useState(false);

  if (!group || !group.isGroupChat) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 animate-fade-in">
        <AppHeader title="Group Info" />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 dark:text-zinc-500">
          <Users size={48} className="mb-4 opacity-50" />
          <p className="font-medium text-sm">Group not found or has been deleted.</p>
        </div>
      </div>
    );
  }

  const isGroupAdmin = group.groupAdmins?.some(
    (admin) => (admin._id || admin) === user?.id
  );

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      showNotification('Group name cannot be empty', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await dispatch(
        updateGroupSettings({ chatId: group._id, groupName: editedName.trim() })
      ).unwrap();
      showNotification('Group name updated successfully', 'success');
      setIsEditingName(false);
    } catch (err) {
      showNotification(err || 'Failed to update group name', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDesc = async () => {
    try {
      setSubmitting(true);
      await dispatch(
        updateGroupSettings({ chatId: group._id, groupDescription: editedDesc.trim() })
      ).unwrap();
      showNotification('Group description updated successfully', 'success');
      setIsEditingDesc(false);
    } catch (err) {
      showNotification(err || 'Failed to update description', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleInvitePermission = async () => {
    try {
      setSubmitting(true);
      await dispatch(
        updateGroupSettings({
          chatId: group._id,
          allowMembersToInvite: !group.allowMembersToInvite
        })
      ).unwrap();
      showNotification('Invite permission updated', 'success');
    } catch (err) {
      showNotification(err || 'Failed to update settings', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateLimit = async (limitVal) => {
    const val = parseInt(limitVal);
    if (isNaN(val) || val < group.participants.length || val > 500) {
      showNotification(
        `Limit must be between ${group.participants.length} and 500`,
        'error'
      );
      return;
    }
    try {
      setSubmitting(true);
      await dispatch(
        updateGroupSettings({ chatId: group._id, memberLimit: val })
      ).unwrap();
      showNotification('Member limit updated', 'success');
    } catch (err) {
      showNotification(err || 'Failed to update member limit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegenerateInviteCode = async () => {
    try {
      setSubmitting(true);
      await dispatch(generateGroupInviteLink({ chatId: group._id })).unwrap();
      showNotification('Invite code regenerated successfully', 'success');
    } catch (err) {
      showNotification(err || 'Failed to regenerate invite link', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join?code=${group.inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    showNotification('Invite link copied to clipboard!', 'success');
  };

  const handlePromoteDemote = async (memberId, isAdmin) => {
    const action = isAdmin ? 'demote' : 'promote';
    try {
      setSubmitting(true);
      await dispatch(
        manageGroupAdmins({ chatId: group._id, targetUserId: memberId, action })
      ).unwrap();
      showNotification(
        `Member ${isAdmin ? 'demoted from admin' : 'promoted to admin'}`,
        'success'
      );
    } catch (err) {
      showNotification(err || 'Failed to update admin role', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKickMember = async (memberId) => {
    if (window.confirm('Are you sure you want to remove this member from the group?')) {
      try {
        setSubmitting(true);
        await dispatch(
          removeGroupMember({
            chatId: group._id,
            targetUserId: memberId,
            currentUserId: user?.id
          })
        ).unwrap();
        showNotification('Member removed from the group', 'success');
      } catch (err) {
        showNotification(err || 'Failed to remove member', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleLeaveGroupAction = async () => {
    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        setSubmitting(true);
        await dispatch(
          removeGroupMember({
            chatId: group._id,
            targetUserId: user?.id,
            currentUserId: user?.id
          })
        ).unwrap();
        showNotification('You have left the group', 'success');
        navigate(CHAT_ROUTES.root);
      } catch (err) {
        showNotification(err || 'Failed to leave group', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50/50 dark:bg-zinc-950/40 overflow-y-auto animate-fade-in">
      <AppHeader title="Group Details" />

      <div className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
          <div className="relative group mb-4">
            {group.groupPhoto ? (
              <img
                src={getImageUrl(group.groupPhoto)}
                alt={group.groupName}
                className="w-24 h-24 object-cover rounded-full border-2 border-indigo-500/20 shadow-md"
              />
            ) : (
              <div className="h-24 w-24 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-100 dark:border-zinc-800 shadow-inner">
                <Users size={36} />
              </div>
            )}
          </div>

          {/* Group Name Editing */}
          {isEditingName ? (
            <div className="flex items-center gap-2 max-w-md w-full justify-center">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                maxLength={32}
                disabled={submitting}
                className="px-3.5 py-1.5 text-base text-center bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100 w-full"
                placeholder="Enter Group Name"
              />
              <button
                onClick={handleSaveName}
                disabled={submitting}
                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition shadow-sm active:scale-95 flex-shrink-0"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setEditedName(group.groupName);
                  setIsEditingName(false);
                }}
                disabled={submitting}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 rounded-xl transition active:scale-95 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 group">
              <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100">
                {group.groupName}
              </h3>
              {isGroupAdmin && (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition"
                  title="Edit Group Name"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
          )}

          {/* Group Description Editing */}
          <div className="mt-2 w-full max-w-lg">
            {isEditingDesc ? (
              <div className="flex gap-2 w-full mt-1.5">
                <textarea
                  value={editedDesc}
                  onChange={(e) => setEditedDesc(e.target.value)}
                  maxLength={150}
                  disabled={submitting}
                  className="px-3.5 py-2 text-xs bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100 w-full resize-none h-18"
                  placeholder="Describe this group..."
                />
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleSaveDesc}
                    disabled={submitting}
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition shadow-sm active:scale-95"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditedDesc(group.groupDescription || '');
                      setIsEditingDesc(false);
                    }}
                    disabled={submitting}
                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 rounded-xl transition active:scale-95"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-center gap-2 group max-w-md mx-auto">
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed italic">
                  {group.groupDescription || 'No description provided'}
                </p>
                {isGroupAdmin && (
                  <button
                    onClick={() => setIsEditingDesc(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition flex-shrink-0 mt-0.5"
                    title="Edit Description"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-semibold tracking-wide border border-emerald-100 dark:border-emerald-900/50">
              <Shield size={11} /> End-to-End Encrypted
            </span>
          </div>
        </div>

        {/* Invite Link Panel */}
        {(group.allowMembersToInvite || isGroupAdmin) && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">Group Invite Link</h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Anyone with this link can join the group chat session.</p>
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 dark:text-zinc-300 font-mono truncate select-all">
                {`${window.location.origin}/join?code=${group.inviteCode}`}
              </div>
              <button
                onClick={handleCopyInviteLink}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl transition active:scale-95 flex-shrink-0"
                title="Copy Link"
              >
                <Copy size={16} />
              </button>
              {isGroupAdmin && (
                <button
                  onClick={handleRegenerateInviteCode}
                  disabled={submitting}
                  className="p-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl transition active:scale-95 flex-shrink-0"
                  title="Regenerate Link"
                >
                  <RefreshCw size={16} className={submitting ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Group Administrative Settings (Admin Only) */}
        {isGroupAdmin && (
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase border-b border-slate-100 dark:border-zinc-800 pb-2">Group Settings</h4>

            <div className="flex items-center justify-between py-1">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Allow Members to Invite</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">Let ordinary group members copy the invite link to add users.</p>
              </div>
              <button
                onClick={handleToggleInvitePermission}
                disabled={submitting}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  group.allowMembersToInvite ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-850'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    group.allowMembersToInvite ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-zinc-800/85 pt-4">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Member Limit</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5">Set the maximum size limit allowed for this group chat.</p>
              </div>
              <input
                type="number"
                min={group.participants.length}
                max={500}
                defaultValue={group.memberLimit || 100}
                disabled={submitting}
                onBlur={(e) => handleUpdateLimit(e.target.value)}
                className="w-20 px-2 py-1 text-xs text-center bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-zinc-100"
              />
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 tracking-wide uppercase">Group Members</h4>
            <span className="text-[11px] px-2.5 py-0.5 bg-slate-150 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-semibold rounded-full">
              {group.participants?.length || 0} / {group.memberLimit || 100}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-850">
            {group.participants?.map((member) => {
              const isSelf = member._id === user?.id;
              const isMemberAdmin = group.groupAdmins?.some(
                (admin) => (admin._id || admin) === member._id
              );

              return (
                <div key={member._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {member.pfp ? (
                    <img
                      src={getImageUrl(member.pfp)}
                      alt={member.name || member.username}
                      className="w-9 h-9 object-cover rounded-full border border-slate-150 dark:border-zinc-800"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200/50 dark:border-zinc-700/50 font-bold text-xs uppercase">
                      {(member.name || member.username || 'U').substring(0, 1)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-slate-850 dark:text-zinc-200 truncate">
                        {member.name || member.username} {isSelf && '(You)'}
                      </p>
                      {isMemberAdmin && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 text-[8px] font-bold tracking-wider uppercase border border-indigo-100/55 dark:border-indigo-900/40">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-500 truncate">
                      @{member.username}
                    </p>
                  </div>

                  {/* Admin controls for other members */}
                  {isGroupAdmin && !isSelf && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePromoteDemote(member._id, isMemberAdmin)}
                        disabled={submitting}
                        className={`p-1.5 rounded-lg transition active:scale-95 flex items-center gap-1 ${
                          isMemberAdmin
                            ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20'
                        }`}
                        title={isMemberAdmin ? 'Demote from Admin' : 'Make Group Admin'}
                      >
                        {isMemberAdmin ? <ShieldAlert size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => handleKickMember(member._id)}
                        disabled={submitting}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 rounded-lg transition active:scale-95"
                        title="Remove from Group"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Danger Zone Actions */}
        <div className="bg-red-50/30 dark:bg-red-950/5 border border-red-200/40 dark:border-red-900/30 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h4 className="text-sm font-bold text-red-700 dark:text-red-400 tracking-wide uppercase border-b border-red-150 dark:border-red-900/30 pb-2">Danger Zone</h4>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">Actions that immediately alter your membership status.</p>
          </div>

          <button
            onClick={handleLeaveGroupAction}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl shadow-sm hover:shadow transition active:scale-[0.98]"
          >
            <LogOut size={14} /> Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}
