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
  { name: "Allocations (600)", icon: "Users", path: "/allocations" },
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
    label: "Personnel (600)",
    value: "600",
    delta: "+24.0%",
    trend: "up",
    detail: "active employee database",
  },
  {
    label: "Allocated Units",
    value: "485",
    delta: "+6.8%",
    trend: "up",
    detail: "equipment checked out",
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
    product_id: "P-1001",
    name: "Dell Latitude 5420",
    product_name: "Dell Latitude 5420",
    barcode: "890123450001",
    category: "Computing",
    subCategory: "Laptops",
    sku: "DL-5420-14",
    qty: 22,
    available_stock: 22,
    total_stock: 35,
    status: "In Stock",
    location: "Warehouse B-2",
    unit: "Unit",
    threshold: 12,
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1002",
    product_id: "P-1002",
    name: "HP ProDesk 600 G5",
    product_name: "HP ProDesk 600 G5",
    barcode: "890123450002",
    category: "Computing",
    subCategory: "Desktops",
    sku: "HP-600-G5",
    qty: 18,
    available_stock: 18,
    total_stock: 25,
    status: "Issued",
    location: "HQ Floor 4",
    unit: "Unit",
    threshold: 10,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1003",
    product_id: "P-1003",
    name: 'Samsung 27" Monitor',
    product_name: 'Samsung 27" Monitor',
    barcode: "890123450003",
    category: "Peripherals",
    subCategory: "Displays",
    sku: "SM-27M-01",
    qty: 34,
    available_stock: 34,
    total_stock: 45,
    status: "In Stock",
    location: "Warehouse B-1",
    unit: "Unit",
    threshold: 15,
    image:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1004",
    product_id: "P-1004",
    name: "Cisco IP Phone 8851",
    product_name: "Cisco IP Phone 8851",
    barcode: "890123450004",
    category: "Networking",
    subCategory: "Telephony",
    sku: "CI-8851",
    qty: 9,
    available_stock: 9,
    total_stock: 15,
    status: "Low Stock",
    location: "IT Room",
    unit: "Unit",
    threshold: 10,
    image:
      "https://images.unsplash.com/photo-1555618560-ffb7dc7855af?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1005",
    product_id: "P-1005",
    name: "HP LaserJet MFP 4250",
    product_name: "HP LaserJet MFP 4250",
    barcode: "890123450005",
    category: "Office",
    subCategory: "Printers",
    sku: "HP-MFP-4250",
    qty: 5,
    available_stock: 5,
    total_stock: 10,
    status: "Under Maintenance",
    location: "Service Bay",
    unit: "Unit",
    threshold: 8,
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1006",
    product_id: "P-1006",
    name: "Logitech MX Keys Keyboard",
    product_name: "Logitech MX Keys Keyboard",
    barcode: "097855149305",
    category: "Accessories",
    subCategory: "Keyboards",
    sku: "LG-MXK-01",
    qty: 51,
    available_stock: 51,
    total_stock: 60,
    status: "In Stock",
    location: "Warehouse C-3",
    unit: "Set",
    threshold: 12,
    image:
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1007",
    product_id: "P-1007",
    name: "Epson EB-X05 Projector",
    product_name: "Epson EB-X05 Projector",
    barcode: "8901030925237",
    category: "AV",
    subCategory: "Projectors",
    sku: "EP-X05",
    qty: 7,
    available_stock: 7,
    total_stock: 12,
    status: "Issued",
    location: "Board Room",
    unit: "Unit",
    threshold: 6,
    image:
      "https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1008",
    product_id: "P-1008",
    name: "Zebra Scanner GX420t",
    product_name: "Zebra Scanner GX420t",
    barcode: "ZR-GX420T",
    category: "Field Ops",
    subCategory: "Scanning",
    sku: "ZR-GX420T",
    qty: 26,
    available_stock: 26,
    total_stock: 30,
    status: "In Stock",
    location: "Warehouse A-4",
    unit: "Unit",
    threshold: 8,
    image:
      "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1009",
    product_id: "P-1009",
    name: "YubiKey 5C Security Key",
    product_name: "YubiKey 5C Security Key",
    barcode: "5060408461532",
    category: "Security",
    subCategory: "Access",
    sku: "YK-5C",
    qty: 12,
    available_stock: 12,
    total_stock: 20,
    status: "In Stock",
    location: "Security Office",
    unit: "Pack",
    threshold: 10,
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "P-1010",
    product_id: "P-1010",
    name: "Cisco Catalyst 9300",
    product_name: "Cisco Catalyst 9300",
    barcode: "0882658988630",
    category: "Networking",
    subCategory: "Switches",
    sku: "CC-9300",
    qty: 6,
    available_stock: 6,
    total_stock: 10,
    status: "Low Stock",
    location: "Data Center",
    unit: "Unit",
    threshold: 12,
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=600&q=80",
  },
];

