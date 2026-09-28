export interface TierItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  totalQuantity: number;
  soldQuantity: number;
  maxPerCustomer: number;
  isEarlyBird: boolean;
  status: 'ACTIVE' | 'SOLD_OUT' | 'INACTIVE';
}

const defaultTiers: TierItem[] = [
  {
    id: 'tier-1',
    name: 'Early-Bird General Admission',
    description: 'Standard access to main stage, food court, and beach areas.',
    price: 150.00,
    currency: 'GHS',
    totalQuantity: 300,
    soldQuantity: 0,
    maxPerCustomer: 5,
    isEarlyBird: true,
    status: 'ACTIVE',
  },
  {
    id: 'tier-2',
    name: 'VIP Tropical Pass',
    description: 'Express lane entrance, dedicated bar lounge, VIP restrooms, and elevated viewing platform.',
    price: 350.00,
    currency: 'GHS',
    totalQuantity: 150,
    soldQuantity: 0,
    maxPerCustomer: 4,
    isEarlyBird: false,
    status: 'ACTIVE',
  },
  {
    id: 'tier-3',
    name: 'Cabana Lounge Table Package',
    description: 'Exclusive private beach cabana for up to 8 guests with bottle service and dedicated host.',
    price: 1500.00,
    currency: 'GHS',
    totalQuantity: 20,
    soldQuantity: 0,
    maxPerCustomer: 2,
    isEarlyBird: false,
    status: 'ACTIVE',
  },
];

const globalForTiers = globalThis as unknown as {
  sharedTicketTiers?: TierItem[];
};

if (!globalForTiers.sharedTicketTiers) {
  globalForTiers.sharedTicketTiers = [...defaultTiers];
}

export function getSharedTiers(): TierItem[] {
  return globalForTiers.sharedTicketTiers || defaultTiers;
}

export function saveSharedTier(tier: TierItem): TierItem[] {
  if (!globalForTiers.sharedTicketTiers) {
    globalForTiers.sharedTicketTiers = [...defaultTiers];
  }
  const index = globalForTiers.sharedTicketTiers.findIndex(t => t.id === tier.id);
  if (index >= 0) {
    globalForTiers.sharedTicketTiers[index] = tier;
  } else {
    globalForTiers.sharedTicketTiers.push(tier);
  }
  return [...globalForTiers.sharedTicketTiers];
}

export function deleteSharedTier(tierId: string): TierItem[] {
  if (!globalForTiers.sharedTicketTiers) {
    globalForTiers.sharedTicketTiers = [...defaultTiers];
  }
  globalForTiers.sharedTicketTiers = globalForTiers.sharedTicketTiers.filter(t => t.id !== tierId);
  return [...globalForTiers.sharedTicketTiers];
}
