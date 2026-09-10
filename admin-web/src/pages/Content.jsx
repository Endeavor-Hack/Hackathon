import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Content() {
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    return onSnapshot(collection(db, "posts"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPosts(list);
    });
  }, []);

  const visible = tab === "flagged" ? posts.filter((p) => p.flagged) : posts;

  async function remove(id) {
    if (!confirm("Delete this post permanently?")) return;
    await deleteDoc(doc(db, "posts", id));
  }
  async function toggleFlag(id, flagged) {
    await updateDoc(doc(db, "posts", id), { flagged: !flagged });
  }

  return (
    <>
      <h2>Content moderation</h2>
      <p className="subtitle">Review posts and remove anything that violates platform guidelines.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button className={tab === "all" ? "" : "secondary"} onClick={() => setTab("all")}>All posts ({posts.length})</button>
        <button className={tab === "flagged" ? "" : "secondary"} onClick={() => setTab("flagged")}>
          Flagged ({posts.filter((p) => p.flagged).length})
        </button>
      </div>

      {visible.map((p) => (
        <div key={p.id} className="card">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {p.authorName}
                <span className="badge accent">{p.authorRole}</span>
                {p.flagged && <span className="badge danger">flagged</span>}
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4 }}>
                {p.createdAt?.toDate?.().toLocaleString?.() || ""}
              </div>
              <p style={{ marginTop: 8, marginBottom: 0 }}>{p.text}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="secondary" onClick={() => toggleFlag(p.id, p.flagged)}>
                {p.flagged ? "Unflag" : "Flag"}
              </button>
              <button className="danger" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
