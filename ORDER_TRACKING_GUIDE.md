# Order Tracking System - Implementation Guide

## ✅ What's Been Implemented

### 1. **Database Schema** (`prisma/schema.prisma`)
- Added `Transporter` enum: ARAMEX, FIRST_DELIVERY, OUR_COMPANY
- Added `DeliveryStatus` enum: PENDING, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, CANCELLED
- Added fields to `CommandeClient`:
  - `transporter`: Current transporter
  - `trackingNumber`: Tracking/shipment number
  - `deliveryStatus`: Current delivery status
  - `deliveryDate`: When order was delivered
  - `deliveryNote`: Instructions for delivery
  - `lastTrackingCheck`: Last time API was checked

### 2. **Backend API** (`server/routes/order-tracking.ts`)
- `POST /api/commands/:id/set-delivery` - Start delivery process
  - Accepts: transporter, trackingNumber, deliveryNote
  - Updates status to EN_COURS_LIVRAISON
  - Triggers API tracking check if external transporter
  
- `GET /api/commands/:id/tracking` - Get tracking info
  - Returns current tracking status
  
- `POST /api/commands/:id/mark-delivered` - Mark as delivered
  - Updates status to LIVRE
  - Records delivery date
  
- `checkAllTrackingStatuses()` - Background job
  - Checks all in-transit orders periodically
  - Auto-updates status when delivered

### 3. **Frontend Component** (`src/components/OrderTrackingDialog.tsx`)
- Material-UI dialog for setting transporter
- Transporter selection with colors
- Tracking number input (required for Aramex/First Delivery)
- Delivery notes field
- Status display for ongoing deliveries
- Loading states & error handling

---

## 📋 Integration Checklist

### To integrate into your app:

1. **Backend - Add route to server/index.ts**:
   ```typescript
   import orderTracking from './routes/order-tracking';
   app.use('/api', orderTracking);
   ```

2. **Frontend - Import component in CommandesClient.tsx**:
   ```typescript
   import { OrderTrackingDialog } from '../components/OrderTrackingDialog';
   ```

3. **Add button to order detail/list**:
   ```typescript
   <Button onClick={() => setTrackingDialogOpen(true)}>
     <LocalShippingIcon /> Suivi Livraison
   </Button>
   ```

4. **Call API**:
   ```typescript
   const handleSetDelivery = async (data) => {
     await fetch(`/api/commands/${orderId}/set-delivery`, {
       method: 'POST',
       body: JSON.stringify(data)
     });
   };
   ```

---

## 🔌 API Integration Details

### Aramex API Setup
1. Create account at: https://www.aramex.com
2. Get API credentials:
   - API Key
   - Account Number
3. Add to `.env`:
   ```
   ARAMEX_API_KEY=your_api_key
   ARAMEX_ACCOUNT_NUMBER=your_account
   ARAMEX_API_URL=https://services.aramex.com
   ```
4. Implement endpoint in `checkAramexTracking()`:
   ```typescript
   // POST /shipping/api/v1/shipments/track
   // Returns: shipment status, delivery location, estimated delivery date
   ```

### First Delivery API Setup
1. Create account at: https://www.firstdelivery.tn
2. Get API credentials:
   - API Key
   - Account ID
3. Add to `.env`:
   ```
   FIRST_DELIVERY_API_KEY=your_api_key
   FIRST_DELIVERY_ACCOUNT_ID=your_account
   FIRST_DELIVERY_API_URL=https://api.firstdelivery.tn
   ```
4. Implement endpoint in `checkFirstDeliveryTracking()`:
   ```typescript
   // GET /tracking?shipment_id={trackingNumber}
   // Returns: shipment status, delivery location, estimated delivery date
   ```

---

## 🚀 Features to Add

### 1. **Tracking Dashboard**
- Display all in-transit orders
- Map view showing delivery locations
- Real-time status updates
- SMS/Email notifications on status change

### 2. **SMS/Email Notifications**
```typescript
// When status changes, notify customer:
- "Your order #CC123 is out for delivery"
- "Your order #CC123 has been delivered"
- Delivery attempts notifications

// Libraries: twilio (SMS), nodemailer (Email)
```

### 3. **Multiple Shipments per Order**
- Split large orders into multiple shipments
- Track each shipment separately
- Combine tracking info in UI

