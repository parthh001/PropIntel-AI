"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth/auth-provider";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Search,
  Plus,
  Filter,
  LayoutGrid,
  LayoutList,
  MapPin,
  Building2,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ArrowUpDown,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";

// Dynamic import for Leaflet map component
const PropertyMap = dynamic(() => import("@/components/shared/property-map"), {
  ssr: false,
  loading: () => (
    <div className="pi-card h-96 flex items-center justify-center text-platinum/40 text-xs">
      Loading property map...
    </div>
  ),
});

const TALUKAS = ["All", "Haveli", "Mulshi", "Maval", "Bhor", "Baramati", "Shirur", "Khed", "Ambegaon"];
const PROPERTY_TYPES = [
  "All",
  "Residential plot",
  "Commercial plot",
  "Agricultural land",
  "Flat / Apartment",
  "Row house",
  "Bungalow",
  "Industrial gala",
  "Farm house",
];
const STATUSES = ["All", "VERIFIED", "LISTED", "UNDER_VERIFICATION", "FLAGGED", "DRAFT"];
const RISK_LEVELS = ["All", "MINIMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"];

const DEMO_PROPERTIES = [
  { id: "prop-001", title: "Plot 42, Kharadi", status: "VERIFIED", price: 4800000, areaSqft: 2400, surveyNumber: "42/3A", propertyType: { name: "Residential plot" }, address: { city: "Pune", district: "Pune", latitude: 18.5562, longitude: 73.9404 }, owner: { firstName: "Amit", lastName: "Patil" }, broker: { firstName: "Vinod", lastName: "Deshmukh" }, riskScore: { overallScore: 18, riskLevel: "LOW" }, metadata: { taluka: "Haveli", village: "Kharadi" }, createdAt: "2026-06-15T10:30:00Z" },
  { id: "prop-002", title: "Survey 118, Hinjewadi", status: "FLAGGED", price: 12500000, areaSqft: 5200, surveyNumber: "S.No.299/12", propertyType: { name: "Commercial plot" }, address: { city: "Pune", district: "Pune", latitude: 18.5912, longitude: 73.7380 }, owner: { firstName: "Sunil", lastName: "Deshmukh" }, broker: { firstName: "Rahul", lastName: "Joshi" }, riskScore: { overallScore: 73, riskLevel: "HIGH" }, metadata: { taluka: "Mulshi", village: "Hinjewadi" }, createdAt: "2026-05-20T08:15:00Z" },
  { id: "prop-003", title: "Flat 7B, Baner Road", status: "UNDER_VERIFICATION", price: 8200000, areaSqft: 1100, surveyNumber: "387/12C", propertyType: { name: "Flat / Apartment" }, address: { city: "Pune", district: "Pune", latitude: 18.5590, longitude: 73.7868 }, owner: { firstName: "Meena", lastName: "Kulkarni" }, broker: { firstName: "Vishal", lastName: "Sharma" }, riskScore: { overallScore: 47, riskLevel: "MODERATE" }, metadata: { taluka: "Haveli", village: "Baner" }, createdAt: "2026-07-01T14:00:00Z" },
  { id: "prop-004", title: "Farm Plot, Mulshi", status: "LISTED", price: 21000000, areaSqft: 43560, surveyNumber: "118/2A", propertyType: { name: "Agricultural land" }, address: { city: "Pune", district: "Pune", latitude: 18.5100, longitude: 73.5100 }, owner: { firstName: "Vitthal", lastName: "Pawar" }, broker: { firstName: "Sachin", lastName: "More" }, riskScore: { overallScore: 8, riskLevel: "MINIMAL" }, metadata: { taluka: "Mulshi", village: "Pirangut" }, createdAt: "2026-04-10T09:45:00Z" },
  { id: "prop-005", title: "Gala 3, Wagholi MIDC", status: "VERIFIED", price: 18000000, areaSqft: 4100, surveyNumber: "73/15", propertyType: { name: "Industrial gala" }, address: { city: "Pune", district: "Pune", latitude: 18.5800, longitude: 73.9800 }, owner: { firstName: "Ganesh", lastName: "Shinde" }, broker: { firstName: "Amit", lastName: "Kumar" }, riskScore: { overallScore: 22, riskLevel: "LOW" }, metadata: { taluka: "Haveli", village: "Wagholi" }, createdAt: "2026-03-22T11:20:00Z" },
  { id: "prop-006", title: "Row House 12, Undri", status: "DRAFT", price: 9500000, areaSqft: 1800, surveyNumber: "496/2C", propertyType: { name: "Row house" }, address: { city: "Pune", district: "Pune", latitude: 18.4632, longitude: 73.9101 }, owner: { firstName: "Savita", lastName: "Jadhav" }, broker: { firstName: "Nitin", lastName: "Kale" }, riskScore: null, metadata: { taluka: "Haveli", village: "Undri" }, createdAt: "2026-07-20T16:30:00Z" },
  { id: "prop-007", title: "Bungalow, Koregaon Park", status: "VERIFIED", price: 35000000, areaSqft: 6000, surveyNumber: "243", propertyType: { name: "Bungalow" }, address: { city: "Pune", district: "Pune", latitude: 18.5362, longitude: 73.8930 }, owner: { firstName: "Krishna", lastName: "Kulkarni" }, broker: { firstName: "Priya", lastName: "Joshi" }, riskScore: { overallScore: 12, riskLevel: "MINIMAL" }, metadata: { taluka: "Haveli", village: "Koregaon Park" }, createdAt: "2026-02-14T10:00:00Z" },
  { id: "prop-008", title: "Land parcel, Baramati", status: "LISTED", price: 5500000, areaSqft: 12000, surveyNumber: "S.No.150/3", propertyType: { name: "Agricultural land" }, address: { city: "Baramati", district: "Pune", latitude: 18.1515, longitude: 74.5771 }, owner: { firstName: "Shankar", lastName: "Thorat" }, broker: { firstName: "Sachin", lastName: "More" }, riskScore: { overallScore: 55, riskLevel: "MODERATE" }, metadata: { taluka: "Baramati", village: "Morgaon" }, createdAt: "2026-06-05T12:15:00Z" },
];

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

