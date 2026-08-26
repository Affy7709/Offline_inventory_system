export const company = {
  name: "Northstar AssetOps",
  short: "NAO",
};

export const navigation = [
  { name: "Dashboard", icon: "LayoutDashboard", path: "/" },
  { name: "Inventory", icon: "Package2", path: "/inventory" },
  { name: "QR / Barcode", icon: "ScanLine", path: "/qr" },
  { name: "Issues & Returns", icon: "ArrowLeftRight", path: "/transactions" },
  { name: "Stock", icon: "Boxes", path: "/stock" },
  { name: "Allocations", icon: "Users", path: "/allocations" },
  { name: "Reports", icon: "FileBarChart2", path: "/reports" },
  { name: "Roles", icon: "ShieldCheck", path: "/roles" },
  { name: "Audit Logs", icon: "ClipboardList", path: "/audit" },
];

export const kpis = [
  {
    label: "Total Products",
    value: "412",
    delta: "+12.4%",
    trend: "up",
    detail: "vs last month",
  },
  {
    label: "In Stock",
    value: "286",
    delta: "+8.1%",
    trend: "up",
    detail: "healthy coverage",
  },
  {
    label: "Issued",
    value: "74",
    delta: "-2.3%",
    trend: "down",
    detail: "active allocations",
  },
  {
    label: "Under Maintenance",
    value: "21",
    delta: "+1.8%",
    trend: "up",
    detail: "service queue",
  },
  {
    label: "Low Stock",
    value: "31",
    delta: "+4.6%",
    trend: "up",
    detail: "needs attention",
  },
];

export const stockTrend = [
  { month: "Jan", value: 240 },
  { month: "Feb", value: 260 },
  { month: "Mar", value: 255 },
  { month: "Apr", value: 270 },
  { month: "May", value: 285 },
  { month: "Jun", value: 295 },
  { month: "Jul", value: 310 },
  { month: "Aug", value: 332 },
  { month: "Sep", value: 346 },
  { month: "Oct", value: 340 },
  { month: "Nov", value: 360 },
  { month: "Dec", value: 412 },
];

export const statusDistribution = [
  { name: "In Stock", value: 286, color: "#1e293b" },
  { name: "Issued", value: 74, color: "#8b5cf6" },
  { name: "Maintenance", value: 21, color: "#f59e0b" },
  { name: "Low Stock", value: 31, color: "#ef4444" },
];

export const lowStockAlerts = [
  {
    id: "A-104",
    name: "Dell Latitude 5420",
    remaining: 6,
    threshold: 12,
    location: "Warehouse B-2",
  },
  {
    id: "A-118",
    name: "HP LaserJet MFP",
    remaining: 3,
    threshold: 8,
    location: "Station 3",
  },
  {
    id: "A-202",
    name: "Cisco IP Phone 8851",
    remaining: 5,
    threshold: 10,
    location: "HQ Floor 7",
  },
];

export const recentTransactions = [
  {
    id: "TX-1032",
    type: "Stock In",
    status: "Completed",
    asset: "Dell Monitor",
    qty: 18,
    date: "2026-08-12",
    user: "R. Nair",
  },
  {
    id: "TX-1037",
    type: "Issue",
    status: "Issued",
    asset: "Laptop Kit",
    qty: 5,
    date: "2026-08-14",
    user: "Ops Team",
  },
  {
    id: "TX-1041",
    type: "Return",
    status: "Returned",
    asset: "Barcode Scanner",
    qty: 2,
    date: "2026-08-15",
    user: "Warehouse A",
  },
  {
    id: "TX-1047",
    type: "Stock Out",
    status: "Completed",
    asset: "Router Access",
    qty: 7,
    date: "2026-08-18",
    user: "IT Infra",
  },
  {
    id: "TX-1051",
    type: "Issue",
    status: "Overdue",
    asset: "Projector",
    qty: 1,
    date: "2026-08-09",
    user: "Sales Team",
  },
];

