// src/app/api/admin/notes/route.ts
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
    const notes = await prisma.note.findMany({
      where: { counselorId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ ok: true, notes });
  } catch (err) {
    console.error("GET notes error:", err);
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

    const { clientName, clientNumber, date, content } = body;

    if (!clientName || typeof clientName !== "string" || !clientName.trim()) {
      return NextResponse.json({ error: "Client Name is required" }, { status: 400 });
    }
    if (!clientNumber || typeof clientNumber !== "string" || !clientNumber.trim()) {
      return NextResponse.json({ error: "Client Number is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Notes content is required" }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid Date format" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const newNote = await prisma.note.create({
      data: {
        counselorId,
        clientName: clientName.trim(),
        clientNumber: clientNumber.trim(),
        date: parsedDate,
        content: content.trim(),
      },
    });

    return NextResponse.json({ ok: true, note: newNote }, { status: 201 });
  } catch (err) {
    console.error("POST notes error:", err);
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

    const { id, clientName, clientNumber, date, content } = body;

    const noteId = Number(id);
    if (!noteId || isNaN(noteId)) {
      return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
    }

    if (!clientName || typeof clientName !== "string" || !clientName.trim()) {
      return NextResponse.json({ error: "Client Name is required" }, { status: 400 });
    }
    if (!clientNumber || typeof clientNumber !== "string" || !clientNumber.trim()) {
      return NextResponse.json({ error: "Client Number is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Notes content is required" }, { status: 400 });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid Date format" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Verify ownership
    const existingNote = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (existingNote.counselorId !== counselorId) {
      return NextResponse.json({ error: "Unauthorized access to this note" }, { status: 403 });
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        clientName: clientName.trim(),
        clientNumber: clientNumber.trim(),
        date: parsedDate,
        content: content.trim(),
      },
    });

    return NextResponse.json({ ok: true, note: updatedNote });
  } catch (err) {
    console.error("PUT notes error:", err);
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
    const noteId = Number(idParam);

    if (!noteId || isNaN(noteId)) {
      return NextResponse.json({ error: "Invalid or missing note ID" }, { status: 400 });
    }

    const prisma = await getPrisma();

    // Verify ownership
    const existingNote = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (existingNote.counselorId !== counselorId) {
      return NextResponse.json({ error: "Unauthorized access to this note" }, { status: 403 });
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    return NextResponse.json({ ok: true, message: "Note deleted successfully" });
  } catch (err) {
    console.error("DELETE notes error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