// Helper to generate 600 full people / employee allocation profiles
const generate600People = () => {
  const firstNames = [
    "Aarav", "Priya", "Vikram", "Ananya", "Rohan", "Sneha", "Rahul", "Neha",
    "Aditya", "Pooja", "Arjun", "Divya", "Karan", "Ritu", "Suresh", "Meera",
    "David", "Sarah", "Michael", "Emma", "James", "Emily", "Daniel", "Jessica",
    "Alex", "Sophia", "Carlos", "Maria", "Liam", "Olivia", "Ethan", "Ava"
  ];
  const lastNames = [
    "Sharma", "Patel", "Nair", "Desai", "Gupta", "Verma", "Rao", "Joshi",
    "Kulkarni", "Mehta", "Chopra", "Reddy", "Iyer", "Singhania", "Bose", "Menon",
    "Miller", "Smith", "Johnson", "Brown", "Williams", "Taylor", "Anderson", "Thomas",
    "Martinez", "Davis", "Wilson", "Clark", "Rodriguez", "Lewis", "Lee", "Walker"
  ];

  const departments = [
    "Engineering", "Operations", "Field Service", "Finance", "Human Resources",
    "IT Infrastructure", "Marketing & Growth", "Executive Leadership", "Supply Chain", "Quality Assurance"
  ];

  const roles = [
    "Senior Systems Engineer", "Operations Lead", "Field Specialist", "Financial Analyst",
    "HR Business Partner", "Cloud Architect", "Product Strategist", "Logistics Coordinator",
    "Compliance Officer", "Network Administrator", "Security Lead", "Database Administrator"
  ];

  const assets = [
    { name: "Dell Latitude 5420 Laptop", code: "DL-5420" },
    { name: "HP ProDesk 600 G5 Tower", code: "HP-600" },
    { name: 'Samsung 27" 4K Monitor', code: "SM-27" },
    { name: "Cisco IP Phone 8851", code: "CI-8851" },
    { name: "Zebra Scanner GX420t", code: "ZR-420" },
    { name: "Logitech MX Master Set", code: "LG-MX" },
    { name: "YubiKey 5C Security Key", code: "YK-5C" },
    { name: "iPad Air Field Inspection Kit", code: "IP-AIR" }
  ];

  const locations = [
    "HQ Tower - Floor 4", "HQ Tower - Floor 7", "Warehouse Main Bay", "Warehouse B-2",
    "Field Deployment Station", "Data Center West", "Executive Suite 12", "Remote Workstation"
  ];

  const records = [];
  for (let i = 1; i <= 600; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3 + 7) % lastNames.length];
    const fullName = `${fn} ${ln}`;
    const dept = departments[i % departments.length];
    const role = roles[(i * 2 + 3) % roles.length];
    const assetObj = assets[i % assets.length];
    const loc = locations[i % locations.length];

    const empId = `EMP-${1000 + i}`;
    const serial = `SN-${assetObj.code}-${String(1000 + i)}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@northstar-ops.com`;
    const phone = `+1 (555) ${String(200 + (i % 700)).padStart(3, '0')}-${String(1000 + (i * 13) % 9000).padStart(4, '0')}`;

    const status = i % 5 === 0 ? "Returned" : i % 11 === 0 ? "Under Review" : "Issued";

    records.push({
      id: empId,
      user: fullName,
      email: email,
      phone: phone,
      department: dept,
      role: role,
      asset: assetObj.name,
      serialNo: serial,
      qty: (i % 3) + 1,
      status: status,
      dateIssued: `2026-0${(i % 7) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
      dueDate: `2026-1${(i % 3) + 0}-${String((i % 28) + 1).padStart(2, '0')}`,
      officeLocation: loc,
      securityClearance: i % 4 === 0 ? "Level 3 - Secret" : i % 2 === 0 ? "Level 2 - Confidential" : "Level 1 - Public",
      condition: i % 7 === 0 ? "Minor wear" : "Excellent",
      emergencyContact: `Emergency Contact: ${ln} Family (${phone})`,
      notes: `Active equipment checkout record for ${fullName}`
    });
  }
  return records;
};

export const allocations = generate600People();

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
