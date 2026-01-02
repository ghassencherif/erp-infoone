export interface User {
  id: number
  name: string | null
  email: string
  role: 'ADMIN' | 'CASHIER' | 'ACCOUNTANT' | 'WAREHOUSE'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: number
  reference: string | null
  sku: string | null
  barcode?: string | null
  serialNumber?: string | null
  name: string
  description: string | null
  category?: string | null
  price: number
  promoPrice?: number | null
  cost: number | null
  tvaRate: number
  isService: boolean
  lowStockThreshold: number | null
  invoiceableQuantity: number
  prestashopId: string | null
  prestashopLastSynced: string | null
  isOnline: boolean
  stockAvailables: StockAvailable[]
  createdAt: string
}

export interface StockAvailable {
  id: number
  productId: number
  quantity: number
  createdAt: string
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}
export interface Client {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}
