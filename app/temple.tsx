import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
// Firebase
import {
  doc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

const MEDITATION_OPTIONS = [
  {
    id: "focus",
    title: "Foco Rápido",
    duration: 300,
    label: "5 min",
    xp: 10,
    gems: 1,
    color: "#4DD0E1",
    icon: "feather",
  },
  {
    id: "balance",
    title: "Equilíbrio",
    duration: 900,
    label: "15 min",
    xp: 30,
    gems: 3,
    color: "#29B6F6",
    icon: "yin-yang",
  },
  {
    id: "astral",
    title: "Projeção Astral",
    duration: 1800,
    label: "30 min",
    xp: 70,
    gems: 7,
    color: "#7E57C2",
    icon: "eye",
  },
  {
    id: "test",
    title: "Teste Dev",
    duration: 10,
    label: "10 seg",
    xp: 1,
    gems: 0,
    color: "#666",
    icon: "bug",
  },
];

export default function TempleScreen() {
  const router = useRouter();
  const [heroId, setHeroId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(
          collection(db, "heroes"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) setHeroId(querySnapshot.docs[0].id);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(timerRef.current);
      setIsActive(false);
      handleComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const startMeditation = (option: any) => {
    setSelectedOption(option);
    setTimeLeft(option.duration);
    setIsActive(true);
  };

  const cancelMeditation = () => {
    Alert.alert("Quebrar Foco?", "Se sair agora, não ganhará recompensas.", [
      { text: "Continuar", style: "cancel" },
      {
        text: "Desistir",
        style: "destructive",
        onPress: () => {
          setIsActive(false);
          setTimeLeft(0);
          setSelectedOption(null);
        },
      },
    ]);
  };

  const handleComplete = async () => {
    if (!heroId || !selectedOption) return;

    try {
      const heroRef = doc(db, "heroes", heroId);

      // Busca dados atuais para calcular level up
      const user = auth.currentUser;
      const q = query(
        collection(db, "heroes"),
        where("userId", "==", user?.uid)
      );
      const snap = await getDocs(q);
      const hData = snap.docs[0].data();

      let currentLevel = hData.level;
      let currentXp = (hData.stats.xp || 0) + selectedOption.xp;
      let leveledUp = false;

      // Loop Level Up
      while (currentXp >= currentLevel * 100) {
        currentXp -= currentLevel * 100;
        currentLevel++;
        leveledUp = true;
      }

      await updateDoc(heroRef, {
        "stats.xp": currentXp,
        "stats.gems": increment(selectedOption.gems),
        level: currentLevel,
      });

      Alert.alert(
        "Mente Blindada 🧘‍♂️",
        `Você completou o ritual!\n+${selectedOption.xp} XP | +${
          selectedOption.gems
        } Gemas${leveledUp ? `\n\nLEVEL UP! Nível ${currentLevel}` : ""}`,
        [{ text: "Ótimo", onPress: () => setSelectedOption(null) }]
      );
    } catch (error) {
      Alert.alert("Erro", "Falha ao sintonizar.");
    }
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#29B6F6" style={{ marginTop: 50 }} />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {isActive && selectedOption ? (
        <View
          style={[
            styles.timerContainer,
            { backgroundColor: selectedOption.color + "10" },
          ]}
        >
          <MaterialCommunityIcons
            name="meditation"
            size={80}
            color={selectedOption.color}
            style={{ marginBottom: 30 }}
          />
          <Text style={[styles.timerText, { color: selectedOption.color }]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={styles.timerLabel}>Mantenha o foco...</Text>
          <TouchableOpacity style={styles.giveUpBtn} onPress={cancelMeditation}>
            <Text style={styles.giveUpText}>DESISTIR</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="spa" size={50} color="#29B6F6" />
            <Text style={styles.title}>TEMPLO DA MENTE</Text>
            <Text style={styles.subtitle}>
              O corpo treina na masmorra.{"\n"}A mente treina na quietude.
            </Text>
          </View>

          <View style={styles.grid}>
            {MEDITATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.card, { borderColor: opt.color }]}
                onPress={() => startMeditation(opt)}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: opt.color + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={opt.icon as any}
                    size={32}
                    color={opt.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: opt.color }]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.cardReward}>
                    +{opt.xp} XP | +{opt.gems} Gemas
                  </Text>
                </View>
                <Text style={styles.durationBadge}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>VOLTAR À CIDADE</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#051015" },
  content: { flex: 1, padding: 20, paddingTop: 60 },
  header: { alignItems: "center", marginBottom: 40 },
  title: {
    color: "#29B6F6",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 10,
    letterSpacing: 2,
  },
  subtitle: {
    color: "#888",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 20,
  },
  grid: { gap: 15 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#102025",
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    gap: 15,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  cardReward: { color: "#aaa", fontSize: 12 },
  durationBadge: {
    color: "#fff",
    fontWeight: "bold",
    backgroundColor: "#203035",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  backBtn: { marginTop: "auto", padding: 15, alignItems: "center" },
  backText: { color: "#666", fontWeight: "bold" },
  timerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  timerText: { fontSize: 80, fontWeight: "bold", fontFamily: "monospace" },
  timerLabel: {
    color: "#fff",
    fontSize: 16,
    marginTop: 10,
    marginBottom: 50,
    fontStyle: "italic",
  },
  giveUpBtn: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderWidth: 1,
    borderColor: "#FF4444",
    borderRadius: 30,
  },
  giveUpText: { color: "#FF4444", fontWeight: "bold", letterSpacing: 1 },
});