### 4. **Transporter Comparison**
- Show prices from each transporter
- Allow automatic selection based on weight/distance
- Schedule periodic price updates

### 5. **Delivery Proof**
- Photo upload on delivery
- Signature capture (mobile)
- GPS location verification
- Recipient name/date recording

### 6. **Route Optimization**
- Group deliveries by area
- Optimize delivery order
- Estimate delivery time
- Driver assignment

### 7. **Return Shipments**
- Generate return labels
- Track returns back to warehouse
- Auto-refund on return receipt
- Update inventory on return

### 8. **Transporter Webhooks**
Instead of polling APIs, receive real-time updates:
```typescript
POST /api/webhooks/aramex
POST /api/webhooks/first-delivery

// Auto-update order status when transporter sends status change
```

### 9. **Customer Tracking Portal**
- Share tracking link with customer
- Allow customers to provide delivery instructions
- Change delivery address
- Reschedule delivery date

### 10. **Analytics & Reports**
- On-time delivery rate by transporter
- Cost analysis per transporter
- Geographic delivery heatmap
- Peak delivery times
- Failed delivery analysis

### 11. **Integration with Suppliers**
- Send delivery status to supplier
- Track supplier orders separately
- Multi-warehouse support

### 12. **Delivery Slots**
- Configure delivery time windows
- Allow customers to choose slot
- Optimize driver route accordingly

---

## 📊 Database Schema Additions for Advanced Features

```prisma
model Shipment {
  id Int @id @default(autoincrement())
  commandeId Int
  commande CommandeClient @relation(fields: [commandeId], references: [id])
  
  transporter Transporter
  trackingNumber String @unique
  status DeliveryStatus
  
  weight Float?
  dimensions String? // "30x20x10"
  estimatedDelivery DateTime?
  actualDelivery DateTime?
  
  cost Float? // Cost to customer or cost from transporter
  insuranceValue Float?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  trackingHistory TrackingHistory[]
  deliveryProofs DeliveryProof[]
}

model TrackingHistory {
  id Int @id @default(autoincrement())
  shipmentId Int
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  
  status DeliveryStatus
  location String?
  latitude Float?
  longitude Float?
  notes String?
  
  timestamp DateTime @default(now())
}

model DeliveryProof {
  id Int @id @default(autoincrement())
  shipmentId Int
  shipment Shipment @relation(fields: [shipmentId], references: [id])
  
  photoUrl String? // Photo of delivered package
  signature String? // Base64 signature
  recipientName String?
  recipientPhone String?
  gpsLatitude Float?
  gpsLongitude Float?
  deliveredAt DateTime @default(now())
}
```

---

## 🔧 Configuration

Create `.env` variables:
```bash
# Aramex
ARAMEX_API_KEY=your_key
ARAMEX_ACCOUNT_NUMBER=your_account
ARAMEX_ENABLED=true

# First Delivery
FIRST_DELIVERY_API_KEY=your_key
FIRST_DELIVERY_ACCOUNT_ID=your_account
FIRST_DELIVERY_ENABLED=true

# Tracking Check Interval (in minutes)
TRACKING_CHECK_INTERVAL=30

# SMS/Email Notifications
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
```

---

## 📱 Frontend Components to Create

1. **OrderTrackingWidget** - Show tracking in order detail
2. **TrackingMap** - Display delivery location on map
3. **TrackingTimeline** - Show status history
4. **TrackingNotification** - Alert customer of status change
5. **ReturnShipmentForm** - Create return shipment
6. **TransporterComparison** - Compare prices & services

---

## 🎯 Recommended Implementation Order

1. ✅ Database schema & API endpoints (DONE)
2. ✅ Frontend dialog component (DONE)
3. Integrate into CommandesClient.tsx
4. Add transporter credentials to .env
5. Implement Aramex API integration
6. Implement First Delivery API integration
7. Add scheduled tracking checks (cron job)
8. Add SMS/Email notifications
9. Create tracking dashboard
10. Add customer portal
11. Add return shipment feature
12. Add analytics/reports

---

## Questions to Clarify

1. **Do you want automatic SMS notifications** when delivery status changes?
2. **Should customers see tracking info** in their own portal?
3. **Do you need delivery proof** (photos, signatures)?
4. **Multiple shipments per order** support?
5. **Specific transporter APIs** to integrate first?
6. **Should we auto-select transporter** based on location/weight?
