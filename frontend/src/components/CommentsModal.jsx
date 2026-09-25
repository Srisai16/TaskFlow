import { useEffect, useRef, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { dueStatus, PRIORITY_META, timeAgo } from "../utils/format";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Modal from "./Modal";
import Spinner from "./Spinner";

export default function CommentsModal({ projectId, task, me, canManage, onClose, onEdit, onCommentCountChange }) {
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [commentCount, setCommentCount] = useState(task.commentCount || 0);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const mountedRef = useRef(false);
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
  const due = dueStatus(task.dueDate, task.status);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCommentsLoaded(false);
    setError("");
    setComments([]);
    setCommentCount(task.commentCount || 0);
    api
      .get(`/projects/${projectId}/tasks/${task.id}/comments`)
      .then((response) => {
        if (!active || !mountedRef.current) return;
        setComments(response.data || []);
        setCommentCount((response.data || []).length);
        setCommentsLoaded(true);
      })
      .catch((requestError) => {
        if (active && mountedRef.current) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active && mountedRef.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId, task.id]);

  useEffect(() => {
    if (commentsLoaded) onCommentCountChange?.(task.id, commentCount);
  }, [commentCount, commentsLoaded, onCommentCountChange, task.id]);

  const addComment = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(
        `/projects/${projectId}/tasks/${task.id}/comments`,
        { content: text.trim() }
      );
      if (!mountedRef.current) return;
      setComments((current) => [...current, data]);
      setCommentCount((current) => current + 1);
      setCommentsLoaded(true);
      setText("");
    } catch (requestError) {
      if (mountedRef.current) setError(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const removeComment = async (id) => {
    setDeletingId(id);
    setError("");
    try {
      await api.delete(`/projects/${projectId}/comments/${id}`);
      if (!mountedRef.current) return;
      setComments((current) => current.filter((comment) => comment.id !== id));
      setCommentCount((current) => Math.max(0, current - 1));
      setConfirmDeleteId(null);
      toast.success("Comment deleted.");
    } catch (requestError) {
      if (mountedRef.current) setError(getErrorMessage(requestError));
    } finally {
      if (mountedRef.current) setDeletingId(null);
    }
  };

  const displayedCount = commentsLoaded ? commentCount : task.commentCount || 0;

  return (
    <Modal
      title="Task details"
      description={`Task #${task.id}`}
      size="wide"
      onClose={onClose}
      closeDisabled={saving}
    >
      <div className="task-detail-summary">
        <div className="task-detail-heading">
          <span className={`priority ${priority.className}`}><i />{priority.label} priority</span>
          <h3>{task.title}</h3>
          <p>{task.description || "No additional description has been added."}</p>
        </div>
        <div className="task-detail-meta">
          {due.label && <span className={due.className}><Icon name="calendar" size={15} />{due.label}</span>}
          {task.assigneeName && <span><Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={24} decorative />{task.assigneeName}</span>}
          <span><Icon name="comment" size={15} />{displayedCount} comments</span>
        </div>
        {onEdit && canManage && (
          <button type="button" className="btn secondary small" onClick={onEdit}>
            <Icon name="edit" size={16} />Edit task
          </button>
        )}
      </div>

      <div className="comments-section">
        <div className="comments-heading">
          <div><h3>Conversation</h3><p>Share context and keep decisions with the work.</p></div>
          <span>{displayedCount}</span>
        </div>

        {loading ? (
          <div className="comments-loading" aria-label="Loading comments">
            <span /><span /><span />
          </div>
        ) : error && comments.length === 0 ? (
          <div className="inline-state error" role="alert">
            <Icon name="alert" size={20} />
            <div><strong>Comments couldn’t be loaded</strong><p>{error}</p></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="inline-state">
            <span className="inline-state-icon"><Icon name="comment" size={20} /></span>
            <div><strong>Start the conversation</strong><p>Add context, ask a question, or share an update.</p></div>
          </div>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <article className="comment" key={comment.id}>
                <Avatar name={comment.userName} color={comment.userAvatarColor} size={36} decorative />
                <div className="comment-content">
                  <div className="comment-head">
                    <strong>{comment.userName}</strong>
                    <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
                  </div>
                  {confirmDeleteId === comment.id ? (
                    <div className="inline-confirm" role="alert">
                      <span>Delete this comment?</span>
                      <button type="button" className="btn ghost small" onClick={() => setConfirmDeleteId(null)} disabled={deletingId === comment.id}>Cancel</button>
                      <button type="button" className="btn danger-solid small" onClick={() => removeComment(comment.id)} disabled={deletingId === comment.id}>
                        {deletingId === comment.id ? <Spinner label="Deleting" /> : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <p>{comment.content}</p>
                  )}
                </div>
                {(comment.userId === me?.id || canManage) && confirmDeleteId !== comment.id && (
                  <button
                    type="button"
                    className="icon-btn danger comment-delete"
                    onClick={() => setConfirmDeleteId(comment.id)}
                    aria-label={`Delete comment by ${comment.userName}`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        {error && comments.length > 0 && <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>}

        <form className="comment-composer" onSubmit={addComment}>
          <Avatar name={me?.name} color={me?.avatarColor} size={36} decorative />
          <div className="comment-input-wrap">
            <label htmlFor="new-comment">Add a comment</label>
            <textarea
              id="new-comment"
              data-modal-initial-focus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write a thoughtful update..."
              rows={3}
              maxLength={2000}
            />
            <div className="comment-compose-actions">
              <span>{text.length}/2000</span>
              <button type="submit" className="btn primary" disabled={saving || loading || !text.trim()}>
                {saving ? <Spinner label="Posting comment" /> : <Icon name="send" size={16} />}
                <span>{saving ? "Posting..." : "Post comment"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
