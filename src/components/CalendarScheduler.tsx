// src/components/CalendarScheduler.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  ClockIcon,
  TrashIcon,
  UserIcon,
  HashtagIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";

type Schedule = {
  id: number;
  clientName: string;
  clientNumber: string;
  startTime: string;
  endTime: string;
  comment: string | null;
};

type CalendarSchedulerProps = {
  onSelectClient: (clientName: string, clientNumber: string) => void;
};

export default function CalendarScheduler({ onSelectClient }: CalendarSchedulerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [view, setView] = useState<"month" | "year" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Form states
  const [clientName, setClientName] = useState<string>("");
  const [clientNumber, setClientNumber] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

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

  // Handle Event creation
  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!clientName.trim() || !clientNumber.trim() || !startDate || !startTime || !endDate || !endTime) {
      setFormError("All fields except comments are required.");
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setFormError("Invalid date or time format.");
      return;
    }

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      setFormError("Start time must be before end time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientNumber: clientNumber.trim(),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to schedule appointment");
      }

      setShowAddModal(false);
      resetForm();
      await fetchSchedules();
    } catch (err: any) {
      setFormError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Event deletion
  async function handleDeleteSchedule(id: number) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      const res = await fetch(`/api/admin/schedules?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setShowDetailModal(false);
        setSelectedSchedule(null);
        await fetchSchedules();
      }
    } catch (err) {
      console.error("Error canceling schedule", err);
    }
  }

  function resetForm() {
    setClientName("");
    setClientNumber("");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setComment("");
    setFormError(null);
  }

  function handleOpenAddModal(initialDate: Date = new Date()) {
    resetForm();
    const formattedDate = initialDate.toISOString().split("T")[0];
    setStartDate(formattedDate);
    setEndDate(formattedDate);
    setStartTime("10:00");
    setEndTime("11:00");
    setShowAddModal(true);
  }

  // Trigger Clinical Notes Filter when clicking schedule
  function handleScheduleClick(sched: Schedule, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedSchedule(sched);
    setShowDetailModal(true);
    // Callback to filter notes
    onSelectClient(sched.clientName, sched.clientNumber);
  }

  // Navigation helpers
  function adjustDate(amount: number) {
    const next = new Date(currentDate);
    if (view === "month" || collapsed) {
      next.setMonth(next.getMonth() + amount);
    } else if (view === "year") {
      next.setFullYear(next.getFullYear() + amount);
    } else if (view === "week") {
      next.setDate(next.getDate() + amount * 7);
    } else if (view === "day") {
      next.setDate(next.getDate() + amount);
    }
    setCurrentDate(next);
  }

  // Helper date lists
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDayOfWeek = startOfMonth.getDay(); // 0 is Sunday
  const totalDaysInMonth = endOfMonth.getDate();

  // Calendar cells for Month view
  const monthDays: (Date | null)[] = [];
  // padding previous month
  const prevMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    monthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthEnd - i));
  }
  // current month
  for (let i = 1; i <= totalDaysInMonth; i++) {
    monthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }
  // padding next month to make rows complete (42 cells total for grid stability)
  const remainingCells = 42 - monthDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    monthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i));
  }

  // Collapsed View (Week Agenda): Starts at Sunday of focused date's week
  const weekStart = new Date(currentDate);
  const currentDayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - currentDayOfWeek); // Sunday

  const collapsedDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    collapsedDays.push(day);
  }

  // Filter schedules on a specific day
  function getSchedulesForDay(day: Date) {
    return schedules.filter((s) => {
      const sDate = new Date(s.startTime);
      return (
        sDate.getFullYear() === day.getFullYear() &&
        sDate.getMonth() === day.getMonth() &&
        sDate.getDate() === day.getDate()
      );
    });
  }

  // Render list of months for Year View
  const monthsList = Array.from({ length: 12 }, (_, i) => new Date(currentDate.getFullYear(), i, 1));

  // Render days of the active week for Week View
  const weekDaysList: Date[] = [];
  const activeWeekStart = new Date(currentDate);
  activeWeekStart.setDate(currentDate.getDate() - currentDate.getDay());
  for (let i = 0; i < 7; i++) {
    const day = new Date(activeWeekStart);
    day.setDate(activeWeekStart.getDate() + i);
    weekDaysList.push(day);
  }

  return (
    <div className="bg-[var(--background)] border border-[var(--border-subtle)] rounded-2xl shadow-sm overflow-hidden mb-6 transition-all duration-300">
      
      {/* Calendar Header Toggles */}
      <div className="px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--background)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
          <h3 className="text-sm font-bold text-[var(--foreground)] tracking-wide">
            {collapsed ? "Session Schedule (Collapsed)" : "Session Scheduler"}
          </h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[var(--muted-bg)] text-[var(--muted-foreground)]">
            {currentDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-3">
          
          {/* Collapse/Expand toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] hover:bg-[var(--muted-bg)] transition-colors text-[var(--foreground)] bg-[var(--background)]"
          >
            {collapsed ? "Expand Scheduler" : "Collapse to Week"}
          </button>

          {/* View Selection (Only when expanded) */}
          {!collapsed && (
            <div className="flex bg-[var(--muted-bg)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
              {(["year", "month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded ${
                    view === v
                      ? "bg-[var(--background)] text-[var(--accent-primary)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {/* Prev/Next Navigation */}
          <div className="flex items-center border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--background)]">
            <button
              onClick={() => adjustDate(-1)}
              className="p-1.5 hover:bg-[var(--muted-bg)] transition-colors border-r border-[var(--border-subtle)]"
            >
              <ChevronLeftIcon className="w-4 h-4 text-[var(--foreground)]" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-[10px] font-bold text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => adjustDate(1)}
              className="p-1.5 hover:bg-[var(--muted-bg)] transition-colors border-l border-[var(--border-subtle)]"
            >
              <ChevronRightIcon className="w-4 h-4 text-[var(--foreground)]" />
            </button>
          </div>

          {/* Quick Add Schedule */}
          <button
            onClick={() => handleOpenAddModal(new Date())}
            className="p-1.5 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center"
            title="Schedule New Session"
          >
            <PlusIcon className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* ======================================================== */}
      {/* COLLAPSED VIEW: Single Row Week Agenda strip             */}
      {/* ======================================================== */}
      {collapsed && (
        <div className="p-4 bg-[var(--muted-bg)]">
          <div className="grid grid-cols-7 gap-2">
            {collapsedDays.map((day, idx) => {
              const dayScheds = getSchedulesForDay(day);
              const isToday = new Date().toDateString() === day.toDateString();
              const isSelected = currentDate.toDateString() === day.toDateString();

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentDate(day)}
                  className={`cursor-pointer p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                    isSelected
                      ? "bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] text-[var(--foreground)]"
                      : isToday
                        ? "bg-[var(--background)] border-[var(--accent-primary)] border-dashed text-[var(--foreground)]"
                        : "bg-[var(--background)] border-[var(--border-subtle)] hover:border-[var(--muted-foreground)] text-[var(--muted-foreground)]"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </span>
                  <span className="text-sm font-extrabold text-[var(--foreground)]">
                    {day.getDate()}
                  </span>
                  {/* Event indicators */}
                  <div className="flex gap-1 justify-center min-h-[6px]">
                    {dayScheds.map((s) => (
                      <span
                        key={s.id}
                        className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse"
                        title={`${s.clientName} (${new Date(s.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })})`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick list of day's appointments in collapsed mode */}
          <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
              Schedules for {currentDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </h4>
            
            {getSchedulesForDay(currentDate).length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] italic py-1">
                No sessions scheduled for this day. Click "+" to add one.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {getSchedulesForDay(currentDate).map((sched) => {
                  const sTime = new Date(sched.startTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <button
                      key={sched.id}
                      type="button"
                      onClick={(e) => handleScheduleClick(sched, e)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] hover:bg-[var(--muted-bg)] text-xs text-[var(--foreground)] font-medium shadow-sm transition-colors text-left"
                    >
                      <ClockIcon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      <span>{sTime}</span>
                      <strong className="text-[var(--accent-primary)] font-semibold border-l border-[var(--border-subtle)] pl-2">
                        {sched.clientName}
                      </strong>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* EXPANDED VIEW: Month/Year/Week/Day grids                 */}
      {/* ======================================================== */}
      {!collapsed && (
        <div className="p-4 bg-[var(--muted-bg)] overflow-x-auto">
          
          {/* MONTH VIEW */}
          {view === "month" && (
            <div className="min-w-[600px]">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, idx) => {
                  if (!day) return <div key={idx} className="bg-transparent" />;
                  
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const dayScheds = getSchedulesForDay(day);
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <div
                      key={idx}
                      onClick={() => handleOpenAddModal(day)}
                      className={`min-h-[90px] p-2 rounded-xl border flex flex-col gap-1 transition-all ${
                        isCurrentMonth
                          ? "bg-[var(--background)] border-[var(--border-subtle)]"
                          : "bg-[var(--background)]/40 border-[var(--border-subtle)]/40 text-[var(--muted-foreground)]/50"
                      } ${isToday ? "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--muted-bg)]" : ""}`}
                    >
                      <span className={`text-[10px] font-extrabold ${isCurrentMonth ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]/40"}`}>
                        {day.getDate()}
                      </span>
                      
                      <div className="flex-1 overflow-y-auto space-y-1 mt-1">
                        {dayScheds.map((s) => {
                          const timeStr = new Date(s.startTime).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={(e) => handleScheduleClick(s, e)}
                              className="w-full text-left truncate px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[var(--accent-soft-bg)] border border-[var(--accent-primary)]/20 text-[var(--accent-soft-foreground)] hover:opacity-90 transition-opacity"
                              title={`${s.clientName} (${timeStr})`}
                            >
                              {timeStr} {s.clientName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* YEAR VIEW */}
          {view === "year" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {monthsList.map((m, mIdx) => {
                // compute days inside the current year month
                const monthStart = new Date(currentDate.getFullYear(), mIdx, 1);
                const monthEnd = new Date(currentDate.getFullYear(), mIdx + 1, 0);
                const monthCells: (number | null)[] = [];
                for (let i = 0; i < monthStart.getDay(); i++) monthCells.push(null);
                for (let i = 1; i <= monthEnd.getDate(); i++) monthCells.push(i);

                return (
                  <div
                    key={mIdx}
                    onClick={() => {
                      setCurrentDate(m);
                      setView("month");
                    }}
                    className="cursor-pointer p-4 bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl hover:shadow-md transition-shadow"
                  >
                    <h4 className="text-xs font-extrabold text-[var(--foreground)] text-center mb-3">
                      {m.toLocaleDateString(undefined, { month: "long" })}
                    </h4>
                    
                    <div className="grid grid-cols-7 gap-0.5 text-center text-[7px] font-bold text-[var(--muted-foreground)] mb-1">
                      {["S", "M", "T", "W", "T", "F", "S"].map((c, i) => (
                        <div key={i}>{c}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 text-center text-[8px]">
                      {monthCells.map((dayNum, cellIdx) => {
                        if (dayNum === null) return <div key={cellIdx} />;
                        
                        const curDay = new Date(currentDate.getFullYear(), mIdx, dayNum);
                        const hasEvent = getSchedulesForDay(curDay).length > 0;

                        return (
                          <div
                            key={cellIdx}
                            className={`p-0.5 rounded-full ${
                              hasEvent
                                ? "bg-[var(--accent-primary)] text-[var(--accent-foreground)] font-bold"
                                : "text-[var(--foreground)]"
                            }`}
                          >
                            {dayNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* WEEK VIEW */}
          {view === "week" && (
            <div className="min-w-[700px]">
              <div className="grid grid-cols-7 gap-2">
                {weekDaysList.map((day, idx) => {
                  const dayScheds = getSchedulesForDay(day);
                  const isToday = new Date().toDateString() === day.toDateString();

                  return (
                    <div
                      key={idx}
                      className={`border border-[var(--border-subtle)] rounded-xl min-h-[300px] flex flex-col p-3 bg-[var(--background)] ${
                        isToday ? "ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--muted-bg)]" : ""
                      }`}
                    >
                      <div className="text-center border-b border-[var(--border-subtle)] pb-2 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                          {day.toLocaleDateString(undefined, { weekday: "short" })}
                        </span>
                        <h4 className="text-lg font-extrabold text-[var(--foreground)] mt-0.5">
                          {day.getDate()}
                        </h4>
                      </div>

                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {dayScheds.map((s) => {
                          const sTime = new Date(s.startTime).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          });
                          return (
                            <div
                              key={s.id}
                              onClick={(e) => handleScheduleClick(s, e)}
                              className="cursor-pointer p-2.5 rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-soft-bg)] text-[var(--accent-soft-foreground)] text-xs flex flex-col gap-1 hover:opacity-90 transition-opacity"
                            >
                              <div className="font-bold">{s.clientName}</div>
                              <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                                <ClockIcon className="w-3 h-3" />
                                {sTime}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handleOpenAddModal(day)}
                        className="mt-2 w-full py-1 text-[10px] font-bold text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-soft-bg)] rounded-lg transition-colors"
                      >
                        + Add Slot
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {view === "day" && (
            <div className="max-w-2xl mx-auto bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-6">
              <div className="border-b border-[var(--border-subtle)] pb-4 mb-4 flex justify-between items-center">
                <div>
                  <h4 className="text-base font-extrabold text-[var(--foreground)]">
                    Agenda for {currentDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Select any schedule to sync-filter client notes database.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddModal(currentDate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 font-bold text-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Appointment
                </button>
              </div>

              <div className="space-y-4">
                {getSchedulesForDay(currentDate).length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] italic text-center py-6">
                    No sessions scheduled for today.
                  </p>
                ) : (
                  getSchedulesForDay(currentDate).map((s) => {
                    const startStr = new Date(s.startTime).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const endStr = new Date(s.endTime).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    return (
                      <div
                        key={s.id}
                        onClick={(e) => handleScheduleClick(s, e)}
                        className="cursor-pointer p-4 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] bg-[var(--muted-bg)] transition-colors flex justify-between items-start gap-4"
                      >
                        <div className="space-y-1">
                          <h5 className="text-sm font-extrabold text-[var(--foreground)]">
                            {s.clientName} (ID: {s.clientNumber})
                          </h5>
                          <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                            <ClockIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                            {startStr} – {endStr}
                          </div>
                          {s.comment && (
                            <p className="text-xs text-[var(--muted-foreground)] italic mt-1 pl-2 border-l border-[var(--border-subtle)]">
                              "{s.comment}"
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSchedule(s.id);
                          }}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP MODAL: Schedule New Session                        */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--background)] rounded-2xl shadow-2xl p-6 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
              <h4 className="text-sm font-extrabold text-[var(--foreground)] uppercase tracking-wider">
                Schedule New Session
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted-bg)]"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-4">
              {/* Client Name */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" /> Client Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                  required
                />
              </div>

              {/* Client ID */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <HashtagIcon className="w-3.5 h-3.5" /> Client ID / Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. C-104"
                  value={clientNumber}
                  onChange={(e) => setClientNumber(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                  required
                />
              </div>

              {/* Date & Time selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate) setEndDate(e.target.value);
                    }}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-xs text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* Comment field */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ChatBubbleBottomCenterTextIcon className="w-3.5 h-3.5" /> Comments
                </label>
                <textarea
                  rows={3}
                  placeholder="Clinical notes focus, session goal..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] p-3 text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                />
              </div>

              {formError && (
                <div className="text-xs text-[var(--error-foreground)] bg-[var(--error-bg)] border border-[var(--error-border)] p-3 rounded-lg font-medium">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 font-bold text-xs"
                >
                  {submitting ? "Scheduling..." : "Schedule Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP MODAL: Appointment Detail View / Cancel            */}
      {/* ======================================================== */}
      {showDetailModal && selectedSchedule && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--background)] rounded-2xl shadow-2xl p-6 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
              <h4 className="text-sm font-extrabold text-[var(--foreground)] uppercase tracking-wider">
                Appointment Details
              </h4>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-md text-[var(--muted-foreground)] hover:bg-[var(--muted-bg)]"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-[var(--muted-bg)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase block">Client Name</span>
                  <span className="text-sm font-bold text-[var(--foreground)] mt-0.5 block">{selectedSchedule.clientName}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase block">Client ID</span>
                  <span className="text-sm font-bold text-[var(--foreground)] mt-0.5 block">{selectedSchedule.clientNumber}</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase block">Date & Time</span>
                <span className="text-xs font-semibold text-[var(--foreground)] mt-1 flex items-center gap-1.5">
                  <ClockIcon className="w-4 h-4 text-[var(--accent-primary)]" />
                  {new Date(selectedSchedule.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(selectedSchedule.endTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {selectedSchedule.comment && (
                <div>
                  <span className="text-[9px] font-bold text-[var(--muted-foreground)] uppercase block">Notes focus / comments</span>
                  <p className="text-xs text-[var(--foreground)] mt-1.5 p-3 rounded-lg bg-[var(--muted-bg)] border border-[var(--border-subtle)] italic">
                    "{selectedSchedule.comment}"
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(selectedSchedule.id)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 border border-red-200"
                >
                  <TrashIcon className="w-4 h-4" />
                  Cancel Appointment
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-5 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] font-bold hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
