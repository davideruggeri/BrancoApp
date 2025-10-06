// screens/PresenzeScreen.js
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { db } from "../firebaseConfig";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import moment from "moment";
import { MaterialIcons } from "@expo/vector-icons";
//import LinearGradient from 'react-native-linear-gradient';


const { width, height } = Dimensions.get("window");

export default function PresenzeScreen() {
  const [lupetti, setLupetti] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // FILTRI
  const [modalFiltersVisible, setModalFiltersVisible] = useState(false);
  const [annoFiltro, setAnnoFiltro] = useState(null);
  const [statoFiltro, setStatoFiltro] = useState(null); // "presenti" | "assenti"
  const [eventoFiltro, setEventoFiltro] = useState(null);

  // MODAL LUPETTO
  const [modalLupettoVisible, setModalLupettoVisible] = useState(false);
  const [selectedLupetto, setSelectedLupetto] = useState(null);

  // FETCH CONTATTI
  const fetchLupetti = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "indirizzario"));
      const data = [];
      querySnapshot.forEach((docSnap) => {
        const c = docSnap.data();
        if (c.categoria === "Lupetto") {
          data.push({
            id: docSnap.id,
            nome: c.nome,
            cognome: c.cognome,
            annoAttivita: c.annoAttivita,
            presenze: c.presenze || {}, // map eventoId -> true/false
          });
        }
      });
      setLupetti(data);
    } catch (e) {
      console.error("Errore caricamento lupetti:", e);
    }
  }, []);

  // FETCH EVENTI
  const fetchEvents = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const data = [];
      querySnapshot.forEach((docSnap) => {
        const e = docSnap.data();
        if (
          ["Riunione", "Caccia", "Uscita", "VDBE", "VDBI", "FDP"].includes(
            e.category
          )
        ) {
          data.push({
            id: docSnap.id,
            title: e.title,
            start: e.start,
            end: e.end,
            category: e.category,
          });
        }
      });
      data.sort((a, b) => new Date(a.start) - new Date(b.start));
      setEvents(data);
      setSelectedEvent(data[0] || null); // prossima attività di default
      setEventoFiltro(data[0]?.id || null);
    } catch (e) {
      console.error("Errore caricamento eventi:", e);
    }
  }, []);

  useEffect(() => {
    fetchLupetti();
    fetchEvents();
  }, [fetchLupetti, fetchEvents]);

  // TOGGLE PRESENZA SU LISTA PRINCIPALE
  const togglePresenza = async (lupettoId, eventoId = selectedEvent?.id) => {
    if (!eventoId) return;
    const lupetto = lupetti.find((l) => l.id === lupettoId);
    if (!lupetto) return;
    const nuovoStato = !(lupetto.presenze[eventoId] ?? true);
    lupetto.presenze[eventoId] = nuovoStato;
    setLupetti([...lupetti]);

    try {
      await updateDoc(doc(db, "indirizzario", lupettoId), {
        [`presenze.${eventoId}`]: nuovoStato,
      });
    } catch (e) {
      console.error("Errore aggiornamento presenza:", e);
    }
  };

  // LONG PRESS - APRI MODAL LUPETTO
  const handleLongPressLupetto = (lupetto) => {
    setSelectedLupetto(lupetto);
    setModalLupettoVisible(true);
  };

  // FILTRI
  const lupettiFiltrati = lupetti
    .filter((l) => (annoFiltro ? l.annoAttivita === annoFiltro : true))
    .filter((l) => {
      if (!statoFiltro || !selectedEvent) return true;
      const presente = l.presenze[selectedEvent.id] ?? true;
      return statoFiltro === "presenti" ? presente : !presente;
    });

  const countPresenti = lupettiFiltrati.filter(
    (l) => l.presenze[selectedEvent?.id] ?? true
  ).length;
  const countAssenti = lupettiFiltrati.filter(
    (l) => !(l.presenze[selectedEvent?.id] ?? true)
  ).length;

  return (
    <SafeAreaView style={styles.container}>
        {/* HEADER INFO */}
 <View style={styles.headerCard}>
  <Text style={styles.headerTitle}>
    Prossima attività:
  </Text>
  <Text style={styles.headerEvent}>
    {selectedEvent?.title || "-"}
  </Text>
  <Text style={styles.headerDate}>
    {selectedEvent
      ? selectedEvent.category === "Uscita"
        ? `${moment(selectedEvent.start).format("DD/MM/YYYY")} - ${moment(selectedEvent.end).format("DD/MM/YYYY")}`
        : moment(selectedEvent.start).format("DD/MM/YYYY")
      : ""}
  </Text>
  <View style={styles.badgeContainer}>
    <View style={styles.presentBadge}>
      <Text style={styles.badgeText}>Presenti: {countPresenti}</Text>
    </View>
    <View style={styles.absentBadge}>
      <Text style={styles.badgeText}>Assenti: {countAssenti}</Text>
    </View>
  </View>
</View>


      {/* LISTA LUPETTI */}
      <FlatList
        data={lupettiFiltrati}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const presente = item.presenze[selectedEvent?.id] ?? true;
          return (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: presente ? "#d4edda" : "#f8d7da" },
              ]}
              onPress={() => togglePresenza(item.id)}
              onLongPress={() => handleLongPressLupetto(item)}
            >
              <Text style={styles.nome}>{item.nome} {item.cognome}</Text>
              <Text>Anno: {item.annoAttivita}</Text>
              <Text>Stato: {presente ? "Presente" : "Assente"}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* PULSANTE FILTRI */}
      <TouchableOpacity
        style={styles.filtroButton}
        onPress={() => setModalFiltersVisible(true)}
      >
        <MaterialIcons name="filter-alt" size={28} color="#fff" />
      </TouchableOpacity>

      {/* MODAL FILTRI */}
      <Modal visible={modalFiltersVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Filtri</Text>

              <Text>Anno</Text>
              <Picker
                selectedValue={annoFiltro}
                onValueChange={(val) => setAnnoFiltro(val)}
              >
                <Picker.Item label="Tutti" value={null} />
                {[...new Set(lupetti.map((l) => l.annoAttivita))].map((anno) => (
                  <Picker.Item key={anno} label={anno} value={anno} />
                ))}
              </Picker>

              <Text>Stato</Text>
              <Picker
                selectedValue={statoFiltro}
                onValueChange={(val) => setStatoFiltro(val)}
              >
                <Picker.Item label="Tutti" value={null} />
                <Picker.Item label="Presenti" value="presenti" />
                <Picker.Item label="Assenti" value="assenti" />
              </Picker>

              <Text>Attività</Text>
              <Picker
                selectedValue={eventoFiltro}
                onValueChange={(val) => {
                  setEventoFiltro(val);
                  setSelectedEvent(events.find((e) => e.id === val) || events[0]);
                }}
              >
                {events.map((e) => (
                  <Picker.Item
                    key={e.id}
                    label={`${e.title} (${moment(e.start).format("DD/MM/YYYY")})`}
                    value={e.id}
                  />
                ))}
              </Picker>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setModalFiltersVisible(false)}
              >
                <Text style={styles.buttonText}>Applica</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  setAnnoFiltro(null);
                  setStatoFiltro(null);
                  setEventoFiltro(events[0]?.id || null);
                  setSelectedEvent(events[0] || null);
                  setModalFiltersVisible(false);
                }}
              >
                <Text style={styles.buttonText}>Rimuovi filtri</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL LUPETTO - ATTIVITÀ */}
      <Modal visible={modalLupettoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: height * 0.8 }]}>
            <Text style={styles.modalTitle}>
              {selectedLupetto?.nome} {selectedLupetto?.cognome}
            </Text>
            <ScrollView>
              {events.map((e) => {
                const presente = selectedLupetto?.presenze[e.id] ?? true;
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={{
                      padding: 10,
                      marginVertical: 5,
                      borderRadius: 8,
                      backgroundColor: presente ? "#d4edda" : "#f8d7da",
                    }}
                    onPress={() => togglePresenza(selectedLupetto.id, e.id)}
                  >
                    <Text style={{ fontWeight: "bold" }}>{e.title}</Text>
                    <Text>{moment(e.start).format("DD/MM/YYYY")}</Text>
                    <Text>Stato: {presente ? "Presente" : "Assente"}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              style={[styles.applyButton, { marginTop: 10 }]}
              onPress={() => setModalLupettoVisible(false)}
            >
              <Text style={styles.buttonText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  headerCard: {
    backgroundColor: "#fff",
    margin: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  headerTitle: { fontSize: 14, fontWeight: "bold", color: "#555" },
  headerEvent: { fontSize: 16, fontWeight: "bold", color: "#007bff", marginBottom: 10 },
  headerDate: { fontSize: 14, color: "#555", marginBottom: 10 },

  badgeContainer: { flexDirection: "row" },
  presentBadge: { backgroundColor: "#28a745", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginRight: 10 },
  absentBadge: { backgroundColor: "#dc3545", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  badgeText: { color: "#fff", fontWeight: "bold" },
  card: {
    padding: 12,
    margin: 8,
    borderRadius: 8,
    elevation: 2,
  },
  nome: { fontWeight: "bold", fontSize: 16 },
  filtroButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 50,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "#fff", borderRadius: 10, padding: 15 },
  modalTitle: { fontWeight: "bold", fontSize: 18, marginBottom: 10 },
  applyButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  removeButton: {
    backgroundColor: "#dc3545",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
