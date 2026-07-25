import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const onlyUpcoming = searchParams.get("upcoming") === "true";

    let queryRef: admin.firestore.Query = adminDb.collection("events");

    if (typeFilter) {
      queryRef = queryRef.where("eventType", "==", typeFilter);
    }

    const snapshot = await queryRef.get();
    let events = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // In-memory filter for upcoming events and active/approved status
    if (onlyUpcoming) {
      const nowStr = new Date().toISOString();
      events = events.filter((e) => e.date >= nowStr);
    }

    // Retain only active/approved events
    events = events.filter((e) => e.isActive !== false && (!e.status || e.status === "Approved"));

    // Sort by date descending
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Backwards compatibility with Module 3 (which expects direct array response)
    const isModule3Request = request.headers.get("referer")?.includes("/") || 
                             request.url.includes("module3");
    if (isModule3Request) {
      return NextResponse.json(events, { status: 200 });
    }

    return NextResponse.json({ success: true, data: events }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/v1/events]", error);
    
    // Fallback direct array in case of build/module3 compatibility issues
    return NextResponse.json(
      { success: false, message: "Failed to fetch events.", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists || userDoc.data()?.role?.toLowerCase() !== "admin") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      date,
      venue,
      speakerName,
      eventType,
      price,
      premiumPrice,
      registrationDeadline,
      seatsAvailable,
      posterUrl,
      onlineLink,
    } = body;

    if (!title || !description || !date || !eventType) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const eventData = {
      title,
      description,
      date,
      venue: venue || "Online",
      speakerName: speakerName || "",
      eventType,
      price: price ? Number(price) : 0,
      premiumPrice: premiumPrice ? Number(premiumPrice) : 0,
      registrationDeadline: registrationDeadline || null,
      seatsAvailable: seatsAvailable ? Number(seatsAvailable) : null,
      seatsBooked: 0,
      posterUrl: posterUrl || "",
      onlineLink: onlineLink || "",
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      status: "Approved",
    };

    const docRef = await adminDb.collection("events").add(eventData);

    return NextResponse.json(
      { success: true, message: "Event created.", data: { id: docRef.id, ...eventData } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/v1/events]", error);
    return NextResponse.json(
      { success: false, message: "Failed to create event.", error: error.message },
      { status: 500 }
    );
  }
}
