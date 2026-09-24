import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import Avatar from "./Avatar";
import Modal from "./Modal";
import Spinner from "./Spinner";

export default function CommentsModal({ projectId, task, me, canManage, onClose, onEdit }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get(`/projects/${projectId}/tasks/${task.id}/comments`)
      .then((res) => setComments(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [projectId, task.id]);

  const addComment = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(
        `/projects/${projectId}/tasks/${task.id}/comments`,
        { content: text.trim() }
      );
      setComments((prev) => [...prev, data]);
      setText("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const removeComment = async (id) => {
    setError("");
    try {
      await api.delete(`/projects/${projectId}/comments/${id}`);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <Modal title={`Task #${task.id} · ${task.title}`} onClose={onClose}>
      {onEdit && canManage && (
        <div className="modal-toolbar">
          <button className="btn ghost small" onClick={onEdit}>
            Edit task
          </button>
        </div>
      )}
      <div className="comments">
        {loading ? (
          <div className="center">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="comment">
              <Avatar name={c.userName} color={c.userAvatarColor} size={30} />
              <div className="comment-body">
                <div className="comment-head">
                  <strong>{c.userName}</strong>
                  <small>{new Date(c.createdAt).toLocaleString()}</small>
                </div>
                <p>{c.content}</p>
              </div>
              {(c.userId === me?.id || canManage) && (
                <button
                  className="icon-btn danger"
                  onClick={() => removeComment(c.id)}
                  title="Delete comment"
                >
                  &times;
                </button>
              )}
            </div>
          ))
        )}
        {error && <div className="alert error">{error}</div>}
        <form className="form comment-form" onSubmit={addComment}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Write a comment..."
            maxLength={2000}
          />
          <button type="submit" className="btn primary" disabled={saving || !text.trim()}>
            {saving ? <Spinner /> : "Comment"}
          </button>
        </form>
      </div>
    </Modal>
  );
}