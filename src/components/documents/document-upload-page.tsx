// src/components/documents/document-upload-page.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, FileText, Image, X, CheckCircle2, AlertTriangle, Clock, Loader2,
  Trash2, Eye, Download, Bot, ChevronDown, File, Plus, Search, Filter,
  HardDrive, Shield, Zap,
} from "lucide-react";
import { CHART_STATUS, CHART_SERIES } from "@/lib/chart-theme";

// ─── Types & constants ───

interface QueuedFile {
  id: string;
  file: File;
  documentType: string;
  status: "queued" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  preview?: string;
}

const DOC_TYPES = [
  { id: "dt-title-deed", name: "Title deed", icon: "📄", mandatory: true },
  { id: "dt-7-12-extract", name: "7/12 extract", icon: "📋", mandatory: true },
  { id: "dt-encumbrance-cert", name: "Encumbrance certificate", icon: "📑", mandatory: true },
  { id: "dt-tax-receipt", name: "Property tax receipt", icon: "🧾", mandatory: false },
  { id: "dt-sale-deed", name: "Sale deed", icon: "📝", mandatory: false },
  { id: "dt-mutation-entry", name: "Mutation entry", icon: "🔄", mandatory: false },
  { id: "dt-na-order", name: "NA order", icon: "📌", mandatory: false },
  { id: "dt-site-photo", name: "Site photographs", icon: "📸", mandatory: false },
  { id: "dt-other", name: "Other document", icon: "📁", mandatory: false },
];

const DEMO_DOCS = [
  { id: "d1", name: "title_deed_118_2A.pdf", type: "Title deed", size: "2.4 MB", ocrStatus: "COMPLETED", confidence: 91, uploadedBy: "Rahul Joshi", date: "20 May 2026", fields: 14 },
  { id: "d2", name: "7_12_extract.pdf", type: "7/12 extract", size: "890 KB", ocrStatus: "COMPLETED", confidence: 94, uploadedBy: "Rahul Joshi", date: "20 May 2026", fields: 8 },
  { id: "d3", name: "encumbrance_cert.pdf", type: "Encumbrance certificate", size: "1.1 MB", ocrStatus: "REQUIRES_REVIEW", confidence: 72, uploadedBy: "Rahul Joshi", date: "21 May 2026", fields: 6 },
  { id: "d4", name: "tax_receipt_2025.pdf", type: "Property tax receipt", size: "340 KB", ocrStatus: "COMPLETED", confidence: 96, uploadedBy: "Amit Kumar", date: "01 Jun 2026", fields: 5 },
];

const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/tiff", "image/webp"];
const MAX_SIZE = 25 * 1024 * 1024;

// ─── Helpers ───

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

const ACCENT = "#F4F6FA";

const ocrCfg: Record<string, { bg: string; color: string; label: string; Icon: any }> = {
  COMPLETED: { bg: `${CHART_STATUS.good}1a`, color: CHART_STATUS.good, label: "OCR complete", Icon: CheckCircle2 },
  REQUIRES_REVIEW: { bg: `${CHART_STATUS.warning}1a`, color: CHART_STATUS.warning, label: "Needs review", Icon: AlertTriangle },
  PROCESSING: { bg: `${CHART_SERIES[0]}1a`, color: CHART_SERIES[0], label: "Processing", Icon: Loader2 },
  PENDING: { bg: "rgba(244,246,250,0.08)", color: "rgba(244,246,250,0.45)", label: "Pending", Icon: Clock },
  FAILED: { bg: `${CHART_STATUS.critical}1a`, color: CHART_STATUS.critical, label: "Failed", Icon: AlertTriangle },
};

// ─── Main component ───

