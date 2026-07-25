import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const doc = await adminDb.collection("events").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, message: "Event not found." }, { status: 404 });
    }

    // Backwards compatibility with Module 3 (which expects direct object response)
    const isModule3Request = request.headers.get("referer")?.includes("/") || 
                             request.url.includes("module3");
    if (isModule3Request) {
      return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    console.error("[GET /api/v1/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error.", error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role?.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();

    const { createdAt, createdBy, seatsBooked, ...allowedUpdates } = body;

    await adminDb.collection("events").doc(id).update({
      ...allowedUpdates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Event updated." });
  } catch (error: any) {
    console.error("[PUT /api/v1/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error.", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role?.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    await adminDb.collection("events").doc(id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, message: "Event deleted." });
  } catch (error: any) {
    console.error("[DELETE /api/v1/events/:id]", error);
    return NextResponse.json({ success: false, message: "Server error.", error: error.message }, { status: 500 });
  }
}
