import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import delle schermate
import HomeScreen from "./screens/HomeScreen";
import CalendarScreen from "./screens/CalendarScreen";
import IndirizzarioScreen from "./screens/IndirizzarioScreen";
import QuoteScreen from "./screens/QuoteScreen";
import PersonDetailScreen from "./screens/PersonDetailScreen";
import PresenzeScreen from "./screens/PresenzeScreen";
import SpeseScreen from "./screens/SpeseScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Calendario" component={CalendarScreen} />
        <Stack.Screen name="Indirizzario" component={IndirizzarioScreen} />
        <Stack.Screen name="Quote" component={QuoteScreen} />
        <Stack.Screen
          name="PersonDetail"
          component={PersonDetailScreen}
          options={{ title: "Dettaglio Persona" }}
        />
        <Stack.Screen name="Presenze" component={PresenzeScreen} />
        <Stack.Screen name="Spese" component={SpeseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
