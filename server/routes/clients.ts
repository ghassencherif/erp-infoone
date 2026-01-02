import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { fetchPrestashopClients } from '../lib/prestashop';

const router = Router();

// Get all clients
// GET: Return all clients from local DB
router.get('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST: Sync clients from PrestaShop
router.post('/sync', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const prestashopData = await fetchPrestashopClients();
    let count = 0;
    let skipped = 0;
    if (prestashopData && prestashopData.customers) {
      for (const customer of prestashopData.customers) {
        try {
          const name = (customer.firstname || '') + ' ' + (customer.lastname || '');
          const email = customer.email;
          if (!email) { skipped++; continue; }
          
          // Extract phone from various possible fields
          const phone = customer.phone || customer.phone_mobile || customer.mobile_phone || '';
          
          // Build address from fetched addressData
          let address = '';
          if (customer.addressData) {
            const addr = customer.addressData;
            address = addr.address1 || '';
            if (addr.address2) address += ', ' + addr.address2;
            if (addr.city) address += ', ' + addr.city;
            if (addr.postcode) address += ' ' + addr.postcode;
          }
          
          console.log('Syncing client:', { name, email, phone, address });
          
          await prisma.client.upsert({
            where: { email },
            update: { name, phone, address },
            create: { name, email, phone, address }
          });
          count++;
        } catch (clientError: any) {
          skipped++;
          console.error('Error syncing client:', clientError.message);
        }
      }
    } else {
      return res.status(400).json({ error: 'PrestaShop response missing customers array.' });
    }
    res.json({ message: `Synced ${count} clients from PrestaShop. Skipped: ${skipped}` });
  } catch (error: any) {
    console.error('PrestaShop sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create client
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { name, email, phone, address, type, matriculeFiscale } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Client name is required' });
    }
    
    // Generate the next client code
    let nextNumber = 1;
    try {
      const lastClient = await prisma.client.findFirst({
        orderBy: { id: 'desc' },
        select: { code: true }
      });
      
      if (lastClient && lastClient.code) {
        const match = lastClient.code.match(/C(\d+)/);
        if (match && match[1]) {
          const currentNumber = parseInt(match[1]);
          if (!isNaN(currentNumber)) {
            nextNumber = currentNumber + 1;
          }
        }
      }
    } catch (codeError) {
      console.warn('Error parsing client code, using default:', codeError);
      nextNumber = 1;
    }
    
    const code = `C${String(nextNumber).padStart(5, '0')}`;
    
    // Only send non-empty values to avoid unique constraint issues
    const data: any = { 
      code, 
      name: name.trim(),
      type: type || 'PARTICULIER'
    };
    
    if (email && email.trim()) {
      data.email = email.trim();
    }
    if (phone && phone.trim()) {
      data.phone = phone.trim();
    }
    if (address && address.trim()) {
      data.address = address.trim();
    }
    if (matriculeFiscale && matriculeFiscale.trim()) {
      data.matriculeFiscale = matriculeFiscale.trim();
    }
    
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  } catch (error: any) {
    console.error('Error creating client:', error.message, error);
    res.status(500).json({ error: error.message });
  }
});

// Update client
router.put('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, type, matriculeFiscale } = req.body;
    
    const data: any = {};
    if (name) data.name = name;
    if (type) data.type = type;
    if (email !== undefined) data.email = email || null;
    if (phone !== undefined) data.phone = phone || null;
    if (address !== undefined) data.address = address || null;
    if (matriculeFiscale !== undefined) data.matriculeFiscale = matriculeFiscale || null;
    
    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data
    });
    res.json(client);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete client
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Client deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get client order history
router.get('/:id/orders', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const orders = await prisma.commandeClient.findMany({
      where: { clientId: parseInt(id) },
      include: {
        lignes: {
          include: {
            product: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
