import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  Button,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import moment from "moment";
import { Picker } from "@react-native-picker/picker";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CalendarScreen({ navigation }) {
  const [events, setEvents] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isStartPickerVisible, setStartPickerVisible] = useState(false);
  const [isEndPickerVisible, setEndPickerVisible] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(SCREEN_HEIGHT * 0.8);
  const [editingEventId, setEditingEventId] = useState(null);

  const categoryColors = {
    Uscita: "blue",
    Riunione: "green",
    Caccia: "orange",
    Staff: "purple",
    Coca: "red",
    Zona: "gray",
    VDBE: "pink",
    VDBI: "cyan",
    FPD: "brown",
  };

  const fetchEvents = useCallback(async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      const eventsData = {};

      querySnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.start || !data.end) return;

        const start = moment(data.start);
        const end = moment(data.end);
        let day = start.clone();

        while (day.isSameOrBefore(end, "day")) {
          const dayStr = day.format("YYYY-MM-DD");
          if (!eventsData[dayStr]) eventsData[dayStr] = [];
          eventsData[dayStr].push({
            id: docSnap.id,
            title: data.title || "Senza titolo",
            start: start.format("HH:mm"),
            end: end.format("HH:mm"),
            category: data.category || "Zona",
          });
          day.add(1, "day");
        }
      });

      Object.keys(eventsData).forEach((day) => {
        eventsData[day].sort((a, b) => a.start.localeCompare(b.start));
      });

      setEvents(eventsData);
    } catch (error) {
      console.error("Errore caricamento eventi:", error);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addOrUpdateEvent = async (eventId = null) => {
    if (!newTitle || !newCategory) return;

    if (endDate < startDate) {
      alert("Errore: la data di fine deve essere successiva alla data di inizio.");
      return;
    }

    try {
      if (eventId) {
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, {
          title: newTitle,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          category: newCategory,
        });
      } else {
        await addDoc(collection(db, "events"), {
          title: newTitle,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          category: newCategory,
        });
      }

      // reset modal
      setNewTitle("");
      setNewCategory("");
      setStartDate(new Date());
      setEndDate(new Date());
      setEditingEventId(null);
      fetchEvents();
    } catch (error) {
      console.error("Errore aggiunta/modifica evento:", error);
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, "events", eventId));
      setEditingEventId(null);
      fetchEvents();
    } catch (error) {
      console.error("Errore eliminazione evento:", error);
    }
  };

  const markedDates = {};
  Object.keys(events).forEach((day) => {
    markedDates[day] = {
      dots: events[day].map((e) => ({ key: e.id, color: categoryColors[e.category] || "gray" })),
    };
  });

  const calculateCalendarHeight = (dateString) => {
    const firstDayOfMonth = moment(dateString).startOf("month").day();
    const daysInMonth = moment(dateString).daysInMonth();
    const weeksInMonth = Math.ceil((daysInMonth + firstDayOfMonth) / 7);
    const height = weeksInMonth * ((SCREEN_HEIGHT * 0.8) / 6);
    setCalendarHeight(height);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Button title="Torna alla Home" onPress={() => navigation.goBack()} />

        <Calendar
          style={[styles.calendar, { height: calendarHeight }]}
          markingType="multi-dot"
          markedDates={markedDates}
          firstDay={1}
          onDayPress={(day) => {
            setSelectedDay(day.dateString);
            setModalVisible(true);
            setEditingEventId(null);
            setNewTitle("");
            setNewCategory("");
            const selectedDate = moment(day.dateString, "YYYY-MM-DD").toDate();
            setStartDate(selectedDate);
            setEndDate(selectedDate);
            calculateCalendarHeight(day.dateString);
          }}
        />

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Eventi del {selectedDay}</Text>

              <FlatList
                data={events[selectedDay] || []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.eventItem}
                    onPress={() => {
                      setNewTitle(item.title);
                      setNewCategory(item.category);
                      setStartDate(moment(`${selectedDay} ${item.start}`, "YYYY-MM-DD HH:mm").toDate());
                      setEndDate(moment(`${selectedDay} ${item.end}`, "YYYY-MM-DD HH:mm").toDate());
                      setEditingEventId(item.id);
                    }}
                  >
                    <Text style={{ color: categoryColors[item.category] || "gray" }}>
                      {item.start} - {item.end} {item.title} ({item.category})
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text>Nessun evento</Text>}
              />

              <TextInput
                style={styles.input}
                placeholder="Titolo evento"
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Picker
                selectedValue={newCategory}
                onValueChange={(itemValue) => setNewCategory(itemValue)}
                style={{ marginVertical: 5 }}
              >
                <Picker.Item label="Seleziona categoria..." value="" />
                <Picker.Item label="Uscita" value="Uscita" />
                <Picker.Item label="Riunione" value="Riunione" />
                <Picker.Item label="Caccia" value="Caccia" />
                <Picker.Item label="Staff" value="Staff" />
                <Picker.Item label="Coca" value="Coca" />
                <Picker.Item label="Zona" value="Zona" />
                <Picker.Item label="VDBE" value="VDBE" />
                <Picker.Item label="VDBI" value="VDBI" />
                <Picker.Item label="FPD" value="FPD" />
              </Picker>

              <Button
                title={`Inizio: ${moment(startDate).format("DD/MM/YYYY HH:mm")}`}
                onPress={() => setStartPickerVisible(true)}
              />
              <DateTimePickerModal
                isVisible={isStartPickerVisible}
                mode="datetime"
                date={startDate}
                onConfirm={(date) => {
                  setStartDate(date);
                  if (endDate < date) setEndDate(date);
                  setStartPickerVisible(false);
                }}
                onCancel={() => setStartPickerVisible(false)}
              />

              <Button
                title={`Fine: ${moment(endDate).format("DD/MM/YYYY HH:mm")}`}
                onPress={() => setEndPickerVisible(true)}
              />
              <DateTimePickerModal
                isVisible={isEndPickerVisible}
                mode="datetime"
                date={endDate}
                minimumDate={startDate}
                onConfirm={(date) => {
                  setEndDate(date);
                  setEndPickerVisible(false);
                }}
                onCancel={() => setEndPickerVisible(false)}
              />

              <Button
                title={editingEventId ? "Salva modifiche" : "Aggiungi evento"}
                onPress={() => addOrUpdateEvent(editingEventId)}
              />

              {editingEventId && (
                <Button
                  title="Elimina evento"
                  color="red"
                  onPress={() => {
                    deleteEvent(editingEventId);
                    setModalVisible(false);
                  }}
                />
              )}

              <Button
                title="Chiudi"
                onPress={() => {
                  setModalVisible(false);
                  setEditingEventId(null);
                  setNewTitle("");
                  setNewCategory("");
                  setStartDate(new Date());
                  setEndDate(new Date());
                }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1 },
  calendar: { width: "100%" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginVertical: 5,
    borderRadius: 5,
  },
  eventItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
  },
});
