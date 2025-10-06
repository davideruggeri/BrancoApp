import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { db } from "../firebaseConfig";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";

const MONTHS = [
  "ottobre","novembre","dicembre","gennaio","febbraio","marzo",
  "aprile","maggio","giugno","luglio","agosto","settembre"
];
const MAX_QUOTA = 15;

export default function QuoteScreen({ navigation }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState("Tutti");
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    setLoading(true);

    const unsub = onSnapshot(collection(db, "indirizzario"), (snapshot) => {
      const peopleList = [];
      const yearsSet = new Set();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.categoria === "Lupetto") {
          const year = data.annoAttivita || "";
          if (year) yearsSet.add(year);

          const payments = data.payments || { main: {}, VDBI: 0, FDP: 0, VDBE: 0 };

          // totale pagato (mensili + extra)
          const totalPaid = Object.values(payments.main || {}).reduce(
            (sum, m) => sum + (m.paid || 0),
            0
          ) + (payments.VDBI || 0) + (payments.FDP || 0) + (payments.VDBE || 0);

          // alert se mese corrente non pagato
          const currentMonth = getCurrentMonthItalian();
          const alertDue = (payments.main?.[currentMonth]?.paid || 0) < MAX_QUOTA;

          peopleList.push({
            id: docSnap.id,
            name: data.nome + " " + data.cognome,
            year,
            payments,
            totalPaid,
            alertDue,
          });
        }
      });

      setAvailableYears(["Tutti", ...Array.from(yearsSet).sort()]);
      setPeople(peopleList);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getCurrentMonthItalian = () => {
    const now = new Date();
    const monthIndex = now.getMonth();
    const offset = (monthIndex - 9 + 12) % 12;
    return MONTHS[offset];
  };

  const markQuotaPaid = async (person) => {
    const personRef = doc(db, "indirizzario", person.id);
    const currentMonth = getCurrentMonthItalian();
    const newPayments = {
      ...person.payments,
      main: { ...person.payments.main, [currentMonth]: { paid: MAX_QUOTA } },
    };
    try {
      await updateDoc(personRef, { payments: newPayments });
    } catch (e) {
      console.error("Errore inserimento quota:", e);
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  const filteredPeople =
    selectedYear === "Tutti"
      ? people
      : people.filter((p) => p.year === selectedYear);

  return (
    <ScrollView style={styles.container}>
      <Picker
        selectedValue={selectedYear}
        onValueChange={(val) => setSelectedYear(val)}
        style={{ marginBottom: 10 }}
      >
        {availableYears.map((y) => (
          <Picker.Item key={y} label={y} value={y} />
        ))}
      </Picker>

      {filteredPeople.map((person) => (
        <View key={person.id} style={styles.personContainer}>
          <TouchableOpacity
            style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
            onPress={() =>
              navigation.navigate("PersonDetail", {
                personId: person.id,
                personName: person.name,
              })
            }
          >
            <Text style={styles.personName}>
              {person.year} - {person.name}
            </Text>
            {person.alertDue && <Text style={styles.alertText}>⚠️</Text>}
          </TouchableOpacity>

          <Text style={styles.totalPaid}>Totale versato: {person.totalPaid} €</Text>

          <View style={{ flexDirection: "row", marginTop: 5 }}>
            <TouchableOpacity
              style={[styles.quickButton, { backgroundColor: "#28a745" }]}
              onPress={() => markQuotaPaid(person)}
            >
              <Text style={{ color: "white" }}>Quota versata</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  personContainer: {
    flexDirection: "column",
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  personName: { fontSize: 16, fontWeight: "bold" },
  alertText: { color: "red", marginLeft: 5, fontSize: 16 },
  totalPaid: { fontSize: 14, color: "#555", marginTop: 2 },
  quickButton: {
    padding: 5,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
});
