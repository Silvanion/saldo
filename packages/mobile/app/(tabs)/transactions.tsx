import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import {
  Transaction,
  formatMoney,
  normalizeText,
  formatDate,
} from '@saldo/core';
import { Search, Filter, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

export default function TransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'tx-1',
      name: 'Faktura B2B - Usługi IT',
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
    {
      id: 'tx-4',
      name: 'Orlen paliwo PB95',
      amount: 312.20,
      type: 'expense',
      category: 'Transport',
      account: 'mBank',
      isoDate: '2026-03-05',
      currency: 'PLN',
    },
  ]);

  const filtered = transactions.filter((tx) => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (!searchQuery.trim()) return true;
    const normQuery = normalizeText(searchQuery);
    const normName = normalizeText(tx.name);
    const normCat = normalizeText(tx.category);
    return normName.includes(normQuery) || normCat.includes(normQuery);
  });

  return (
    <View style={styles.container}>
      {/* Pasek Wyszukiwania */}
      <View style={styles.searchBar}>
        <Search color="#64748b" size={18} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Szukaj transakcji, sklepu lub kategorii..."
          placeholderTextColor="#64748b"
        />
      </View>

      {/* Filtry szybkie */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, filterType === t && styles.filterChipActive]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[styles.filterText, filterType === t && styles.filterTextActive]}>
              {t === 'all' ? 'Wszystkie' : t === 'expense' ? 'Wydatki' : 'Wpływy'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista Transakcji */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardIconBadge}>
              {item.type === 'income' ? (
                <ArrowDownLeft color="#10b981" size={20} />
              ) : (
                <ArrowUpRight color="#ef4444" size={20} />
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardSubtitle}>
                {item.category} • {item.account}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={item.type === 'income' ? styles.amountIncome : styles.amountExpense}>
                {item.type === 'income' ? '+' : '-'}{formatMoney(item.amount, item.currency)}
              </Text>
              <Text style={styles.cardDate}>{formatDate(item.isoDate)}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
    height: 48,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterChipActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  filterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  cardIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amountIncome: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '700',
  },
  amountExpense: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  cardDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
});
