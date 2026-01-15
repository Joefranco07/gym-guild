import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert("Ops", "Preencha e-mail e senha.");

    setLoading(true);

    try {
      // 1. Tentar fazer login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 2. Verificar se o e-mail foi confirmado
      if (!user.emailVerified) {
        await signOut(auth);
        Alert.alert(
          "E-mail não verificado",
          "Verifique sua caixa de entrada e confirme seu e-mail antes de jogar."
        );
        setLoading(false);
        return;
      }

      // 3. Verificar se o Herói existe na coleção 'heroes'
      // CORREÇÃO: Usando "heroes" e verificando o campo "name"
      const heroDocRef = doc(db, "heroes", user.uid);
      const heroDoc = await getDoc(heroDocRef);

      if (heroDoc.exists() && heroDoc.data()?.name) {
        console.log("Herói encontrado:", heroDoc.data()?.name);
        router.replace("/city"); // ou "/cityhub" se for esse o nome da rota
      } else {
        console.log("Conta existe, mas sem herói. Indo criar...");
        router.replace("/create");
      }
    } catch (error: any) {
      console.log(error);
      let msg = "E-mail ou senha incorretos.";
      if (error.code === "auth/user-not-found") msg = "Usuário não encontrado.";
      if (error.code === "auth/wrong-password") msg = "Senha incorreta.";

      Alert.alert("Erro ao entrar", msg);
    } finally {
      if (loading) setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.content}>
        <Text style={styles.title}>GYM GUILD</Text>
        <Text style={styles.subtitle}>Bem-vindo de volta, Caçador.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu e-mail"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Sua senha"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Verificando..." : "ENTRAR"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/recovery")}
            style={{ alignSelf: "flex-end" }}
          >
            <Text style={{ color: "#888", fontSize: 12 }}>
              Esqueceu a senha?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push("/register")}
          >
            <Text style={styles.signupButtonText}>
              Ainda não tem conta?{" "}
              <Text style={{ fontWeight: "bold", color: "#FFD700" }}>
                Criar agora
              </Text>
            </Text>
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
    fontSize: 42,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 5,
    letterSpacing: 2,
  },
  subtitle: { color: "#888", textAlign: "center", marginBottom: 40 },
  form: { gap: 15 },
  label: { color: "#ccc", fontWeight: "bold", marginLeft: 5 },
  input: {
    backgroundColor: "#1E1E1E",
    padding: 18,
    borderRadius: 10,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
  },
  loginButton: {
    backgroundColor: "#FFD700",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: { color: "#000", fontWeight: "900", fontSize: 16 },
  signupButton: { padding: 15, alignItems: "center", marginTop: 10 },
  signupButtonText: { color: "#888" },
});
