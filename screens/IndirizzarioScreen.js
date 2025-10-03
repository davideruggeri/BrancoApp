// screens/IndirizzarioScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function IndirizzarioScreen() {
  const [contatti, setContatti] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoriaFiltro, setCategoriaFiltro] = useState("Lupetto");
  const [annoFiltro, setAnnoFiltro] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [contattoSelezionato, setContattoSelezionato] = useState(null);

  const [formData, setFormData] = useState({
    categoria: "Lupetto",
    nome: "",
    cognome: "",
    annoAttivita: "",
    compleanno: "",
    residenza: "",
    mamma: "",
    papa: "",
    cellulare: "",
    email: "",
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    caricaContatti();
  }, []);

  const caricaContatti = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, "indirizzario"));
      const dati = [];
      querySnapshot.forEach((docSnap) => {
        dati.push({ id: docSnap.id, ...docSnap.data() });
      });
      setContatti(dati);
    } catch (e) {
      console.error("Errore caricamento:", e);
      Alert.alert("Errore", "Impossibile caricare i contatti");
    } finally {
      setLoading(false);
    }
  };

const salvaContatto = async () => {
  try {
    // Normalizza email: sempre array nel DB
    const emailNormalizzata = (formData.email || "")
      .toString()
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const datiDaSalvare = {
      ...formData,
      email: emailNormalizzata,
    };

    if (contattoSelezionato) {
      // Modifica contatto esistente
      await updateDoc(doc(db, "indirizzario", contattoSelezionato.id), datiDaSalvare);
    } else {
      // Nuovo contatto
      await addDoc(collection(db, "indirizzario"), datiDaSalvare);
    }

    // Ricarica lista e reset form
    await caricaContatti();
    setModalVisible(false);
    setContattoSelezionato(null);
    resetForm();
  } catch (e) {
    console.error("Errore salvataggio contatto:", e);
    Alert.alert("Errore", "Impossibile salvare il contatto");
  }
};


  const eliminaContatto = async (id) => {
    try {
      await deleteDoc(doc(db, "indirizzario", id));
      caricaContatti();
      setModalVisible(false);
      setContattoSelezionato(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Errore", "Impossibile eliminare il contatto");
    }
  };

  const resetForm = () => {
    setFormData({
      categoria: "Lupetto",
      nome: "",
      cognome: "",
      annoAttivita: "",
      compleanno: "",
      residenza: "",
      mamma: "",
      papa: "",
      cellulare: "",
      email: "",
    });
    setSelectedDate(null);
  };

  // DatePicker
  const apriCalendario = () => setShowDatePicker(true);

  const onChangeDate = (event, date) => {
    setShowDatePicker(false);
    if (date) {
      const formattedDate = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
      setFormData({ ...formData, compleanno: formattedDate });
      setSelectedDate(date);
    }
  };

  // Filtri e sezioni
  const contattiFiltrati = contatti
    .filter((c) => c.categoria === categoriaFiltro)
    .filter((c) => (categoriaFiltro === "Lupetto" && annoFiltro ? c.annoAttivita === annoFiltro : true))
    .sort((a, b) => {
      if (categoriaFiltro === "Lupetto") {
        return (Number(b.annoAttivita) || 0) - (Number(a.annoAttivita) || 0);
      }
      return (a.nome || "").localeCompare(b.nome || "");
    });

  const sezioni = categoriaFiltro === "Lupetto"
    ? Object.values(
        contattiFiltrati.reduce((acc, c) => {
          const anno = c.annoAttivita || "Senza anno";
          if (!acc[anno]) acc[anno] = { title: anno, data: [] };
          acc[anno].data.push(c);
          return acc;
        }, {})
      ).sort((a, b) => (b.title === "Senza anno" ? -1 : Number(b.title) - Number(a.title)))
    : [{ title: categoriaFiltro, data: contattiFiltrati }];

  const sezioniConDati = sezioni.filter((s) => s.data && s.data.length > 0);

  return (
    <View style={styles.container}>
      {/* FILTRI */}
      <View style={styles.filtro}>
        <Text style={styles.filtroLabel}>Categoria:</Text>
        <Picker
          selectedValue={categoriaFiltro}
          style={styles.picker}
          onValueChange={(val) => setCategoriaFiltro(val)}
        >
          <Picker.Item label="Lupetti" value="Lupetto" />
          <Picker.Item label="VVLL" value="VVLL" />
        </Picker>

        {categoriaFiltro === "Lupetto" && (
          <>
            <Text style={styles.filtroLabel}>Anno attività:</Text>
            <Picker
              selectedValue={annoFiltro}
              style={styles.picker}
              onValueChange={(val) => setAnnoFiltro(val)}
            >
              <Picker.Item label="Tutti" value={null} />
              {[...new Set(contatti.map((c) => c.annoAttivita).filter(Boolean))]
                .sort((a, b) => b - a)
                .map((anno) => (
                  <Picker.Item key={anno} label={anno.toString()} value={anno} />
                ))}
            </Picker>
          </>
        )}
      </View>

      {/* LISTA */}
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <SectionList
          sections={sezioniConDati}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const emailArray = Array.isArray(item.email) ? item.email : item.email ? [item.email] : [];
            return (
              <TouchableOpacity
                style={styles.card}
                onLongPress={() => {
                  setContattoSelezionato(item);
                  setFormData(item);
                  if (item.compleanno) {
                    const [g, m, a] = item.compleanno.split("/").map(Number);
                    setSelectedDate(new Date(a, m - 1, g));
                  }
                  setModalVisible(true);
                }}
              >
                <Text style={styles.nome}>{item.nome || "-"} {item.cognome || "-"}</Text>
                <Text>Compleanno: {item.compleanno || "-"}</Text>
                {item.categoria === "Lupetto" && (
                  <>
                    <Text>Anno attività: {item.annoAttivita || "-"}</Text>
                    <Text>Mamma: {item.mamma || "-"}</Text>
                    <Text>Papà: {item.papa || "-"}</Text>
                  </>
                )}
                <Text>Cellulare: {item.cellulare || "-"}</Text>
                <Text>Email: {emailArray.join(", ") || "-"}</Text>
              </TouchableOpacity>
            );
          }}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sezione}>{title}</Text>
          )}
        />
      )}

      {/* AGGIUNGI */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setContattoSelezionato(null);
          setModalVisible(true);
        }}
      >
        <Text style={styles.addButtonText}>＋ Aggiungi</Text>
      </TouchableOpacity>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {contattoSelezionato ? "Modifica Contatto" : "Nuovo Contatto"}
          </Text>

          <Text>Categoria</Text>
          <Picker
            selectedValue={formData.categoria}
            style={styles.picker}
            onValueChange={(val) => setFormData({ ...formData, categoria: val })}
          >
            <Picker.Item label="Lupetto" value="Lupetto" />
            <Picker.Item label="VVLL" value="VVLL" />
          </Picker>

          <Text>Nome</Text>
          <TextInput
            style={styles.input}
            value={formData.nome}
            onChangeText={(t) => setFormData({ ...formData, nome: t })}
          />

          <Text>Cognome</Text>
          <TextInput
            style={styles.input}
            value={formData.cognome}
            onChangeText={(t) => setFormData({ ...formData, cognome: t })}
          />

          {formData.categoria === "Lupetto" && (
            <>
              <Text>Anno attività</Text>
              <TextInput
                style={styles.input}
                value={formData.annoAttivita}
                onChangeText={(t) => setFormData({ ...formData, annoAttivita: t })}
                keyboardType="number-pad"
              />
            </>
          )}

          <Text>Compleanno</Text>
          <TouchableOpacity onPress={apriCalendario} style={styles.datePicker}>
            <Text>{formData.compleanno || "Seleziona data"}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeDate}
            />
          )}

          <Text>Residenza</Text>
          <TextInput
            style={styles.input}
            value={formData.residenza}
            onChangeText={(t) => setFormData({ ...formData, residenza: t })}
          />

          {formData.categoria === "Lupetto" && (
            <>
              <Text>Mamma</Text>
              <TextInput
                style={styles.input}
                value={formData.mamma}
                onChangeText={(t) => setFormData({ ...formData, mamma: t })}
              />
              <Text>Papà</Text>
              <TextInput
                style={styles.input}
                value={formData.papa}
                onChangeText={(t) => setFormData({ ...formData, papa: t })}
              />
            </>
          )}

          <Text>Cellulare</Text>
          <TextInput
            style={styles.input}
            value={formData.cellulare}
            onChangeText={(t) => setFormData({ ...formData, cellulare: t })}
            keyboardType="number-pad"
          />

          <Text>Email (separate da , )</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(t) => setFormData({ ...formData, email: t })}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={salvaContatto}>
              <Text style={styles.buttonText}>Salva</Text>
            </TouchableOpacity>

            {contattoSelezionato && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  Alert.alert(
                    "Conferma eliminazione",
                    "Sei sicuro di voler eliminare questo contatto?",
                    [
                      { text: "Annulla", style: "cancel" },
                      { text: "Elimina", style: "destructive", onPress: () => eliminaContatto(contattoSelezionato.id) },
                    ]
                  )
                }
              >
                <Text style={styles.buttonText}>Elimina</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setContattoSelezionato(null);
                resetForm();
              }}
            >
              <Text style={styles.buttonText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  filtro: { marginBottom: 10 },
  filtroLabel: { fontWeight: "bold" },
  picker: { height: 50, width: "100%" },
  sezione: { fontSize: 18, fontWeight: "bold", backgroundColor: "#eee", padding: 5 },
  card: { backgroundColor: "#fff", padding: 10, marginVertical: 5, borderRadius: 5, elevation: 1 },
  nome: { fontWeight: "bold", fontSize: 16 },
  addButton: { backgroundColor: "#28a745", padding: 10, alignItems: "center", marginVertical: 10, borderRadius: 5 },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalContent: { padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, marginBottom: 10 },
  datePicker: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 10, marginBottom: 10 },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap" },
  saveButton: { backgroundColor: "#28a745", padding: 10, borderRadius: 5, marginBottom: 10 },
  deleteButton: { backgroundColor: "#dc3545", padding: 10, borderRadius: 5, marginBottom: 10 },
  cancelButton: { backgroundColor: "#6c757d", padding: 10, borderRadius: 5, marginBottom: 10 },
  buttonText: { color: "#fff", fontWeight: "bold" },
});
