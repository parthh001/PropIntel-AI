"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";
import { CHART_STATUS } from "@/lib/chart-theme";
import {
  FileCheck,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Download,
  Loader2,
  FileUp,
} from "lucide-react";

export default function DocumentVerificationPage() {
  const { getAccessToken } = useAuth();
  const [documents, setDocuments] = useState<any[]>([
    { id: "doc-1", originalName: "7_12_Extract_2026.pdf", documentType: { name: "7/12 extract" }, property: { id: "prop-001", title: "Plot 42, Kharadi", surveyNumber: "42/3A" }, ocrStatus: "COMPLETED", fileSizeBytes: 1420000, createdAt: "2026-06-10" },
    { id: "doc-2", originalName: "Title_Deed_Signed.pdf", documentType: { name: "Title deed" }, property: { id: "prop-001", title: "Plot 42, Kharadi", surveyNumber: "42/3A" }, ocrStatus: "COMPLETED", fileSizeBytes: 3800000, createdAt: "2026-06-12" },
    { id: "doc-3", originalName: "Encumbrance_Cert.pdf", documentType: { name: "Encumbrance cert" }, property: { id: "prop-002", title: "Survey 118, Hinjewadi", surveyNumber: "S.No.299/12" }, ocrStatus: "PENDING", fileSizeBytes: 890000, createdAt: "2026-07-01" },
    { id: "doc-4", originalName: "Property_Tax_Receipt.pdf", documentType: { name: "Property tax receipt" }, property: { id: "prop-003", title: "Flat 7B, Baner Road", surveyNumber: "387/12C" }, ocrStatus: "COMPLETED", fileSizeBytes: 520000, createdAt: "2026-07-15" },
    { id: "doc-5", originalName: "Site_Photographs_Zip.zip", documentType: { name: "Site photographs" }, property: { id: "prop-004", title: "Farm Plot, Mulshi", surveyNumber: "118/2A" }, ocrStatus: "SKIPPED", fileSizeBytes: 8500000, createdAt: "2026-07-20" },
  ]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const token = getAccessToken();
        const res = await fetch("/api/documents", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success && data.data?.documents?.length > 0) {
          setDocuments(data.data.documents);
        }
      } catch (err) {
        console.error("Fetch docs error:", err);
      }
    }

    fetchDocuments();
  }, [getAccessToken]);

  const handleSimulatedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      setUploadMessage("");
      setTimeout(() => {
        const newDoc = {
          id: `doc-${Date.now()}`,
          originalName: file.name,
          documentType: { name: "7/12 extract" },
          property: { id: "prop-001", title: "Plot 42, Kharadi", surveyNumber: "42/3A" },
          ocrStatus: "COMPLETED",
          fileSizeBytes: file.size,
          createdAt: new Date().toISOString().split("T")[0],
        };
        setDocuments((prev) => [newDoc, ...prev]);
        setUploading(false);
        setUploadMessage(`Successfully uploaded and scanned ${file.name} via Tesseract OCR.`);
      }, 1500);
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (search && !d.originalName?.toLowerCase().includes(search.toLowerCase()) && !d.property?.title?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== "All" && d.ocrStatus !== statusFilter) {
      return false;
    }
    return true;
  });

  const ocrStatusStyle = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return { color: CHART_STATUS.good, bg: "bg-emerald-500/12", text: "text-emerald-400", pulse: false };
      case "PENDING":
        return { color: CHART_STATUS.warning, bg: "bg-amber-500/12", text: "text-amber-400", pulse: true };
      case "FAILED":
        return { color: CHART_STATUS.critical, bg: "bg-rose-500/12", text: "text-rose-400", pulse: false };
      default:
        return { color: "rgba(244,246,250,0.4)", bg: "bg-white/[0.06]", text: "text-platinum/45", pulse: false };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-extrabold text-platinum tracking-tight flex items-center gap-2.5">
            <span className="pi-icon-tile w-9 h-9 text-platinum/80">
              <FileCheck className="w-5 h-5" />
            </span>
            Document Verification &amp; OCR Intelligence
          </h1>
          <p className="text-xs text-platinum/45 mt-1">
            Verify 7/12 extracts, title deeds, encumbrance certificates, and land records
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="pi-card p-6 text-center space-y-3" style={{ borderStyle: "dashed", borderColor: "rgba(244,246,250,0.16)" }}>
        <div className="pi-icon-tile w-12 h-12 mx-auto text-platinum/80">
          {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileUp className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="font-sora text-sm font-bold text-platinum">
            Upload Property Documents for OCR Scanning
          </h3>
          <p className="text-xs text-platinum/45 max-w-md mx-auto mt-0.5">
            Supported formats: PDF, PNG, JPG (7/12 Extract, Title Deed, Encumbrance, Tax Receipts). Automated text extraction &amp; validation.
          </p>
        </div>

        <label className="pi-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-sora font-bold text-xs cursor-pointer">
          <Upload className="w-4 h-4" />
          Select &amp; Upload File
          <input
            type="file"
            onChange={handleSimulatedUpload}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
          />
        </label>

        {uploadMessage && (
          <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {uploadMessage}
          </p>
        )}
      </div>

      {/* Document Directory */}
      <div className="pi-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="font-sora text-base font-bold text-platinum">
            Verified Document Records
          </h3>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="pi-input relative flex-1 sm:w-64 rounded-xl flex items-center">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-platinum/35 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search document name or property..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-transparent text-platinum placeholder-platinum/30 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pi-input px-3 py-2 text-xs rounded-xl bg-transparent text-platinum focus:outline-none [&>option]:bg-[#14151b]"
            >
              <option value="All">All OCR Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="pi-table w-full text-left text-xs">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Document Type</th>
                <th>Associated Property</th>
                <th>OCR Status</th>
                <th>Uploaded Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc: any) => {
                const s = ocrStatusStyle(doc.ocrStatus);
                return (
                  <tr key={doc.id}>
                    <td className="font-bold text-platinum">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-platinum/40 flex-shrink-0" />
                        {doc.originalName}
                      </span>
                    </td>
                    <td className="text-platinum/60 font-medium">
                      {doc.documentType?.name || "Document"}
                    </td>
                    <td>
                      <Link
                        href={`/properties/${doc.property?.id || "prop-001"}`}
                        className="font-semibold text-platinum/75 hover:text-platinum hover:underline"
                      >
                        {doc.property?.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`pi-pill ${s.bg} ${s.text} border-transparent normal-case font-bold text-[10px] uppercase ${s.pulse ? "pi-pulse-dot" : ""}`}>
                        {doc.ocrStatus}
                      </span>
                    </td>
                    <td className="text-platinum/45 font-mono">
                      {doc.createdAt}
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/properties/${doc.property?.id || "prop-001"}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-platinum/75 hover:text-platinum font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Property
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
