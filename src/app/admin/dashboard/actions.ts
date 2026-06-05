"use server";

import { getPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Server action to update schedule time (reschedule)
export async function updateAppointmentTime(
  scheduleId: number,
  startTimeISO: string,
  endTimeISO: string,
  counselorId: number
) {
  const prisma = await getPrisma();

  const existing = await prisma.schedule.findUnique({
    where: { id: scheduleId },
  });

  if (!existing || existing.counselorId !== counselorId) {
    throw new Error("Unauthorized or schedule not found");
  }

  const updated = await prisma.schedule.update({
    where: { id: scheduleId },
    data: {
      startTime: new Date(startTimeISO),
      endTime: new Date(endTimeISO),
    },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/game");
  return { ok: true, schedule: updated };
}

// Server action to schedule from waitlist
export async function moveWaitlistToSchedule(
  clientName: string,
  clientNumber: string,
  startTimeISO: string,
  endTimeISO: string,
  counselorId: number,
  comment?: string
) {
  const prisma = await getPrisma();

  const newSchedule = await prisma.schedule.create({
    data: {
      counselorId,
      clientName: clientName.trim(),
      clientNumber: clientNumber.trim(),
      startTime: new Date(startTimeISO),
      endTime: new Date(endTimeISO),
      comment: comment ? comment.trim() : null,
    },
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/game");
  return { ok: true, schedule: newSchedule };
}
