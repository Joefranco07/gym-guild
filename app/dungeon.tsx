import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  Vibration,
  TextInput,
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
  getDocs,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
// Itens e Dados
import { ITEMS_DATABASE } from "../constants/items";
import { GYM_DATABASE, RPG_TEMPLATES } from "../constants/gym_database";

// --- CONFIGURAÇÃO DE PESOS ---
const CLASS_WEIGHTS: any = {
  forca: { push: 35, pull: 35, squat: 20, core: 5, cardio: 5 },
  agilidade: { push: 10, pull: 10, squat: 30, core: 10, cardio: 40 },
  destreza: { push: 15, pull: 15, squat: 15, core: 40, cardio: 15 },
  vigor: { push: 25, pull: 25, squat: 25, core: 10, cardio: 15 },
  guardian: { push: 20, pull: 20, squat: 20, core: 20, cardio: 20 },
  default: { push: 20, pull: 20, squat: 20, core: 20, cardio: 20 },
};

// --- LORE GENÉRICA ---
const LORE_DATABASE: any = {
  squat: [
    {
      title: "Colheita de Ervas",
      lore: "Agache rente ao chão para colher raízes.",
      action: "Agachamento",
      meta: "3x15",
      locations: ["home", "gym", "park"],
    },
    {
      title: "Salto na Ravina",
      lore: "O chão está cedendo! Pule!",
      action: "Agachamento Salto",
      meta: "3x12",
      locations: ["home", "park"],
    },
    {
      title: "Prensa Hidráulica",
      lore: "Ative o mecanismo com os pés.",
      action: "Leg Press",
      meta: "3x12",
      locations: ["gym"],
    },
  ],
  push: [
    {
      title: "Empurrar Carroça",
      lore: "A roda atolou na lama.",
      action: "Flexão",
      meta: "3x Falha",
      locations: ["home", "park"],
    },
    {
      title: "Arrombar Portão",
      lore: "Use força bruta!",
      action: "Supino",
      meta: "4x10",
      locations: ["gym"],
    },
    {
      title: "Mergulho no Poço",
      lore: "Saia do buraco usando os braços.",
      action: "Tríceps",
      meta: "3x10",
      locations: ["home", "gym", "park"],
    },
  ],
  pull: [
    {
      title: "Içar Mantimentos",
      lore: "Puxe as caixas para cima.",
      action: "Puxada Alta",
      meta: "3x10",
      locations: ["gym", "park"],
    },
    {
      title: "Escalar Muralha",
      lore: "Infiltre-se no castelo.",
      action: "Barra Fixa",
      meta: "3x Falha",
      locations: ["gym", "park"],
    },
    {
      title: "Arrastar a Caça",
      lore: "Leve o Javali ao acampamento.",
      action: "Remada",
      meta: "3x12",
      locations: ["gym", "home"],
    },
  ],
  core: [
    {
      title: "Escudo Humano",
      lore: "Mantenha a postura firme.",
      action: "Prancha",
      meta: "3x 1min",
      locations: ["home", "gym", "park"],
    },
    {
      title: "Resistir à Magia",
      lore: "Contraia o núcleo.",
      action: "Abdominal",
      meta: "3x20",
      locations: ["home", "gym", "park"],
    },
  ],
  cardio: [
    {
      title: "Mensageiro Real",
      lore: "Entregue a carta rápido.",
      action: "Corrida",
      meta: "20 min",
      locations: ["gym", "park"],
    },
    {
      title: "Fuga de Enxame",
      lore: "Vespas gigantes!",
      action: "Bike / Tiro",
      meta: "15 min",
      locations: ["gym", "park"],
    },
    {
      title: "Ritual Xamânico",
      lore: "Pule para invocar a chuva.",
      action: "Polichinelos",
      meta: "3x 50",
      locations: ["home", "gym", "park"],
    },
  ],
};

