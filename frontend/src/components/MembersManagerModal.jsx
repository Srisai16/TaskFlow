import { useMemo, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Modal from "./Modal";
import Spinner from "./Spinner";
import ConfirmDialog from "./ConfirmDialog";
import {
  getStoredMemberDetails,
  MEMBER_DEPARTMENTS,
  MEMBER_ROLES,
  MEMBER_STATUSES,
  parseTaskMetadata,
  saveStoredMemberDetails,
} from "../utils/jira";

export default function MembersManagerModal({
  projectId,
  project,
  members = [],
  tasks = [],
  currentUser,
  canManageProject,
  onClose,
  onMembersUpdated,
  onTasksReassigned,
}) {
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [editingMember, setEditingMember] = useState(null);
  const [reassigningMember, setReassigningMember] = useState(null);
  const [targetReassigneeId, setTargetReassigneeId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [inviteDept, setInviteDept] = useState("Engineering");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Compute workload and stats per member
  const memberWorkloads = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      const memberTasks = tasks.filter((t) => String(t.assigneeId) === String(m.id));
      const openTasks = memberTasks.filter((t) => t.status !== "DONE");
      const doneTasks = memberTasks.filter((t) => t.status === "DONE");
      const totalPoints = memberTasks.reduce((sum, t) => {
        const { meta } = parseTaskMetadata(t);
        return sum + (meta.storyPoints || 0);
      }, 0);

      const details = getStoredMemberDetails(m.id, m);

      map.set(m.id, {
        member: m,
        details,
        totalTasks: memberTasks.length,
        openTasks: openTasks.length,
        doneTasks: doneTasks.length,
        totalPoints,
      });
    });
    return map;
  }, [members, tasks]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      const data = memberWorkloads.get(m.id);
      const details = data?.details || m;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (details.title || "").toLowerCase().includes(q);

      const matchesDept =
        selectedDepartment === "ALL" || details.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [members, memberWorkloads, searchQuery, selectedDepartment]);

  // Add / Invite member
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");

    try {
      const response = await api.post(`/projects/${projectId}/members`, {
        email: inviteEmail.trim(),
      });

      // Save initial details
      saveStoredMemberDetails(response.data.id, {
        title: inviteRole === "ADMIN" ? "Project Lead" : "Software Engineer",
        department: inviteDept,
        workRole: inviteRole,
        capacityHours: 40,
        status: "ACTIVE",
      });

      toast.success(`${response.data.name} was added to the team!`);
      setInviteEmail("");
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      setInviteError(getErrorMessage(err));
    } finally {
      setInviting(false);
    }
  };

  // Remove member
  const handleRemoveMember = async () => {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await api.delete(`/projects/${projectId}/members/${pendingRemoval.id}`);
      toast.success(`${pendingRemoval.name} was removed from the project`);
      setPendingRemoval(null);
      if (onMembersUpdated) onMembersUpdated();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  // Reassign all tasks from one member to another
  const handleReassignAll = async () => {
    if (!reassigningMember || !targetReassigneeId) return;
    setReassigning(true);
    try {
      const tasksToReassign = tasks.filter(
        (t) => String(t.assigneeId) === String(reassigningMember.id)
      );

      const promises = tasksToReassign.map((task) =>
        api.put(`/projects/${projectId}/tasks/${task.id}`, {
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigneeId: Number(targetReassigneeId),
          dueDate: task.dueDate,
          position: task.position,
        })
      );

      await Promise.all(promises);
      toast.success(
        `Reassigned ${tasksToReassign.length} tasks to ${
          members.find((m) => String(m.id) === String(targetReassigneeId))?.name || "teammate"
        }`
      );
      setReassigningMember(null);
      setTargetReassigneeId("");
      if (onTasksReassigned) onTasksReassigned();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReassigning(false);
    }
  };

  return (
    <Modal
      title="Team Directory & Member Management"
      description="Configure member profiles, industry roles, departments, capacity, and task allocations."
      onClose={onClose}
      className="jira-members-modal"
    >
      <div className="jira-members-container">
        {/* Top summary stats */}
        <div className="jira-members-stats">
          <div className="jira-mem-stat-card">
            <span className="jira-mem-stat-icon indigo">
              <Icon name="users" size={18} />
            </span>
            <div>
              <strong>{members.length}</strong>
              <span>Team Members</span>
            </div>
          </div>
          <div className="jira-mem-stat-card">
            <span className="jira-mem-stat-icon cyan">
              <Icon name="clock" size={18} />
            </span>
            <div>
              <strong>{members.length * 40} hrs</strong>
              <span>Total Weekly Capacity</span>
            </div>
          </div>
          <div className="jira-mem-stat-card">
            <span className="jira-mem-stat-icon green">
              <Icon name="checkSquare" size={18} />
            </span>
            <div>
              <strong>{tasks.filter((t) => t.status !== "DONE").length}</strong>
              <span>Assigned Open Issues</span>
            </div>
          </div>
        </div>

        {/* Search & Department Filters */}
        <div className="jira-members-toolbar">
          <div className="jira-members-search">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team members by name, role, email..."
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")}>
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <div className="jira-members-dept-select">
            <Icon name="filter" size={15} />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {MEMBER_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Directory List */}
        <div className="jira-members-list">
          {filteredMembers.length === 0 ? (
            <div className="jira-members-empty">
              <Icon name="search" size={24} />
              <p>No team members match the search query.</p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const workload = memberWorkloads.get(member.id);
              const details = workload?.details || member;
              const statusObj =
                MEMBER_STATUSES.find((s) => s.id === details.status) || MEMBER_STATUSES[0];
              const roleObj =
                MEMBER_ROLES.find((r) => r.id === details.workRole) ||
                MEMBER_ROLES.find((r) => r.id === member.role) ||
                MEMBER_ROLES[2];

              const isMe = member.id === currentUser?.id;
              const canEditThisMember = canManageProject || isMe;

              return (
                <article key={member.id} className="jira-member-row">
                  <div className="jira-member-avatar-col">
                    <Avatar name={member.name} size={44} decorative />
                    <span
                      className="jira-status-indicator-dot"
                      style={{ backgroundColor: statusObj.dot }}
                      title={`Status: ${statusObj.label}`}
                    />
                  </div>

                  <div className="jira-member-info-col">
                    <div className="jira-member-title-line">
                      <strong>{member.name}</strong>
                      {isMe && <span className="jira-you-badge">You</span>}
                      <span className="jira-dept-chip">{details.department || "Engineering"}</span>
                      <span className="jira-role-pill">{roleObj.label}</span>
                    </div>

                    <div className="jira-member-subtitle">
                      <span className="jira-job-title">
                        {details.title || (member.role === "ADMIN" ? "Project Lead" : "Software Engineer")}
                      </span>
                      <span className="jira-email">{member.email}</span>
                    </div>

                    {details.skills && details.skills.length > 0 && (
                      <div className="jira-member-skills">
                        {details.skills.slice(0, 4).map((skill) => (
                          <span key={skill} className="jira-skill-tag">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="jira-member-workload-col">
                    <div className="jira-workload-badges">
                      <span className="jira-workload-chip open" title="Open issues assigned">
                        <Icon name="layers" size={13} />
                        <span>{workload?.openTasks || 0} open</span>
                      </span>
                      <span className="jira-workload-chip done" title="Completed issues">
                        <Icon name="checkCircle" size={13} />
                        <span>{workload?.doneTasks || 0} done</span>
                      </span>
                      <span className="jira-workload-chip points" title="Story points">
                        <Icon name="zap" size={13} />
                        <span>{workload?.totalPoints || 0} SP</span>
                      </span>
                    </div>
                    <div className="jira-capacity-line">
                      <Icon name="clock" size={12} />
                      <span>{details.capacityHours || 40}h / week</span>
                    </div>
                  </div>

                  <div className="jira-member-actions-col">
                    {canEditThisMember && (
                      <button
                        type="button"
                        className="btn secondary small"
                        onClick={() => setEditingMember({ ...details, member })}
                        title="Edit member details"
                      >
                        <Icon name="edit" size={13} />
                        <span>Edit Details</span>
                      </button>
                    )}

                    {canManageProject && (workload?.openTasks || 0) > 0 && (
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setReassigningMember(member)}
                        title="Reassign all tasks to another teammate"
                      >
                        <Icon name="arrowRight" size={13} />
                        <span>Reassign</span>
                      </button>
                    )}

                    {canManageProject && !isMe && (
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => setPendingRemoval(member)}
                        title="Remove from project"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Invite New Team Member Form */}
        {canManageProject && (
          <form className="jira-invite-box" onSubmit={handleInvite}>
            <div className="jira-invite-head">
              <span className="jira-invite-icon">
                <Icon name="userPlus" size={16} />
              </span>
              <div>
                <strong>Add New Team Member</strong>
                <p>Invite registered TaskFlow teammates by email and configure their project role.</p>
              </div>
            </div>

            {inviteError && (
              <div className="alert error">
                <Icon name="alert" size={15} />
                <span>{inviteError}</span>
              </div>
            )}

            <div className="jira-invite-grid">
              <div className="jira-invite-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@taskflow.dev"
                  required
                />
              </div>

              <div className="jira-invite-field">
                <label>Department</label>
                <select value={inviteDept} onChange={(e) => setInviteDept(e.target.value)}>
                  {MEMBER_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-invite-field">
                <label>Project Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  {MEMBER_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="jira-invite-submit-cell">
                <label>&nbsp;</label>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? <Spinner plain /> : <Icon name="plus" size={16} />}
                  <span>{inviting ? "Adding..." : "Add Member"}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Edit Member Details Sub-Modal */}
      {editingMember && (
        <EditMemberDetailsModal
          memberData={editingMember}
          onClose={() => setEditingMember(null)}
          onSaved={(updated) => {
            setEditingMember(null);
            toast.success(`Updated profile for ${editingMember.member?.name || "teammate"}`);
            if (onMembersUpdated) onMembersUpdated();
          }}
        />
      )}

      {/* Reassign Work Sub-Modal */}
      {reassigningMember && (
        <Modal
          title={`Reassign Work from ${reassigningMember.name}`}
          description="Transfer all open tasks currently assigned to this teammate to another member."
          onClose={() => setReassigningMember(null)}
        >
          <div className="jira-reassign-modal">
            <div className="jira-reassign-info">
              <Icon name="info" size={17} />
              <span>
                {memberWorkloads.get(reassigningMember.id)?.openTasks || 0} open tasks will be
                reassigned.
              </span>
            </div>

            <div className="form-field">
              <label>Select New Assignee</label>
              <select
                value={targetReassigneeId}
                onChange={(e) => setTargetReassigneeId(e.target.value)}
                required
              >
                <option value="">Choose a team member...</option>
                {members
                  .filter((m) => m.id !== reassigningMember.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setReassigningMember(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleReassignAll}
                disabled={reassigning || !targetReassigneeId}
              >
                {reassigning ? <Spinner plain /> : <Icon name="check" size={15} />}
                <span>Confirm Reassignment</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Removal */}
      {pendingRemoval && (
        <ConfirmDialog
          open
          title={`Remove ${pendingRemoval.name} from Project?`}
          message={`Are you sure you want to remove ${pendingRemoval.name} (${pendingRemoval.email})? Any tasks currently assigned to them will remain in the project.`}
          confirmLabel="Remove Member"
          danger
          busy={removing}
          onCancel={() => !removing && setPendingRemoval(null)}
          onConfirm={handleRemoveMember}
        />
      )}
    </Modal>
  );
}

/**
 * Dedicated Sub-Modal for Editing Full Member Details
 */
function EditMemberDetailsModal({ memberData, onClose, onSaved }) {
  const [name, setName] = useState(memberData.member?.name || "");
  const [title, setTitle] = useState(memberData.title || "Full Stack Engineer");
  const [department, setDepartment] = useState(memberData.department || "Engineering");
  const [workRole, setWorkRole] = useState(memberData.workRole || "DEVELOPER");
  const [capacityHours, setCapacityHours] = useState(memberData.capacityHours || 40);
  const [status, setStatus] = useState(memberData.status || "ACTIVE");
  const [skillsString, setSkillsString] = useState((memberData.skills || []).join(", "));
  const [bio, setBio] = useState(memberData.bio || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const skills = skillsString
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated = saveStoredMemberDetails(memberData.member.id, {
      title: title.trim(),
      department,
      workRole,
      capacityHours: Number(capacityHours) || 40,
      status,
      skills,
      bio: bio.trim(),
    });

    onSaved(updated);
  };

  return (
    <Modal
      title={`Edit Member Profile: ${memberData.member?.name}`}
      description="Update designation, department, project permissions, skills, and weekly capacity."
      onClose={onClose}
    >
      <form className="jira-edit-member-form" onSubmit={handleSubmit}>
        <div className="jira-edit-profile-header">
          <Avatar name={name} size={48} decorative />
          <div>
            <strong>{name}</strong>
            <span>{memberData.member?.email}</span>
          </div>
        </div>

        <div className="jira-form-row-2">
          <div className="form-field">
            <label>Job Title / Designation</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Architect"
              required
            />
          </div>

          <div className="form-field">
            <label>Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              {MEMBER_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="jira-form-row-2">
          <div className="form-field">
            <label>Project Workspace Role</label>
            <select value={workRole} onChange={(e) => setWorkRole(e.target.value)}>
              {MEMBER_ROLES.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.label} — {role.desc}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Work Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {MEMBER_STATUSES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="jira-form-row-2">
          <div className="form-field">
            <label>Weekly Capacity (Hours)</label>
            <input
              type="number"
              min={10}
              max={80}
              value={capacityHours}
              onChange={(e) => setCapacityHours(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label>Skills &amp; Tech Stack (comma separated)</label>
            <input
              type="text"
              value={skillsString}
              onChange={(e) => setSkillsString(e.target.value)}
              placeholder="Java, Spring Boot, React, AWS, Docker"
            />
          </div>
        </div>

        <div className="form-field">
          <label>Bio / Notes</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Focus areas, timezone, or team responsibilities..."
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            <Icon name="check" size={15} />
            <span>Save Profile Details</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
