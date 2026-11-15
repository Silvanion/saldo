import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import {
  calculateSingleTaxForm,
  TAX_CONSTANTS_PL,
  formatMoney,
  TaxForm,
  ZusTier,
} from '@saldo/core';
import { Calculator, ShieldCheck, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function BudgetAndTaxScreen() {
  const [revenueStr, setRevenueStr] = useState('22000');
  const [costsStr, setCostsStr] = useState('2500');
  const [taxForm, setTaxForm] = useState<TaxForm>('ryczalt');
  const [zusTier, setZusTier] = useState<ZusTier>('full');

  const revenue = parseFloat(revenueStr) || 0;
  const costs = parseFloat(costsStr) || 0;

  const taxResult = calculateSingleTaxForm(taxForm, {
    monthlyRevenue: revenue,
    monthlyCosts: costs,
    zusTier,
    includeSickPay: true,
    ryczaltRate: 12,
    isVatPayer: true,
    vatRate: 23,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Karta Kalkulatora Podatków 2026 */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Calculator color="#38bdf8" size={20} />
          <Text style={styles.cardTitle}>Polski Silnik Podatkowy B2B (2026)</Text>
        </View>
        <Text style={styles.subtitle}>
          Aktualne stawki ZUS i zdrowotna (min. wynagrodzenie: {formatMoney(TAX_CONSTANTS_PL.MIN_WAGE, 'PLN')})
        </Text>

        {/* Wybór Formy Opodatkowania */}
        <View style={styles.selectorRow}>
          {(['ryczalt', 'linear', 'scale'] as const).map((form) => (
            <TouchableOpacity
              key={form}
              style={[styles.selectorChip, taxForm === form && styles.selectorChipActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setTaxForm(form);
              }}
            >
              <Text style={[styles.selectorText, taxForm === form && styles.selectorTextActive]}>
                {form === 'ryczalt' ? 'Ryczałt 12%' : form === 'linear' ? 'Liniowy 19%' : 'Skala 12/32%'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pola Przychodów i Kosztów */}
        <View style={styles.inputRow}>
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Przychód netto (PLN)</Text>
            <TextInput
              style={styles.textInput}
              value={revenueStr}
              onChangeText={setRevenueStr}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputBox}>
            <Text style={styles.inputLabel}>Koszty netto (PLN)</Text>
            <TextInput
              style={styles.textInput}
              value={costsStr}
              onChangeText={setCostsStr}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Podsumowanie bufora do odłożenia */}
        <View style={styles.bufferBanner}>
          <Text style={styles.bufferLabel}>Łączna rezerwa podatkowa do odłożenia:</Text>
          <Text style={styles.bufferAmount}>{formatMoney(taxResult.taxBufferToSetAside, 'PLN')}</Text>
          <Text style={styles.bufferHint}>ZUS + Zdrowotna + PIT + VAT</Text>
        </View>

        {/* Składowe */}
        <View style={styles.breakdownTable}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Ubezpieczenia społeczne ZUS</Text>
            <Text style={styles.tableValue}>{formatMoney(taxResult.zusSocial, 'PLN')}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Składka zdrowotna (NFZ)</Text>
            <Text style={styles.tableValue}>{formatMoney(taxResult.healthInsurance, 'PLN')}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Zaliczka na podatek dochodowy (PIT)</Text>
            <Text style={styles.tableValue}>{formatMoney(taxResult.incomeTax, 'PLN')}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Podatek VAT (23%)</Text>
            <Text style={styles.tableValue}>{formatMoney(taxResult.vatDue, 'PLN')}</Text>
          </View>
          <View style={[styles.tableRow, styles.tableRowHighlight]}>
            <Text style={styles.tableLabelHighlight}>Dochód na czysto (Netto do ręki)</Text>
            <Text style={styles.tableValueHighlight}>{formatMoney(taxResult.netIncome, 'PLN')}</Text>
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
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  selectorChip: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    alignItems: 'center',
  },
  selectorChipActive: {
    backgroundColor: '#38bdf8',
  },
  selectorText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  selectorTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  inputBox: {
    flex: 1,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  bufferBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 18,
  },
  bufferLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  bufferAmount: {
    color: '#38bdf8',
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  bufferHint: {
    color: '#64748b',
    fontSize: 11,
  },
  breakdownTable: {
    gap: 10,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  tableRowHighlight: {
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  tableLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  tableValue: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  tableLabelHighlight: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableValueHighlight: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

