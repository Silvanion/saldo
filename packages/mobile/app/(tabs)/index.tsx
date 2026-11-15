import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import {
  calculate503020,
  formatMoney,
  Transaction,
  Breakdown503020
} from '@saldo/core';
import { TrendingDown, TrendingUp, ShieldAlert, Sparkles, ArrowUpRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Przykładowe dane stanu (podłączane pod SQLite w getMonthlyTransactions)
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-1',
      name: 'Wynagrodzenie B2B',
      amount: 18500,
      type: 'income',
      category: 'Wynagrodzenie',
      account: 'PKO BP',
      isoDate: '2026-03-01',
      currency: 'PLN',
    },
    {
      id: 'tx-2',
      name: 'Rata kredytu hipotecznego',
      amount: 3450,
      type: 'expense',
      category: 'Kredyt hipoteczny',
      account: 'PKO BP',
      isoDate: '2026-03-03',
      currency: 'PLN',
    },
    {
      id: 'tx-3',
      name: 'Biedronka zakupy spożywcze',
      amount: 284.50,
      type: 'expense',
      category: 'Żywność',
      account: 'mBank',
      isoDate: '2026-03-04',
      currency: 'PLN',
    },
  ]);

  const breakdown: Breakdown503020 = calculate503020(transactions, new Date());
  const incomeTotal = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expenseTotal = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const netSavings = incomeTotal - expenseTotal;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
    >
      {/* Karta Głównego Bilansu */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Dostępne środki (Bilans miesiąca)</Text>
        <Text style={styles.heroAmount}>{formatMoney(netSavings, 'PLN')}</Text>

        <View style={styles.heroRow}>
          <View style={styles.statBox}>
            <View style={styles.statIconBadgeIncome}>
              <TrendingUp color="#10b981" size={16} />
            </View>
            <View>
              <Text style={styles.statLabel}>Przychody</Text>
              <Text style={styles.statValueIncome}>+{formatMoney(incomeTotal, 'PLN')}</Text>
            </View>
          </View>

          <View style={styles.statBox}>
            <View style={styles.statIconBadgeExpense}>
              <TrendingDown color="#ef4444" size={16} />
            </View>
            <View>
              <Text style={styles.statLabel}>Wydatki</Text>
              <Text style={styles.statValueExpense}>-{formatMoney(expenseTotal, 'PLN')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Reguła 50/30/20 */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Podział Budżetu 50 / 30 / 20</Text>
          <Text style={styles.sectionSubtitle}>Zgodnie z polskim silnikiem reguł</Text>
        </View>

        <View style={styles.budgetRow}>
          <View style={styles.budgetLabelRow}>
            <Text style={styles.budgetName}>Potrzeby (Cel 50%)</Text>
            <Text style={styles.budgetAmount}>{formatMoney(breakdown.needs.amount, 'PLN')}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(breakdown.needs.percentage, 100)}%`, backgroundColor: '#38bdf8' }]} />
          </View>
        </View>

        <View style={styles.budgetRow}>
          <View style={styles.budgetLabelRow}>
            <Text style={styles.budgetName}>Zachcianki (Cel 30%)</Text>
            <Text style={styles.budgetAmount}>{formatMoney(breakdown.wants.amount, 'PLN')}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(breakdown.wants.percentage, 100)}%`, backgroundColor: '#f59e0b' }]} />
          </View>
        </View>

        <View style={styles.budgetRow}>
          <View style={styles.budgetLabelRow}>
            <Text style={styles.budgetName}>Oszczędności & Kredyty (Cel 20%)</Text>
            <Text style={styles.budgetAmount}>{formatMoney(breakdown.savings.amount, 'PLN')}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(breakdown.savings.percentage, 100)}%`, backgroundColor: '#10b981' }]} />
          </View>
        </View>
      </View>

      {/* Ostatnie Operacje */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Ostatnie Transakcje</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
            <Text style={styles.linkText}>Wszystkie</Text>
          </TouchableOpacity>
        </View>

        {transactions.map((tx) => (
          <View key={tx.id} style={styles.txRow}>
            <View style={styles.txLeft}>
              <Text style={styles.txName}>{tx.name}</Text>
              <Text style={styles.txDetails}>{tx.category} • {tx.account} • {tx.isoDate}</Text>
            </View>
            <Text style={tx.type === 'income' ? styles.txAmountIncome : styles.txAmountExpense}>
              {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  heroLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  heroAmount: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  statIconBadgeIncome: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statIconBadgeExpense: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  statValueIncome: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  statValueExpense: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  linkText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  budgetRow: {
    marginBottom: 14,
  },
  budgetLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetName: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  budgetAmount: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  txLeft: {
    flex: 1,
    marginRight: 12,
  },
  txName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '500',
  },
  txDetails: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 3,
  },
  txAmountIncome: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  txAmountExpense: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

