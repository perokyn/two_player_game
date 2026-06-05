// src/components/ClientNotesWidget.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  ClipboardDocumentIcon,
  PlusIcon,
  CheckIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserIcon,
  HashtagIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

type Note = {
  id: number;
  clientName: string;
  clientNumber: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export default function ClientNotesWidget() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);

  // Form states
  const [clientName, setClientName] = useState<string>("");
  const [clientNumber, setClientNumber] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [content, setContent] = useState<string>( "");

  // UI feedback states
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notes");
      const data = await res.json();
      if (res.ok && data.notes) {
        setNotes(data.notes);
      } else {
        console.error("Failed to load notes", data.error);
      }
    } catch (err) {
      console.error("Error loading notes", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectNote(note: Note) {
    setSelectedNoteId(note.id);
    setClientName(note.clientName);
    setClientNumber(note.clientNumber);
    // Date standard format YYYY-MM-DD
    const noteDate = new Date(note.date);
    const formattedDate = noteDate.toISOString().split("T")[0];
    setDate(formattedDate);
    setContent(note.content);
    setMessage(null);
  }

  function handleNewNote() {
    setSelectedNoteId(null);
    setClientName("");
    setClientNumber("");
    setDate(new Date().toISOString().split("T")[0]);
    setContent("");
    setMessage(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!clientName.trim() || !clientNumber.trim() || !date || !content.trim()) {
      setMessage({ text: "All fields are required.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const isEditing = selectedNoteId !== null;
      const url = "/api/admin/notes";
      const method = isEditing ? "PUT" : "POST";
      const payload = isEditing
        ? { id: selectedNoteId, clientName, clientNumber, date, content }
        : { clientName, clientNumber, date, content };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save note");
      }

      setMessage({
        text: isEditing ? "Note updated successfully!" : "Note saved successfully!",
        type: "success",
      });

      if (!isEditing && data.note) {
        setSelectedNoteId(data.note.id);
      }

      await fetchNotes();
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // Filter notes based on query
  const filteredNotes = notes.filter((note) => {
    const query = searchQuery.toLowerCase();
    return (
      note.clientName.toLowerCase().includes(query) ||
      note.clientNumber.toLowerCase().includes(query) ||
      note.content.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col gap-5 bg-[var(--background)] rounded-2xl shadow-sm border border-[var(--border-subtle)] p-6 transition-all duration-300">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
        <h3 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-2">
          <ClipboardDocumentIcon className="w-5 h-5 text-[var(--accent-primary)]" />
          Client Notes
        </h3>
        <button
          type="button"
          onClick={handleNewNote}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[var(--accent-soft-bg)] text-[var(--accent-primary)] hover:opacity-90 transition-opacity"
          title="Create New Note"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Date Selector */}
        <div>
          <label
            htmlFor="note-date"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            Session Date
          </label>
          <input
            id="note-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
            required
          />
        </div>

        {/* Client Name & ID side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="client-name"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Client Name
            </label>
            <input
              id="client-name"
              type="text"
              placeholder="e.g. John Doe"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
              required
            />
          </div>
          <div>
            <label
              htmlFor="client-number"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5"
            >
              <HashtagIcon className="w-3.5 h-3.5" />
              Client ID / #
            </label>
            <input
              id="client-number"
              type="text"
              placeholder="e.g. C-104"
              value={clientNumber}
              onChange={(e) => setClientNumber(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
              required
            />
          </div>
        </div>

        {/* Note Content Textarea */}
        <div>
          <label
            htmlFor="note-content"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5"
          >
            <DocumentTextIcon className="w-3.5 h-3.5" />
            Session Notes
          </label>
          <textarea
            id="note-content"
            rows={6}
            placeholder="Document session details, progress, or diagnostic notes..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] p-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all"
            required
          />
        </div>

        {/* Status Messages */}
        {message && (
          <div
            className={`p-3 rounded-lg border text-xs font-medium transition-all ${
              message.type === "success"
                ? "bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-foreground)]"
                : "bg-[var(--error-bg)] border-[var(--error-border)] text-[var(--error-foreground)]"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={saving}
          className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 font-semibold text-sm shadow-sm transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : selectedNoteId !== null ? (
            <>
              <CheckIcon className="w-4 h-4" />
              Update Note
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
              Save Note
            </>
          )}
        </button>
      </form>

      {/* Note History List */}
      <div className="border-t border-[var(--border-subtle)] pt-4 mt-2">
        <h4 className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
          Notes History ({filteredNotes.length})
        </h4>

        {/* Search bar for history */}
        <input
          type="text"
          placeholder="Filter notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-1.5 text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all mb-3"
        />

        {loading ? (
          <div className="flex justify-center py-4">
            <ArrowPathIcon className="w-5 h-5 text-[var(--muted-foreground)] animate-spin" />
          </div>
        ) : filteredNotes.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] italic text-center py-2">
            {searchQuery ? "No matching notes found." : "No saved notes yet."}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const formattedDate = new Date(note.date).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" }
              );
              const isActive = selectedNoteId === note.id;

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleSelectNote(note)}
                  className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1.5 outline-none ${
                    isActive
                      ? "bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] text-[var(--foreground)]"
                      : "bg-[var(--background)] hover:bg-[var(--muted-bg)] border-[var(--border-subtle)] text-[var(--muted-foreground)]"
                  }`}
                >
                  <div className="flex justify-between items-center w-full font-bold">
                    <span className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--foreground)]"}>
                      {note.clientName} ({note.clientNumber})
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] font-normal">
                      {formattedDate}
                    </span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed text-[11px] text-[var(--muted-foreground)]">
                    {note.content}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
