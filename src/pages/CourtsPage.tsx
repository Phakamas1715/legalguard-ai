import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  MapPin, Search, Loader2, Navigation, Building2, Phone
} from "lucide-react";

import { API_BASE } from "@/lib/runtimeConfig";

interface Court {
  name: string;
  lat: number;
  lon: number;
  address?: string;
  province?: string;
}

interface NearestResult {
  name: string;
  distance_km: number;
  lat: number;
  lon: number;
  address?: string;
}

const MOCK_COURTS: Court[] = [
  { name: "ศาลฎีกา", lat: 13.7563, lon: 100.5018, address: "ถนนราชดำเนินใน แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพฯ", province: "กรุงเทพฯ" },
  { name: "ศาลอุทธรณ์", lat: 13.7540, lon: 100.5010, address: "ถนนราชดำเนินใน แขวงพระบรมมหาราชวัง เขตพระนคร กรุงเทพฯ", province: "กรุงเทพฯ" },
  { name: "ศาลแพ่ง", lat: 13.7580, lon: 100.5050, address: "ถนนรัชดาภิเษก แขวงจอมพล เขตจตุจักร กรุงเทพฯ", province: "กรุงเทพฯ" },
  { name: "ศาลอาญา", lat: 13.7585, lon: 100.5055, address: "ถนนรัชดาภิเษก แขวงจอมพล เขตจตุจักร กรุงเทพฯ", province: "กรุงเทพฯ" },
  { name: "ศาลแรงงานกลาง", lat: 13.7590, lon: 100.5060, address: "ถนนพระราม 4 แขวงทุ่งมหาเมฆ เขตสาทร กรุงเทพฯ", province: "กรุงเทพฯ" },
  { name: "ศาลปกครองกลาง", lat: 13.7620, lon: 100.5200, address: "ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพฯ", province: "กรุงเทพฯ" },
  { name: "ศาลจังหวัดเชียงใหม่", lat: 18.7883, lon: 98.9853, address: "ถนนโชตนา ตำบลช้างเผือก อำเภอเมือง เชียงใหม่", province: "เชียงใหม่" },
  { name: "ศาลจังหวัดขอนแก่น", lat: 16.4322, lon: 102.8236, address: "ถนนกลางเมือง ตำบลในเมือง อำเภอเมือง ขอนแก่น", province: "ขอนแก่น" },
  { name: "ศาลจังหวัดสงขลา", lat: 7.1896, lon: 100.5945, address: "ถนนราชดำเนิน ตำบลบ่อยาง อำเภอเมือง สงขลา", province: "สงขลา" },
  { name: "ศาลจังหวัดนครราชสีมา", lat: 14.9799, lon: 102.0978, address: "ถนนมิตรภาพ ตำบลในเมือง อำเภอเมือง นครราชสีมา", province: "นครราชสีมา" },
  { name: "ศาลจังหวัดภูเก็ต", lat: 7.8804, lon: 98.3923, address: "ถนนดำรง ตำบลตลาดใหญ่ อำเภอเมือง ภูเก็ต", province: "ภูเก็ต" },
  { name: "ศาลจังหวัดอุดรธานี", lat: 17.4138, lon: 102.7870, address: "ถนนโพศรี ตำบลหมากแข้ง อำเภอเมือง อุดรธานี", province: "อุดรธานี" },
];