export default function DocumentUploadPage({ propertyId = "prop-002", propertyTitle = "Survey 118, Hinjewadi" }: { propertyId?: string; propertyTitle?: string }) {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [documents, setDocuments] = useState(DEMO_DOCS);
  const [selectedType, setSelectedType] = useState(DOC_TYPES[0].id);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewDoc, setViewDoc] = useState<typeof DEMO_DOCS[0] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── File handling ───

  const addFiles = useCallback((files: FileList | File[]) => {
    const newFiles: QueuedFile[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE) continue;
      if (queue.some(q => q.file.name === file.name && q.file.size === file.size)) continue;

      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        documentType: selectedType,
        status: "queued",
        progress: 0,
        preview,
      });
    }
    setQueue(prev => [...prev, ...newFiles]);
  }, [queue, selectedType]);

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(f => f.id !== id));
  };

  // ─── Upload simulation ───

  async function uploadAll() {
    if (queue.length === 0) return;
    setUploading(true);

    for (let i = 0; i < queue.length; i++) {
      const qf = queue[i];
      if (qf.status !== "queued") continue;

      // Set uploading
      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: "uploading" as const, progress: 0 } : f));

      // Simulate upload progress
      for (let p = 0; p <= 100; p += 10 + Math.random() * 20) {
        await sleep(100 + Math.random() * 200);
        const progress = Math.min(Math.round(p), 100);
        setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, progress } : f));
      }

      // Random failure for demo (10% chance)
      if (Math.random() < 0.1) {
        setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: "error" as const, progress: 100, error: "Checksum mismatch — duplicate file detected" } : f));
        continue;
      }

      // Success — add to document list
      setQueue(prev => prev.map(f => f.id === qf.id ? { ...f, status: "success" as const, progress: 100 } : f));

      const docType = DOC_TYPES.find(t => t.id === qf.documentType);
      setDocuments(prev => [{
        id: `d-${Date.now()}`,
        name: qf.file.name,
        type: docType?.name || "Other",
        size: formatSize(qf.file.size),
        ocrStatus: "PENDING",
        confidence: 0,
        uploadedBy: "You",
        date: "Just now",
        fields: 0,
      }, ...prev]);
    }

    setUploading(false);
    // Clear successful uploads after 2s
    setTimeout(() => {
      setQueue(prev => prev.filter(f => f.status !== "success"));
    }, 2000);
  }

  // ─── Drag & drop ───

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  }

  // ─── Completeness ───

  const mandatoryTypes = DOC_TYPES.filter(t => t.mandatory);
  const uploadedTypes = new Set(documents.map(d => d.type));
  const completeness = Math.round((mandatoryTypes.filter(t => uploadedTypes.has(t.name)).length / mandatoryTypes.length) * 100);

  const confColor = (c: number) => c >= 90 ? CHART_STATUS.good : c >= 75 ? CHART_STATUS.warning : CHART_STATUS.critical;

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: "#F4F6FA" }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .fade-in{animation:fadeIn 0.25s ease both}
        .card{background:rgba(20,21,27,0.62);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,0.09);border-radius:18px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px -28px rgba(0,0,0,0.75)}
        .card-head{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center}
        .card-head span{font-family:'Sora',sans-serif}
        .drop-zone{border:2px dashed rgba(255,255,255,0.12);border-radius:16px;padding:40px;text-align:center;transition:all 0.2s;cursor:pointer}
        .drop-zone:hover{border-color:rgba(244,246,250,0.3);background:rgba(244,246,250,0.02)}
        .drop-zone.active{border-color:rgba(244,246,250,0.55);background:rgba(244,246,250,0.05)}
        .file-row{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.1s}
        .file-row:hover{background:rgba(255,255,255,0.025)}
        .file-row:last-child{border-bottom:none}
        .prog-bar{height:4px;border-radius:2px;background:rgba(255,255,255,0.06);overflow:hidden;flex:1}
        .prog-fill{height:100%;border-radius:2px;transition:width 0.2s}
        .btn-sm{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(244,246,250,0.6);transition:all 0.15s}
        .btn-sm:hover{background:rgba(255,255,255,0.06);color:#F4F6FA;border-color:rgba(255,255,255,0.18)}
        .btn-primary-sm{background:linear-gradient(135deg,#ffffff,#c7ccd6);color:#0c0d11;border-color:transparent;box-shadow:0 6px 18px -6px rgba(255,255,255,0.35)}
        .btn-primary-sm:hover{background:linear-gradient(135deg,#ffffff,#c7ccd6);color:#0c0d11;filter:brightness(1.04)}
        .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
        .type-chip{padding:6px 12px;border-radius:8px;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(244,246,250,0.55);transition:all 0.15s;white-space:nowrap}
        .type-chip:hover{border-color:rgba(255,255,255,0.18);color:#F4F6FA}
        .type-chip.active{background:rgba(244,246,250,0.1);color:#F4F6FA;border-color:rgba(244,246,250,0.24);font-weight:600}
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 20 }}>
        {/* Left: Upload zone + queue + document list */}
        <div>
          {/* Document type selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(244,246,250,0.55)", marginBottom: 8 }}>Document type for upload</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DOC_TYPES.map(t => (
                <button key={t.id} className={`type-chip ${selectedType === t.id ? "active" : ""}`} onClick={() => setSelectedType(t.id)}>
                  {t.icon} {t.name} {t.mandatory && <span style={{ color: CHART_STATUS.critical }}>*</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Drop zone */}
          <div
            className={`drop-zone ${dragActive ? "active" : ""}`}
            onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp" style={{ display: "none" }} onChange={(e) => e.target.files && addFiles(e.target.files)} />
            <Upload size={32} color={dragActive ? "#F4F6FA" : "rgba(244,246,250,0.3)"} style={{ margin: "0 auto 12px", display: "block" }} />
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Sora',sans-serif" }}>
              {dragActive ? "Drop files here" : "Drag & drop files, or click to browse"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(244,246,250,0.35)" }}>PDF, JPEG, PNG, TIFF, WebP — up to 25 MB each</div>
          </div>

          {/* Upload queue */}
          {queue.length > 0 && (
            <div className="card fade-in" style={{ marginTop: 16 }}>
              <div className="card-head">
                <span style={{ fontWeight: 700, fontSize: 14 }}>Upload queue ({queue.length})</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {!uploading && queue.some(f => f.status === "queued") && (
                    <button className="btn-sm btn-primary-sm" onClick={uploadAll}>
                      <Upload size={13} /> Upload all
                    </button>
                  )}
                  {!uploading && (
                    <button className="btn-sm" onClick={() => setQueue([])}>Clear</button>
                  )}
                </div>
              </div>
              {queue.map(qf => (
                <div key={qf.id} className="file-row fade-in">
                  {/* Preview thumbnail */}
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(244,246,250,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                    {qf.preview ? (
                      <img src={qf.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <FileText size={16} color="#F4F6FA" />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{qf.file.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(244,246,250,0.35)", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>{formatSize(qf.file.size)}</span>
                      <span>{DOC_TYPES.find(t => t.id === qf.documentType)?.name}</span>
                    </div>
                    {qf.status === "uploading" && (
                      <div className="prog-bar" style={{ marginTop: 6 }}>
                        <div className="prog-fill" style={{ width: `${qf.progress}%`, background: "#F4F6FA" }} />
                      </div>
                    )}
                    {qf.error && <div style={{ fontSize: 11, color: CHART_STATUS.critical, marginTop: 4 }}>{qf.error}</div>}
                  </div>
                  {/* Status */}
                  {qf.status === "queued" && <Clock size={16} color="rgba(244,246,250,0.4)" />}
                  {qf.status === "uploading" && <Loader2 size={16} color="#F4F6FA" className="spin" />}
                  {qf.status === "success" && <CheckCircle2 size={16} color={CHART_STATUS.good} />}
                  {qf.status === "error" && <AlertTriangle size={16} color={CHART_STATUS.critical} />}
                  {/* Remove */}
                  {(qf.status === "queued" || qf.status === "error") && (
                    <button onClick={() => removeFromQueue(qf.id)} style={{ background: "none", border: "none", color: "rgba(244,246,250,0.35)", cursor: "pointer", padding: 4 }}>
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Document list */}
          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-head">
              <span style={{ fontWeight: 700, fontSize: 15 }}>Documents ({documents.length})</span>
            </div>
            {documents.map((doc, i) => {
              const ocr = ocrCfg[doc.ocrStatus] || ocrCfg.PENDING;
              return (
                <div key={doc.id} className="file-row fade-in" style={{ animationDelay: `${i * 0.03}s`, cursor: "pointer" }} onClick={() => setViewDoc(doc)}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(244,246,250,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <FileText size={16} color="#F4F6FA" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{doc.type}</div>
                    <div style={{ fontSize: 11, color: "rgba(244,246,250,0.35)" }}>{doc.name} · {doc.size} · {doc.date}</div>
                  </div>
                  <span className="pill" style={{ background: ocr.bg, color: ocr.color }}>
                    <ocr.Icon size={11} className={doc.ocrStatus === "PROCESSING" ? "spin" : ""} /> {ocr.label}
                  </span>
                  {doc.confidence > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: confColor(doc.confidence), minWidth: 36, textAlign: "right" }}>{doc.confidence}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          {/* Completeness tracker */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Sora',sans-serif" }}>Document checklist</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: completeness === 100 ? CHART_STATUS.good : CHART_STATUS.warning }}>{completeness}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", marginBottom: 16, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${completeness}%`, background: completeness === 100 ? CHART_STATUS.good : "#F4F6FA", transition: "width 0.5s" }} />
              </div>
              {mandatoryTypes.map(t => {
                const done = uploadedTypes.has(t.name);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {done ? <CheckCircle2 size={16} color={CHART_STATUS.good} /> : <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid rgba(244,246,250,0.3)" }} />}
                    <span style={{ fontSize: 13, color: done ? "#F4F6FA" : "rgba(244,246,250,0.35)" }}>{t.name}</span>
                    <span style={{ fontSize: 10, color: CHART_STATUS.critical, marginLeft: "auto" }}>Required</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Doc viewer panel */}
          {viewDoc ? (
            <div className="card fade-in">
              <div className="card-head">
                <span style={{ fontWeight: 700, fontSize: 14 }}>Document preview</span>
                <button onClick={() => setViewDoc(null)} style={{ background: "none", border: "none", color: "rgba(244,246,250,0.45)", cursor: "pointer" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 20 }}>
                {/* Mock PDF preview */}
                <div style={{ height: 200, background: "rgba(255,255,255,0.03)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ textAlign: "center" }}>
                    <FileText size={40} color="rgba(244,246,250,0.15)" />
                    <div style={{ fontSize: 12, color: "rgba(244,246,250,0.35)", marginTop: 8 }}>{viewDoc.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(244,246,250,0.2)" }}>PDF preview renders in production</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, marginBottom: 12 }}>
                  {[["Type", viewDoc.type], ["Size", viewDoc.size], ["Uploaded by", viewDoc.uploadedBy], ["Date", viewDoc.date]].map(([k, v]) => (
                    <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "rgba(244,246,250,0.45)" }}>{k}</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {viewDoc.confidence > 0 && (
                  <div style={{ padding: 12, borderRadius: 10, background: `${confColor(viewDoc.confidence)}14`, border: `1px solid ${confColor(viewDoc.confidence)}33`, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: confColor(viewDoc.confidence), marginBottom: 4 }}>OCR confidence: {viewDoc.confidence}%</div>
                    <div style={{ fontSize: 12, color: "rgba(244,246,250,0.55)" }}>{viewDoc.fields} fields extracted</div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-sm" style={{ flex: 1, justifyContent: "center" }}><Eye size={13} /> View</button>
                  <button className="btn-sm" style={{ flex: 1, justifyContent: "center" }}><Download size={13} /> Download</button>
                  <button className="btn-sm" style={{ color: CHART_STATUS.critical }}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{ padding: 40, textAlign: "center" }}>
                <Eye size={28} color="rgba(244,246,250,0.3)" style={{ margin: "0 auto 12px", display: "block" }} />
                <div style={{ fontWeight: 700, marginBottom: 4 }}>No document selected</div>
                <div style={{ fontSize: 13, color: "rgba(244,246,250,0.35)" }}>Click a document to preview</div>
              </div>
            </div>
          )}

          {/* Storage info */}
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(244,246,250,0.45)", marginBottom: 8 }}>
                <HardDrive size={14} /> Storage
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "rgba(244,246,250,0.55)" }}>Used</span>
                <span style={{ fontWeight: 600 }}>4.7 MB / 500 MB</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", width: "1%", borderRadius: 2, background: "#F4F6FA" }} />
              </div>
              <div style={{ fontSize: 11, color: "rgba(244,246,250,0.35)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                <Shield size={11} /> Local storage · Prototype mode
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
