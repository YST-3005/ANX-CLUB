"use client";
// components/events/EventCard.jsx
// Matches the Grid view card from Forge Alumnus Events page exactly.

import Image from "next/image";
import { useState } from "react";
import RegisterModal from "./RegisterModal";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),
    full: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

function isPastDeadline(registrationDeadline) {
  if (!registrationDeadline) return false;
  return new Date() > new Date(registrationDeadline);
}

export default function EventCard({ event, userRegisteredIds = [], onRegistered }) {
  const [showModal, setShowModal] = useState(false);
  const { day, month, year, time } = formatDate(event.date);
  const isRegistered = userRegisteredIds.includes(event.id);
  const closed = isPastDeadline(event.registrationDeadline);
  const noSeats = event.seatsAvailable !== null && event.seatsBooked >= event.seatsAvailable;

  const isFree = event.eventType === "free";
  const isPremiumOnly = event.eventType === "member-only";

  return (
    <>
      <div className="event-card">
        {/* Poster */}
        <div className="card-poster">
          {event.posterUrl ? (
            <Image
              src={event.posterUrl}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="poster-img"
            />
          ) : (
            <div className="poster-placeholder">
              <span>{event.title.charAt(0)}</span>
            </div>
          )}

          {/* Date badge — top left, dark navy */}
          <div className="date-badge">
            <span className="date-day">{String(day).padStart(2, "0")}</span>
            <span className="date-monthyear">{month} {year}</span>
          </div>

          {/* Free / Paid badge — top right */}
          <div className={`type-badge ${isFree ? "free" : isPremiumOnly ? "premium" : "paid"}`}>
            {isFree ? "Free" : isPremiumOnly ? "Members" : "Paid"}
          </div>
        </div>

        {/* Body */}
        <div className="card-body">
          <h3 className="card-title">{event.title}</h3>
          <p className="card-desc">{event.description}</p>

          {/* Meta */}
          <div className="card-meta">
            <div className="meta-row">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
              </svg>
              <span>Time: {time}</span>
            </div>
            <div className="meta-row">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <span>Venue: {event.venue}</span>
            </div>
          </div>

          {/* CTA */}
          <button
            className={`card-btn ${isRegistered ? "registered" : closed || noSeats ? "closed" : ""}`}
            onClick={() => !isRegistered && !closed && !noSeats && setShowModal(true)}
            disabled={isRegistered || closed || noSeats}
          >
            {isRegistered
              ? "✓ Registered"
              : closed || noSeats
              ? "Registrations Closed"
              : event.price > 0
              ? `Register — ₹${event.price}`
              : "Register Now"}
          </button>
        </div>
      </div>

      {showModal && (
        <RegisterModal
          event={event}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            onRegistered?.();
          }}
        />
      )}

      <style jsx>{`
        .event-card {
          background: #ffffff;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .event-card:hover {
          box-shadow: 0 6px 24px rgba(15,31,74,0.13);
          transform: translateY(-2px);
        }

        /* Poster */
        .card-poster {
          position: relative;
          width: 100%;
          height: 200px;
          background: #0f1f4a;
          overflow: hidden;
        }
        .poster-img { object-fit: cover; }
        .poster-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f1f4a 0%, #1e3a8a 100%);
          font-size: 56px;
          font-weight: 700;
          color: rgba(255,255,255,0.15);
          text-transform: uppercase;
        }

        /* Date badge */
        .date-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: #0f1f4a;
          color: #fff;
          border-radius: 8px;
          padding: 6px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 56px;
          line-height: 1.2;
        }
        .date-day {
          font-size: 18px;
          font-weight: 700;
          display: block;
        }
        .date-monthyear {
          font-size: 10px;
          font-weight: 500;
          opacity: 0.85;
        }

        /* Type badge */
        .type-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .type-badge.free { background: #22c55e; color: #fff; }
        .type-badge.paid { background: #f59e0b; color: #fff; }
        .type-badge.premium { background: #8b5cf6; color: #fff; }

        /* Body */
        .card-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 8px;
        }
        .card-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.35;
        }
        .card-desc {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
        }
        .meta-row {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          font-size: 12px;
          color: #475569;
        }
        .meta-row svg { flex-shrink: 0; margin-top: 1px; }

        /* CTA button */
        .card-btn {
          margin-top: auto;
          padding: 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: 1.5px solid #0f1f4a;
          background: transparent;
          color: #0f1f4a;
          transition: all 0.18s;
          text-align: center;
        }
        .card-btn:hover:not(:disabled) {
          background: #0f1f4a;
          color: #fff;
        }
        .card-btn.registered {
          border-color: #22c55e;
          color: #16a34a;
          cursor: default;
        }
        .card-btn.closed {
          border-color: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .card-btn:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
