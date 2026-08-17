/**
 * OfflinePOS — React Native client built on the shared @offlinepos/core
 * engine. Catalog, cart, checkout, receipt, and sync all run the exact same
 * code as the web + Electron apps; only storage (AsyncStorage) and the
 * printer (demo) are native here.
 *
 * @format
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_TAXES,
  computePricing,
  renderThermalReceipt,
  type CartLine,
  type Order,
  type Product,
} from '@offlinepos/core';
import { CATALOG } from './src/catalog';
import { bus, db, initApp, printer, queue, sync } from './src/wiring';

type SyncState = {
  online: boolean;
  pending: number;
  lastEvent: string;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ordersCount, setOrdersCount] = useState(0);
  const [printerState, setPrinterState] = useState('disconnected');
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>({ online: true, pending: 0, lastEvent: '' });

  useEffect(() => {
    let disposed = false;
    void (async () => {
      await initApp(CATALOG);
      if (disposed) return;
      setProducts(db.getProducts());
      setOrdersCount(db.getOrders().length);
      sync.start();
      setReady(true);
    })();
    return () => {
      disposed = true;
      sync.stop();
    };
  }, []);

  useEffect(() => {
    const offEnqueued = bus.on('mutation:enqueued', () => {
      setSyncState((s) => ({ ...s, pending: queue.pending().length }));
    });
    const offCompleted = bus.on('sync:completed', (report) => {
      setSyncState((s) => ({
        ...s,
        pending: queue.pending().length,
        lastEvent: `synced ${report.synced} · failed ${report.failed} · dead ${report.dead}`,
      }));
    });
    const offOrderSynced = bus.on('order:synced', () => {
      setOrdersCount(db.getOrders().length);
      setSyncState((s) => ({ ...s, pending: queue.pending().length }));
    });
    const offPrinter = bus.on('printer:state', (s) => setPrinterState(s.state));
    return () => {
      offEnqueued();
      offCompleted();
      offOrderSynced();
      offPrinter();
    };
  }, []);

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = products.find((p) => p.id === id);
          if (!product || quantity <= 0) return null;
          return {
            productId: product.id,
            name: product.name,
            emoji: product.emoji,
            price: product.price,
            quantity,
            lineTotal: product.price * quantity,
          };
        })
        .filter((line): line is CartLine => line !== null),
    [cart, products],
  );

  const pricing = useMemo(
    () => computePricing(lines, { type: 'fixed', value: 0 }, DEFAULT_TAXES),
    [lines],
  );

  const add = useCallback(
    (product: Product) => setCart((c) => ({ ...c, [product.id]: (c[product.id] ?? 0) + 1 })),
    [],
  );

  const setQty = useCallback((id: string, quantity: number) => {
    setCart((c) => {
      const next = { ...c };
      if (quantity <= 0) {
        delete next[id];
      } else {
        next[id] = quantity;
      }
      return next;
    });
  }, []);

  const checkout = useCallback(async () => {
    if (lines.length === 0) return;
    const order: Order = db.createOrder({
      lines,
      discount: { type: 'fixed', value: 0 },
      taxes: DEFAULT_TAXES,
      paymentMethod: 'cash',
    });
    await printer.printOrder(order);
    setLastReceipt(renderThermalReceipt(order));
    setOrdersCount(db.getOrders().length);
    setCart({});
  }, [lines]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>OfflinePOS</Text>
            <Text style={styles.subtitle}>
              {ready
                ? `${ordersCount} orders · ${queue.pending().length} pending · ${printerState}`
                : 'Loading local database…'}
            </Text>
          </View>
          <View style={[styles.dot, syncState.online ? styles.dotOnline : styles.dotOffline]} />
        </View>
        {syncState.lastEvent !== '' && <Text style={styles.syncEvent}>{syncState.lastEvent}</Text>}

        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={<Text style={styles.section}>Catalog</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.product} onPress={() => add(item)}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>AED {item.price.toFixed(2)}</Text>
              <Text style={styles.addHint}>+ Add</Text>
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />

        <View style={styles.cart}>
          <Text style={styles.section}>Cart</Text>
          {lines.length === 0 ? (
            <Text style={styles.empty}>Tap a product to add it.</Text>
          ) : (
            <ScrollView style={styles.cartLines} nestedScrollEnabled>
              {lines.map((line) => (
                <View key={line.productId} style={styles.line}>
                  <Text style={styles.lineName}>
                    {line.emoji} {line.name}
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable style={styles.stepBtn} onPress={() => setQty(line.productId, line.quantity - 1)}>
                      <Text style={styles.stepText}>−</Text>
                    </Pressable>
                    <Text style={styles.qty}>{line.quantity}</Text>
                    <Pressable style={styles.stepBtn} onPress={() => setQty(line.productId, line.quantity + 1)}>
                      <Text style={styles.stepText}>+</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.lineTotal}>AED {(line.lineTotal).toFixed(2)}</Text>
                </View>
              ))}
            </ScrollView>
          )}
          {lines.length > 0 && (
            <>
              <View style={styles.totals}>
                <Text style={styles.totalsText}>Subtotal</Text>
                <Text style={styles.totalsText}>AED {pricing.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totals}>
                <Text style={styles.totalsText}>VAT (15%)</Text>
                <Text style={styles.totalsText}>AED {pricing.tax.toFixed(2)}</Text>
              </View>
              <View style={styles.totals}>
                <Text style={styles.total}>Total</Text>
                <Text style={styles.total}>AED {pricing.total.toFixed(2)}</Text>
              </View>
              <Pressable style={styles.checkout} onPress={() => void checkout()}>
                <Text style={styles.checkoutText}>Checkout — print receipt</Text>
              </Pressable>
            </>
          )}
        </View>

        {lastReceipt !== null && (
          <View style={styles.receipt}>
            <Text style={styles.receiptTitle}>Last receipt (thermal)</Text>
            <Text style={styles.receiptText}>{lastReceipt}</Text>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotOnline: { backgroundColor: '#22c55e' },
  dotOffline: { backgroundColor: '#ef4444' },
  syncEvent: {
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  list: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  product: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    padding: 14,
    alignItems: 'center',
  },
  emoji: { fontSize: 30 },
  productName: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginTop: 6 },
  productPrice: { fontSize: 13, color: '#334155', marginTop: 2 },
  addHint: { fontSize: 12, color: '#2563eb', fontWeight: '700', marginTop: 6 },
  cart: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#cbd5e1',
    padding: 16,
    maxHeight: 300,
  },
  empty: { color: '#94a3b8', fontSize: 13, marginBottom: 8 },
  cartLines: { maxHeight: 120 },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineName: { flex: 1, fontSize: 13, color: '#0f172a' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 8 },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 16, fontWeight: '700', color: '#334155' },
  qty: { minWidth: 22, textAlign: 'center', fontSize: 14, fontWeight: '600' },
  lineTotal: { width: 70, textAlign: 'right', fontSize: 13, color: '#334155' },
  totals: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalsText: { fontSize: 13, color: '#475569' },
  total: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  checkout: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  checkoutText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  receipt: {
    backgroundColor: '#fefce8',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    padding: 16,
  },
  receiptTitle: { fontSize: 12, fontWeight: '700', color: '#713f12', marginBottom: 6 },
  receiptText: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 15,
    color: '#422006',
  },
});
