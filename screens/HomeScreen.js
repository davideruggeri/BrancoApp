import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  ImageBackground,
  Animated,
  Pressable,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

const features = [
  {id: "1",title: "Calendario",icon: <MaterialIcons name="calendar-today" size={32} color="#fff" />,screen: "Calendario",color: "#FF5722",},
  {id: "2",title: "Indirizzario",icon: <FontAwesome5 name="address-book" size={32} color="#fff" />,screen: "Indirizzario",color: "#4CAF50",},
  {id: "3",title: "Quote",icon: <FontAwesome5 name="book-open" size={32} color="#fff" />,screen: "Quote",color: "#2196F3",},
  {id: "4",title: "Presenze",icon: <FontAwesome5 name="user-check" size={32} color="#fff" />,screen: "Presenze",color: "#9C27B0",},
  {id: "5",title: "Spese",icon: <FontAwesome5 name="dollar-sign" size={32} color="#fff" />,screen: "Spese",color: "#FF9800",},
];

const { width } = Dimensions.get("window");
const itemWidth = width - 40; // margine laterale 20px per lato

function FeatureCard({ item, navigation }) {
  const scale = new Animated.Value(1);

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={() => navigation.navigate(item.screen)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{ marginVertical: 10 }}
    >
      <Animated.View
        style={[
          styles.card,
          { width: itemWidth, backgroundColor: item.color, transform: [{ scale }] },
        ]}
      >
        {item.icon}
        <Text style={styles.cardText}>{item.title}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen({ navigation }) {
  return (
    <ImageBackground
      source={require("../assets/sfondo.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <Text style={styles.appTitle}>BrancoApp</Text>
        <FlatList
          data={features}
          renderItem={({ item }) => <FeatureCard item={item} navigation={navigation} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 30,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  list: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 50,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cardText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 20,
  },
});
