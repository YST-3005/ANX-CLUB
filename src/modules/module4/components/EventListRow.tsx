"use client";

import { useState } from "react";
import RegisterModal from "./RegisterModal";
import { Event } from "@/types";
import { useRouter } from "next/navigation";

interface EventListRowProps {
  event: Event;
  index: number;
  userRegisteredIds?: string[];
  onRegistered?: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isPastDeadline(deadline?: string | null) {
  if (!deadline) return false;
  return new Date() > new Date(deadline);
}

export default function EventListRow({ event, index, userRegisteredIds = [], onRegistered }: EventListRowProps) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const isRegistered = userRegisteredIds.includes(event.id);
  const closed = isPastDeadline(event.registrationDeadline);
  const noSeats = event.seatsAvailable !== null && event.seatsAvailable !== undefined && (event.seatsBooked ?? 0) >= event.seatsAvailable;
  const canRegister = !isRegistered && !closed && !noSeats;

  return (
    <>
      <tr className="list-row">
        <td className="td-sno">{index}</td>
        <td className="td-name">{event.title}</td>
        <td className="td-desc">
          {event.description.length > 45 ? (
            <>
              {event.description.slice(0, 45)}
              <span className="read-more">...Read More</span>
            </>
          ) : (
            event.description
          )}
        </td>
        <td className="td-date">{formatDate(event.date)}</td>
        <td className="td-attend">
          <button
            className={`attend-btn ${isRegistered ? "registered" : canRegister ? "open" : "closed"}`}
            onClick={() => canRegister && setShowModal(true)}
            disabled={!canRegister}
          >
            {isRegistered ? "✓ Registered" : "Registrations Closed"}
          </button>
        </td>
        <td className="td-detail">
          <button className="detail-btn" title="View Details" onClick={() => router.push(`/events/${event.id}`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#fff" strokeWidth="2"/>
              <circle cx="12" cy="12" r="3" stroke="#f59e0b" strokeWidth="2"/>
            </svg>
          </button>
        </td>
      </tr>

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
        .list-row {
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
        }
        .list-row:hover { background: #f8fafc; }
        .list-row td {
          padding: 14px 16px;
          font-size: 13.5px;
          color: #334155;
          vertical-align: middle;
        }
        .td-sno { color: #64748b; font-size: 13px; }
        .td-name { font-weight: 600; color: #0f172a; max-width: 180px; }
        .td-desc { color: #64748b; max-width: 240px; }
        .read-more { color: #2563eb; cursor: pointer; font-size: 12px; }
        .td-date { white-space: nowrap; color: #475569; }
        .attend-btn {
          padding: 7px 16px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s;
        }
        .attend-btn.closed {
          border: 1.5px solid #cbd5e1;
          background: #fff;
          color: #64748b;
          cursor: default;
        }
        .attend-btn.open {
          border: 1.5px solid #0f1f4a;
          background: #fff;
          color: #0f1f4a;
        }
        .attend-btn.open:hover {
          background: #0f1f4a;
          color: #fff;
        }
        .attend-btn.registered {
          border: 1.5px solid #22c55e;
          background: #f0fdf4;
          color: #16a34a;
          cursor: default;
        }
        .detail-btn {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: #0f1f4a;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.18s;
        }
        .detail-btn:hover { background: #1e3a8a; }
      `}</style>
    </>
  );
}
