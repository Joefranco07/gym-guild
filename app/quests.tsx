import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
// Firebase
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

// --- CONFIGURAÇÃO DAS MISSÕES ---
const QUESTS_DB = [
  {
    id: "drink_water",
    title: "Hidratação",
    desc: "Beber 2L de água.",
    xp: 20,
    gold: 15,
    icon: "water",
    color: "#29B6F6",
    goldCooldownDays: 3, // Ouro só a cada 3 dias
  },
  {
    id: "sleep_well",
    title: "Sono Reparador",
    desc: "Dormir 7h+ horas.",
    xp: 30,
    gold: 25,
    icon: "bed",
    color: "#7E57C2",
    goldCooldownDays: 3,
  },
  {
    id: "eat_clean",
    title: "Dieta Limpa",
    desc: "Não comer açúcar hoje.",
    xp: 40,
    gold: 30,
    icon: "carrot",
    color: "#66BB6A",
    goldCooldownDays: 4, // Ouro só a cada 4 dias (mais difícil)
  },
  {
    id: "read_book",
    title: "Sabedoria",
    desc: "Ler 10 páginas de um livro.",
    xp: 25,
    gold: 20,
    icon: "book-open-page-variant",
    color: "#FFA726",
    goldCooldownDays: 3,
  },
];

export default function QuestsScreen() {
  const router = useRouter();
  const [heroData, setHeroData] = useState<any>(null);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar Dados
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "heroes"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setHeroData(snapshot.docs[0].data());
        setHeroId(snapshot.docs[0].id);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE TEMPO ---
  const checkAvailability = (questId: string, goldCooldownDays: number) => {
    if (!heroData?.questsLog)
      return { canDo: true, canGold: true, daysLeft: 0 };

    const now = new Date().getTime();

    // 1. Checar se já fez HOJE (XP e Conclusão)
    const lastDone = heroData.questsLog[`${questId}_lastDone`] || 0;
    // Se passou 20h desde a última vez, consideramos "novo dia" para simplificar (ou usar setHours(0,0,0,0))
    // Vamos usar logica de dia corrido:
    const hoursSinceDone = (now - lastDone) / (1000 * 60 * 60);
    const canDo = hoursSinceDone >= 20;

    // 2. Checar se pode pegar OURO (Cooldown longo)
    const lastGold = heroData.questsLog[`${questId}_lastGold`] || 0;
    const daysSinceGold = (now - lastGold) / (1000 * 60 * 60 * 24);
    const canGold = daysSinceGold >= goldCooldownDays;

    // Dias restantes para o ouro (para exibir na tela)
    const daysLeft = Math.ceil(goldCooldownDays - daysSinceGold);

    return { canDo, canGold, daysLeft: daysLeft > 0 ? daysLeft : 0 };
  };

  // --- COMPLETAR MISSÃO ---
  const handleComplete = async (quest: any) => {
    const status = checkAvailability(quest.id, quest.goldCooldownDays);

    if (!status.canDo) {
      return Alert.alert(
        "Volte Amanhã",
        "Você já completou esta missão hoje. Descanse!"
      );
    }

    try {
      const heroRef = doc(db, "heroes", heroId!);
      const now = new Date().getTime();

      let xpGain = quest.xp;
      let goldGain = 0;
      let msg = `+${xpGain} XP`;

      // Define se ganha ouro ou não
      const updateData: any = {
        [`questsLog.${quest.id}_lastDone`]: now, // Marca que fez hoje
      };

      if (status.canGold) {
        goldGain = quest.gold;
        msg += ` | +${goldGain} Ouro 💰`;
        updateData[`questsLog.${quest.id}_lastGold`] = now; // Reseta o timer do ouro
      } else {
        msg += `\n(Ouro recarrega em ${status.daysLeft} dias)`;
      }

      // Level Up Logic (Simplificada aqui, ideal é igual Dungeon)
      const currentLevel = heroData.level;
      let currentXp = (heroData.stats.xp || 0) + xpGain;
      let newLevel = currentLevel;

      while (currentXp >= newLevel * 100) {
        currentXp -= newLevel * 100;
        newLevel++;
      }

      // Updates Stats
      updateData["stats.xp"] = currentXp;
      updateData["level"] = newLevel;
      if (goldGain > 0) updateData["stats.gold"] = increment(goldGain);

      await updateDoc(heroRef, updateData);

      Alert.alert(
        newLevel > currentLevel ? "LEVEL UP! 🎉" : "Missão Cumprida!",
        msg
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha ao completar missão.");
    }
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFD700" style={{ marginTop: 50 }} />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>QUADRO DE HÁBITOS</Text>
        <Text style={styles.subtitle}>A constância gera poder.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {QUESTS_DB.map((quest) => {
          const status = checkAvailability(quest.id, quest.goldCooldownDays);

          return (
            <TouchableOpacity
              key={quest.id}
              style={[styles.card, !status.canDo && styles.cardDone]}
              onPress={() => handleComplete(quest)}
              disabled={!status.canDo}
            >
              {/* Ícone */}
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: status.canDo ? quest.color + "20" : "#333",
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={quest.icon as any}
                  size={30}
                  color={status.canDo ? quest.color : "#666"}
                />
              </View>

              {/* Infos */}
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.questTitle,
                    !status.canDo && { color: "#666" },
                  ]}
                >
                  {quest.title}
                </Text>
                <Text style={styles.questDesc}>{quest.desc}</Text>

                {/* Recompensas */}
                <View style={styles.rewardsRow}>
                  {/* XP Sempre aparece */}
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>+{quest.xp} XP</Text>
                  </View>

                  {/* Ouro: Condicional */}
                  {status.canGold ? (
                    <View
                      style={[styles.badge, { backgroundColor: "#FFD70020" }]}
                    >
                      <Text style={[styles.badgeText, { color: "#FFD700" }]}>
                        +{quest.gold} Ouro
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: "#333" }]}>
                      <FontAwesome5
                        name="clock"
                        size={10}
                        color="#888"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.badgeText, { color: "#888" }]}>
                        Ouro: {status.daysLeft}d
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Status Check */}
              {!status.canDo && (
                <View style={styles.checkIcon}>
                  <FontAwesome5 name="check" size={16} color="#4CAF50" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>VOLTAR À CIDADE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    color: "#FFD700",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subtitle: { color: "#888", marginTop: 5 },

  list: { padding: 20 },

  card: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    gap: 15,
  },
  cardDone: { opacity: 0.6, borderColor: "#4CAF50" },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },

  questTitle: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  questDesc: { color: "#aaa", fontSize: 12, marginBottom: 8 },

  rewardsRow: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    backgroundColor: "#29B6F620",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  badgeText: { color: "#29B6F6", fontSize: 10, fontWeight: "bold" },

  checkIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4CAF5020",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },

  backButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    padding: 15,
  },
  backText: { color: "#666", fontWeight: "bold" },
});
