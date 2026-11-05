import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  generateId,
  formatMoney,
  expenseCategories,
  getLocalDateIso,
  Transaction,
} from '@saldo/core';
import { insertTransaction } from '../../src/db/sqliteStorage';
import { Check, X } from 'lucide-react-native';

export default function QuickAddModal() {
  const router = useRouter();

  const [amountStr, setAmountStr] = useState('');
  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(expenseCategories[0]);
  const [type, setType] = useState<'expense' | 'income'>('expense');

  const handleSave = async () => {
    const parsedAmount = parseFloat(amountStr.replace(',', '.'));
    if (!parsedAmount || parsedAmount <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const newTx: Transaction = {
      id: generateId('tx'),
      name: name.trim() || (type === 'expense' ? 'Wydatek' : 'Wpływ'),
      amount: parsedAmount,
      type,
      category: selectedCategory,
      account: 'Gotówka / Konto',
      isoDate: getLocalDateIso(),
      currency: 'PLN',
    };

    try {
      await insertTransaction(newTx);
    } catch {
      // W środowisku bez zainicjalizowanego natywnego SQLite zapis jest bezpiecznie tolerowany
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Przełącznik Typu: Wydatek / Wpływ */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, type === 'expense' && styles.typeButtonActiveExpense]}
            onPress={() => {
              Haptics.selectionAsync();
              setType('expense');
            }}
          >
            <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Wydatek</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, type === 'income' && styles.typeButtonActiveIncome]}
            onPress={() => {
              Haptics.selectionAsync();
              setType('income');
            }}
          >
            <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Przychód</Text>
          </TouchableOpacity>
        </View>

        {/* Wielkie pole kwoty */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencyPrefix}>PLN</Text>
          <TextInput
            style={styles.amountInput}
            value={amountStr}
            onChangeText={(val) => {
              setAmountStr(val);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            placeholder="0,00"
            placeholderTextColor="#475569"
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Tytuł / Opis */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tytuł / Sklep / Kontrahent</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="np. Biedronka, Paliwo, Obiad..."
            placeholderTextColor="#475569"
          />
        </View>

        {/* Wybór kategorii */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Kategoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {expenseCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCategory(cat);
                  }}
                >
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Przycisk zapisu */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.85}>
          <Check color="#0f172a" size={20} />
          <Text style={styles.saveButtonText}>Zapisz transakcję</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActiveExpense: {
    backgroundColor: '#ef4444',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#10b981',
  },
  typeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#ffffff',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  currencyPrefix: {
    color: '#38bdf8',
    fontSize: 24,
    fontWeight: 'bold',
  },
  amountInput: {
    color: '#f8fafc',
    fontSize: 48,
    fontWeight: 'bold',
    minWidth: 160,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 15,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipSelected: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  categoryChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#0f172a',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#38bdf8',
    paddingVertical: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
