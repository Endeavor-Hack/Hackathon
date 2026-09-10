import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const EMPTY = { title: "", date: "", location: "", description: "", targetProgrammes: "" };

export default function Events() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.date > b.date ? 1 : -1));
      setEvents(list);
    });
  }, []);

  function set(k, v) { setForm((prev) => ({ ...prev, [k]: v })); }

  function startEdit(ev) {
    setEditingId(ev.id);
    setForm({
      title: ev.title || "",
      date: ev.date || "",
      location: ev.location || "",
      description: ev.description || "",
      targetProgrammes: (ev.targetProgrammes || []).join(", "),
    });
  }

  async function save() {
    if (!form.title || !form.date) { alert("Title and date are required."); return; }
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      date: form.date,
      location: form.location.trim(),
      description: form.description.trim(),
      targetProgrammes: form.targetProgrammes.split(",").map((s) => s.trim()).filter(Boolean),
      createdBy: auth.currentUser.uid,
    };
    try {
      if (editingId) {
        await updateDoc(doc(db, "events", editingId), payload);
      } else {
        const created = await addDoc(collection(db, "events"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        // Fan out programme-targeted notifications
        await notifyTargeted(created.id, payload);
      }
      setForm(EMPTY);
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this event?")) return;
    await deleteDoc(doc(db, "events", id));
  }

  async function notifyTargeted(eventId, ev) {
    // If no targetProgrammes → broadcast to all active users.
    let usersToNotify = [];
    if (!ev.targetProgrammes.length) {
      const snap = await getDocs(query(collection(db, "users"), where("status", "==", "active")));
      usersToNotify = snap.docs.map((d) => d.id);
    } else {
      const snap = await getDocs(query(
        collection(db, "users"),
        where("status", "==", "active"),
        where("programme", "in", ev.targetProgrammes.slice(0, 10)),
      ));
      usersToNotify = snap.docs.map((d) => d.id);
    }
    for (const uid of usersToNotify) {
      await addDoc(collection(db, "notifications"), {
        userId: uid,
        type: "event",
        message: `New event: ${ev.title}`,
        relatedId: eventId,
        read: false,
        createdAt: serverTimestamp(),
      });
    }
  }

  return (
    <>
      <h2>Institutional events</h2>
      <p className="subtitle">Career fairs, workshops, networking. Only admins can publish these.</p>

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label>Title</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
        </div>
        <div style={{ height: 12 }} />
        <label>Location</label>
        <input value={form.location} onChange={(e) => set("location", e.target.value)} />
        <div style={{ height: 12 }} />
        <label>Description</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} />
        <div style={{ height: 12 }} />
        <label>Target programmes (comma separated, leave blank to notify everyone)</label>
        <input value={form.targetProgrammes} onChange={(e) => set("targetProgrammes", e.target.value)} placeholder="BSc Computer Science, BCom, ..." />
        <div style={{ height: 12 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={busy}>{editingId ? "Save changes" : "Publish event"}</button>
          {editingId && <button className="secondary" onClick={() => { setEditingId(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </div>

      <div className="section-title">Upcoming</div>
      {events.map((e) => (
        <div key={e.id} className="card">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {e.title} <span className="badge accent">{e.date}</span>
                {(e.targetProgrammes || []).length > 0 && <span className="badge">{e.targetProgrammes.length} programmes</span>}
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4 }}>{e.location}</div>
              <p style={{ marginTop: 8, marginBottom: 0 }}>{e.description}</p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="secondary" onClick={() => startEdit(e)}>Edit</button>
              <button className="danger" onClick={() => remove(e.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
