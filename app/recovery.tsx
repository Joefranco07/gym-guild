import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { FontAwesome5 } from "@expo/vector-icons";

export default function RecoveryScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRecovery = async () => {
    if (!email) return Alert.alert("Ops", "Digite seu e-mail.");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        "E-mail Enviado",
        "Verifique sua caixa de entrada (e spam) para redefinir a senha."
      );
      router.back();
    } catch (error: any) {
      Alert.alert("Erro", "E-mail não encontrado ou inválido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 20 }}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.title}>RECUPERAR</Text>
        <Text style={styles.subtitle}>Não perca seu progresso.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail da conta</Text>
          <TextInput
            style={styles.input}
            placeholder="exemplo@email.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleRecovery}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.sendButtonText}>ENVIAR LINK</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f", justifyContent: "center" },
  content: { padding: 30 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 5,
  },
  subtitle: { color: "#888", marginBottom: 30 },
  form: { gap: 15 },
  label: { color: "#ccc", fontWeight: "bold", marginLeft: 5 },
  input: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  sendButton: {
    backgroundColor: "#FFD700",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  sendButtonText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
