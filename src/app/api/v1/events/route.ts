import { NextRequest, NextResponse } from "next/server";
import { adminDb } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/auth';
import * as admin from "firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const onlyUpcoming = searchParams.get("upcoming") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
    const lastId = searchParams.get("lastId");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    let queryRef: admin.firestore.Query = adminDb.collection("events")
      .where("isActive", "==", true);

    if (typeFilter && typeFilter !== "All") {
      queryRef = queryRef.where("eventType", "==", typeFilter);
    }

    if (onlyUpcoming) {
      const nowStr = new Date().toISOString();
      queryRef = queryRef.where("date", ">=", nowStr);
    }

    // Adding sort order based on params
    if (sortBy) {
      queryRef = queryRef.orderBy(sortBy, sortOrder);
    } else {
      queryRef = queryRef.orderBy("date", "desc");
    }
    
    queryRef = queryRef.limit(limit);

    if (lastId) {
      const lastDoc = await adminDb.collection("events").doc(lastId).get();
      if (lastDoc.exists) {
        queryRef = queryRef.startAfter(lastDoc);
      }
    }

    const snapshot = await queryRef.get();
    const events = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Backwards compatibility with Module 3 (which expects direct array response)
    const isModule3Request = request.headers.get("referer")?.includes("/") || 
                             request.url.includes("module3");
    
    let response: NextResponse;
    if (isModule3Request) {
      response = NextResponse.json(events, { status: 200 });
    } else {
      response = NextResponse.json(
        { success: true, data: events, count: events.length },
        { status: 200 }
      );
    }

    // Cache static/semi-static events payload on CDN edge for 5 minutes
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );

    return response;
  } catch (error: any) {
    console.error("[GET /api/v1/events]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch events.", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticate(request);
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
