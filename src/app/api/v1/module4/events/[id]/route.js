// app/api/events/[id]/route.js
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/modules/module4/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

// ─── GET /api/events/:id ───────────────────────────────────────────────────────
export async function GET(_req, { params }) {
  try {
    const { id } = params;
    const doc = await adminDb.collection("events").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("[GET /api/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

// ─── PUT /api/events/:id ───────────────────────────────────────────────────────
// Admin only: update event fields.
export async function PUT(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    // Disallow overwriting system fields
    const { createdAt, createdBy, seatsBooked, ...allowedUpdates } = body;

    await adminDb.collection("events").doc(id).update({
      ...allowedUpdates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Event updated." });
  } catch (error) {
    console.error("[PUT /api/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}

// ─── DELETE /api/events/:id ────────────────────────────────────────────────────
// Admin only: soft-delete by setting isActive = false.
export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    // Soft delete — preserves registration history
    await adminDb.collection("events").doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Event deleted." });
  } catch (error) {
    console.error("[DELETE /api/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
