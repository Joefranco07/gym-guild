import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut, // Importamos o signOut para deslogar após criar
} from "firebase/auth";
import { auth } from "../firebaseConfig"; // Mantendo o caminho correto (uma pasta atrás)
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
  const router = useRouter();

  // --- ESTADOS ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Visibilidade da Senha
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Checklist de Segurança
  const [checks, setChecks] = useState({
    length: false,
    upper: false,
    number: false,
    symbol: false,
  });

  // Monitora a senha
  useEffect(() => {
    setChecks({
      length: password.length >= 6,
      upper: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const passwordsMatch = password === confirmPassword && password.length > 0;

  // --- FUNÇÃO DE CADASTRO ---
  const handleSignUp = async () => {
    // 1. Validações Visuais
    if (!checks.length || !checks.upper || !checks.number || !checks.symbol) {
      return Alert.alert(
        "Senha Fraca",
        "Por favor, atenda a todos os requisitos da senha."
      );
    }
    if (!passwordsMatch) {
      return Alert.alert("Erro", "A confirmação de senha não confere.");
    }

    setLoading(true);
    try {
      // 2. Criar conta no Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 3. Enviar E-mail de Confirmação
      await sendEmailVerification(userCredential.user);

      // 4. DESLOGAR IMEDIATAMENTE
      // O Firebase loga automaticamente ao criar. Nós forçamos o logout
      // para obrigar o usuário a validar o e-mail e fazer login novamente.
      await signOut(auth);

      Alert.alert(
        "Conta Criada!",
        "Um link de verificação foi enviado para o seu e-mail. Confirme antes de fazer login."
      );

      // 5. Manda o usuário de volta para a tela de LOGIN (raiz)
      router.replace("/");
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes("email-already-in-use"))
        msg = "Este e-mail já está em uso.";
      Alert.alert("Erro ao criar conta", msg);
    } finally {
      setLoading(false);
    }
  };

  // Componente do Checklist
  const PasswordRequirement = ({
    met,
    text,
  }: {
    met: boolean;
    text: string;
  }) => (
    <View style={styles.reqItem}>
      <Ionicons
        name={met ? "checkmark-circle" : "ellipse-outline"}
        size={18}
        color={met ? "#4CAF50" : "#666"}
      />
      <Text style={[styles.reqText, met && styles.reqTextMet]}>{text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>NOVO RECRUTA</Text>
        <Text style={styles.subtitle}>
          Configure suas credenciais de acesso.
        </Text>

        <View style={styles.form}>
          {/* E-MAIL */}
          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="ex: heroi@email.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* SENHA */}
          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Sua senha secreta"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={24}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          {/* CHECKLIST */}
          <View style={styles.requirementsContainer}>
            <PasswordRequirement
              met={checks.length}
              text="Mínimo 6 caracteres"
            />
            <PasswordRequirement met={checks.upper} text="Letra Maiúscula" />
            <PasswordRequirement
              met={checks.number}
              text="Pelo menos um número"
            />
            <PasswordRequirement met={checks.symbol} text="Símbolo (!@#$)" />
          </View>

          {/* CONFIRMAR SENHA */}
          <Text style={styles.label}>Confirmar Senha</Text>
          <View
            style={[
              styles.inputContainer,
              confirmPassword.length > 0 &&
                (passwordsMatch ? styles.borderGreen : styles.borderRed),
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Repita a senha"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={24}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          {/* FEEDBACK SENHA */}
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={styles.errorText}>As senhas não conferem</Text>
          )}
          {passwordsMatch && (
            <Text style={styles.successText}>Senhas idênticas!</Text>
          )}

          {/* BOTÕES */}
          <TouchableOpacity
            style={styles.mainButton}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.mainButtonText}>
              {loading ? "FORJANDO..." : "REGISTRAR"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Já tenho conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  content: { padding: 30, paddingTop: 60 },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 5,
  },
  subtitle: { color: "#888", textAlign: "center", marginBottom: 30 },
  form: { gap: 12 },

  label: { color: "#ccc", fontWeight: "bold", marginLeft: 5, marginBottom: -5 },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  input: {
    flex: 1,
    padding: 15,
    color: "#fff",
    height: 50,
  },
  eyeIcon: { padding: 10 },

  requirementsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
    marginBottom: 5,
  },
  reqItem: { flexDirection: "row", alignItems: "center", width: "48%" },
  reqText: { color: "#666", fontSize: 12, marginLeft: 5 },
  reqTextMet: { color: "#ccc", fontWeight: "bold" },

  borderGreen: { borderColor: "#4CAF50" },
  borderRed: { borderColor: "#F44336" },
  errorText: { color: "#F44336", fontSize: 12, marginLeft: 5, marginTop: -8 },
  successText: { color: "#4CAF50", fontSize: 12, marginLeft: 5, marginTop: -8 },

  mainButton: {
    backgroundColor: "#FFD700",
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 15,
  },
  mainButtonText: { color: "#000", fontWeight: "900", fontSize: 16 },
  backButton: { padding: 15, alignItems: "center" },
  backButtonText: { color: "#666" },
});
