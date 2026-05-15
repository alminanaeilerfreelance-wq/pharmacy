// Shared domain types
export type Role = 'admin' | 'pharmacist' | 'cashier' | 'inventory' | 'manager';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  branchId?: string;
  active: boolean;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isWarehouse: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  balance: number; // accounts payable
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  barcode: string;
  unit: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'box' | 'strip';
  prescriptionRequired: boolean;
  controlled: boolean; // narcotic / restricted
  reorderLevel: number;
  taxRate: number; // VAT %
  shelfLocation: string;
}

export interface Batch {
  id: string;
  medicineId: string;
  batchNumber: string;
  supplierId: string;
  branchId: string;
  expiryDate: string; // ISO date
  manufactureDate: string;
  quantity: number; // current stock for this batch
  costPrice: number;
  sellingPrice: number;
  receivedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  address?: string;
  loyaltyPoints: number;
  insuranceProvider?: string;
  insuranceNumber?: string;
}

export interface Prescription {
  id: string;
  customerId: string;
  doctorName: string;
  doctorLicense: string;
  issuedDate: string;
  status: 'pending' | 'verified' | 'dispensed' | 'rejected';
  items: { medicineId: string; quantity: number; dosage: string; instructions: string }[];
  notes?: string;
  verifiedBy?: string; // user id
}

export interface SaleItem {
  medicineId: string;
  batchId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  branchId: string;
  cashierId: string;
  customerId?: string;
  prescriptionId?: string;
  items: SaleItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'insurance' | 'mixed';
  amountPaid: number;
  change: number;
  insuranceCovered: number;
  status: 'completed' | 'refunded' | 'partial-refund';
  createdAt: string;
}

export interface PurchaseItem {
  medicineId: string;
  batchNumber: string;
  expiryDate: string;
  manufactureDate: string;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
}

export interface Purchase {
  id: string;
  poNumber: string;
  supplierId: string;
  branchId: string;
  items: PurchaseItem[];
  total: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  orderedAt: string;
  receivedAt?: string;
  notes?: string;
}

export interface InventoryLog {
  id: string;
  batchId: string;
  medicineId: string;
  branchId: string;
  type: 'purchase' | 'sale' | 'transfer' | 'adjustment' | 'return' | 'expired';
  quantityChange: number; // positive or negative
  reason: string;
  userId: string;
  refId?: string; // sale id, purchase id, etc.
  createdAt: string;
}