export const products = [
  {
    id: "P-1001",
    name: "Dell Latitude 5420",
    category: "Computing",
    subCategory: "Laptops",
    sku: "DL-5420-14",
    qty: 22,
    status: "In Stock",
    location: "Warehouse B-2",
    unit: "Unit",
    threshold: 12,
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1002",
    name: "HP ProDesk 600 G5",
    category: "Computing",
    subCategory: "Desktops",
    sku: "HP-600-G5",
    qty: 18,
    status: "Issued",
    location: "HQ Floor 4",
    unit: "Unit",
    threshold: 10,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1003",
    name: 'Samsung 27" Monitor',
    category: "Peripherals",
    subCategory: "Displays",
    sku: "SM-27M-01",
    qty: 34,
    status: "In Stock",
    location: "Warehouse B-1",
    unit: "Unit",
    threshold: 15,
    image:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1004",
    name: "Cisco IP Phone 8851",
    category: "Networking",
    subCategory: "Telephony",
    sku: "CI-8851",
    qty: 9,
    status: "Low Stock",
    location: "IT Room",
    unit: "Unit",
    threshold: 10,
    image:
      "https://images.unsplash.com/photo-1555618560-ffb7dc7855af?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1005",
    name: "HP LaserJet MFP 4250",
    category: "Office",
    subCategory: "Printers",
    sku: "HP-MFP-4250",
    qty: 5,
    status: "Under Maintenance",
    location: "Service Bay",
    unit: "Unit",
    threshold: 8,
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1006",
    name: "Logitech MX Keys",
    category: "Accessories",
    subCategory: "Keyboards",
    sku: "LG-MXK-01",
    qty: 51,
    status: "In Stock",
    location: "Warehouse C-3",
    unit: "Set",
    threshold: 12,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1007",
    name: "Epson EB-X05 Projector",
    category: "AV",
    subCategory: "Projectors",
    sku: "EP-X05",
    qty: 7,
    status: "Issued",
    location: "Board Room",
    unit: "Unit",
    threshold: 6,
    image:
      "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1008",
    name: "Zebra Scanner GX420t",
    category: "Field Ops",
    subCategory: "Scanning",
    sku: "ZR-GX420T",
    qty: 26,
    status: "In Stock",
    location: "Warehouse A-4",
    unit: "Unit",
    threshold: 8,
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1009",
    name: "YubiKey 5C",
    category: "Security",
    subCategory: "Access",
    sku: "YK-5C",
    qty: 12,
    status: "In Stock",
    location: "Security Office",
    unit: "Pack",
    threshold: 10,
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1010",
    name: "Cisco Catalyst 9300",
    category: "Networking",
    subCategory: "Switches",
    sku: "CC-9300",
    qty: 6,
    status: "Low Stock",
    location: "Data Center",
    unit: "Unit",
    threshold: 12,
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80",
  },
];

export const allocations = [
  {
    user: "Alicia Martins",
    department: "Operations",
    asset: "Dell Latitude 5420",
    qty: 3,
    status: "Issued",
  },
  {
    user: "Raman Nair",
    department: "Field Service",
    asset: "Zebra Scanner GX420t",
    qty: 2,
    status: "Issued",
  },
  {
    user: "Finance Team",
    department: "Finance",
    asset: "Samsung Monitor",
    qty: 5,
    status: "Returned",
  },
  {
    user: "HR Team",
    department: "HR",
    asset: "HP LaserJet",
    qty: 2,
    status: "Maintenance",
  },
];

export const auditLogs = [
  {
    id: "LOG-2001",
    user: "Anita Shah",
    action: "Updated stock threshold",
    record: "Dell Latitude 5420",
    time: "2026-08-21 09:14",
    type: "Adjust",
  },
  {
    id: "LOG-2002",
    user: "Marcus Lee",
    action: "Issued item to operations",
    record: "Scanner kit",
    time: "2026-08-21 08:40",
    type: "Issue",
  },
  {
    id: "LOG-2003",
    user: "Priya Rao",
    action: "Returned equipment",
    record: "CISCO phone",
    time: "2026-08-20 16:52",
    type: "Return",
  },
  {
    id: "LOG-2004",
    user: "John Doe",
    action: "Added new product",
    record: "Logitech MX Keys",
    time: "2026-08-19 13:05",
    type: "Create",
  },
];

export const reports = [
  { name: "Stock Summary", type: "Summary", updated: "2 hrs ago" },
  { name: "Issue Report", type: "Operations", updated: "1 day ago" },
  { name: "Low Stock", type: "Alert", updated: "5 hrs ago" },
  { name: "Audit Report", type: "Compliance", updated: "3 days ago" },
];
