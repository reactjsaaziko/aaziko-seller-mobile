import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOrders, StatusKey, TAB_FILTERS, UiOrder } from '@/lib/orders';

const BLUE = '#3E82C4';
const AMOUNT_BLUE = '#3E82C4';
const TAB_INACTIVE_BG = '#e7eaee';
const TAB_INACTIVE_TEXT = '#7b8794';
const YELLOW = '#f6c918';
const BORDER = '#ececf0';
const MUTED = '#8a929b';
const DARK = '#3b4149';

const TABS: { key: StatusKey; label: string }[] = [
  { key: 'ongoing', label: 'On Going Order' },
  { key: 'shipped', label: 'Shipped Order' },
  { key: 'delivered', label: 'Delivered Order' },
  { key: 'upcoming', label: 'Up Coming Order' },
];

function StatusTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text
        numberOfLines={1}
        style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OrderCard({ order }: { order: UiOrder }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.thumb}>
          <Ionicons name="image-outline" size={24} color="#b7c0c9" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.orderNo}>Order No. {order.orderNo}</Text>
          {order.sampleLabel ? <Text style={styles.metaLine}>{order.sampleLabel}</Text> : null}
          <Text style={styles.product} numberOfLines={2}>
            {order.product}
          </Text>
          {order.extraProducts > 0 ? (
            <Text style={styles.moreProducts}>+{order.extraProducts} more product(s)</Text>
          ) : null}
        </View>
        <TouchableOpacity hitSlop={8} activeOpacity={0.7}>
          <Ionicons name="document-text-outline" size={22} color={DARK} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardMid}>
        {order.qty ? <Text style={styles.metaLine}>Qty.: {order.qty} Pcs.</Text> : null}
        <Text style={styles.metaLine}>Order Date: {order.orderDate}</Text>
        <Text style={styles.metaLine}>Complition Date: {order.completionDate}</Text>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.amounts}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Order Amount</Text>
            <Text style={styles.amountValue}>{order.orderAmount}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Advance Received</Text>
            <Text style={styles.amountValue}>{order.advanceReceived}</Text>
          </View>
        </View>

        {order.manufacturingComplete ? (
          <View style={styles.completedTag}>
            <Ionicons name="checkmark-circle" size={15} color="#1a8f5f" />
            <Text style={styles.completedTagText}>Completed</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const [active, setActive] = useState<StatusKey>('ongoing');
  const [orders, setOrders] = useState<UiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    setUnauthorized(false);

    const res = await getOrders();
    if (res.ok) {
      setOrders(res.orders);
    } else {
      setError(res.error);
      setUnauthorized(!!res.unauthorized);
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => orders.filter((o) => TAB_FILTERS[active](o.status)),
    [orders, active],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Status tabs */}
      <View style={styles.tabsBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}>
          {TABS.map((t) => (
            <StatusTab
              key={t.key}
              label={t.label}
              active={active === t.key}
              onPress={() => setActive(t.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.centeredText}>Loading your orders…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={MUTED} />
          <Text style={styles.centeredText}>{error}</Text>
          {unauthorized ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/')}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Log in again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => load()}
              activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[BLUE]} tintColor={BLUE} />
          }>
          {orders.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="cube-outline" size={40} color={MUTED} />
              <Text style={styles.centeredText}>You don&apos;t have any orders yet.</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="funnel-outline" size={36} color={MUTED} />
              <Text style={styles.centeredText}>No orders in this tab.</Text>
            </View>
          ) : (
            filtered.map((o) => (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({ pathname: '/order-detail', params: { order: JSON.stringify(o) } })
                }>
                <OrderCard order={o} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f6f8' },

  tabsBar: { paddingTop: 10, paddingBottom: 6 },
  tabsRow: { paddingHorizontal: 12, paddingTop: 8, gap: 10 },
  tab: {
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: BLUE },
  tabInactive: { backgroundColor: TAB_INACTIVE_BG },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  tabTextInactive: { color: TAB_INACTIVE_TEXT },

  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32, gap: 12 },
  centeredText: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingHorizontal: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  listContent: { padding: 12, paddingBottom: 24, gap: 14, flexGrow: 1 },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1, paddingRight: 8 },
  orderNo: { fontSize: 13.5, fontWeight: '600', color: DARK },
  metaLine: { fontSize: 13, color: '#5c636b', marginTop: 3 },
  product: { fontSize: 13, color: '#5c636b', marginTop: 4, lineHeight: 18 },
  moreProducts: { fontSize: 12, color: BLUE, marginTop: 2 },

  cardMid: { marginTop: 12 },

  cardBottom: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  amounts: { flexDirection: 'row', flex: 1, gap: 18 },
  amountCol: {},
  amountLabel: { fontSize: 12.5, color: DARK, marginBottom: 4 },
  amountValue: { fontSize: 13, color: AMOUNT_BLUE, fontWeight: '600' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plusBtn: {
    width: 46,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#c7cdd4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportBtn: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: YELLOW,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#e7f7ef',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  completedTagText: { color: '#1a8f5f', fontSize: 12.5, fontWeight: '700' },
});
