import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

const MONTHS = [
  "ottobre","novembre","dicembre","gennaio","febbraio","marzo",
  "aprile","maggio","giugno"
];
const MAX_QUOTA = 15;

export default function PersonDetailScreen({ route }) {
  const { personId, personName } = route.params;
  const [payments, setPayments] = useState({
    main: {},
    VDBI: 0,
    FDP: 0,
    VDBE: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const personRef = doc(db, "indirizzario", personId);
    const unsubscribe = onSnapshot(personRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setPayments(data.payments || { main: {}, VDBI: 0, FDP: 0, VDBE: 0 });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [personId]);

  const updateMonthPayment = async (month, value) => {
    let newValue = Number(value) || 0;
    if (newValue > MAX_QUOTA) newValue = MAX_QUOTA;

    const newPayments = {
      ...payments,
      main: { ...payments.main, [month]: { paid: newValue } },
    };
    setPayments(newPayments);

    try {
      await updateDoc(doc(db, "indirizzario", personId), { payments: newPayments });
    } catch (e) {
      console.error("Errore aggiornamento quota mensile:", e);
    }
  };

  const updateExtraPayment = async (type, value) => {
    let newValue = Number(value) || 0;
    if (newValue > MAX_QUOTA) newValue = MAX_QUOTA;

    const newPayments = { ...payments, [type]: newValue };
    setPayments(newPayments);

    try {
      await updateDoc(doc(db, "indirizzario", personId), { payments: newPayments });
    } catch (e) {
      console.error("Errore aggiornamento quota extra:", e);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{personName}</Text>

      <Text style={styles.sectionTitle}>Quote mensili (max {MAX_QUOTA} €)</Text>
      {MONTHS.map((month) => {
        const paid = payments.main?.[month]?.paid || 0;
        const reachedMax = paid >= MAX_QUOTA;
        return (
          <View key={month} style={styles.monthContainer}>
            <Text style={styles.monthName}>
              {month.charAt(0).toUpperCase() + month.slice(1)}
            </Text>
            <TextInput
              style={[styles.input, reachedMax && styles.inputMax]}
              keyboardType="number-pad"
              value={String(paid)}
              onChangeText={(v) => updateMonthPayment(month, v)}
              textAlign="center"
              maxLength={5}
            />
          </View>
        );
      })}

      <Text style={styles.sectionTitle}>Quote extra (modificabili)</Text>
      {["VDBI", "FDP", "VDBE"].map((type) => {
        const value = payments[type] || 0;
        const reachedMax = value >= MAX_QUOTA;
        return (
          <View key={type} style={styles.monthContainer}>
            <Text style={styles.monthName}>{type}</Text>
            <TextInput
              style={[styles.input, reachedMax && styles.inputMax]}
              keyboardType="number-pad"
              value={String(value)}
              onChangeText={(v) => updateExtraPayment(type, v)}
              textAlign="center"
              maxLength={5}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20, marginBottom: 10 },
  monthContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  monthName: { flex: 1, fontSize: 16 },
  input: {
    width: 100,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
    textAlign: "center",
  },
  inputMax: { backgroundColor: "#d4edda", borderColor: "#28a745" },
});
