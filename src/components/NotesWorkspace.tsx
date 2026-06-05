// src/components/NotesWorkspace.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  CheckIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
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

export default function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);

  // Form & Content states
  const [clientName, setClientName] = useState<string>("");
  const [clientNumber, setClientNumber] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [content, setContent] = useState<string>("");

  // Editor Ref
  const editorRef = useRef<HTMLDivElement>(null);

  // UI status feedback
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);

  // Load notes history
  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes(selectIdAfterFetch?: number) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notes");
      const data = await res.json();
      if (res.ok && data.notes) {
        setNotes(data.notes);
        if (selectIdAfterFetch) {
          const found = data.notes.find((n: Note) => n.id === selectIdAfterFetch);
          if (found) {
            handleSelectNote(found);
          }
        }
      }
    } catch (err) {
      console.error("Error loading notes", err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectNote(note: Note) {
    setIsCreatingNew(false);
    setSelectedNoteId(note.id);
    setClientName(note.clientName);
    setClientNumber(note.clientNumber);
    const noteDate = new Date(note.date);
    setDate(noteDate.toISOString().split("T")[0]);
    setContent(note.content);
    
    // Sync into the uncontrolled contentEditable editor
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content;
    }
    setMessage(null);
    setDeleteConfirmId(null);
    setShowExportDropdown(false);
  }

  function handleCreateNew() {
    setIsCreatingNew(true);
    setSelectedNoteId(null);
    setClientName("");
    setClientNumber("");
    setDate(new Date().toISOString().split("T")[0]);
    setContent("");
    
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setMessage(null);
    setDeleteConfirmId(null);
    setShowExportDropdown(false);
  }

  // Formatting helper command
  const execCmd = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    // sync content from editor back to state
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!clientName.trim() || !clientNumber.trim() || !date || !content.trim()) {
      setMessage({ text: "Please fill out all fields and write notes.", type: "error" });
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

      const idToSelect = isEditing ? selectedNoteId : data.note.id;
      setIsCreatingNew(false);
      await fetchNotes(idToSelect);
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedNoteId) return;

    if (deleteConfirmId !== selectedNoteId) {
      setDeleteConfirmId(selectedNoteId);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/notes?id=${selectedNoteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessage({ text: "Note deleted successfully", type: "success" });
        setSelectedNoteId(null);
        setClientName("");
        setClientNumber("");
        setDate("");
        setContent("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        await fetchNotes();
      } else {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete");
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Could not delete note.", type: "error" });
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  }

  // Export handlers
  function exportAsText() {
    const rawText = editorRef.current?.innerText || "";
    const header = `Clinical Session Notes\n\nClient Name: ${clientName}\nClient ID/Number: ${clientNumber}\nSession Date: ${date}\n\n=========================\n\n`;
    const blob = new Blob([header + rawText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Session_Notes_${clientName.replace(/\s+/g, "_")}_${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  }

  function exportAsWord() {
    const rawHtml = editorRef.current?.innerHTML || "";
    const docHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Session Notes - ${clientName}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', sans-serif; line-height: 1.6; padding: 30px; color: #1a202c; }
          h1 { font-family: 'Arial', sans-serif; font-size: 26px; color: #2c5282; border-bottom: 2px solid #2c5282; padding-bottom: 8px; margin-top: 0; }
          h2 { font-family: 'Arial', sans-serif; font-size: 18px; color: #2c5282; margin-top: 20px; }
          p { font-size: 11pt; margin: 0 0 12px 0; }
          ul, ol { margin: 0 0 12px 20px; }
          .meta-info { font-size: 10pt; color: #4a5568; background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
          .meta-row { margin-bottom: 6px; }
          .meta-label { font-weight: bold; color: #4a5568; }
        </style>
      </head>
      <body>
        <h1>Clinical Session Notes</h1>
        <div class="meta-info">
          <div class="meta-row"><span class="meta-label">Client Name:</span> ${clientName}</div>
          <div class="meta-row"><span class="meta-label">Client ID/Number:</span> ${clientNumber}</div>
          <div class="meta-row"><span class="meta-label">Session Date:</span> ${date}</div>
          <div class="meta-row"><span class="meta-label">Exported On:</span> ${new Date().toLocaleDateString()}</div>
        </div>
        <div>${rawHtml}</div>
      </body>
      </html>
    `;
    const blob = new Blob([docHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Session_Notes_${clientName.replace(/\s+/g, "_")}_${date}.docx`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  }

  function exportAsPDF() {
    const rawHtml = editorRef.current?.innerHTML || "";
    const formattedDate = new Date(date).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
        <head>
          <title>Session Notes - ${clientName}</title>
          <style>
            @media print {
              body { padding: 0; margin: 0; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 45px; color: #1e293b; max-width: 820px; margin: 0 auto; line-height: 1.6; }
            h1 { font-size: 26px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; }
            .meta-card { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
            .meta-item { font-size: 13px; }
            .meta-label { font-weight: 600; color: #64748b; text-transform: uppercase; font-size: 10px; tracking-wider; display: block; margin-bottom: 3px; }
            .meta-val { color: #0f172a; font-weight: 500; font-size: 14px; }
            .content { font-size: 15px; color: #334155; }
            .content p { margin-bottom: 1em; }
            .content ul, .content ol { padding-left: 20px; margin-bottom: 1em; }
            .content li { margin-bottom: 0.4em; }
          </style>
        </head>
        <body>
          <h1>Clinical Session Notes</h1>
          <div class="meta-card">
            <div class="meta-item">
              <span class="meta-label">Client Name</span>
              <span class="meta-val">${clientName}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Client ID / Number</span>
              <span class="meta-val">${clientNumber}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Session Date</span>
              <span class="meta-val">${formattedDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Exported On</span>
              <span class="meta-val">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          <div class="content">${rawHtml}</div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
    setShowExportDropdown(false);
  }

  // Filter notes list
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.clientName.toLowerCase().includes(q) ||
      n.clientNumber.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  });

  const isActiveMode = selectedNoteId !== null || isCreatingNew;

  return (
    <div className="flex h-[calc(100vh-12rem)] bg-[var(--background)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden shadow-sm">
      
      {/* LEFT COLUMN: Note History Sidebar */}
      <div className="w-full md:w-80 border-r border-[var(--border-subtle)] flex flex-col h-full bg-[var(--background)] shrink-0">
        
        {/* Sidebar Header with Search & New Actions */}
        <div className="p-4 border-b border-[var(--border-subtle)] space-y-3 bg-[var(--background)]">
          <button
            onClick={handleCreateNew}
            className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[var(--accent-primary)] hover:opacity-90 text-[var(--accent-foreground)] font-semibold text-xs shadow-sm transition-opacity"
          >
            <PlusIcon className="w-4 h-4" />
            Create New Note
          </button>
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search past notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] pl-9 pr-4 py-2 text-xs text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[var(--background)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <ArrowPathIcon className="w-6 h-6 text-[var(--muted-foreground)] animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] italic text-center py-4">
              {searchQuery ? "No matching notes found." : "No saved notes yet."}
            </p>
          ) : (
            filteredNotes.map((note) => {
              const formattedDate = new Date(note.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const isActive = selectedNoteId === note.id;

              return (
                <button
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs flex flex-col gap-1.5 outline-none ${
                    isActive
                      ? "bg-[var(--accent-soft-bg)] border-[var(--accent-primary)] text-[var(--foreground)]"
                      : "bg-[var(--background)] hover:bg-[var(--muted-bg)] border-[var(--border-subtle)] text-[var(--muted-foreground)]"
                  }`}
                >
                  <div className="flex justify-between items-center w-full font-bold">
                    <span className={isActive ? "text-[var(--accent-primary)]" : "text-[var(--foreground)]"}>
                      {note.clientName}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] font-normal">
                      {formattedDate}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-[var(--muted-foreground)]">
                    <span>ID: {note.clientNumber}</span>
                  </div>
                  <p className="line-clamp-2 leading-relaxed text-[11px] text-[var(--muted-foreground)] mt-0.5">
                    {note.content.replace(/<[^>]*>/g, "")}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Rich Text Editor Workspace */}
      <div className="flex-1 flex flex-col h-full bg-[var(--background)] overflow-hidden relative">
        
        {!isActiveMode ? (
          /* Empty Workspace State */
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--muted-foreground)] p-8">
            <DocumentDuplicateIcon className="w-16 h-16 mb-4 text-[var(--border-subtle)] opacity-60" />
            <h4 className="text-base font-semibold text-[var(--foreground)] mb-1">
              No Note Selected
            </h4>
            <p className="text-sm text-center max-w-xs text-[var(--muted-foreground)]">
              Choose an existing clinical note from the history sidebar or create a new session document to start writing.
            </p>
          </div>
        ) : (
          /* Active Writing workspace */
          <form onSubmit={handleSave} className="flex-1 flex flex-col h-full overflow-hidden">
            
            {/* Note Fields Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] bg-[var(--background)] flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Date Picker */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Session Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>

                {/* Client Name */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>

                {/* Client ID / Number */}
                <div>
                  <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    Client ID / Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. C-104"
                    value={clientNumber}
                    onChange={(e) => setClientNumber(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:ring-1 focus:ring-[var(--accent-primary)] outline-none transition-all"
                    required
                  />
                </div>

              </div>
            </div>

            {/* WYSIWYG Editor Formatting Toolbar */}
            <div className="px-5 py-2 border-b border-[var(--border-subtle)] bg-[var(--muted-bg)] flex flex-wrap gap-1.5 items-center">
              
              {/* Headings */}
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "H1")}
                className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--border-subtle)] transition-colors"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "H2")}
                className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--border-subtle)] transition-colors"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execCmd("formatBlock", "P")}
                className="px-2 py-1 rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Paragraph"
              >
                Text
              </button>

              <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1"></div>

              {/* Inline Formatting */}
              <button
                type="button"
                onClick={() => execCmd("bold")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs font-bold hover:bg-[var(--border-subtle)] transition-colors"
                title="Bold (Ctrl+B)"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => execCmd("italic")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs italic hover:bg-[var(--border-subtle)] transition-colors"
                title="Italic (Ctrl+I)"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => execCmd("underline")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs underline hover:bg-[var(--border-subtle)] transition-colors"
                title="Underline (Ctrl+U)"
              >
                U
              </button>
              <button
                type="button"
                onClick={() => execCmd("strikeThrough")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs line-through hover:bg-[var(--border-subtle)] transition-colors"
                title="Strikethrough"
              >
                S
              </button>

              <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1"></div>

              {/* Lists */}
              <button
                type="button"
                onClick={() => execCmd("insertUnorderedList")}
                className="px-2 py-0.5 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-[10px] font-bold hover:bg-[var(--border-subtle)] transition-colors"
                title="Bulleted List"
              >
                • List
              </button>
              <button
                type="button"
                onClick={() => execCmd("insertOrderedList")}
                className="px-2 py-0.5 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-[10px] font-bold hover:bg-[var(--border-subtle)] transition-colors"
                title="Numbered List"
              >
                1. List
              </button>

              <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1"></div>

              {/* Alignments */}
              <button
                type="button"
                onClick={() => execCmd("justifyLeft")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Align Left"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => execCmd("justifyCenter")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Align Center"
              >
                ↔
              </button>
              <button
                type="button"
                onClick={() => execCmd("justifyRight")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Align Right"
              >
                →
              </button>
              <button
                type="button"
                onClick={() => execCmd("justifyFull")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Justify"
              >
                ═
              </button>

              <div className="h-4 w-[1px] bg-[var(--border-subtle)] mx-1"></div>

              {/* Actions */}
              <button
                type="button"
                onClick={() => execCmd("undo")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => execCmd("redo")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Redo (Ctrl+Y)"
              >
                ↷
              </button>
              <button
                type="button"
                onClick={() => execCmd("removeFormat")}
                className="w-7 h-7 flex items-center justify-center rounded bg-[var(--background)] border border-[var(--border-subtle)] text-xs hover:bg-[var(--border-subtle)] transition-colors"
                title="Clear Formatting"
              >
                ⌫
              </button>

            </div>

            {/* Note Editor Area */}
            <div className="flex-1 p-6 bg-[var(--muted-bg)] overflow-y-auto">
              <div
                ref={editorRef}
                contentEditable
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onBlur={(e) => setContent(e.currentTarget.innerHTML)}
                className="w-full min-h-full bg-[var(--background)] border border-[var(--border-subtle)] rounded-xl p-8 focus:ring-2 focus:ring-[var(--accent-primary)] outline-none prose max-w-none shadow-inner text-sm text-[var(--foreground)] leading-relaxed"
                style={{
                  fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
                }}
              />
            </div>

            {/* Footer controls & Feedback */}
            <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--background)] flex flex-wrap items-center justify-between gap-4">
              
              {/* Feedback messages */}
              <div className="flex-1 min-w-0">
                {message && (
                  <span
                    className={`inline-block px-3 py-1 rounded text-xs font-medium truncate ${
                      message.type === "success"
                        ? "bg-[var(--success-bg)] text-[var(--success-foreground)] border border-[var(--success-border)]"
                        : "bg-[var(--error-bg)] text-[var(--error-foreground)] border border-[var(--error-border)]"
                    }`}
                  >
                    {message.text}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                
                {/* Delete button (only when editing) */}
                {selectedNoteId !== null && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={handleDelete}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border font-semibold text-xs transition-colors ${
                      deleteConfirmId === selectedNoteId
                        ? "bg-red-600 hover:bg-red-700 text-white border-red-600 animate-pulse"
                        : "bg-transparent text-red-600 hover:bg-red-50 border-red-200 hover:border-red-300"
                    }`}
                  >
                    <TrashIcon className="w-4 h-4" />
                    {deleting
                      ? "Deleting..."
                      : deleteConfirmId === selectedNoteId
                        ? "Click again to confirm"
                        : "Delete Note"}
                  </button>
                )}

                {/* Export dropdown menu wrapper */}
                {selectedNoteId !== null && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowExportDropdown((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] hover:bg-[var(--muted-bg)] text-[var(--foreground)] font-semibold text-xs transition-colors"
                    >
                      <DocumentArrowDownIcon className="w-4 h-4" />
                      Export As...
                    </button>
                    {showExportDropdown && (
                      <div className="absolute right-0 bottom-12 z-50 w-40 bg-[var(--background)] border border-[var(--border-subtle)] rounded-lg shadow-xl py-1 text-xs">
                        <button
                          type="button"
                          onClick={exportAsPDF}
                          className="w-full text-left px-4 py-2 hover:bg-[var(--muted-bg)] text-[var(--foreground)]"
                        >
                          PDF Document (.pdf)
                        </button>
                        <button
                          type="button"
                          onClick={exportAsWord}
                          className="w-full text-left px-4 py-2 hover:bg-[var(--muted-bg)] text-[var(--foreground)]"
                        >
                          Word Document (.docx)
                        </button>
                        <button
                          type="button"
                          onClick={exportAsText}
                          className="w-full text-left px-4 py-2 hover:bg-[var(--muted-bg)] text-[var(--foreground)]"
                        >
                          Plain Text (.txt)
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Save/Update Note button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg bg-[var(--accent-primary)] text-[var(--accent-foreground)] hover:opacity-90 font-semibold text-xs shadow-sm transition-opacity"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : selectedNoteId !== null ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      Update Note
                    </>
                  ) : (
                    <>
                      <PlusIcon className="w-3.5 h-3.5" />
                      Save Note
                    </>
                  )}
                </button>

              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