const CourtsPage = () => {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [nearestResult, setNearestResult] = useState<NearestResult | null>(null);
  const [reverseResult, setReverseResult] = useState<Record<string, unknown> | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "nearest" | "reverse">("list");

  useEffect(() => { loadCourts(); }, []);

  const loadCourts = async () => {
    try {
      const resp = await fetch(`${API_BASE}/geocoder/courts`);
      const data = await resp.json();
      const fetched = data.courts ?? [];
      setCourts(fetched.length > 0 ? fetched : MOCK_COURTS);
    } catch {
      setCourts(MOCK_COURTS);
    }
    setLoading(false);
  };

  const findNearest = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    setNearestResult(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const resp = await fetch(`${API_BASE}/geocoder/nearest-court?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        setNearestResult(await resp.json());
      } catch { /* ignore */ }
      setGpsLoading(false);
    }, () => setGpsLoading(false));
  };

  const reverseGeocode = (lat: number, lon: number) => {
    setReverseResult(null);
    fetch(`${API_BASE}/geocoder/reverse?lat=${lat}&lon=${lon}`)
      .then(r => r.json())
      .then(setReverseResult)
      .catch(() => {});
  };

  const filteredCourts = searchQuery
    ? courts.filter(c => c.name.includes(searchQuery) || c.province?.includes(searchQuery))
    : courts;

  const tabs = [
    { id: "list" as const, label: "รายชื่อศาล", icon: Building2 },
    { id: "nearest" as const, label: "ศาลใกล้ฉัน", icon: Navigation },
    { id: "reverse" as const, label: "Reverse Geocode", icon: MapPin },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-teal/10 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-teal" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">ค้นหาศาล</h1>
            <p className="text-muted-foreground">รายชื่อศาลทั้งหมด + ค้นหาศาลใกล้เคียงจาก GPS</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-muted"
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "list" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 mb-4">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อศาล เช่น ศาลฎีกา, ศาลจังหวัด..."
                className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              <Search className="w-5 h-5 text-muted-foreground self-center" />
            </div>
            {loading ? (
              <div className="text-center py-16"><Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">{filteredCourts.length} ศาล</p>
                {filteredCourts.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.name}</p>
                      {c.address && <p className="text-[11px] text-muted-foreground truncate">{c.address}</p>}
                    </div>
                    <button onClick={() => { setActiveTab("reverse"); reverseGeocode(c.lat, c.lon); }}
                      className="text-[11px] text-primary hover:underline flex-shrink-0">ดูที่อยู่</button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "nearest" && (
          <div className="max-w-xl mx-auto text-center">
            <div className="bg-card border border-border rounded-2xl p-8 shadow-card">
              <Navigation className="w-12 h-12 mx-auto mb-4 text-teal" />
              <h3 className="font-heading font-bold text-lg mb-2">ค้นหาศาลใกล้ฉัน</h3>
              <p className="text-sm text-muted-foreground mb-6">ใช้ GPS ของคุณเพื่อค้นหาศาลที่ใกล้ที่สุด</p>
              <button onClick={findNearest} disabled={gpsLoading}
                className="bg-teal text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2 mx-auto">
                {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {gpsLoading ? "กำลังค้นหา..." : "ค้นหาศาลใกล้ฉัน"}
              </button>
              {nearestResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-teal/5 border border-teal/20 rounded-xl p-4 text-left">
                  <p className="text-sm font-bold text-teal mb-1">{nearestResult.name}</p>
                  {nearestResult.distance_km !== undefined && (
                    <p className="text-xs text-muted-foreground">ระยะทาง: {nearestResult.distance_km.toFixed(1)} กม.</p>
                  )}
                  {nearestResult.address && <p className="text-xs text-muted-foreground mt-1">{nearestResult.address}</p>}
                </motion.div>
              )}
            </div>
          </div>
        )}

        {activeTab === "reverse" && (
          <div className="max-w-xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h3 className="font-heading font-bold mb-4">Reverse Geocode</h3>
              <p className="text-sm text-muted-foreground mb-4">แปลงพิกัด GPS เป็นที่อยู่ภาษาไทย</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="number" step="any" placeholder="Latitude เช่น 13.7563"
                  id="rev-lat" className="bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
                <input type="number" step="any" placeholder="Longitude เช่น 100.5018"
                  id="rev-lon" className="bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              </div>
              <button onClick={() => {
                const lat = parseFloat((document.getElementById("rev-lat") as HTMLInputElement).value);
                const lon = parseFloat((document.getElementById("rev-lon") as HTMLInputElement).value);
                if (!isNaN(lat) && !isNaN(lon)) reverseGeocode(lat, lon);
              }} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-navy-deep transition-colors flex items-center gap-2">
                <MapPin className="w-4 h-4" /> แปลงพิกัด
              </button>
              {reverseResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-muted rounded-xl p-4">
                  <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(reverseResult, null, 2)}</pre>
                </motion.div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CourtsPage;
