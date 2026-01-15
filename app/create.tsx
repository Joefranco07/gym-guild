import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { setDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function CharacterCreation() {
  const router = useRouter();

  // --- ESTADOS ---
  const [name, setName] = useState("");
  const [activityLevel, setActivityLevel] = useState(3);
  const [selectedClass, setSelectedClass] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [hasPet, setHasPet] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("FORJAR HERÓI");

  useEffect(() => {
    let interval: any;
    if (loading) {
      let dotCount = 0;
      interval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        const dots = ".".repeat(dotCount);
        setLoadingText(`FORJANDO${dots}`);
      }, 500);
    } else {
      setLoadingText("FORJAR HERÓI");
    }
    return () => clearInterval(interval);
  }, [loading]);

  // --- DADOS FIXOS ---
  const classOptions = [
    {
      id: "guardian",
      label: "🛡️ Guardião (Saúde Geral)",
      description: "Foco em bem-estar, imunidade e rotina.",
    },
    {
      id: "forca",
      label: "⚔️ Força (Musculação)",
      description: "Foco em carga e hipertrofia.",
    },
    {
      id: "agilidade",
      label: "👟 Agilidade (Corrida)",
      description: "Foco em cardio e resistência.",
    },
    {
      id: "destreza",
      label: "🧘 Destreza (Yoga/Flex)",
      description: "Foco em controle corporal.",
    },
    {
      id: "vigor",
      label: "🔥 Vigor (Crossfit)",
      description: "Alta intensidade e explosão.",
    },
  ];

  const locationOptions = [
    { id: "home", label: "🏠 Casa", icon: "🏠" },
    { id: "gym", label: "🏋️ Ginásio", icon: "🏋️" },
    { id: "street", label: "🌳 Rua/Parque", icon: "🌳" },
  ];

  const toggleLocation = (id: string) => {
    if (locations.includes(id))
      setLocations(locations.filter((item) => item !== id));
    else setLocations([...locations, id]);
  };

  const getLevelColor = (level: number) => {
    if (level <= 3) return "#888"; // Iniciante
    if (level <= 7) return "#FFD700"; // Intermediário
    return "#FF4500"; // Avançado
  };

  const handleCreateHero = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Sessão Expirada", "Faça login novamente.");
      router.replace("/");
      return;
    }

    if (!name || !selectedClass)
      return Alert.alert(
        "Campos Incompletos",
        "Dê um nome e escolha a classe."
      );
    if (locations.length === 0)
      return Alert.alert("Sem Local", "Selecione onde treina.");

    setLoading(true);

    const heroData = {
      userId: user.uid,
      email: user.email,
      name: name,
      level: 1,
      fitnessLevel: activityLevel,
      class: selectedClass,
      unlockedMaps: locations,
      hasCompanion: hasPet,
      stats: { xp: 0, hp: 100, gold: 0, gems: 0, streak: 0 },
      createdAt: new Date(),
    };

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000)
      );

      // CORREÇÃO: Salvando em "heroes" com o ID do usuário
      await Promise.race([
        setDoc(doc(db, "heroes", user.uid), heroData),
        timeoutPromise,
      ]);

      console.log("Salvo com sucesso na coleção 'heroes'!");

      router.replace("/city");
    } catch (error: any) {
      console.log("Erro ao salvar:", error.message);
      Alert.alert("Erro", "Falha ao criar herói. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Gym Guild</Text>
        <Text style={styles.subtitle}>Crie o seu legado</Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Nome do Herói</Text>
        <TextInput
          style={styles.input}
          placeholder="Como quer ser chamado?"
          placeholderTextColor="#555"
          value={name}
          onChangeText={setName}
        />

        <View>
          <Text style={styles.label}>
            Nível de Condicionamento:{" "}
            <Text style={{ color: getLevelColor(activityLevel) }}>
              {activityLevel}
            </Text>
          </Text>
          <Text style={styles.helperText}>
            Escolha o nível que melhor se encaixa com sua rotina de treino atual
            (1 = Iniciante, 10 = Atleta).
          </Text>
        </View>

        <View style={styles.counterContainer}>
          <TouchableOpacity
            onPress={() => setActivityLevel(Math.max(1, activityLevel - 1))}
            style={styles.counterBtn}
          >
            <Text style={styles.btnText}>-</Text>
          </TouchableOpacity>
          <View style={styles.levelBarContainer}>
            <View
              style={[
                styles.levelFill,
                {
                  width: `${activityLevel * 10}%`,
                  backgroundColor: getLevelColor(activityLevel),
                },
              ]}
            />
          </View>
          <TouchableOpacity
            onPress={() => setActivityLevel(Math.min(10, activityLevel + 1))}
            style={styles.counterBtn}
          >
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Onde costumas treinar?</Text>
        <View style={styles.row}>
          {locationOptions.map((opt) => {
            const isSelected = locations.includes(opt.id);
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.smallCard, isSelected && styles.selectedBorder]}
                onPress={() => toggleLocation(opt.id)}
              >
                <Text style={styles.icon}>{opt.icon}</Text>
                <Text
                  style={[styles.smallCardText, isSelected && styles.textGold]}
                >
                  {opt.label}
                </Text>
                {isSelected && <View style={styles.dotIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.switchContainer}>
          <Text style={[styles.label, { flex: 1, marginBottom: 0 }]}>
            Possui Familiar (Pet)?
          </Text>
          <Switch
            trackColor={{ false: "#333", true: "#FFD700" }}
            thumbColor={"#f4f3f4"}
            onValueChange={setHasPet}
            value={hasPet}
          />
        </View>

        <Text style={styles.label}>Afinidade</Text>
        {classOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.card,
              selectedClass === option.id && styles.selectedBorder,
            ]}
            onPress={() => setSelectedClass(option.id)}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.cardTitle,
                  selectedClass === option.id && styles.textGold,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.cardDesc}>{option.description}</Text>
            </View>
            {selectedClass === option.id && (
              <Text style={styles.checkIcon}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.mainButton, loading && styles.disabledButton]}
          onPress={handleCreateHero}
          disabled={loading}
        >
          <Text
            style={[
              styles.mainButtonText,
              { minWidth: 150, textAlign: "center" },
            ]}
          >
            {loadingText}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  content: { padding: 20, paddingTop: 50, paddingBottom: 50 },
  header: { marginBottom: 25, alignItems: "center" },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFD700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: { color: "#666", fontSize: 14 },
  formSection: { gap: 18 },
  label: { color: "#eee", fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  helperText: {
    color: "#888",
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  input: {
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    padding: 15,
    color: "#fff",
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  counterBtn: {
    backgroundColor: "#252525",
    width: 45,
    height: 45,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  btnText: { color: "#FFD700", fontSize: 24, fontWeight: "bold" },
  levelBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: "#252525",
    borderRadius: 6,
    overflow: "hidden",
  },
  levelFill: { height: "100%", borderRadius: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  smallCard: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    position: "relative",
  },
  smallCardText: {
    color: "#888",
    fontSize: 11,
    marginTop: 5,
    fontWeight: "bold",
    textAlign: "center",
  },
  icon: { fontSize: 22 },
  dotIndicator: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFD700",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    color: "#eee",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  cardDesc: { color: "#666", fontSize: 12 },
  checkIcon: { color: "#FFD700", fontSize: 18, fontWeight: "bold" },
  selectedBorder: { borderColor: "#FFD700", backgroundColor: "#222" },
  textGold: { color: "#FFD700" },
  mainButton: {
    backgroundColor: "#FFD700",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: { backgroundColor: "#555" },
  mainButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
