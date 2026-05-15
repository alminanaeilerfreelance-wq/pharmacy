import * as bcrypt from 'bcryptjs';
import {
  User,
  Branch,
  Supplier,
  Medicine,
  Batch,
  Customer,
  Prescription,
} from './types';

const today = new Date();
const addDays = (d: number) =>
  new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

export function buildSeed() {
  const branches: Branch[] = [
    {
      id: 'br_main',
      name: 'Main Pharmacy',
      address: '123 King Fahd Rd, Riyadh',
      phone: '+966-11-555-0100',
      isWarehouse: false,
    },
    {
      id: 'br_north',
      name: 'North Branch',
      address: '45 Olaya St, Riyadh',
      phone: '+966-11-555-0200',
      isWarehouse: false,
    },
    {
      id: 'br_wh',
      name: 'Central Warehouse',
      address: 'Industrial Zone, Riyadh',
      phone: '+966-11-555-0300',
      isWarehouse: true,
    },
  ];

  // Pre-hashed bcrypt for "password123" (cost 8) — generated at boot for deterministic seed
  const pw = bcrypt.hashSync('password123', 8);
  const users: User[] = [
    { id: 'u_admin', username: 'admin', passwordHash: pw, fullName: 'System Admin', role: 'admin', active: true, createdAt: today.toISOString() },
    { id: 'u_pharm', username: 'pharmacist', passwordHash: pw, fullName: 'Sara Ahmed', role: 'pharmacist', branchId: 'br_main', active: true, createdAt: today.toISOString() },
    { id: 'u_cash', username: 'cashier', passwordHash: pw, fullName: 'Khalid Omar', role: 'cashier', branchId: 'br_main', active: true, createdAt: today.toISOString() },
    { id: 'u_inv', username: 'inventory', passwordHash: pw, fullName: 'Layla Hassan', role: 'inventory', branchId: 'br_wh', active: true, createdAt: today.toISOString() },
    { id: 'u_mgr', username: 'manager', passwordHash: pw, fullName: 'Mohammed Ali', role: 'manager', active: true, createdAt: today.toISOString() },
  ];

  const suppliers: Supplier[] = [
    { id: 's1', name: 'PharmaCorp Distribution', contact: 'Ahmed Yusuf', email: 'orders@pharmacorp.sa', phone: '+966-50-111-2222', address: 'Jeddah, KSA', balance: 12500 },
    { id: 's2', name: 'MediSupply Gulf', contact: 'Fatima Khan', email: 'sales@medisupply.com', phone: '+966-50-333-4444', address: 'Dubai, UAE', balance: 8200 },
    { id: 's3', name: 'GlobalMeds Inc', contact: 'John Carter', email: 'contact@globalmeds.com', phone: '+1-415-555-7890', address: 'San Francisco, USA', balance: 0 },
  ];

  const medicines: Medicine[] = [
    { id: 'm1', name: 'Paracetamol 500mg', genericName: 'Acetaminophen', category: 'Analgesic', manufacturer: 'Saudi Pharma', barcode: '6281234500011', unit: 'tablet', prescriptionRequired: false, controlled: false, reorderLevel: 50, taxRate: 15, shelfLocation: 'A-01' },
    { id: 'm2', name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', manufacturer: 'GSK', barcode: '6281234500028', unit: 'capsule', prescriptionRequired: true, controlled: false, reorderLevel: 30, taxRate: 0, shelfLocation: 'A-02' },
    { id: 'm3', name: 'Ibuprofen 400mg', genericName: 'Ibuprofen', category: 'Analgesic', manufacturer: 'Pfizer', barcode: '6281234500035', unit: 'tablet', prescriptionRequired: false, controlled: false, reorderLevel: 40, taxRate: 15, shelfLocation: 'A-03' },
    { id: 'm4', name: 'Cough Syrup 100ml', genericName: 'Dextromethorphan', category: 'Cough/Cold', manufacturer: 'Sanofi', barcode: '6281234500042', unit: 'syrup', prescriptionRequired: false, controlled: false, reorderLevel: 15, taxRate: 15, shelfLocation: 'B-01' },
    { id: 'm5', name: 'Insulin Glargine', genericName: 'Insulin Glargine', category: 'Diabetes', manufacturer: 'Sanofi', barcode: '6281234500059', unit: 'injection', prescriptionRequired: true, controlled: false, reorderLevel: 10, taxRate: 0, shelfLocation: 'C-01 (Cold)' },
    { id: 'm6', name: 'Tramadol 50mg', genericName: 'Tramadol HCl', category: 'Analgesic', manufacturer: 'Janssen', barcode: '6281234500066', unit: 'capsule', prescriptionRequired: true, controlled: true, reorderLevel: 20, taxRate: 0, shelfLocation: 'D-01 (Locked)' },
    { id: 'm7', name: 'Vitamin C 1000mg', genericName: 'Ascorbic Acid', category: 'Vitamins', manufacturer: 'Bayer', barcode: '6281234500073', unit: 'tablet', prescriptionRequired: false, controlled: false, reorderLevel: 60, taxRate: 15, shelfLocation: 'E-01' },
    { id: 'm8', name: 'Hydrocortisone Cream', genericName: 'Hydrocortisone', category: 'Topical', manufacturer: 'GSK', barcode: '6281234500080', unit: 'cream', prescriptionRequired: false, controlled: false, reorderLevel: 25, taxRate: 15, shelfLocation: 'B-02' },
  ];

  // Batches — multiple batches per medicine with varying expiry to demo FEFO
  const batches: Batch[] = [
    { id: 'b1', medicineId: 'm1', batchNumber: 'PCM-2024-A', supplierId: 's1', branchId: 'br_main', expiryDate: addDays(180), manufactureDate: addDays(-200), quantity: 220, costPrice: 0.30, sellingPrice: 0.75, receivedAt: addDays(-90) },
    { id: 'b2', medicineId: 'm1', batchNumber: 'PCM-2024-B', supplierId: 's1', branchId: 'br_main', expiryDate: addDays(420), manufactureDate: addDays(-30), quantity: 500, costPrice: 0.32, sellingPrice: 0.75, receivedAt: addDays(-15) },
    { id: 'b3', medicineId: 'm2', batchNumber: 'AMX-2024-A', supplierId: 's1', branchId: 'br_main', expiryDate: addDays(25), manufactureDate: addDays(-340), quantity: 18, costPrice: 1.20, sellingPrice: 2.50, receivedAt: addDays(-300) },
    { id: 'b4', medicineId: 'm2', batchNumber: 'AMX-2024-B', supplierId: 's1', branchId: 'br_main', expiryDate: addDays(300), manufactureDate: addDays(-60), quantity: 80, costPrice: 1.25, sellingPrice: 2.50, receivedAt: addDays(-45) },
    { id: 'b5', medicineId: 'm3', batchNumber: 'IBU-2024-A', supplierId: 's2', branchId: 'br_main', expiryDate: addDays(540), manufactureDate: addDays(-20), quantity: 150, costPrice: 0.40, sellingPrice: 1.10, receivedAt: addDays(-10) },
    { id: 'b6', medicineId: 'm4', batchNumber: 'CSY-2024-A', supplierId: 's2', branchId: 'br_main', expiryDate: addDays(365), manufactureDate: addDays(-30), quantity: 35, costPrice: 4.50, sellingPrice: 9.00, receivedAt: addDays(-20) },
    { id: 'b7', medicineId: 'm5', batchNumber: 'INS-2024-A', supplierId: 's3', branchId: 'br_main', expiryDate: addDays(120), manufactureDate: addDays(-90), quantity: 12, costPrice: 35.00, sellingPrice: 65.00, receivedAt: addDays(-60) },
    { id: 'b8', medicineId: 'm6', batchNumber: 'TRM-2024-A', supplierId: 's3', branchId: 'br_main', expiryDate: addDays(280), manufactureDate: addDays(-60), quantity: 25, costPrice: 2.10, sellingPrice: 4.80, receivedAt: addDays(-50) },
    { id: 'b9', medicineId: 'm7', batchNumber: 'VTC-2024-A', supplierId: 's2', branchId: 'br_main', expiryDate: addDays(450), manufactureDate: addDays(-15), quantity: 200, costPrice: 0.20, sellingPrice: 0.60, receivedAt: addDays(-10) },
    { id: 'b10', medicineId: 'm8', batchNumber: 'HCO-2024-A', supplierId: 's1', branchId: 'br_main', expiryDate: addDays(-5), manufactureDate: addDays(-700), quantity: 8, costPrice: 1.80, sellingPrice: 4.50, receivedAt: addDays(-680) }, // EXPIRED — for demo
    { id: 'b11', medicineId: 'm8', batchNumber: 'HCO-2024-B', supplierId: 's1', branchId: 'br_main', expiryDate: addDays(330), manufactureDate: addDays(-30), quantity: 40, costPrice: 1.85, sellingPrice: 4.50, receivedAt: addDays(-20) },
  ];

  const customers: Customer[] = [
    { id: 'c1', name: 'Abdullah Al-Rashid', phone: '+966-55-111-0001', email: 'abdullah@example.com', dateOfBirth: '1985-03-15', loyaltyPoints: 240, insuranceProvider: 'Bupa Arabia', insuranceNumber: 'BUP-998877' },
    { id: 'c2', name: 'Maryam Al-Saud', phone: '+966-55-222-0002', email: 'maryam@example.com', dateOfBirth: '1992-07-22', loyaltyPoints: 85, insuranceProvider: 'Tawuniya', insuranceNumber: 'TAW-554433' },
    { id: 'c3', name: 'Walk-in Customer', phone: '-', loyaltyPoints: 0 },
    { id: 'c4', name: 'Omar Khalil', phone: '+966-55-333-0003', dateOfBirth: '1978-11-30', loyaltyPoints: 510 },
  ];

  const prescriptions: Prescription[] = [
    {
      id: 'rx1',
      customerId: 'c1',
      doctorName: 'Dr. Hassan Ibrahim',
      doctorLicense: 'KSA-MD-44521',
      issuedDate: addDays(-2),
      status: 'verified',
      items: [
        { medicineId: 'm2', quantity: 21, dosage: '500mg', instructions: '1 cap TID for 7 days' },
        { medicineId: 'm3', quantity: 10, dosage: '400mg', instructions: 'PRN for pain' },
      ],
      notes: 'Patient allergic to penicillin — confirm tolerance',
      verifiedBy: 'u_pharm',
    },
    {
      id: 'rx2',
      customerId: 'c2',
      doctorName: 'Dr. Nadia Faraj',
      doctorLicense: 'KSA-MD-33890',
      issuedDate: addDays(-1),
      status: 'pending',
      items: [{ medicineId: 'm5', quantity: 2, dosage: '100 IU/ml', instructions: '20 units SC at bedtime' }],
    },
  ];

  return { branches, users, suppliers, medicines, batches, customers, prescriptions };
}
