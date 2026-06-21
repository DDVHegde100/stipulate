'use client';

import { useEffect, useState } from 'react';
import { Button, GlassPanel, Heading, Input, Text } from '@stipulate/ui';

import { getStoredUser } from '../../../lib/consumer-auth';
import {
  createCardholder,
  issueVirtualCard,
  listPhysicalCardOrders,
  listVirtualCards,
  orderPhysicalCard,
  updateVirtualCardStatus,
  type Cardholder,
  type PhysicalCardOrder,
  type VirtualCard,
} from '../../../lib/issuing';

const CARDHOLDER_KEY = 'stipulate_cardholder_id';

function getStoredCardholderId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CARDHOLDER_KEY);
}

function storeCardholderId(id: string): void {
  localStorage.setItem(CARDHOLDER_KEY, id);
}

export default function CardsPage() {
  const [cardholder, setCardholder] = useState<Cardholder | null>(null);
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [orders, setOrders] = useState<PhysicalCardOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [showShipForm, setShowShipForm] = useState(false);
  const [address, setAddress] = useState({
    line1: '',
    city: '',
    state: '',
    postalCode: '',
  });
  const [orderStatus, setOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) {
      setLoading(false);
      setError('Sign in to manage Stipulate cards');
      return;
    }

    void (async () => {
      try {
        let cardholderId = getStoredCardholderId();
        if (!cardholderId) {
          const created = await createCardholder();
          cardholderId = created.id;
          storeCardholderId(created.id);
          setCardholder(created);
        } else {
          setCardholder({
            id: cardholderId,
            consumerUserId: user.id,
            programSlug: 'stipulate_sandbox',
            status: 'approved',
            kycStatus: 'passed',
            createdAt: new Date().toISOString(),
          });
        }

        const virtualCards = await listVirtualCards(cardholderId);
        setCards(virtualCards);
        const physicalOrders = await listPhysicalCardOrders(cardholderId);
        setOrders(physicalOrders);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleIssueCard() {
    if (!cardholder) return;
    setIssuing(true);
    setError(null);
    try {
      const card = await issueVirtualCard(cardholder.id);
      setCards((prev) => [card, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue card');
    } finally {
      setIssuing(false);
    }
  }

  async function handleToggleFreeze(card: VirtualCard) {
    setError(null);
    try {
      const nextStatus = card.status === 'frozen' ? 'active' : 'frozen';
      const updated = await updateVirtualCardStatus(card.id, nextStatus);
      setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, status: updated.status } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card');
    }
  }

  async function handleOrderPhysical() {
    if (!cardholder) return;
    setOrdering(true);
    setError(null);
    setOrderStatus(null);
    try {
      const order = await orderPhysicalCard({
        cardholderId: cardholder.id,
        shippingAddress: { ...address, country: 'US' },
      });
      setOrderStatus(`Order ${order.id.slice(0, 8)} submitted (${order.status})`);
      setOrders((prev) => [order, ...prev]);
      setShowShipForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to order physical card');
    } finally {
      setOrdering(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <Text variant="overline" tone="secondary">
            Stipulate issuing
          </Text>
          <Heading as="h1" size="lg">
            Virtual cards
          </Heading>
          <Text tone="secondary" className="mt-1">
            Sandbox program — issue, freeze, and order physical cards
          </Text>
        </div>
        <Button onClick={handleIssueCard} disabled={!cardholder || issuing}>
          {issuing ? 'Issuing…' : '+ Issue virtual card'}
        </Button>
      </div>

      {error && (
        <GlassPanel className="border-red-500/30">
          <Text tone="secondary">{error}</Text>
        </GlassPanel>
      )}

      {loading ? (
        <Text tone="secondary">Loading cards…</Text>
      ) : cards.length === 0 ? (
        <GlassPanel>
          <Text tone="secondary">No virtual cards yet. Issue one to get started.</Text>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <GlassPanel key={card.id}>
              <div className="flex items-start justify-between">
                <div>
                  <Text variant="overline" tone="secondary">
                    {card.network.toUpperCase()}
                  </Text>
                  <Heading as="h2" size="md">
                    •••• {card.last4}
                  </Heading>
                  <Text tone="secondary" className="mt-1 capitalize">
                    {card.status}
                  </Text>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleToggleFreeze(card)}
                  disabled={card.status === 'closed'}
                >
                  {card.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                </Button>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      <GlassPanel>
        <div className="flex items-center justify-between">
          <div>
            <Heading as="h2" size="sm">
              Physical card
            </Heading>
            <Text tone="secondary" className="mt-1">
              Submit a shipping address to queue a physical card order
            </Text>
          </div>
          <Button variant="ghost" onClick={() => setShowShipForm(!showShipForm)}>
            {showShipForm ? 'Cancel' : 'Order physical'}
          </Button>
        </div>

        {showShipForm && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Street address"
              value={address.line1}
              onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
            />
            <Input
              placeholder="City"
              value={address.city}
              onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
            />
            <Input
              placeholder="State"
              value={address.state}
              onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
            />
            <Input
              placeholder="Postal code"
              value={address.postalCode}
              onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
            />
            <Button onClick={() => void handleOrderPhysical()} disabled={ordering || !cardholder}>
              {ordering ? 'Submitting…' : 'Submit order'}
            </Button>
          </div>
        )}

        {orderStatus && (
          <Text tone="secondary" className="mt-3">
            {orderStatus}
          </Text>
        )}

        {orders.length > 0 && (
          <div className="mt-4 space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border border-glass-border px-3 py-2 text-sm"
              >
                <span className="capitalize text-[var(--color-text-secondary)]">
                  {order.status}
                  {order.trackingNumber ? ` · ${order.trackingNumber}` : ''}
                </span>
                <span className="text-[var(--color-text-tertiary)]">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
