import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const CATEGORIE = ["Generale", "Cibo", "Trasporto", "Alloggio", "Altro"];
const METODI = ["Cassa Comune", "Contanti", "Carta"];

export default function SpeseScreen() {
  const [spese, setSpese] = useState([]);
  const [vvllList, setVvllList] = useState([]);
  const [importo, setImporto] = useState("");
  const [categoria, setCategoria] = useState("Generale");
  const [metodoPagamento, setMetodoPagamento] = useState("Cassa Comune");
  const [anticipata, setAnticipata] = useState(false);
  const [anticipatoDa, setAnticipatoDa] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [editId, setEditId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSpesa, setSelectedSpesa] = useState(null);

  const [entrate, setEntrate] = useState(0); // entrate Lupetti + donazioni
  const [rimborsi, setRimborsi] = useState({});
  const [totaleSpese, setTotaleSpese] = useState(0);

  const [rimborsoModalVisible, setRimborsoModalVisible] = useState(false);
  const [vvllDaRimborsare, setVvllDaRimborsare] = useState("");
  const [metodoRimborso, setMetodoRimborso] = useState("Contanti");

  // 🔹 Carica spese in tempo reale
  useEffect(() => {
    const q = query(collection(db, "spese"), orderBy("data", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dati = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSpese(dati);
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Carica VVLL e Lupetti
  useEffect(() => {
    const q = collection(db, "indirizzario");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = [];
      let totaleQuote = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.categoria === "VVLL") {
          lista.push({ id: doc.id, name: data.nome + " " + data.cognome });
        } else if (data.categoria === "Lupetto") {
          const payments = data.payments || { main: {}, VDBI: 0, FDP: 0, VDBE: 0 };
          const totalePersona =
            Object.values(payments.main || {}).reduce(
              (sum, m) => sum + (m.paid || 0),
              0
            ) +
            (payments.VDBI || 0) +
            (payments.FDP || 0) +
            (payments.VDBE || 0);
          totaleQuote += totalePersona;
        }
      });
      setVvllList(lista);
      setEntrate(totaleQuote);
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Calcola totale spese, rimborsi e entrate da donazioni
  useEffect(() => {
    let totale = 0;
    let donazioni = 0;
    const rimborsiTemp = {};
    spese.forEach((s) => {
      const imp = parseFloat(s.importo || 0);
      if (s.categoria === "Donazione") {
        donazioni += imp;
      } else {
        totale += imp;
        if (s.anticipata && s.anticipatoDa) {
          rimborsiTemp[s.anticipatoDa] = (rimborsiTemp[s.anticipatoDa] || 0) + imp;
        }
      }
    });
    setTotaleSpese(totale);
    setRimborsi(rimborsiTemp);
    // entrate totali = Lupetti + donazioni
    setEntrate((prev) => {
      const lupetti = prev - donazioni; // rimuove donazioni già sommate
      return lupetti + donazioni;
    });
  }, [spese]);

  const saldo = entrate - totaleSpese;

  const resetForm = () => {
    setImporto("");
    setCategoria("Generale");
    setMetodoPagamento("Cassa Comune");
    setAnticipata(false);
    setAnticipatoDa("");
    setDescrizione("");
    setEditId(null);
    setSelectedSpesa(null);
  };

  const salvaSpesa = async () => {
    if (!importo) return Alert.alert("Attenzione", "Inserisci un importo valido");
    if (anticipata && !anticipatoDa)
      return Alert.alert("Attenzione", "Se spesa anticipata devi selezionare chi ha anticipato");
    try {
      if (editId) {
        const ref = doc(db, "spese", editId);
        await updateDoc(ref, {
          importo: parseFloat(importo),
          categoria,
          metodoPagamento,
          anticipata,
          anticipatoDa,
          descrizione,
        });
      } else {
        await addDoc(collection(db, "spese"), {
          importo: parseFloat(importo),
          categoria,
          metodoPagamento,
          anticipata,
          anticipatoDa,
          descrizione,
          data: new Date(),
        });
      }
      resetForm();
    } catch (e) {
      Alert.alert("Errore", e.message);
    }
  };

  const salvaDonazione = async () => {
    if (!importo) return Alert.alert("Attenzione", "Inserisci un importo valido");
    try {
      await addDoc(collection(db, "spese"), {
        importo: parseFloat(importo),
        categoria: "Donazione",
        metodoPagamento: "Contanti",
        anticipata: false,
        anticipatoDa: "",
        descrizione: descrizione || "",
        data: new Date(),
      });
      resetForm();
    } catch (e) {
      Alert.alert("Errore", e.message);
    }
  };

  const eliminaSpesa = async (id) => {
    try {
      const ref = doc(db, "spese", id);
      await deleteDoc(ref);
      resetForm();
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Errore", e.message);
    }
  };

  // Funzione per aprire il modal rimborso
  const apriRimborsoModal = (vvll) => {
    setVvllDaRimborsare(vvll);
    setMetodoRimborso("Contanti");
    setRimborsoModalVisible(true);
  };

  // Conferma rimborso: aggiorna tutte le spese anticipate di quel VVLL
  const confermaRimborso = async () => {
    try {
      const speseDaAggiornare = spese.filter(
        (s) => s.anticipata && s.anticipatoDa === vvllDaRimborsare
      );
      for (const s of speseDaAggiornare) {
        const ref = doc(db, "spese", s.id);
        await updateDoc(ref, {
          metodoPagamento: metodoRimborso,
          anticipata: false,
          anticipatoDa: "",
        });
      }
      setRimborsoModalVisible(false);
      setVvllDaRimborsare("");
    } catch (e) {
      Alert.alert("Errore", e.message);
    }
  };

  const apriModal = (item) => {
    setSelectedSpesa(item);
    setModalVisible(true);
    setImporto(item.importo.toString());
    setCategoria(item.categoria);
    setMetodoPagamento(item.metodoPagamento);
    setAnticipata(item.anticipata);
    setAnticipatoDa(item.anticipatoDa || "");
    setDescrizione(item.descrizione || "");
    setEditId(item.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ListHeaderComponent={
          <View style={{ padding: 16 }}>
            <Text style={styles.title}>Gestione Spese</Text>

            <TextInput
              style={styles.input}
              placeholder="Importo"
              keyboardType="numeric"
              value={importo}
              onChangeText={setImporto}
            />

            <Picker
              selectedValue={categoria}
              onValueChange={(val) => setCategoria(val)}
              style={styles.picker}
            >
              {CATEGORIE.map((c) => (
                <Picker.Item key={c} label={c} value={c} />
              ))}
            </Picker>

            <Picker
              selectedValue={metodoPagamento}
              onValueChange={(val) => setMetodoPagamento(val)}
              style={styles.picker}
            >
              {METODI.map((m) => (
                <Picker.Item key={m} label={m} value={m} />
              ))}
            </Picker>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAnticipata(!anticipata)}
            >
              <Text>{anticipata ? "✅" : "⬜"} Spesa anticipata</Text>
            </TouchableOpacity>

            {anticipata && (
              <Picker
                selectedValue={anticipatoDa}
                onValueChange={(val) => setAnticipatoDa(val)}
                style={styles.picker}
              >
                <Picker.Item label="Seleziona chi ha anticipato" value="" />
                {vvllList.map((v) => (
                  <Picker.Item key={v.id} label={v.name} value={v.name} />
                ))}
              </Picker>
            )}

            <TextInput
              style={styles.input}
              placeholder="Descrizione"
              value={descrizione}
              onChangeText={setDescrizione}
            />

            <TouchableOpacity style={styles.button} onPress={salvaSpesa}>
              <Text style={styles.buttonText}>
                {editId ? "Salva Modifica" : "Aggiungi Spesa"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#007bff" }]}
              onPress={salvaDonazione}
            >
              <Text style={styles.buttonText}>Aggiungi Donazione</Text>
            </TouchableOpacity>

            {editId && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.saldo}>Entrate: {entrate} €</Text>
            <Text style={styles.saldo}>Spese: {totaleSpese} €</Text>
            <Text style={[styles.saldo, { fontWeight: "bold" }]}>
              Saldo: {saldo} €
            </Text>

            <Text style={styles.subtitle}>Lista spese</Text>
          </View>
        }
        data={spese}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.spesaItem}
            onPress={() => apriModal(item)}
          >
            <Text
              style={[
                styles.spesaText,
                { color: item.categoria === "Donazione" ? "green" : "red" },
              ]}
            >
              {item.categoria} - {item.importo} €
            </Text>
            <Text style={styles.spesaSub}>
              {item.metodoPagamento}{" "}
              {item.anticipata && item.anticipatoDa
                ? `| Anticipata da: ${item.anticipatoDa}`
                : ""}
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={{ padding: 16 }}>
            <Text style={styles.subtitle}>📌 Rimborsi da effettuare:</Text>
            {Object.keys(rimborsi).length === 0 ? (
              <Text style={styles.spesaSub}>Nessun rimborso da fare</Text>
            ) : (
              Object.entries(rimborsi).map(([nome, valore]) => (
                <View key={nome} style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
                  <Text style={styles.spesaText}>- {nome}: {valore} €</Text>
                  <TouchableOpacity
                    style={[styles.button, { paddingVertical: 4, paddingHorizontal: 8, marginLeft: 8, backgroundColor: "#007bff" }]}
                    onPress={() => apriRimborsoModal(nome)}
                  >
                    <Text style={styles.buttonText}>Effettua rimborso</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        }
      />

      {/* Modal dettaglio spesa */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSpesa && (
              <>
                <Text style={styles.modalTitle}>Dettaglio Spesa</Text>
                <Text>Categoria: {selectedSpesa.categoria}</Text>
                <Text>Importo: {selectedSpesa.importo} €</Text>
                <Text>Metodo: {selectedSpesa.metodoPagamento}</Text>
                <Text>
                  Anticipata: {selectedSpesa.anticipata ? "Sì" : "No"}
                </Text>
                {selectedSpesa.anticipata && selectedSpesa.anticipatoDa && (
                  <Text>Anticipato da: {selectedSpesa.anticipatoDa}</Text>
                )}
                <Text>
                  Data:{" "}
                  {selectedSpesa.data
                    ? new Date(selectedSpesa.data.seconds * 1000).toLocaleString()
                    : ""}
                </Text>
                <Text>Descrizione: {selectedSpesa.descrizione || "-"}</Text>

                <TouchableOpacity
                  style={[styles.button, { marginTop: 10 }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Chiudi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() =>
                    Alert.alert(
                      "Conferma eliminazione",
                      "Vuoi eliminare questa spesa?",
                      [
                        { text: "Annulla", style: "cancel" },
                        {
                          text: "Elimina",
                          style: "destructive",
                          onPress: () => eliminaSpesa(selectedSpesa.id),
                        },
                      ]
                    )
                  }
                >
                  <Text style={styles.buttonText}>Elimina</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={rimborsoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRimborsoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Effettua rimborso a {vvllDaRimborsare}</Text>
            <Picker
              selectedValue={metodoRimborso}
              onValueChange={(val) => setMetodoRimborso(val)}
              style={styles.picker}
            >
              <Picker.Item label="Contanti" value="Contanti" />
              <Picker.Item label="Carta" value="Carta" />
            </Picker>
            <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={confermaRimborso}>
              <Text style={styles.buttonText}>Conferma rimborso</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelButton, { marginTop: 5 }]} onPress={() => setRimborsoModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  picker: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 10 },
  checkbox: { marginBottom: 10 },
  button: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 5,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  cancelButton: { backgroundColor: "#aaa", padding: 10, borderRadius: 8, alignItems: "center", marginTop: 5 },
  cancelButtonText: { color: "#fff" },
  saldo: { fontSize: 16, marginVertical: 2 },
  subtitle: { fontSize: 18, fontWeight: "bold", marginTop: 20 },
  spesaItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  spesaText: { fontSize: 16 },
  spesaSub: { fontSize: 14, color: "#555" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  deleteButton: { backgroundColor: "#E53935", padding: 10, borderRadius: 8, alignItems: "center", marginTop: 5 },
});
