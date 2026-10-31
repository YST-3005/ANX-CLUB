import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { authenticate } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let notifications: any[] = [];
    try {
      const snapshot = await adminDb.collection("notifications")
        .where("recipientId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (dbErr: any) {
      console.warn(`[GET /api/v1/notifications] Firestore query notice: ${dbErr?.message || dbErr}`);
      notifications = [];
    }

    return NextResponse.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await authenticate(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, markAllRead } = body;

    try {
      if (markAllRead) {
        const snapshot = await adminDb.collection("notifications")
          .where("recipientId", "==", userId)
          .where("isRead", "==", false)
          .get();

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
          batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();

        return NextResponse.json({ success: true, message: "All notifications marked as read." });
      }

      if (!notificationId) {
        return NextResponse.json({ error: "notificationId is required." }, { status: 400 });
      }

      const notifRef = adminDb.collection("notifications").doc(notificationId);
      const notifSnap = await notifRef.get();

      if (!notifSnap.exists || notifSnap.data()?.recipientId !== userId) {
        return NextResponse.json({ error: "Notification not found or unauthorized." }, { status: 404 });
      }

      await notifRef.update({ isRead: true });
      return NextResponse.json({ success: true, message: "Notification marked as read." });
    } catch (dbErr: any) {
      console.warn(`[PATCH /api/v1/notifications] Firestore update notice: ${dbErr?.message || dbErr}`);
      return NextResponse.json({ success: false, error: "Database operation temporarily unavailable" }, { status: 503 });
    }

  } catch (error: any) {
    console.error("Error updating notifications:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
