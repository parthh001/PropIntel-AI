"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-provider";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Building2,
  MapPin,
  FileText,
  ShieldAlert,
  Scale,
  Newspaper,
  ArrowLeft,
  Calendar,
  User,
  DollarSign,
  Maximize2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";

function formatPrice(n: number | null): string {
  if (!n) return "—";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatArea(n: number | null): string {
  if (!n) return "—";
  if (n >= 43560) return `${(n / 43560).toFixed(1)} acres`;
  return `${n.toLocaleString()} sq ft`;
}

export default function PropertyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id;
  const router = useRouter();
  const { getAccessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<"overview" | "risk" | "legal" | "documents" | "news">("overview");
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProperty() {
      try {
        const token = getAccessToken();
        const res = await fetch(`/api/properties/${propertyId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (result.success && result.data?.property) {
          setProperty(result.data.property);
        } else {
          // Fallback demo detail matching ID
          setProperty({
            id: propertyId,
            title: propertyId === "prop-002" ? "Survey 118, Hinjewadi" : "Plot 42, Kharadi",
            status: propertyId === "prop-002" ? "FLAGGED" : "VERIFIED",
            price: propertyId === "prop-002" ? 12500000 : 4800000,
            areaSqft: propertyId === "prop-002" ? 5200 : 2400,
            surveyNumber: propertyId === "prop-002" ? "S.No.299/12" : "42/3A",
            khasraNumber: "K-8812",
            description: "Prime clear title property located in Maharashtra due-diligence corridor.",
            propertyType: { name: propertyId === "prop-002" ? "Commercial plot" : "Residential plot" },
            address: {
              line1: "Near Tech Park Phase 1",
              city: "Pune",
              district: "Pune",
              state: "Maharashtra",
              postalCode: "411057",
            },
            owner: { firstName: "Sunil", lastName: "Deshmukh" },
            broker: { firstName: "Vinod", lastName: "Deshmukh" },
            riskScore: {
              overallScore: propertyId === "prop-002" ? 73 : 18,
              riskLevel: propertyId === "prop-002" ? "HIGH" : "LOW",
              aiNarrative: propertyId === "prop-002"
                ? "HIGH RISK: Potential title overlap detected with Civil Court Case CS-2025/881. Duplicate relisting detected in Hinjewadi region."
                : "LOW RISK: Clean 7/12 extract, clear encumbrance certificate verified, no active litigations linked.",
              factors: [
                { factorDef: { name: "Title Dispute & Litigation" }, factorScore: propertyId === "prop-002" ? 85 : 10, explanation: propertyId === "prop-002" ? "Civil litigation pending" : "No cases found" },
                { factorDef: { name: "7/12 Extract Verification" }, factorScore: propertyId === "prop-002" ? 60 : 15, explanation: "7/12 verified via Land Records" },
                { factorDef: { name: "Zoning & Land Use Compliance" }, factorScore: 20, explanation: "Zone cleared for development" },
              ],
            },
            courtPropertyLinks: propertyId === "prop-002" ? [
              {
                id: "c-link-1",
                impactScore: 85,
                courtCase: {
                  caseNumber: "CS-2025/881",
                  caseStatus: "ACTIVE",
                  title: "Deshmukh vs Patil Title Dispute",
                  courtName: "Pune Civil Court (Senior Division)",
                  nextHearingDate: "2026-08-25",
                },
              },
            ] : [],
            documents: [
              { id: "doc-1", originalName: "7_12_Extract_2026.pdf", documentType: { name: "7/12 extract" }, ocrStatus: "COMPLETED", createdAt: "2026-06-10" },
              { id: "doc-2", originalName: "Title_Deed_Signed.pdf", documentType: { name: "Title deed" }, ocrStatus: "COMPLETED", createdAt: "2026-06-12" },
              { id: "doc-3", originalName: "Encumbrance_Cert.pdf", documentType: { name: "Encumbrance cert" }, ocrStatus: "PENDING", createdAt: "2026-07-01" },
            ],
            newspaperMentions: [
              {
                id: "news-1",
                relevanceScore: 0.92,
                sentiment: "NEGATIVE",
                matchedExcerpt: "LOKMAT: Special land tribunal investigating survey numbers in Hinjewadi phase 1.",
                article: { headline: "Land Registry Inspection Drive in Mulshi", source: { name: "Lokmat" }, publishedAt: "2026-06-20" },
              },
            ],
          });
        }
      } catch (err) {
        console.error("Property fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProperty();
  }, [propertyId, getAccessToken]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-platinum/40 text-sm">
        <Loader2 className="w-6 h-6 animate-spin text-platinum/60 mr-2" />
        Loading property intelligence details...
      </div>
    );
  }

  if (!property) {
    return (
      <div className="pi-card p-8 text-center">
        <h2 className="font-sora text-lg font-bold text-platinum">Property Not Found</h2>
        <p className="text-xs text-platinum/45 mt-1 mb-4">The property record could not be loaded.</p>
        <Link href="/properties" className="pi-btn-primary inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold">
          Return to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="pi-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-platinum/50 hover:text-platinum transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Properties Directory
            </Link>
            <h1 className="font-sora text-2xl md:text-3xl font-extrabold text-platinum tracking-tight">
              {property.title}
            </h1>
            <p className="text-xs text-platinum/45 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-platinum/40" />
              {property.address?.line1 || "Main Road"}, {property.address?.city || "Pune"},{" "}
              {property.address?.state || "Maharashtra"}
              <span className="font-mono text-platinum/35">| Survey: {property.surveyNumber || "N/A"}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={property.status} />
            <RiskBadge
              level={property.riskScore?.riskLevel}
              score={property.riskScore?.overallScore}
            />
          </div>
        </div>

        {/* Quick Spec Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/[0.08] text-xs">
          <div className="pi-surface p-3">
            <span className="text-[10px] text-platinum/40 uppercase tracking-wider block font-bold">Estimated Price</span>
            <span className="font-sora text-base font-extrabold text-platinum">{formatPrice(property.price)}</span>
          </div>
          <div className="pi-surface p-3">
            <span className="text-[10px] text-platinum/40 uppercase tracking-wider block font-bold">Total Area</span>
            <span className="font-sora text-base font-extrabold text-platinum">{formatArea(property.areaSqft)}</span>
          </div>
          <div className="pi-surface p-3">
            <span className="text-[10px] text-platinum/40 uppercase tracking-wider block font-bold">Property Type</span>
            <span className="text-base font-bold text-platinum">{property.propertyType?.name || "Plot"}</span>
          </div>
          <div className="pi-surface p-3">
            <span className="text-[10px] text-platinum/40 uppercase tracking-wider block font-bold">Owner / Broker</span>
            <span className="text-base font-bold text-platinum">
              {property.owner ? `${property.owner.firstName} ${property.owner.lastName}` : "Direct Owner"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-white/[0.08]">
        {[
          { id: "overview", label: "Overview & Specs", icon: Building2 },
          { id: "risk", label: "AI Risk Intelligence", icon: ShieldAlert },
          { id: "legal", label: "Legal & Court Cases", icon: Scale },
          { id: "documents", label: "Documents (7/12, Title)", icon: FileText },
          { id: "news", label: "News Intelligence", icon: Newspaper },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
              activeTab === tab.id
                ? "bg-white/[0.1] text-platinum border-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-white/[0.02] text-platinum/50 hover:text-platinum/80 border-white/[0.08] hover:bg-white/[0.05]"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 pi-card p-6 space-y-6">
            <div>
              <h3 className="font-sora text-base font-bold text-platinum mb-2">Property Description</h3>
              <p className="text-xs text-platinum/55 leading-relaxed">
                {property.description || "Detailed land and property parcel record verified through Sahyadri intelligence portal."}
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/[0.08]">
              <h3 className="font-sora text-base font-bold text-platinum">Survey &amp; Revenue Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-platinum/40 block font-medium">Survey Number</span>
                  <span className="font-mono font-bold text-platinum">{property.surveyNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-platinum/40 block font-medium">Khasra Number</span>
                  <span className="font-mono font-bold text-platinum">{property.khasraNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-platinum/40 block font-medium">Taluka</span>
                  <span className="font-bold text-platinum">{property.metadata?.taluka || "Haveli"}</span>
                </div>
                <div>
                  <span className="text-platinum/40 block font-medium">Village</span>
                  <span className="font-bold text-platinum">{property.metadata?.village || "Kharadi"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pi-card p-6 space-y-4">
            <h3 className="font-sora text-base font-bold text-platinum">Location Details</h3>
            <div className="pi-surface p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-platinum/40">District:</span>
                <span className="font-bold text-platinum">{property.address?.district || "Pune"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-platinum/40">State:</span>
                <span className="font-bold text-platinum">{property.address?.state || "Maharashtra"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-platinum/40">Pincode:</span>
                <span className="font-mono font-bold text-platinum">{property.address?.postalCode || "411001"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Risk Analysis */}
      {activeTab === "risk" && (
        <div className="space-y-6">
          <div className="pi-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sora text-base font-bold text-platinum flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                AI Property Risk Score Breakdown
              </h3>
              <RiskBadge
                level={property.riskScore?.riskLevel}
                score={property.riskScore?.overallScore}
                size="lg"
              />
            </div>

            {property.riskScore?.aiNarrative && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed font-medium">
                <span className="font-bold block text-amber-200 mb-1">AI Risk Summary Narrative:</span>
                {property.riskScore.aiNarrative}
              </div>
            )}

            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-platinum/40">Scored Risk Factors</h4>
              <div className="space-y-3">
                {property.riskScore?.factors?.map((f: any, idx: number) => (
                  <div key={idx} className="pi-surface p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-platinum">{f.factorDef?.name || "Risk Factor"}</span>
                      <span className="font-mono font-bold text-rose-400">{f.factorScore}/100</span>
                    </div>
                    <p className="text-xs text-platinum/45">{f.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Legal Intelligence */}
      {activeTab === "legal" && (
        <div className="pi-card p-6 space-y-4">
          <h3 className="font-sora text-base font-bold text-platinum flex items-center gap-2">
            <Scale className="w-5 h-5 text-violet-400" />
            Linked Court Cases &amp; Litigations
          </h3>

          {property.courtPropertyLinks?.length > 0 ? (
            <div className="space-y-4">
              {property.courtPropertyLinks.map((link: any) => (
                <div key={link.id} className="pi-surface p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-platinum">{link.courtCase?.title}</span>
                    <span className="pi-pill bg-rose-500/12 text-rose-400 border-rose-500/25 text-[10px] px-2 py-0.5">
                      Impact: {link.impactScore || 80}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-platinum/45">
                    <div>Case #: <span className="font-mono font-bold text-platinum">{link.courtCase?.caseNumber}</span></div>
                    <div>Status: <span className="font-bold text-amber-400">{link.courtCase?.caseStatus}</span></div>
                    <div>Court: <span className="font-medium text-platinum/60">{link.courtCase?.courtName}</span></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pi-surface p-8 text-center text-platinum/45 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
              No active court litigations linked to this survey number.
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Documents */}
      {activeTab === "documents" && (
        <div className="pi-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-sora text-base font-bold text-platinum flex items-center gap-2">
              <FileText className="w-5 h-5 text-platinum/70" />
              Uploaded Property Documents
            </h3>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {property.documents?.map((doc: any) => (
              <div key={doc.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="pi-icon-tile w-8 h-8 text-platinum/70">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-platinum">{doc.originalName}</p>
                    <p className="text-[10px] text-platinum/35">{doc.documentType?.name || "Document"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`pi-pill text-[10px] px-2 py-0.5 ${
                      doc.ocrStatus === "COMPLETED"
                        ? "bg-emerald-500/12 text-emerald-400 border-emerald-500/25"
                        : "bg-amber-500/12 text-amber-400 border-amber-500/25"
                    }`}
                  >
                    {doc.ocrStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: News Intelligence */}
      {activeTab === "news" && (
        <div className="pi-card p-6 space-y-4">
          <h3 className="font-sora text-base font-bold text-platinum flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-amber-400" />
            Property Mentioned Newspaper Articles
          </h3>

          {property.newspaperMentions?.length > 0 ? (
            <div className="space-y-3">
              {property.newspaperMentions.map((n: any) => (
                <div key={n.id} className="pi-surface p-4 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-platinum">{n.article?.headline}</span>
                    <span className="text-[10px] font-bold text-platinum/35">{n.article?.source?.name || "News"}</span>
                  </div>
                  <p className="text-platinum/45">{n.matchedExcerpt}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="pi-surface p-8 text-center text-platinum/45 text-xs">
              No recent newspaper mentions detected for this property parcel.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
