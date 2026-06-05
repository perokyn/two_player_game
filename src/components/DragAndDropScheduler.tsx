// src/components/DragAndDropScheduler.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  UserIcon,
  ClockIcon,
  TrashIcon,
  ArrowPathIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  InboxArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

export type WaitlistItem = {
  id: string;
  name: string;
  number: string;
  priority: "high" | "medium" | "low";
  comment?: string;
};

export type Schedule = {
  id: number;
  clientName: string;
  clientNumber: string;
  startTime: string;
  endTime: string;
  comment: string | null;
};

export default function DragAndDropScheduler() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<"day" | "week" | "month">("day");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Waitlist State (persisted to LocalStorage)
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Client-side hydration guard
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize waitlist values
  useEffect(() => {
    if (!isMounted) return;
    const defaultWaitlist: WaitlistItem[] = [
      { id: "w1", name: "Sarah Jenkins", number: "C-201", priority: "high", comment: "Intake session required" },
      { id: "w2", name: "David Miller", number: "C-202", priority: "medium", comment: "Bi-weekly review" },
      { id: "w3", name: "Emily Davis", number: "C-203", priority: "high", comment: "Anxiety coping focus" },
      { id: "w4", name: "James Wilson", number: "C-204", priority: "low", comment: "Follow-up check" },
      { id: "w5", name: "Michael Taylor", number: "C-205", priority: "medium", comment: "Family dynamics focus" }
    ];

    const stored = localStorage.getItem("counselor_waitlist");
    if (stored) {
      try {
        setWaitlist(JSON.parse(stored));
      } catch {
        setWaitlist(defaultWaitlist);
      }
    } else {
      setWaitlist(defaultWaitlist);
      localStorage.setItem("counselor_waitlist", JSON.stringify(defaultWaitlist));
    }
  }, [isMounted]);

  // Sync waitlist changes to localStorage
  const updateWaitlistState = (newList: WaitlistItem[]) => {
    setWaitlist(newList);
    localStorage.setItem("counselor_waitlist", JSON.stringify(newList));
  };

  useEffect(() => {
    if (isMounted) {
      fetchSchedules();
    }
  }, [isMounted, selectedDate]);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/schedules");
      const data = await res.json();
      if (res.ok && data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (err) {
      console.error("Error loading schedules", err);
    } finally {
      setLoading(false);
    }
  }

  // Helper: check if a date matches a target date string
  const isSameDay = (startTimeStr: string, targetDateStr: string) => {
    const d1 = new Date(startTimeStr);
    const d2 = new Date(targetDateStr + "T00:00:00");
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Date lists generator
  const getWeekDays = () => {
    const weekDays: string[] = [];
    const focusedDate = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = focusedDate.getDay();
    const sunday = new Date(focusedDate);
    sunday.setDate(focusedDate.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDays.push(d.toISOString().split("T")[0]);
    }
    return weekDays;
  };

  const getMonthDays = () => {
    const monthDays: Date[] = [];
    const focusedDate = new Date(selectedDate + "T00:00:00");
    const year = focusedDate.getFullYear();
    const month = focusedDate.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    const totalDaysInMonth = endOfMonth.getDate();
    const startDayOfWeek = startOfMonth.getDay();

    // Pad previous month
    const prevMonthEnd = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      monthDays.push(new Date(year, month - 1, prevMonthEnd - i));
    }
    // Current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      monthDays.push(new Date(year, month, i));
    }
    // Pad next month
    const remaining = 42 - monthDays.length;
    for (let i = 1; i <= remaining; i++) {
      monthDays.push(new Date(year, month + 1, i));
    }
    return monthDays;
  };

  // Hourly slots (8 AM to 6 PM) -> Hour numbers
  const workHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

  const formatHourLabel = (hour: number) => {
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${ampm}`;
  };

  const getScheduleForHourAndDay = (hour: number, dayStr: string) => {
    return schedules.find(
      (s) => isSameDay(s.startTime, dayStr) && new Date(s.startTime).getHours() === hour
    );
  };

  // Handle Drag & Drop finish
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    setInfoMessage(null);

    // Dropped outside target zone
    if (!destination) return;

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    // Dropped in same place
    if (sourceId === destId && source.index === destination.index) return;

    // CASE 1: Reordering within waitlist sidebar
    if (sourceId === "waitlist" && destId === "waitlist") {
      const items = Array.from(waitlist);
      const [reordered] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reordered);
      updateWaitlistState(items);
      return;
    }

    // Resolve Draggable client details
    const isGridItem = draggableId.startsWith("sched-");
    const scheduleId = isGridItem ? parseInt(draggableId.replace("sched-", ""), 10) : null;
    const client = isGridItem
      ? schedules.find((s) => s.id === scheduleId)
      : waitlist.find((w) => w.id === draggableId);

    if (!client) return;

    const scheduleClient = isGridItem ? (client as Schedule) : null;
    const waitlistClient = !isGridItem ? (client as WaitlistItem) : null;

    // CASE 2: Drag grid card back to Waitlist sidebar (Cancel appointment)
    if (destId === "waitlist") {
      if (!isGridItem || !scheduleId || !scheduleClient) return;

      const prevSchedules = [...schedules];
      const prevWaitlist = [...waitlist];

      // Optimistic delete
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));

      const restoredWaitlistItem: WaitlistItem = {
        id: `w-${Date.now()}`,
        name: scheduleClient.clientName,
        number: scheduleClient.clientNumber,
        priority: "medium",
        comment: scheduleClient.comment || undefined
      };
      updateWaitlistState([...waitlist, restoredWaitlistItem]);

      try {
        const res = await fetch(`/api/admin/schedules?id=${scheduleId}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error("Failed to delete appointment");
      } catch (err) {
        console.error("Cancel schedule failed", err);
        setSchedules(prevSchedules);
        updateWaitlistState(prevWaitlist);
        setWarningMessage("Could not cancel session. Database sync rollback triggered.");
        setTimeout(() => setWarningMessage(null), 4000);
      }
      return;
    }

    // CASE 3: Dropping into schedule grid (hour target or day cell)
    if (destId.startsWith("hour-") || destId.startsWith("day-")) {
      let targetDateStr = "";
      let targetHour = 10; // Default: 10 AM

      if (destId.startsWith("hour-")) {
        // Hourly Slot: hour-YYYY-MM-DD-H
        const parts = destId.split("-");
        targetDateStr = `${parts[1]}-${parts[2]}-${parts[3]}`;
        targetHour = parseInt(parts[4], 10);
      } else if (destId.startsWith("day-")) {
        // Daily Cell (Month View): day-YYYY-MM-DD
        const parts = destId.split("-");
        targetDateStr = `${parts[1]}-${parts[2]}-${parts[3]}`;
        // Preserve hour if rescheduling, otherwise default to 10 AM
        if (isGridItem && scheduleClient) {
          targetHour = new Date(scheduleClient.startTime).getHours();
        }
      }

      // Check occupied boundaries in Hourly Slots (Day/Week view)
      if (destId.startsWith("hour-")) {
        const occupied = schedules.find(
          (s) => isSameDay(s.startTime, targetDateStr) && new Date(s.startTime).getHours() === targetHour
        );
        if (occupied && occupied.id !== scheduleId) {
          setWarningMessage(`Time slot at ${formatHourLabel(targetHour)} on ${targetDateStr} is already occupied by ${occupied.clientName}!`);
          setTimeout(() => setWarningMessage(null), 4000);
          return;
        }
      }

      // Calculate start & end bounds
      const start = new Date(targetDateStr + "T00:00:00");
      start.setHours(targetHour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(targetHour + 1, 0, 0, 0);

      const startTimeISO = start.toISOString();
      const endTimeISO = end.toISOString();

      const prevSchedules = [...schedules];
      const prevWaitlist = [...waitlist];

      if (!isGridItem && waitlistClient) {
        // A. Move from Waitlist Sidebar -> Scheduled Grid Target
        const tempId = Date.now();
        const newTemp: Schedule = {
          id: tempId,
          clientName: waitlistClient.name,
          clientNumber: waitlistClient.number,
          startTime: startTimeISO,
          endTime: endTimeISO,
          comment: waitlistClient.comment || null
        };

        setSchedules((prev) => [...prev, newTemp]);
        updateWaitlistState(waitlist.filter((w) => w.id !== draggableId));

        try {
          const res = await fetch("/api/admin/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientName: waitlistClient.name,
              clientNumber: waitlistClient.number,
              startTime: startTimeISO,
              endTime: endTimeISO,
              comment: waitlistClient.comment || null
            })
          });
          const data = await res.json();
          if (res.ok && data.schedule) {
            setSchedules((prev) => prev.map((s) => (s.id === tempId ? data.schedule : s)));
          } else {
            throw new Error("POST failed");
          }
        } catch (err) {
          console.error("DB Post Sync failed", err);
          setSchedules(prevSchedules);
          updateWaitlistState(prevWaitlist);
          setWarningMessage("Scheduling client failed. Rollback triggered.");
          setTimeout(() => setWarningMessage(null), 4000);
        }
      } else if (isGridItem && scheduleId) {
        // B. Reschedule Existing Grid Card
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === scheduleId
              ? { ...s, startTime: startTimeISO, endTime: endTimeISO }
              : s
          )
        );

        try {
          const res = await fetch("/api/admin/schedules", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: scheduleId,
              startTime: startTimeISO,
              endTime: endTimeISO
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "PUT failed");
        } catch (err) {
          console.error("DB Put Sync failed", err);
          setSchedules(prevSchedules);
          setWarningMessage("Rescheduling failed. Rollback triggered.");
          setTimeout(() => setWarningMessage(null), 4000);
        }
      }
    }
  };

  const handleCancelClick = async (sched: Schedule) => {
    if (!confirm(`Cancel and delete appointment for ${sched.clientName}?`)) return;

    const prevSchedules = [...schedules];
    const prevWaitlist = [...waitlist];

    setSchedules((prev) => prev.filter((s) => s.id !== sched.id));
    const restored: WaitlistItem = {
      id: `w-${Date.now()}`,
      name: sched.clientName,
      number: sched.clientNumber,
      priority: "medium",
      comment: sched.comment || undefined
    };
    updateWaitlistState([...waitlist, restored]);

    try {
      const res = await fetch(`/api/admin/schedules?id=${sched.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Delete failed");
    } catch (err) {
      setSchedules(prevSchedules);
      updateWaitlistState(prevWaitlist);
      alert("Database error: could not cancel schedule.");
    }
  };

  const adjustDate = (amount: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    if (view === "day") {
      d.setDate(d.getDate() + amount);
    } else if (view === "week") {
      d.setDate(d.getDate() + amount * 7);
    } else if (view === "month") {
      d.setMonth(d.getMonth() + amount);
    }
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const getPriorityStyle = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return {
          bg: "bg-red-50 dark:bg-red-950/20",
          border: "border-red-200 dark:border-red-900/50 hover:border-red-400",
          text: "text-red-800 dark:text-red-300",
          badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
        };
      case "medium":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/20",
          border: "border-amber-200 dark:border-amber-900/50 hover:border-amber-400",
          text: "text-amber-800 dark:text-amber-300",
          badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
        };
      case "low":
        return {
          bg: "bg-teal-50 dark:bg-teal-950/20",
          border: "border-teal-200 dark:border-teal-900/50 hover:border-teal-400",
          text: "text-teal-800 dark:text-teal-300",
          badge: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
        };
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-col gap-6 bg-[var(--background)] p-6 rounded-2xl border border-[var(--border-subtle)] items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="w-8 h-8 text-[var(--muted-foreground)] animate-spin" />
        <span className="text-sm text-[var(--muted-foreground)] font-semibold mt-2">
          Initializing Drag & Drop system...
        </span>
      </div>
    );
  }

  const weekDays = getWeekDays();
  const monthDays = getMonthDays();

  return (
    <DragDropContext onDragStart={() => setInfoMessage("Drag card over lists or empty slots to schedule")} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-6 bg-[var(--background)] p-6 rounded-2xl border border-[var(--border-subtle)] transition-all duration-300 animate-in fade-in duration-200">
        
        {/* Date & Info Banner Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--foreground)] tracking-wide flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-[var(--accent-primary)]" />
              Drag & Drop Scheduler
            </h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              Schedule waitlist clients by dragging cards directly into empty time slots.
            </p>
          </div>

          {/* Controls Toggles Day/Week/Month */}
          <div className="flex bg-[var(--muted-bg)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 rounded ${
                  view === v
                    ? "bg-[var(--background)] text-[var(--accent-primary)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date Selector Navigation */}
          <div className="flex items-center gap-3 bg-[var(--muted-bg)] border border-[var(--border-subtle)] rounded-xl p-1 shadow-sm">
            <button
              onClick={() => adjustDate(-1)}
              className="p-1.5 hover:bg-[var(--background)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]"
            >
              <ChevronLeftIcon className="w-4 h-4 text-[var(--foreground)]" />
            </button>
            
            <div className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-[var(--foreground)] select-none">
              <CalendarIcon className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>
                {view === "day" && new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short", month: "short", day: "numeric", year: "numeric"
                })}
                {view === "week" && `Week of ${new Date(weekDays[0] + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short", day: "numeric"
                })} – ${new Date(weekDays[6] + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short", day: "numeric", year: "numeric"
                })}`}
                {view === "month" && new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                  month: "long", year: "numeric"
                })}
              </span>
            </div>

            <button
              onClick={() => adjustDate(1)}
              className="p-1.5 hover:bg-[var(--background)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]"
            >
              <ChevronRightIcon className="w-4 h-4 text-[var(--foreground)]" />
            </button>
            
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
              className="text-xs font-bold px-2.5 py-1.5 hover:bg-[var(--background)] text-[var(--foreground)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-subtle)]"
            >
              Today
            </button>
          </div>
        </div>

        {/* State Notification Message Banners */}
        {warningMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold animate-pulse shadow-sm">
            <ExclamationCircleIcon className="w-4.5 h-4.5 text-red-600 shrink-0" />
            {warningMessage}
          </div>
        )}
        {infoMessage && (
          <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-semibold shadow-sm">
            <InformationCircleIcon className="w-4.5 h-4.5 text-teal-600 shrink-0" />
            {infoMessage}
          </div>
        )}

        {/* Drag and Drop 2-Column Split Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* LEFT COLUMN: 1/4 Draggable Waitlist Sidebar */}
          <Droppable droppableId="waitlist">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`xl:col-span-1 bg-[var(--muted-bg)] border border-[var(--border-subtle)] rounded-2xl p-4 flex flex-col gap-4 shadow-inner min-h-[450px] transition-colors duration-200 ${
                  snapshot.isDraggingOver ? "bg-[var(--accent-soft-bg)] border-[var(--accent-primary)]/40" : ""
                }`}
              >
                <div className="border-b border-[var(--border-subtle)] pb-2 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                    <InboxArrowDownIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                    Waitlist
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--background)] text-[var(--muted-foreground)]">
                    {waitlist.length} clients
                  </span>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                  {waitlist.length === 0 ? (
                    <div className="text-center py-10 text-xs text-[var(--muted-foreground)] italic border border-dashed border-[var(--border-subtle)] rounded-xl bg-[var(--background)]/30">
                      Waitlist is empty.
                      <p className="text-[10px] mt-1 text-[var(--muted-foreground)]/70">
                        Drag schedules here to cancel them.
                      </p>
                    </div>
                  ) : (
                    waitlist.map((item, index) => {
                      const styles = getPriorityStyle(item.priority);
                      return (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-1.5 shadow-sm bg-[var(--background)] select-none ${styles.border} ${
                                snapshot.isDragging ? "opacity-75 shadow-lg border-[var(--accent-primary)] scale-105" : "hover:shadow"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-xs text-[var(--foreground)]">
                                  {item.name}
                                </span>
                                <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${styles.badge}`}>
                                  {item.priority}
                                </span>
                              </div>
                              
                              <div className="text-[10px] text-[var(--muted-foreground)] flex items-center justify-between">
                                <span>ID: {item.number}</span>
                              </div>

                              {item.comment && (
                                <p className="text-[10px] text-[var(--muted-foreground)] italic border-l border-[var(--border-subtle)] pl-1.5 mt-0.5">
                                  "{item.comment}"
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })
                  )}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>

          {/* RIGHT COLUMN: 3/4 Droppable Grids (Branches based on view) */}
          <div className="xl:col-span-3 bg-[var(--muted-bg)] border border-[var(--border-subtle)] rounded-2xl p-5 shadow-inner">
            
            {/* VIEW A: DAY VIEW */}
            {view === "day" && (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex items-center justify-center py-20 gap-2">
                    <ArrowPathIcon className="w-5 h-5 text-[var(--muted-foreground)] animate-spin" />
                    <span className="text-xs text-[var(--muted-foreground)] font-semibold">Syncing day grid...</span>
                  </div>
                ) : (
                  workHours.map((hour) => {
                    const sched = getScheduleForHourAndDay(hour, selectedDate);
                    const slotId = `hour-${selectedDate}-${hour}`;

                    return (
                      <Droppable key={hour} droppableId={slotId}>
                        {(provided, snapshot) => {
                          let borderHighlight = "border-[var(--border-subtle)] bg-[var(--background)]";
                          if (snapshot.isDraggingOver) {
                            borderHighlight = sched
                              ? "border-red-400 bg-red-50/20 ring-2 ring-red-400"
                              : "border-[var(--accent-primary)] bg-[var(--accent-soft-bg)] ring-2 ring-[var(--accent-primary)]";
                          }

                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`flex items-center rounded-2xl border transition-all duration-300 min-h-[72px] shadow-sm ${borderHighlight}`}
                            >
                              <div className="w-24 border-r border-[var(--border-subtle)] p-4 bg-[var(--muted-bg)]/30 flex flex-col justify-center items-center shrink-0">
                                <ClockIcon className="w-4 h-4 text-[var(--muted-foreground)] mb-1" />
                                <span className="text-[10px] font-bold text-[var(--foreground)] text-center whitespace-nowrap">
                                  {formatHourLabel(hour)}
                                </span>
                              </div>

                              <div className="flex-1 p-3 flex items-center justify-between gap-4 h-full relative">
                                {sched ? (
                                  <Draggable key={`sched-${sched.id}`} draggableId={`sched-${sched.id}`} index={0}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`w-full flex flex-wrap justify-between items-center bg-[var(--accent-soft-bg)] border border-[var(--accent-primary)]/20 p-2.5 rounded-xl gap-2 transition-all ${
                                          snapshot.isDragging ? "opacity-75 shadow-lg border-[var(--accent-primary)] scale-105" : "hover:border-[var(--accent-primary)] hover:shadow-md"
                                        }`}
                                      >
                                        <div className="space-y-0.5 text-left">
                                          <span className="text-xs font-extrabold text-[var(--foreground)] flex items-center gap-1.5">
                                            <UserIcon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                                            {sched.clientName}
                                          </span>
                                          <div className="text-[9px] text-[var(--muted-foreground)] flex gap-4">
                                            <span>ID: {sched.clientNumber}</span>
                                            {sched.comment && <span className="truncate max-w-[200px] italic">"{sched.comment}"</span>}
                                          </div>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleCancelClick(sched)}
                                          className="p-1 rounded-md text-[var(--muted-foreground)] hover:bg-red-50 hover:text-red-600 transition-colors"
                                          title="Cancel appointment"
                                        >
                                          <TrashIcon className="w-4.5 h-4.5" />
                                        </button>
                                      </div>
                                    )}
                                  </Draggable>
                                ) : (
                                  <div className="w-full text-center py-2 text-[10px] text-[var(--muted-foreground)]/60 font-semibold italic border border-dashed border-[var(--border-subtle)]/60 rounded-xl bg-[var(--background)]/20">
                                    Time slot available
                                  </div>
                                )}
                                {provided.placeholder}
                              </div>
                            </div>
                          );
                        }}
                      </Droppable>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW B: WEEK VIEW */}
            {view === "week" && (
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-3 min-w-[950px]">
                  {weekDays.map((dayStr) => {
                    const parsedDay = new Date(dayStr + "T00:00:00");
                    const isToday = new Date().toDateString() === parsedDay.toDateString();

                    return (
                      <div key={dayStr} className="flex flex-col gap-3">
                        {/* Day Header */}
                        <div className={`text-center py-2 border-b border-[var(--border-subtle)] rounded-lg ${isToday ? "bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] text-[var(--accent-primary)]" : "bg-[var(--background)]"}`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider block text-[var(--muted-foreground)]">
                            {parsedDay.toLocaleDateString(undefined, { weekday: "short" })}
                          </span>
                          <span className="text-sm font-extrabold text-[var(--foreground)] mt-0.5 block">
                            {parsedDay.getDate()}
                          </span>
                        </div>

                        {/* Hourly Slots in Column */}
                        <div className="space-y-2">
                          {workHours.map((hour) => {
                            const sched = getScheduleForHourAndDay(hour, dayStr);
                            const slotId = `hour-${dayStr}-${hour}`;

                            return (
                              <Droppable key={hour} droppableId={slotId}>
                                {(provided, snapshot) => {
                                  let bgStyle = "bg-[var(--background)] border-[var(--border-subtle)]";
                                  if (snapshot.isDraggingOver) {
                                    bgStyle = sched
                                      ? "border-red-400 bg-red-50/20 ring-1 ring-red-400"
                                      : "border-[var(--accent-primary)] bg-[var(--accent-soft-bg)] ring-1 ring-[var(--accent-primary)]";
                                  }

                                  return (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`border rounded-xl p-2 min-h-[70px] flex flex-col justify-between transition-all duration-200 ${bgStyle}`}
                                    >
                                      <span className="text-[8px] font-bold text-[var(--muted-foreground)] mb-1 block">
                                        {formatHourLabel(hour)}
                                      </span>

                                      {sched ? (
                                        <Draggable key={`sched-${sched.id}`} draggableId={`sched-${sched.id}`} index={0}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              className={`p-1.5 rounded-lg border border-[var(--accent-primary)]/10 bg-[var(--accent-soft-bg)] text-xs text-left cursor-grab active:cursor-grabbing select-none ${
                                                snapshot.isDragging ? "opacity-75 shadow-md border-[var(--accent-primary)] scale-105" : ""
                                              }`}
                                            >
                                              <div className="font-extrabold text-[10px] text-[var(--foreground)] truncate">
                                                {sched.clientName}
                                              </div>
                                              <div className="text-[8px] text-[var(--muted-foreground)] truncate">
                                                ID: {sched.clientNumber}
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ) : (
                                        <div className="text-[8px] text-[var(--muted-foreground)]/30 text-center italic py-2">
                                          Free
                                        </div>
                                      )}
                                      {provided.placeholder}
                                    </div>
                                  );
                                }}
                              </Droppable>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW C: MONTH VIEW */}
            {view === "month" && (
              <div>
                {/* Day of Week Labels */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="py-1">{d}</div>
                  ))}
                </div>

                {/* Day Grid cells */}
                <div className="grid grid-cols-7 gap-1.5">
                  {monthDays.map((day, cellIdx) => {
                    const dayStr = day.toISOString().split("T")[0];
                    const isCurrentMonth = day.getMonth() === new Date(selectedDate + "T00:00:00").getMonth();
                    const dayScheds = schedules.filter((s) => isSameDay(s.startTime, dayStr));
                    const isToday = new Date().toDateString() === day.toDateString();

                    return (
                      <Droppable key={dayStr} droppableId={`day-${dayStr}`}>
                        {(provided, snapshot) => {
                          let bgStyle = isCurrentMonth
                            ? "bg-[var(--background)] border-[var(--border-subtle)]"
                            : "bg-[var(--background)]/40 border-[var(--border-subtle)]/30 text-[var(--muted-foreground)]/40";
                          if (snapshot.isDraggingOver) {
                            bgStyle = "bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]";
                          }

                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`min-h-[100px] p-2 rounded-xl border flex flex-col gap-1 transition-all ${bgStyle} ${
                                isToday ? "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--muted-bg)]" : ""
                              }`}
                            >
                              <span className={`text-[10px] font-extrabold ${isCurrentMonth ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]/30"}`}>
                                {day.getDate()}
                              </span>

                              <div className="flex-1 space-y-1 overflow-y-auto mt-1 max-h-[80px]">
                                {dayScheds.map((sched, sIdx) => {
                                  const sTime = new Date(sched.startTime).toLocaleTimeString(undefined, {
                                    hour: "numeric", minute: "2-digit"
                                  });
                                  return (
                                    <Draggable key={`sched-${sched.id}`} draggableId={`sched-${sched.id}`} index={sIdx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`px-1.5 py-0.5 rounded text-[8px] font-semibold bg-[var(--accent-soft-bg)] border border-[var(--accent-primary)]/20 text-[var(--accent-soft-foreground)] truncate text-left cursor-grab active:cursor-grabbing select-none ${
                                            snapshot.isDragging ? "opacity-75 shadow-md border-[var(--accent-primary)] scale-105" : "hover:border-[var(--accent-primary)]"
                                          }`}
                                          title={`${sched.clientName} (${sTime})`}
                                        >
                                          {sTime} {sched.clientName}
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                              </div>
                              {provided.placeholder}
                            </div>
                          );
                        }}
                      </Droppable>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </DragDropContext>
  );
}
