"use client";
// app/events/[id]/page.jsx
// Forge Alumnus — Individual event detail page.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { auth, db } from "@/modules/module4/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import RegisterModal from "@/modules/module4/components/events/RegisterModal";

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/v1/module4/events/${id}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setEvent(data.data); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !id) return;
    getDocs(
      query(
        collection(db, "eventRegistrations"),
        where("userId", "==", user.uid),
        where("eventId", "==", id)
      )
    ).then((snap) => setIsRegistered(!snap.empty));
  }, [id]);

  const isPast = event?.registrationDeadline
    ? new Date() > new Date(event.registrationDeadline)
    : false;
  const noSeats =
    event?.seatsAvailable !== null && event?.seatsBooked >= event?.seatsAvailable;

  if (loading) {
    return (
      <div className="center-screen">
        <div className="loader" />
        <style jsx>{`.center-screen{display:flex;align-items:center;justify-content:center;height:100vh;} .loader{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#0f1f4a;border-radius:50%;animation:spin 0.8s linear infinite;} @keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    );
  }
  if (!event) return <div style={{ padding: 40 }}>Event not found.</div>;

  return (
    <div className="detail-root">
      {/* Back */}
      <a href="/module4/events" className="back-link">← Back to Events</a>

      <div className="detail-card">
        {/* Poster */}
        {event.posterUrl && (
          <div className="detail-poster">
            <Image src={event.posterUrl} alt={event.title} fill className="poster-img" />
          </div>
        )}

        {/* Body */}
        <div className="detail-body">
          {/* Badge row */}
          <div className="badge-row">
            <span className={`type-pill ${event.eventType}`}>
              {event.eventType === "free" ? "Free" : event.eventType === "member-only" ? "Members Only" : "Paid"}
            </span>
            {event.seatsAvailable && (
              <span className="seats-pill">
                {event.seatsAvailable - event.seatsBooked} seats left
              </span>
            )}
          </div>

          <h1 className="detail-title">{event.title}</h1>
          <p className="detail-desc">{event.description}</p>

          {/* Info grid */}
          <div className="info-grid">
            <InfoRow icon="📅" label="Date" value={formatDate(event.date)} />
            <InfoRow icon="⏰" label="Time" value={formatTime(event.date)} />
            <InfoRow icon="📍" label="Venue" value={event.venue} />
            {event.speakerName && <InfoRow icon="🎤" label="Speaker" value={event.speakerName} />}
            {event.price > 0 && (
              <InfoRow icon="💰" label="Price" value={`₹${event.price} (Premium: ₹${event.premiumPrice || event.price})`} />
            )}
            {event.registrationDeadline && (
              <InfoRow icon="⏳" label="Deadline" value={formatDate(event.registrationDeadline)} />
            )}
          </div>

          {/* CTA */}
          <button
            className={`register-cta ${isRegistered ? "done" : isPast || noSeats ? "disabled" : ""}`}
            onClick={() => !isRegistered && !isPast && !noSeats && setShowModal(true)}
            disabled={isRegistered || isPast || noSeats}
          >
            {isRegistered
              ? "✓ You're Registered!"
              : isPast || noSeats
              ? "Registrations Closed"
              : event.price > 0
              ? `Register Now — ₹${event.price}`
              : "Register Now — Free"}
          </button>

          {event.onlineLink && (
            <a href={event.onlineLink} target="_blank" rel="noreferrer" className="join-link">
              Join Online →
            </a>
          )}
        </div>
      </div>

      {showModal && (
        <RegisterModal
          event={event}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setIsRegistered(true); }}
        />
      )}

      <style jsx>{`
        .detail-root {
          max-width: 860px;
          margin: 0 auto;
          padding: 32px 24px;
          font-family: inherit;
        }
        .back-link {
          display: inline-block;
          margin-bottom: 20px;
          color: #0f1f4a;
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
        }
        .back-link:hover { text-decoration: underline; }
        .detail-card {
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.09);
        }
        .detail-poster {
          position: relative;
          width: 100%;
          height: 320px;
          background: #0f1f4a;
        }
        .poster-img { object-fit: cover; }
        .detail-body { padding: 28px 32px; }
        .badge-row { display: flex; gap: 8px; margin-bottom: 14px; }
        .type-pill {
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
        }
        .type-pill.free { background: #dcfce7; color: #16a34a; }
        .type-pill.paid { background: #fef3c7; color: #b45309; }
        .type-pill.member-only { background: #ede9fe; color: #7c3aed; }
        .seats-pill {
          padding: 4px 14px;
          border-radius: 20px;
          background: #f1f5f9;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
        }
        .detail-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
          line-height: 1.25;
        }
        .detail-desc {
          font-size: 15px;
          color: #475569;
          line-height: 1.65;
          margin-bottom: 24px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 28px;
          background: #f8fafc;
          border-radius: 8px;
          padding: 20px;
        }
        .register-cta {
          display: block;
          width: 100%;
          padding: 15px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          background: #0f1f4a;
          color: #fff;
          transition: background 0.18s;
          margin-bottom: 12px;
          font-family: inherit;
        }
        .register-cta:hover:not(:disabled) { background: #1e3a8a; }
        .register-cta.done { background: #16a34a; cursor: default; }
        .register-cta.disabled { background: #94a3b8; cursor: not-allowed; }
        .join-link {
          display: block;
          text-align: center;
          color: #2563eb;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        .join-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {icon} {label}
      </span>
      <span style={{ fontSize: 14, color: "#0f172a", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
