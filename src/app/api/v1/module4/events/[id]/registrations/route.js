// app/api/events/[id]/registrations/route.js
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/modules/module4/lib/firebaseAdmin";

// ─── GET /api/events/:id/registrations ────────────────────────────────────────
// Admin only: returns all registrations for a given event.
// Supports CSV export via ?format=csv
export async function GET(request, { params }) {
  try {
    // ── Auth check (admin only) ───────────────────────────────────────────────
    const token = request.headers.get("Authorization")?.split("Bearer ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // ── Fetch registrations ───────────────────────────────────────────────────
    const { id: eventId } = params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // "csv" or default JSON

    const snapshot = await adminDb
      .collection("eventRegistrations")
      .where("eventId", "==", eventId)
      .orderBy("registeredAt", "desc")
      .get();

    const registrations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      registeredAt: doc.data().registeredAt?.toDate?.()?.toISOString() || null,
    }));

    // ── CSV Export ────────────────────────────────────────────────────────────
    if (format === "csv") {
      const headers = ["S.No", "Name", "Email", "Phone", "Membership", "Payment Status", "Amount", "Payment ID", "Registered At"];
      const rows = registrations.map((r, i) => [
        i + 1,
        r.name,
        r.email,
        r.phone,
        r.membershipType,
        r.paymentStatus,
        r.amount,
        r.paymentId || "—",
        r.registeredAt,
      ]);

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="registrations-${eventId}.csv"`,
        },
      });
    }

    // ── JSON response ──────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    console.error("[GET /api/events/:id/registrations]", error);
    return NextResponse.json({ success: false, message: "Server error." }, { status: 500 });
  }
}
