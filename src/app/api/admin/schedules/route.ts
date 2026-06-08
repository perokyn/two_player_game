// src/app/api/admin/schedules/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJwt } from "@/lib/auth";

function getAuthenticatedAdmin(req: NextRequest) {
  const adminCookie = req.cookies.get("cg_admin_session")?.value;
  if (!adminCookie) return null;

  const payload = verifyJwt(adminCookie);
  if (!payload || payload.role !== "admin") return null;

  return payload;
}

export async function GET(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselorId = Number(admin.userId);
    if (!counselorId || isNaN(counselorId)) {
      return NextResponse.json({ error: "Invalid counselor session" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const schedules = await prisma.schedule.findMany({
      where: { counselorId },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({ ok: true, schedules });
  } catch (err) {
    console.error("GET schedules error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselorId = Number(admin.userId);
    if (!counselorId || isNaN(counselorId)) {
      return NextResponse.json({ error: "Invalid counselor session" }, { status: 400 });
    }

    const bodyText = await req.text();
    let body: any = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { clientName, clientNumber, startTime, endTime, comment, meetingType, isRecurring, recurrenceGroup } = body;

    if (!clientName || typeof clientName !== "string" || !clientName.trim()) {
      return NextResponse.json({ error: "Client Name is required" }, { status: 400 });
    }
    if (!clientNumber || typeof clientNumber !== "string" || !clientNumber.trim()) {
      return NextResponse.json({ error: "Client ID/Number is required" }, { status: 400 });
    }
    if (!startTime || !endTime) {
      return NextResponse.json({ error: "Start and End times are required" }, { status: 400 });
    }

    const startParsed = new Date(startTime);
    const endParsed = new Date(endTime);

    if (isNaN(startParsed.getTime()) || isNaN(endParsed.getTime())) {
      return NextResponse.json({ error: "Invalid Date format" }, { status: 400 });
    }

    if (startParsed.getTime() >= endParsed.getTime()) {
      return NextResponse.json({ error: "Start time must be before End time" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const newSchedule = await prisma.schedule.create({
      data: {
        counselorId,
        clientName: clientName.trim(),
        clientNumber: clientNumber.trim(),
        startTime: startParsed,
        endTime: endParsed,
        meetingType: (meetingType && typeof meetingType === "string") ? meetingType.trim() : "In Person",
        isRecurring: typeof isRecurring === "boolean" ? isRecurring : false,
        recurrenceGroup: (recurrenceGroup && typeof recurrenceGroup === "string") ? recurrenceGroup.trim() : null,
        comment: comment ? comment.trim() : null,
      },
    });

    return NextResponse.json({ ok: true, schedule: newSchedule }, { status: 201 });
  } catch (err) {
    console.error("POST schedules error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselorId = Number(admin.userId);
    if (!counselorId || isNaN(counselorId)) {
      return NextResponse.json({ error: "Invalid counselor session" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const scheduleId = Number(idParam);

    if (!scheduleId || isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid or missing schedule ID" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Verify ownership
    const existing = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (existing.counselorId !== counselorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.schedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ ok: true, message: "Appointment deleted" });
  } catch (err) {
    console.error("DELETE schedules error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = getAuthenticatedAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const counselorId = Number(admin.userId);
    if (!counselorId || isNaN(counselorId)) {
      return NextResponse.json({ error: "Invalid counselor session" }, { status: 400 });
    }

    const bodyText = await req.text();
    let body: any = {};
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { id, startTime, endTime, clientName, clientNumber, comment, meetingType, isRecurring, recurrenceGroup } = body;

    const scheduleId = Number(id);
    if (!scheduleId || isNaN(scheduleId)) {
      return NextResponse.json({ error: "Invalid or missing schedule ID" }, { status: 400 });
    }

    let startParsed: Date | undefined;
    let endParsed: Date | undefined;

    if (startTime) {
      startParsed = new Date(startTime);
      if (isNaN(startParsed.getTime())) {
        return NextResponse.json({ error: "Invalid Start Date format" }, { status: 400 });
      }
    }
    if (endTime) {
      endParsed = new Date(endTime);
      if (isNaN(endParsed.getTime())) {
        return NextResponse.json({ error: "Invalid End Date format" }, { status: 400 });
      }
    }

    if (startParsed && endParsed && startParsed.getTime() >= endParsed.getTime()) {
      return NextResponse.json({ error: "Start time must be before End time" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Verify ownership
    const existing = await prisma.schedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (existing.counselorId !== counselorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updatedSchedule = await prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        ...(startParsed && { startTime: startParsed }),
        ...(endParsed && { endTime: endParsed }),
        ...(clientName && typeof clientName === "string" && { clientName: clientName.trim() }),
        ...(clientNumber && typeof clientNumber === "string" && { clientNumber: clientNumber.trim() }),
        ...(comment !== undefined && { comment: comment ? comment.trim() : null }),
        ...(meetingType && typeof meetingType === "string" && { meetingType: meetingType.trim() }),
        ...(isRecurring !== undefined && { isRecurring: typeof isRecurring === "boolean" ? isRecurring : false }),
        ...(recurrenceGroup !== undefined && { recurrenceGroup: recurrenceGroup ? recurrenceGroup.trim() : null }),
      },
    });

    return NextResponse.json({ ok: true, schedule: updatedSchedule });
  } catch (err) {
    console.error("PUT schedules error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
