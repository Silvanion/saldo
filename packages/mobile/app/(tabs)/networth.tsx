import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import {
  calculateLtvMetrics,
  formatMoney,
  calculateAssetBreakdown,
  calculateLiabilityBreakdown,
  calculateNetWorthSummary,
  Profile,
} from '@saldo/core';
import { Landmark, Home, ShieldAlert, Award } from 'lucide-react-native';

export default function NetWorthScreen() {
  // Przykładowe dane profilu (majątek, nieruchomości, kredyty)
  const [mockProfile] = useState<Profile>({
    id: 'p-1',
    name: 'Główny',
    type: 'personal',
    currency: 'PLN',
    accounts: [
      { id: 'a-1', name: 'Konto Główne PKO', balance: 34500, currency: 'PLN' },
      { id: 'a-2', name: 'Oszczędnościowe mBank', balance: 52000, currency: 'PLN' },
    ],
    assets: [
      { id: 'ast-1', name: 'Mieszkanie Warszawa', estimatedValue: 850000, category: 'real_estate', currency: 'PLN' },
      { id: 'ast-2', name: 'Samochód', estimatedValue: 65000, category: 'vehicle', currency: 'PLN' },
    ],
    debts: [
      {
        id: 'd-1',
        name: 'Kredyt Hipoteczny PKO BP',
        remainingAmount: 480000,
        monthlyPayment: 3450,
        interestRate: 7.2,
        currency: 'PLN',
        type: 'mortgage',
        propertyValue: 850000,
      },
    ],
  } as unknown as Profile);

  const assetsBreakdown = calculateAssetBreakdown(mockProfile);
  const liabilitiesBreakdown = calculateLiabilityBreakdown(mockProfile);
  const netWorthSummary = calculateNetWorthSummary(mockProfile);

  // Wskaźnik LTV z MortgagePro
  const ltv = calculateLtvMetrics(480000, 850000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Karta Główna Majątku Netto */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Majątek Netto (Aktywa - Pasywa)</Text>
        <Text style={styles.heroAmount}>{formatMoney(netWorthSummary.netWorth, 'PLN')}</Text>

        <View style={styles.ratioRow}>
          <View style={styles.ratioItem}>
            <Text style={styles.ratioLabel}>Aktywa całkowite</Text>
            <Text style={styles.ratioValueAssets}>{formatMoney(netWorthSummary.assets.totalAssets, 'PLN')}</Text>
          </View>
          <View style={styles.ratioDivider} />
          <View style={styles.ratioItem}>
            <Text style={styles.ratioLabel}>Zobowiązania (Pasywa)</Text>
            <Text style={styles.ratioValueLiabilities}>{formatMoney(netWorthSummary.liabilities.totalLiabilities, 'PLN')}</Text>
          </View>
        </View>
      </View>

      {/* Monitor Kredytu Hipotecznego & LTV */}
      {ltv && (
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Home color="#38bdf8" size={20} />
            <Text style={styles.cardTitle}>Wskaźnik LTV Hipoteki (MortgagePro)</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Stosunek zadłużenia do wyceny nieruchomości
          </Text>

          <View style={styles.ltvBadgeRow}>
            <Text style={styles.ltvBigPercent}>{ltv.ltvPercent}%</Text>
            <View style={[styles.statusBadge, ltv.status === 'safe' ? styles.statusBadgeSafe : styles.statusBadgeWarning]}>
              <Text style={styles.statusBadgeText}>
                {ltv.status === 'safe' ? 'Bezpieczny (<= 80%)' : 'Wymaga uwagi'}
              </Text>
            </View>
          </View>

          <View style={styles.ltvBarBg}>
            <View style={[styles.ltvBarFill, { width: `${Math.min(ltv.ltvPercent, 100)}%` }]} />
          </View>

          <Text style={styles.ltvHint}>
            Wycena: {formatMoney(ltv.propertyValue, 'PLN')} • Pozostały kapitał: {formatMoney(ltv.currentBalance, 'PLN')}
          </Text>
        </View>
      )}

      {/* Składniki Majątku */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardTitle}>Główne Składniki Aktywów</Text>
        <View style={styles.assetList}>
          <View style={styles.assetItem}>
            <Text style={styles.assetName}>Płynna gotówka</Text>
            <Text style={styles.assetValue}>{formatMoney(assetsBreakdown.liquidCash, 'PLN')}</Text>
          </View>
          <View style={styles.assetItem}>
            <Text style={styles.assetName}>Oszczędności & Lokaty</Text>
            <Text style={styles.assetValue}>{formatMoney(assetsBreakdown.savings, 'PLN')}</Text>
          </View>
          <View style={styles.assetItem}>
            <Text style={styles.assetName}>Nieruchomości</Text>
            <Text style={styles.assetValue}>{formatMoney(assetsBreakdown.property, 'PLN')}</Text>
          </View>
        </View>
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
    marginBottom: 6,
  },
  heroAmount: {
    color: '#f8fafc',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  ratioRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  ratioItem: {
    flex: 1,
  },
  ratioDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#334155',
    marginHorizontal: 12,
  },
  ratioLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  ratioValueAssets: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: 'bold',
  },
  ratioValueLiabilities: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  ltvBadgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 10,
  },
  ltvBigPercent: {
    color: '#38bdf8',
    fontSize: 28,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSafe: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  ltvBarBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  ltvBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 4,
  },
  ltvHint: {
    color: '#64748b',
    fontSize: 11,
  },
  assetList: {
    gap: 10,
    marginTop: 12,
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  assetName: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  assetValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
});