export default function PropertiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { getAccessToken } = useAuth();
  const [properties, setProperties] = useState<any[]>(DEMO_PROPERTIES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialQuery);
  const [talukaFilter, setTalukaFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  const [view, setView] = useState<"table" | "card">("table");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadProperties = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/properties?limit=100", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.data?.properties?.length > 0) {
        setProperties(data.data.properties);
      }
    } catch (err) {
      console.error("Properties API load error:", err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const filteredProperties = useMemo(() => {
    let list = [...properties];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.surveyNumber?.toLowerCase().includes(q) ||
          p.metadata?.village?.toLowerCase().includes(q) ||
          p.propertyType?.name?.toLowerCase().includes(q)
      );
    }

    if (talukaFilter !== "All") {
      list = list.filter((p) => p.metadata?.taluka === talukaFilter);
    }

    if (typeFilter !== "All") {
      list = list.filter((p) => p.propertyType?.name === typeFilter);
    }

    if (statusFilter !== "All") {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (riskFilter !== "All") {
      list = list.filter((p) => p.riskScore?.riskLevel === riskFilter);
    }

    list.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];

      if (sortField === "price") {
        va = a.price || 0;
        vb = b.price || 0;
      } else if (sortField === "riskScore") {
        va = a.riskScore?.overallScore || 0;
        vb = b.riskScore?.overallScore || 0;
      }

      if (va < vb) return sortOrder === "asc" ? -1 : 1;
      if (va > vb) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [properties, search, talukaFilter, typeFilter, statusFilter, riskFilter, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl md:text-3xl font-extrabold text-platinum tracking-tight">
            Property Intelligence Directory
          </h1>
          <p className="text-xs text-platinum/45">
            Discover, search, and inspect properties across Pune &amp; Maharashtra
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadProperties}
            className="pi-icon-btn p-2.5 rounded-xl text-platinum/50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/properties/new"
            className="pi-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-sora font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" /> Add New Property
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="pi-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="pi-input relative flex-1 w-full rounded-xl flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-platinum/35 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, survey #, village, or owner..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-transparent text-platinum placeholder-platinum/30 focus:outline-none"
            />
          </div>

          {/* View Toggles */}
          <div className="flex items-center gap-1 pi-surface p-1">
            <button
              onClick={() => setView("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === "table"
                  ? "bg-white/[0.1] text-platinum"
                  : "text-platinum/45 hover:text-platinum/80 hover:bg-white/[0.04]"
              }`}
            >
              <LayoutList className="w-4 h-4" /> Table
            </button>
            <button
              onClick={() => setView("card")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === "card"
                  ? "bg-white/[0.1] text-platinum"
                  : "text-platinum/45 hover:text-platinum/80 hover:bg-white/[0.04]"
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Grid
            </button>
          </div>
        </div>

        {/* Multi Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.08]">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-platinum/40 mb-1.5">
              Taluka
            </label>
            <div className="relative">
              <select
                value={talukaFilter}
                onChange={(e) => setTalukaFilter(e.target.value)}
                className="pi-input w-full appearance-none pl-3 pr-8 py-1.5 text-xs text-platinum rounded-xl focus:outline-none"
              >
                {TALUKAS.map((t) => (
                  <option key={t} value={t} className="bg-[#0c0d11] text-platinum">{t}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-platinum/35 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-platinum/40 mb-1.5">
              Property Type
            </label>
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="pi-input w-full appearance-none pl-3 pr-8 py-1.5 text-xs text-platinum rounded-xl focus:outline-none"
              >
                {PROPERTY_TYPES.map((pt) => (
                  <option key={pt} value={pt} className="bg-[#0c0d11] text-platinum">{pt}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-platinum/35 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-platinum/40 mb-1.5">
              Status
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pi-input w-full appearance-none pl-3 pr-8 py-1.5 text-xs text-platinum rounded-xl focus:outline-none"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-[#0c0d11] text-platinum">{st}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-platinum/35 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-platinum/40 mb-1.5">
              Risk Level
            </label>
            <div className="relative">
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="pi-input w-full appearance-none pl-3 pr-8 py-1.5 text-xs text-platinum rounded-xl focus:outline-none"
              >
                {RISK_LEVELS.map((rl) => (
                  <option key={rl} value={rl} className="bg-[#0c0d11] text-platinum">{rl}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-platinum/35 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Property List Display */}
      {view === "table" ? (
        <div className="pi-card p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="pi-table w-full text-left text-xs">
              <thead>
                <tr>
                  <th>Property Title</th>
                  <th>Type</th>
                  <th>Location / Taluka</th>
                  <th>Area</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Risk Level</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((prop) => (
                  <tr key={prop.id}>
                    <td>
                      <div>
                        <Link
                          href={`/properties/${prop.id}`}
                          className="font-bold text-platinum hover:text-white transition-colors"
                        >
                          {prop.title}
                        </Link>
                        <p className="text-[11px] text-platinum/35 font-mono">
                          Survey: {prop.surveyNumber || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="font-medium text-platinum/70">
                      {prop.propertyType?.name || "Plot"}
                    </td>
                    <td className="text-platinum/50">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-platinum/35" />
                        {prop.metadata?.village || prop.address?.city || "Pune"},{" "}
                        {prop.metadata?.taluka || "Haveli"}
                      </span>
                    </td>
                    <td className="text-platinum/70">
                      {formatArea(prop.areaSqft)}
                    </td>
                    <td className="font-bold text-platinum">
                      {formatPrice(prop.price)}
                    </td>
                    <td>
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td>
                      <RiskBadge
                        level={prop.riskScore?.riskLevel}
                        score={prop.riskScore?.overallScore}
                        size="sm"
                      />
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/properties/${prop.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-platinum/75 hover:text-platinum font-bold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => (
            <div
              key={prop.id}
              className="pi-card pi-card-interactive p-5 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <StatusBadge status={prop.status} size="sm" />
                  <RiskBadge
                    level={prop.riskScore?.riskLevel}
                    score={prop.riskScore?.overallScore}
                    size="sm"
                  />
                </div>

                <div>
                  <h3 className="font-sora font-bold text-lg text-platinum line-clamp-1">
                    {prop.title}
                  </h3>
                  <p className="text-xs text-platinum/45 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {prop.metadata?.village || "Pune"}, {prop.metadata?.taluka || "Haveli"}
                  </p>
                </div>

                <div className="pi-surface grid grid-cols-2 gap-2 p-3 text-xs">
                  <div>
                    <span className="text-[10px] text-platinum/40 uppercase tracking-wider block">Price</span>
                    <span className="font-extrabold text-platinum">{formatPrice(prop.price)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-platinum/40 uppercase tracking-wider block">Area</span>
                    <span className="font-semibold text-platinum/70">{formatArea(prop.areaSqft)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-[11px] text-platinum/35 font-mono">
                  S.# {prop.surveyNumber || "N/A"}
                </span>
                <Link
                  href={`/properties/${prop.id}`}
                  className="pi-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-platinum/85 font-bold text-xs"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