export default function DungeonScreen() {
  const router = useRouter();

  // Estados Principais
  const [heroData, setHeroData] = useState<any>(null);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados do Treino
  const [dailyMissions, setDailyMissions] = useState<any[]>([]);
  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [isTrainerMode, setIsTrainerMode] = useState(false);

  // Contador de Rerolls
  const [rerollCount, setRerollCount] = useState(0);
  const MAX_REROLLS = 3;

  // Boss
  const [bossEvent, setBossEvent] = useState<any>(null);
  const [bossDecision, setBossDecision] = useState<"fight" | "flee" | null>(
    null
  );

  // Modais de Configuração
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [splitModalVisible, setSplitModalVisible] = useState(false);

  // Modais de Edição
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [manualBuilderVisible, setManualBuilderVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Modal de Batalha
  const [battleModalVisible, setBattleModalVisible] = useState(false);
  const [activeMission, setActiveMission] = useState<any>(null);

  // Timer e Sets
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);
  const [currentSetsDone, setCurrentSetsDone] = useState(0);

  // Carregar Dados
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

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          setHeroData(data);
          setHeroId(docSnap.id);

          const today = new Date().toDateString();

          if (data.currentWorkout && data.currentWorkout.date === today) {
            setDailyMissions(data.currentWorkout.missions);
            setCompletedMissions(data.currentWorkout.completed || []);
            setBossEvent(data.currentWorkout.boss || null);
            setIsFinished(data.currentWorkout.isFinished || false);
            setIsTrainerMode(data.currentWorkout.isTrainer || false);
            setRerollCount(data.currentWorkout.rerollCount || 0);

            if (data.currentWorkout.bossDecision)
              setBossDecision(data.currentWorkout.bossDecision);
            setLoading(false);
          } else {
            if (data.workoutRoutine) setSplitModalVisible(true);
            else setLocationModalVisible(true);
            setLoading(false);
          }
        }
      } catch (err) {
        console.log(err);
        setLoading(false);
      }
    };
    init();
  }, []);

  // --- LÓGICA DO TIMER ---
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      Vibration.vibrate([0, 500, 200, 500]);
      Alert.alert("⚔️ VIGOR RECUPERADO!", "Retorne à batalha.", [
        { text: "VAMOS!" },
      ]);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, isTimerRunning]);

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds);
    setIsTimerRunning(true);
  };
  const stopTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(0);
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // --- FUNÇÕES DE BATALHA ---
  const getMaxSets = (metaString: string) => {
    if (!metaString) return 1;
    const parts = metaString.toLowerCase().split("x");
    if (parts.length > 1) {
      const sets = parseInt(parts[0]);
      return isNaN(sets) ? 1 : sets;
    }
    return 1;
  };

  const maxSets = activeMission ? getMaxSets(activeMission.meta) : 1;

  const openMissionBattle = (mission: any) => {
    setActiveMission(mission);
    setCurrentSetsDone(0);
    setBattleModalVisible(true);
  };

  const completeMissionFromBattle = async () => {
    if (activeMission) {
      if (!completedMissions.includes(activeMission.id)) {
        await toggleMission(activeMission.id);
      }
    }
    setBattleModalVisible(false);
    stopTimer();
  };

  // --- MODO MANUAL ---
  const startManualMode = () => {
    setSettingsModalVisible(false);
    setDailyMissions([]);
    setCompletedMissions([]);
    setBossEvent(null);
    setIsTrainerMode(true);
    setIsFinished(false);
    setManualBuilderVisible(true);
  };

  // --- RESET ALEATÓRIO (COM LIMITE) ---
  const tryResetToRandom = () => {
    if (rerollCount >= MAX_REROLLS) {
      Alert.alert(
        "Destino Selado 🔒",
        "Você já alterou o destino muitas vezes hoje. A Masmorra se recusa a mudar novamente."
      );
      return;
    }

    setSettingsModalVisible(false);
    // NÃO limpamos as missões aqui para o contador funcionar corretamente
    setIsTrainerMode(false);
    setLocationModalVisible(true);
  };

  const addManualExercise = async (gymExercise: any) => {
    const newId = dailyMissions.length + 1;
    const newMission = {
      id: newId,
      title: gymExercise.rpgTitle || "Desafio de Força",
      lore: gymExercise.rpgLore || "Realize o movimento com perfeição.",
      action: gymExercise.name,
      meta: "3x12",
      xp: 50,
      gold: 25,
      type: "manual",
      zone: "manual",
      icon: gymExercise.icon || "dumbbell",
    };

    const updatedMissions = [...dailyMissions, newMission];
    setDailyMissions(updatedMissions);

    if (heroId) {
      const today = new Date().toDateString();
      await updateDoc(doc(db, "heroes", heroId), {
        currentWorkout: {
          date: today,
          missions: updatedMissions,
          boss: null,
          completed: completedMissions,
          isFinished: false,
          isTrainer: true,
          rerollCount: rerollCount,
        },
      });
    }
  };

  const generateTrainerWorkout = async (split: string) => {
    setLoading(true);
    setSplitModalVisible(false);
    if (split === "random") {
      setLocationModalVisible(true);
      setLoading(false);
      return;
    }

    const routine = heroData.workoutRoutine[split];
    if (!routine || routine.length === 0) {
      Alert.alert("Erro", "Vazio.");
      setLoading(false);
      return;
    }

    const newMissions = routine.map((task: any, index: number) => {
      let rpgTitle = "Treino Focado";
      let rpgLore = "Siga as instruções.";
      let icon = "dumbbell";
      if (!task.isCustom) {
        const dbEx = GYM_DATABASE.find((e) => e.id === task.id);
        if (dbEx) {
          rpgTitle = dbEx.rpgTitle;
          rpgLore = dbEx.rpgLore;
          icon = dbEx.icon;
        }
      } else {
        const template =
          RPG_TEMPLATES[task.archetype] || RPG_TEMPLATES["heavy_lift"];
        rpgTitle =
          template.titles[Math.floor(Math.random() * template.titles.length)];
        rpgLore = template.lore;
        icon = "notebook-edit";
      }
      return {
        id: index + 1,
        title: rpgTitle,
        lore: rpgLore,
        action: task.name,
        meta: task.meta,
        xp: 60,
        gold: 30,
        type: "trainer",
        zone: "trainer",
        icon: icon,
      };
    });

    const newBoss = generateBoss(heroData.stats.streak || 0);
    // Treino do Mestre não altera o rerollCount (mantém o que estava)
    saveWorkoutToFirebase(newMissions, newBoss, true, rerollCount);
  };

  const generateRandomWorkout = async (location: string) => {
    setLoading(true);
    setLocationModalVisible(false);

    // --- CONTADOR DE REROLL ---
    let newCount = rerollCount;
    if (dailyMissions.length > 0) {
      newCount += 1;
    }
    setRerollCount(newCount);

    const availableDeck: any = {
      squat: LORE_DATABASE.squat.filter(
        (m: any) => location === "any" || m.locations.includes(location)
      ),
      push: LORE_DATABASE.push.filter(
        (m: any) => location === "any" || m.locations.includes(location)
      ),
      pull: LORE_DATABASE.pull.filter(
        (m: any) => location === "any" || m.locations.includes(location)
      ),
      core: LORE_DATABASE.core.filter(
        (m: any) => location === "any" || m.locations.includes(location)
      ),
      cardio: LORE_DATABASE.cardio.filter(
        (m: any) => location === "any" || m.locations.includes(location)
      ),
    };

    const drawCard = (type: string, zone: string, id: number) => {
      if (!availableDeck[type] || availableDeck[type].length === 0)
        type = Math.random() > 0.5 ? "core" : "cardio";
      const pool = availableDeck[type];
      const randomIndex = Math.floor(Math.random() * pool.length);
      const card = pool[randomIndex];

      if (card) {
        availableDeck[type].splice(randomIndex, 1);
        return {
          id: id,
          ...card,
          xp: zone === "zone1" ? 15 : zone === "zone2" ? 30 : 40,
          gold: zone === "zone1" ? 5 : zone === "zone2" ? 12 : 20,
          zone: zone,
        };
      } else return null;
    };

    const heroClass = heroData.class || "default";
    const weights = CLASS_WEIGHTS[heroClass] || CLASS_WEIGHTS["default"];
    const pickType = () => {
      const rand = Math.random() * 100;
      let sum = 0;
      for (const type in weights) {
        sum += weights[type];
        if (rand <= sum) return type;
      }
      return "cardio";
    };

    const rawMissions = [
      drawCard("cardio", "zone1", 1),
      drawCard(pickType(), "zone1", 2),
      drawCard(pickType(), "zone1", 3),
      drawCard(pickType(), "zone2", 4),
      drawCard(pickType(), "zone2", 5),
      drawCard(pickType(), "zone3", 6),
      drawCard(pickType(), "zone3", 7),
      drawCard("core", "zone3", 8),
    ];

    const newMissions = rawMissions.filter((m) => m !== null);
    const newBoss = generateBoss(heroData.stats.streak || 0);

    saveWorkoutToFirebase(newMissions, newBoss, false, newCount);
  };

  const generateBoss = (streak: number) => {
    if ((streak + 1) % 30 === 0) {
      return {
        type: "boss_major",
        name: "Lorde Demônio 👹",
        description: "O Guardião do Ciclo despertou!",
        bonusXp: 500,
        bonusGold: 200,
        fightCondition: "Complete 100% das missões.",
        fleeCondition: "Impossível fugir.",
      };
    } else if (Math.random() > 0.85) {
      return {
        type: "rare",
        name: "Assassino das Sombras 🗡️",
        description: "Um inimigo quer roubar seu ouro.",
        bonusXp: 100,
        bonusGold: 50,
        fightCondition: "Complete 5 missões.",
        fleeCondition: "Fugir.",
      };
    }
    return null;
  };

  const saveWorkoutToFirebase = async (
    missions: any[],
    boss: any,
    isTrainer: boolean,
    rCount: number
  ) => {
    setDailyMissions(missions);
    setBossEvent(boss);
    setBossDecision(null);
    setIsTrainerMode(isTrainer);
    setIsFinished(false);

    if (heroData) {
      setHeroData({
        ...heroData,
        currentWorkout: {
          date: new Date().toDateString(),
          missions: missions,
          boss: boss,
          completed: [],
          bossDecision: null,
          isFinished: false,
          isTrainer: isTrainer,
          rerollCount: rCount,
        },
      });
    }

    if (heroId) {
      const today = new Date().toDateString();
      await updateDoc(doc(db, "heroes", heroId), {
        currentWorkout: {
          date: today,
          missions: missions,
          boss: boss,
          completed: [],
          bossDecision: null,
          isFinished: false,
          isTrainer: isTrainer,
          rerollCount: rCount,
        },
      });
    }
    setLoading(false);
  };

  const toggleMission = async (id: number) => {
    if (isFinished) return;
    let newList;
    if (completedMissions.includes(id))
      newList = completedMissions.filter((m) => m !== id);
    else newList = [...completedMissions, id];
    setCompletedMissions(newList);
    if (heroId)
      await updateDoc(doc(db, "heroes", heroId), {
        "currentWorkout.completed": newList,
      });
  };

  const handleBossDecision = async (decision: "fight" | "flee") => {
    if (isFinished) return;
    setBossDecision(decision);
    if (heroId)
      await updateDoc(doc(db, "heroes", heroId), {
        "currentWorkout.bossDecision": decision,
      });
  };

  const handleCompleteDungeon = async () => {
    if (isFinished) return;
    if (completedMissions.length === 0)
      return Alert.alert("Masmorra Vazia", "Faça pelo menos uma missão!");

    setSaving(true);
    const validMissions = dailyMissions.filter((m) => m && m.title && m.action);
    let totalXp = 0;
    let totalGold = 0;
    const isZone3Blocked =
      bossEvent?.type === "blocker" && bossDecision === "flee";

    dailyMissions.forEach((m) => {
      if (!m || !m.title) return;
      if (completedMissions.includes(m.id)) {
        if (!isTrainerMode && m.zone === "zone3" && isZone3Blocked) return;
        totalXp += m.xp;
        totalGold += m.gold;
      }
    });

    let bossVictory = false;
    if (bossEvent) {
      if (bossEvent.type === "boss_major") {
        if (completedMissions.length === validMissions.length) {
          totalXp += bossEvent.bonusXp;
          totalGold += bossEvent.bonusGold;
          bossVictory = true;
          Alert.alert("LENDA VIVA! 🏆", "Lorde Demônio derrotado!");
        } else {
          Alert.alert("DERROTA...", "O Lorde Demônio venceu.");
        }
      } else if (bossDecision === "fight") {
        totalXp += bossEvent.bonusXp;
        totalGold += bossEvent.bonusGold;
        bossVictory = true;
      }
    }

    const bonuses = calculateBonuses();
    totalXp = Math.round(
      (totalXp + bonuses.xpFlat * completedMissions.length) *
        bonuses.xpMultiplier
    );
    totalGold = Math.round(totalGold * bonuses.goldMultiplier);

    try {
      const heroRef = doc(db, "heroes", heroId!);
      let currentLevel = heroData.level;
      let currentXp = (heroData.stats.xp || 0) + totalXp;
      const nextStreak = (heroData.stats.streak || 0) + 1;
      let leveledUp = false;
      while (currentXp >= currentLevel * 100) {
        currentXp -= currentLevel * 100;
        currentLevel++;
        leveledUp = true;
      }
      let dropsFound: string[] = [];
      if (
        nextStreak % 10 === 0 &&
        !heroData.inventory?.includes("medal_discipline")
      )
        dropsFound.push("medal_discipline");
      if (
        bossEvent?.type === "boss_major" &&
        bossVictory &&
        !heroData.inventory?.includes("sword_demon")
      )
        dropsFound.push("sword_demon");

      const updatePayload: any = {
        "stats.xp": currentXp,
        "stats.gold": (heroData.stats.gold || 0) + totalGold,
        "stats.streak": increment(1),
        level: currentLevel,
        "currentWorkout.isFinished": true,
      };
      if (dropsFound.length > 0)
        updatePayload.inventory = arrayUnion(...dropsFound);
      await updateDoc(heroRef, updatePayload);
      if (heroData.guildId)
        await updateDoc(doc(db, "guilds", heroData.guildId), {
          weeklyXp: increment(totalXp),
        });

      setIsFinished(true);
      let finalMsg = `+${totalXp} XP | +${totalGold} Ouro`;
      if (leveledUp) finalMsg += `\n\nLEVEL UP! Nível ${currentLevel}`;
      if (dropsFound.length > 0) finalMsg += `\n\n🎁 DROP RARO!`;
      Alert.alert("Dia Concluído!", finalMsg, [
        { text: "Voltar à Cidade", onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const calculateBonuses = () => {
    let bonuses = { xpFlat: 0, xpMultiplier: 1, goldMultiplier: 1 };
    if (heroData?.equipped) {
      Object.values(heroData.equipped).forEach((itemId: any) => {
        const item = ITEMS_DATABASE[itemId];
        if (item && item.bonuses) {
          if (item.bonuses.xpFlat) bonuses.xpFlat += item.bonuses.xpFlat;
          if (item.bonuses.xpMultiplier)
            bonuses.xpMultiplier *= item.bonuses.xpMultiplier;
          if (item.bonuses.goldMultiplier)
            bonuses.goldMultiplier *= item.bonuses.goldMultiplier;
        }
      });
    }
    return bonuses;
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator
          color="#FFD700"
          size="large"
          style={{ marginTop: 50 }}
        />
      </View>
    );

  const visibleMissions = dailyMissions.filter((m) => m && m.title && m.action);
  const filteredLibrary = GYM_DATABASE.filter((ex) =>
    ex.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* --- MODAIS DE CONFIGURAÇÃO (LOCAIS/SPLITS) --- */}
      <Modal visible={locationModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>ONDE VAMOS TREINAR?</Text>
            <TouchableOpacity
              style={styles.locBtn}
              onPress={() => generateRandomWorkout("home")}
            >
              <FontAwesome5 name="home" size={18} color="#fff" />
              <Text style={styles.locText}>EM CASA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locBtn}
              onPress={() => generateRandomWorkout("gym")}
            >
              <FontAwesome5 name="dumbbell" size={18} color="#fff" />
              <Text style={styles.locText}>ACADEMIA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.locBtn}
              onPress={() => generateRandomWorkout("park")}
            >
              <FontAwesome5 name="tree" size={18} color="#fff" />
              <Text style={styles.locText}>PARQUE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.locBtn, { backgroundColor: "#333" }]}
              onPress={() => generateRandomWorkout("any")}
            >
              <FontAwesome5 name="dice-d20" size={18} color="#FFD700" />
              <Text style={styles.locText}>ALEATÓRIO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={splitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>TREINO DO MESTRE</Text>
            {["A", "B", "C", "D"].map((split) => {
              const hasTreino = heroData?.workoutRoutine?.[split]?.length > 0;
              if (!hasTreino) return null;
              return (
                <TouchableOpacity
                  key={split}
                  style={styles.locBtn}
                  onPress={() => generateTrainerWorkout(split)}
                >
                  <Text style={styles.splitIcon}>{split}</Text>
                  <Text style={styles.locText}>TREINO {split}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.locBtn,
                { backgroundColor: "#333", marginTop: 10 },
              ]}
              onPress={() => generateTrainerWorkout("random")}
            >
              <FontAwesome5 name="dice" size={18} color="#aaa" />
              <Text style={[styles.locText, { color: "#aaa" }]}>
                Gerar Aleatório (Ignorar Mestre)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE CONFIGURAÇÕES (MENU ATUALIZADO) --- */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>⚙️ OPÇÕES DA MASMORRA</Text>

            {/* --- NOVA SEÇÃO: TREINOS DO MESTRE --- */}
            {heroData?.workoutRoutine && (
              <View style={{ width: "100%", marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#FFD700",
                    fontSize: 14,
                    fontWeight: "bold",
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  📜 PERGAMINHOS DO MESTRE
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  {["A", "B", "C", "D"].map((split) => {
                    const routine = heroData.workoutRoutine[split];
                    if (!routine || routine.length === 0) return null;
                    return (
                      <TouchableOpacity
                        key={split}
                        style={{
                          backgroundColor: "#2A1515",
                          borderWidth: 1,
                          borderColor: "#FFD700",
                          paddingVertical: 10,
                          paddingHorizontal: 20,
                          borderRadius: 8,
                        }}
                        onPress={() => {
                          setSettingsModalVisible(false);
                          generateTrainerWorkout(split);
                        }}
                      >
                        <Text style={{ color: "#FFD700", fontWeight: "bold" }}>
                          TREINO {split}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View
                  style={{
                    height: 1,
                    backgroundColor: "#333",
                    width: "100%",
                    marginTop: 20,
                  }}
                />
              </View>
            )}

            <Text style={styles.configSub}>Outras opções de destino:</Text>

            <TouchableOpacity style={styles.locBtn} onPress={startManualMode}>
              <FontAwesome5 name="edit" size={18} color="#FFD700" />
              <View>
                <Text style={styles.locText}>CRIAR MANUALMENTE</Text>
                <Text style={{ color: "#888", fontSize: 10 }}>
                  Escolha exercício por exercício
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.locBtn} onPress={tryResetToRandom}>
              <FontAwesome5
                name="dice-d20"
                size={18}
                color={rerollCount >= MAX_REROLLS ? "#666" : "#fff"}
              />
              <View>
                <Text
                  style={[
                    styles.locText,
                    rerollCount >= MAX_REROLLS && { color: "#666" },
                  ]}
                >
                  GERAR ALEATÓRIO
                </Text>
                <Text
                  style={{
                    color: rerollCount >= MAX_REROLLS ? "#FF4444" : "#888",
                    fontSize: 10,
                  }}
                >
                  {rerollCount >= MAX_REROLLS
                    ? "LIMITE ATINGIDO"
                    : `Tentativas restantes: ${MAX_REROLLS - rerollCount}`}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.locBtn,
                { backgroundColor: "#333", marginTop: 10 },
              ]}
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.locText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL CONSTRUTOR MANUAL (BIBLIOTECA) --- */}
      <Modal
        visible={manualBuilderVisible}
        animationType="slide"
        onRequestClose={() => setManualBuilderVisible(false)}
      >
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: 50 }]}>
            <TouchableOpacity onPress={() => setManualBuilderVisible(false)}>
              <FontAwesome5 name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.locationTitle}>BIBLIOTECA</Text>
            <View style={{ width: 20 }} />
          </View>
          <View style={{ padding: 15 }}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar exercício..."
              placeholderTextColor="#666"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <ScrollView contentContainerStyle={{ padding: 15 }}>
            {filteredLibrary.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.libraryItem}
                onPress={() => {
                  addManualExercise(item);
                  Alert.alert(
                    "Adicionado",
                    `${item.name} adicionado à masmorra!`
                  );
                }}
              >
                <View style={styles.libraryIcon}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={24}
                    color="#FFD700"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: "#888", fontSize: 10 }}>
                    {item.muscle.toUpperCase()} • {item.category}
                  </Text>
                </View>
                <FontAwesome5 name="plus-circle" size={24} color="#4CAF50" />
              </TouchableOpacity>
            ))}
            <View style={{ height: 50 }} />
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.completeButton}
              onPress={() => setManualBuilderVisible(false)}
            >
              <Text style={styles.completeText}>
                VOLTAR PARA A MASMORRA ({dailyMissions.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL DE BATALHA --- */}
      <Modal
        visible={battleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBattleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.configCard,
              { width: "95%", backgroundColor: "#151515" },
            ]}
          >
            <Text
              style={[styles.configTitle, { color: "#FFD700", fontSize: 22 }]}
            >
              {activeMission?.title}
            </Text>
            <Text style={[styles.configSub, { marginBottom: 5 }]}>
              {activeMission?.lore}
            </Text>
            <View style={styles.battleInfoBox}>
              <Text style={styles.battleActionText}>
                {activeMission?.action}
              </Text>
              <Text style={styles.battleMetaText}>
                Meta: {activeMission?.meta}
              </Text>
            </View>
            <View style={styles.setsContainer}>
              <Text
                style={{
                  color: "#aaa",
                  marginBottom: 10,
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                PROGRESSO DA MISSÃO
              </Text>
              <View
                style={{ flexDirection: "row", gap: 20, alignItems: "center" }}
              >
                <TouchableOpacity
                  style={[
                    styles.setBtnSmall,
                    { opacity: currentSetsDone === 0 ? 0.3 : 1 },
                  ]}
                  disabled={currentSetsDone === 0}
                  onPress={() =>
                    setCurrentSetsDone((prev) => (prev > 0 ? prev - 1 : 0))
                  }
                >
                  <FontAwesome5 name="minus" size={16} color="#fff" />
                </TouchableOpacity>
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={[
                      styles.setCountText,
                      currentSetsDone === maxSets && { color: "#4CAF50" },
                    ]}
                  >
                    {currentSetsDone}{" "}
                    <Text style={{ fontSize: 20, color: "#555" }}>
                      / {maxSets}
                    </Text>
                  </Text>
                  {currentSetsDone === maxSets && (
                    <Text
                      style={{
                        color: "#4CAF50",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      CONCLUÍDO
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[
                    styles.setBtnSmall,
                    currentSetsDone === maxSets
                      ? { backgroundColor: "#4CAF50", borderColor: "#4CAF50" }
                      : { backgroundColor: "#fff" },
                  ]}
                  disabled={currentSetsDone >= maxSets}
                  onPress={() =>
                    setCurrentSetsDone((prev) =>
                      prev < maxSets ? prev + 1 : prev
                    )
                  }
                >
                  {currentSetsDone === maxSets ? (
                    <FontAwesome5 name="check" size={16} color="#000" />
                  ) : (
                    <FontAwesome5 name="plus" size={16} color="#000" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.timerContainer}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <FontAwesome5
                  name="fire"
                  size={20}
                  color={isTimerRunning ? "#FF4500" : "#555"}
                />
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  ACAMPAMENTO (DESCANSO)
                </Text>
              </View>
              {timeLeft > 0 ? (
                <View style={styles.timerDisplay}>
                  <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                  <TouchableOpacity
                    style={styles.cancelTimerBtn}
                    onPress={stopTimer}
                  >
                    <Text style={{ color: "#fff", fontSize: 12 }}>
                      CANCELAR
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    style={styles.timerBtn}
                    onPress={() => startTimer(90)}
                  >
                    <Text style={styles.timerBtnText}>1:30</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timerBtn}
                    onPress={() => startTimer(180)}
                  >
                    <Text style={styles.timerBtnText}>3:00</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.finishBattleBtn}
              onPress={completeMissionFromBattle}
            >
              <Text style={styles.finishBattleText}>
                {completedMissions.includes(activeMission?.id)
                  ? "FECHAR"
                  : "MISSÃO CUMPRIDA"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.header,
          {
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          },
        ]}
      >
        <View>
          <Text style={styles.floorText}>
            STREAK: {heroData?.stats?.streak || 0} DIAS 🔥
          </Text>
          <Text style={styles.locationTitle}>
            {isTrainerMode ? "Treino Personalizado" : "Masmorra"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => setSettingsModalVisible(true)}
        >
          <FontAwesome5 name="cog" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* EVENTO DO BOSS (RESTAURADO) */}
        {bossEvent && !bossDecision && (
          <View
            style={[
              styles.bossCard,
              bossEvent.type === "boss_major" && {
                borderColor: "#FF0000",
                backgroundColor: "#300505",
              },
            ]}
          >
            <View style={styles.bossHeader}>
              <FontAwesome5
                name="dragon"
                size={24}
                color={bossEvent.type === "boss_major" ? "#FF0000" : "#FFD700"}
              />
              <Text
                style={[
                  styles.bossTitle,
                  bossEvent.type === "boss_major" && { color: "#FF0000" },
                ]}
              >
                {bossEvent.name}
              </Text>
            </View>
            <Text style={styles.bossDesc}>{bossEvent.description}</Text>
            <Text style={styles.bossCondition}>{bossEvent.fightCondition}</Text>
            <View style={styles.bossActions}>
              <TouchableOpacity
                style={styles.fightBtn}
                onPress={() => handleBossDecision("fight")}
              >
                <Text style={styles.btnLabel}>⚔️ LUTAR</Text>
              </TouchableOpacity>
              {bossEvent.type !== "boss_major" && (
                <TouchableOpacity
                  style={styles.fleeBtn}
                  onPress={() => handleBossDecision("flee")}
                >
                  <Text style={styles.btnLabel}>FUGIR</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* LOGICA VISUAL RESTAURADA */}
        {isTrainerMode ? (
          // MODO PERSONAL/MANUAL: LISTA ÚNICA
          <View>
            <Text style={styles.layerTitle}>ORDENS ESPECIAIS</Text>
            {dailyMissions.length > 0 ? (
              dailyMissions.map((mission) =>
                renderMissionCard(mission, "#FFD700", false)
              )
            ) : (
              <View style={{ alignItems: "center", marginTop: 30 }}>
                <Text style={{ color: "#666", marginBottom: 20 }}>
                  Nenhum exercício definido.
                </Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setManualBuilderVisible(true)}
                >
                  <Text style={styles.addBtnText}>ADICIONAR MANUALMENTE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          // MODO RANDOM: ZONAS 1, 2, 3 (CORES ORIGINAIS)
          <>
            {renderZone("zone1", "Aquecimento", "#4CAF50")}
            {renderZone("zone2", "Combate", "#FF9800")}
            {renderZone("zone3", "Desafio Final", "#F44336")}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={{ color: "#888", fontSize: 10 }}>PROGRESSO</Text>
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            {completedMissions.length} / {visibleMissions.length}
          </Text>
        </View>
        {isFinished ? (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: "#333" }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.completeText, { color: "#888" }]}>
              VOLTAR (Concluído)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteDungeon}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.completeText}>FINALIZAR O DIA</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // --- FUNÇÃO RENDER ZONE (IMPORTANTE PARA O VISUAL) ---
  function renderZone(zoneId: string, title: string, color: string) {
    const missions = dailyMissions.filter((m) => m.zone === zoneId);
    const isBlocked =
      zoneId === "zone3" &&
      bossEvent?.type === "blocker" &&
      bossDecision === "flee";
    return (
      <View
        style={[
          styles.layerContainer,
          { borderLeftColor: isBlocked ? "#555" : color },
          isBlocked && { opacity: 0.5 },
        ]}
        key={zoneId}
      >
        <Text
          style={[styles.layerTitle, { color: isBlocked ? "#888" : color }]}
        >
          {title} {isBlocked && "🔒"}
        </Text>
        {missions.map((mission) =>
          renderMissionCard(mission, color, isBlocked)
        )}
      </View>
    );
  }

  function renderMissionCard(mission: any, color: string, isBlocked: boolean) {
    if (!mission || !mission.title || !mission.action) return null;
    const isDone = completedMissions.includes(mission.id);
    return (
      <TouchableOpacity
        key={mission.id}
        onPress={() => !isBlocked && openMissionBattle(mission)}
        style={[
          styles.questCard,
          isDone &&
            !isBlocked && { borderColor: color, backgroundColor: color + "10" },
        ]}
      >
        <TouchableOpacity
          style={styles.checkArea}
          onPress={() => toggleMission(mission.id)}
        >
          <View
            style={[
              styles.checkBox,
              isDone && {
                backgroundColor: isBlocked ? "#555" : color,
                borderColor: isBlocked ? "#555" : color,
              },
            ]}
          >
            {isDone && <FontAwesome5 name="check" size={12} color="#000" />}
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.questTitle,
              isDone && !isBlocked && { color: color },
              isBlocked && { color: "#888" },
            ]}
          >
            {mission.title}
          </Text>
          <View style={styles.metaContainer}>
            <Text style={styles.questSub}>{mission.action}</Text>
            <Text
              style={[styles.questMeta, { color: isBlocked ? "#666" : color }]}
            >
              Meta: {mission.meta}
            </Text>
          </View>
        </View>
        <View style={{ padding: 10 }}>
          <MaterialCommunityIcons
            name={mission.icon ? (mission.icon as any) : "information-outline"}
            size={20}
            color={isBlocked ? "#666" : color}
          />
        </View>
      </TouchableOpacity>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  floorText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  locationTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  scrollContent: { padding: 15, paddingBottom: 100 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  configCard: {
    width: "85%",
    backgroundColor: "#1E1E1E",
    padding: 25,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FFD700",
    alignItems: "center",
  },
  configTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  configSub: {
    color: "#888",
    marginBottom: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
  locBtn: {
    flexDirection: "row",
    backgroundColor: "#252525",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    gap: 15,
    borderWidth: 1,
    borderColor: "#333",
    justifyContent: "center",
  },
  locText: { color: "#fff", fontWeight: "bold", fontSize: 14 },

  // --- ESTILOS NOVOS ---
  settingsBtn: { padding: 10 },
  searchInput: {
    backgroundColor: "#252525",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  libraryItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    gap: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  libraryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  addBtn: {
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  addBtnText: { fontWeight: "bold", color: "#000" },

  // --- ESTILOS ORIGINAIS ---
  splitIcon: { fontSize: 18, fontWeight: "bold", color: "#FFD700" },
  layerContainer: { marginBottom: 20, paddingLeft: 10, borderLeftWidth: 3 },
  layerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 5,
    color: "#FFD700",
  },
  questCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  checkArea: { padding: 10 },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#555",
    justifyContent: "center",
    alignItems: "center",
  },
  questTitle: { color: "#eee", fontWeight: "bold", fontSize: 14 },
  questSub: { color: "#aaa", fontSize: 12 },
  metaContainer: { marginTop: 2 },
  questMeta: { fontSize: 11, fontWeight: "bold", marginTop: 1 },
  bossCard: {
    padding: 15,
    backgroundColor: "#2A1515",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFD700",
    marginBottom: 20,
  },
  bossHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 5,
  },
  bossTitle: { color: "#FFD700", fontWeight: "bold", fontSize: 16 },
  bossDesc: { color: "#fff", fontSize: 14, marginBottom: 10 },
  bossCondition: {
    color: "#aaa",
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 10,
  },
  bossActions: { flexDirection: "row", gap: 10 },
  fightBtn: {
    flex: 1,
    backgroundColor: "#443300",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  fleeBtn: {
    flex: 1,
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  btnLabel: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 20,
    backgroundColor: "#1A1A1A",
    borderTopWidth: 1,
    borderColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completeButton: {
    flex: 1,
    marginLeft: 20,
    backgroundColor: "#FFD700",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  completeText: { color: "#000", fontWeight: "900" },

  // --- MODAL BATALHA ---
  battleInfoBox: {
    backgroundColor: "#111",
    padding: 15,
    borderRadius: 10,
    width: "100%",
    marginBottom: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  battleActionText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  battleMetaText: { color: "#FFA726", marginTop: 5, fontSize: 14 },
  setsContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 25,
    padding: 15,
    backgroundColor: "#222",
    borderRadius: 10,
  },
  setBtnSmall: {
    width: 40,
    height: 40,
    backgroundColor: "#333",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#555",
  },
  setBtnSmallPlus: {
    width: 40,
    height: 40,
    backgroundColor: "#FFD700",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  setCountText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
    minWidth: 50,
    textAlign: "center",
  },
  timerContainer: { width: "100%", alignItems: "center", marginBottom: 20 },
  timerBtn: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#FF4500",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  timerBtnText: { color: "#FF4500", fontWeight: "bold" },
  timerDisplay: { alignItems: "center" },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FF4500",
    marginBottom: 5,
  },
  cancelTimerBtn: { padding: 5 },
  finishBattleBtn: {
    backgroundColor: "#FFD700",
    width: "100%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  finishBattleText: { color: "#000", fontWeight: "900", fontSize: 16 },
});
