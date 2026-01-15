import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
// Firebase
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
// Dados
import { GYM_DATABASE, RPG_TEMPLATES } from "../constants/gym_database";

export default function TrainerScreen() {
  const router = useRouter();

  // Estados Gerais
  const [studentEmail, setStudentEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Estados dos Treinos A/B/C/D
  const [currentSplit, setCurrentSplit] = useState<"A" | "B" | "C" | "D">("A");
  const [workouts, setWorkouts] = useState<{
    A: any[];
    B: any[];
    C: any[];
    D: any[];
  }>({ A: [], B: [], C: [], D: [] });

  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "custom">("library");
  const [filterMuscle, setFilterMuscle] = useState<string>("todos");
  const [metaInput, setMetaInput] = useState("3x12");

  // --- NOVO: BUSCA DE TEXTO ---
  const [searchText, setSearchText] = useState("");

  // Inputs do Customizado
  const [customName, setCustomName] = useState("");
  const [customArchetype, setCustomArchetype] = useState("heavy_lift");

  const currentQueue = workouts[currentSplit];

  // --- ADICIONAR AO TREINO ---
  const addToQueue = (exercise: any) => {
    if (currentQueue.some((item) => item.id === exercise.id)) {
      return Alert.alert(
        "Atenção",
        `Este exercício já está no Treino ${currentSplit}.`
      );
    }

    const newItem = {
      id: exercise.id,
      name: exercise.name,
      meta: metaInput,
      isCustom: false,
    };

    setWorkouts({ ...workouts, [currentSplit]: [...currentQueue, newItem] });
    setModalVisible(false);
    setSearchText(""); // Limpa busca ao sair
  };

  // --- ADICIONAR CUSTOMIZADO ---
  const addCustomToQueue = () => {
    const nameTrimmed = customName.trim();
    if (!nameTrimmed) return Alert.alert("Erro", "Dê um nome ao exercício.");

    // Validação de Duplicidade
    if (
      GYM_DATABASE.some(
        (ex) => ex.name.toLowerCase() === nameTrimmed.toLowerCase()
      )
    ) {
      return Alert.alert(
        "Já existe",
        "Existe na biblioteca. Use a aba de busca ou clique na sugestão abaixo."
      );
    }
    if (
      currentQueue.some(
        (item) => item.name.toLowerCase() === nameTrimmed.toLowerCase()
      )
    ) {
      return Alert.alert(
        "Repetido",
        `Já adicionado no Treino ${currentSplit}.`
      );
    }

    const newItem = {
      id: `custom_${Date.now()}`,
      name: nameTrimmed,
      meta: metaInput,
      isCustom: true,
      archetype: customArchetype,
    };

    setWorkouts({ ...workouts, [currentSplit]: [...currentQueue, newItem] });
    setCustomName("");
    setModalVisible(false);
  };

  const removeFromQueue = (index: number) => {
    const newQueue = currentQueue.filter((_, i) => i !== index);
    setWorkouts({ ...workouts, [currentSplit]: newQueue });
  };

  const handleSendRoutine = async () => {
    if (!studentEmail) return Alert.alert("Erro", "Digite o email do aluno.");
    const totalExercises =
      workouts.A.length +
      workouts.B.length +
      workouts.C.length +
      workouts.D.length;
    if (totalExercises === 0)
      return Alert.alert("Vazio", "Adicione exercícios.");

    setSending(true);

    try {
      const q = query(
        collection(db, "heroes"),
        where("email", "==", studentEmail.toLowerCase().trim())
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        Alert.alert("Erro", "Aluno não encontrado.");
        setSending(false);
        return;
      }

      const studentDoc = snap.docs[0];
      const trainerName = auth.currentUser?.displayName || "Mestre";

      await updateDoc(doc(db, "heroes", studentDoc.id), {
        workoutRoutine: {
          trainerName,
          lastUpdated: new Date().toDateString(),
          A: workouts.A,
          B: workouts.B,
          C: workouts.C,
          D: workouts.D,
        },
      });

      Alert.alert(
        "Sucesso! 🦅",
        `Rotina enviada para ${studentDoc.data().name}.`
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha ao enviar rotina.");
    } finally {
      setSending(false);
    }
  };

  // --- LÓGICA DE FILTRO DA BIBLIOTECA ---
  const filteredDatabase = GYM_DATABASE.filter((ex) => {
    const matchMuscle =
      filterMuscle === "todos" ? true : ex.muscle === filterMuscle;
    const matchText = ex.name.toLowerCase().includes(searchText.toLowerCase());
    return matchMuscle && matchText;
  });

  // --- LÓGICA DE SUGESTÃO NO CUSTOM ---
  // Se o user digita algo no custom, procuramos parecidos na DB para sugerir
  const similarExercises =
    customName.length > 2
      ? GYM_DATABASE.filter((ex) =>
          ex.name.toLowerCase().includes(customName.toLowerCase())
        )
      : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>FORJAR ROTINA</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* BUSCA */}
        <View style={styles.card}>
          <Text style={styles.label}>ALUNO (EMAIL)</Text>
          <View style={styles.inputRow}>
            <FontAwesome5
              name="user"
              size={16}
              color="#666"
              style={{ marginRight: 10 }}
            />
            <TextInput
              style={styles.input}
              placeholder="email@aluno.com"
              placeholderTextColor="#666"
              value={studentEmail}
              onChangeText={setStudentEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* SELETOR DE SPLIT */}
        <View style={styles.splitSelector}>
          {["A", "B", "C", "D"].map((split) => {
            const count = workouts[split as "A" | "B" | "C" | "D"].length;
            const isActive = currentSplit === split;
            return (
              <TouchableOpacity
                key={split}
                style={[styles.splitBtn, isActive && styles.splitBtnActive]}
                onPress={() => setCurrentSplit(split as any)}
              >
                <Text style={[styles.splitText, isActive && { color: "#000" }]}>
                  TREINO {split}
                </Text>
                {count > 0 && (
                  <View style={styles.splitBadge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* LISTA DO SPLIT ATUAL */}
        <View style={styles.queueHeader}>
          <Text style={styles.label}>ITENS DO TREINO {currentSplit}</Text>
          <TouchableOpacity
            onPress={() => setWorkouts({ ...workouts, [currentSplit]: [] })}
          >
            <Text style={{ color: "#FF4444", fontSize: 10 }}>
              LIMPAR {currentSplit}
            </Text>
          </TouchableOpacity>
        </View>

        {currentQueue.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ color: "#666", fontStyle: "italic" }}>
              Nenhum exercício no Treino {currentSplit} ainda.
            </Text>
          </View>
        ) : (
          currentQueue.map((item, index) => (
            <View key={index} style={styles.queueItem}>
              <View style={styles.queueNumber}>
                <Text style={{ fontWeight: "bold" }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queueTitle}>{item.name}</Text>
                <Text style={styles.queueMeta}>
                  {item.meta} • {item.isCustom ? "Custom" : "Padrão"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeFromQueue(index)}>
                <FontAwesome5 name="trash" size={14} color="#666" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <FontAwesome5 name="plus" size={16} color="#000" />
          <Text style={styles.addBtnText}>
            ADICIONAR AO TREINO {currentSplit}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSendRoutine}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.sendText}>ENVIAR ROTINA COMPLETA 🦅</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Adicionar ao Treino {currentSplit}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <FontAwesome5 name="times" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "library" && styles.activeTab]}
              onPress={() => setActiveTab("library")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "library" && { color: "#FFD700" },
                ]}
              >
                📚 BIBLIOTECA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "custom" && styles.activeTab]}
              onPress={() => setActiveTab("custom")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "custom" && { color: "#FFD700" },
                ]}
              >
                ✨ CRIAR NOVO
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaInputContainer}>
            <Text style={{ color: "#888", marginRight: 10 }}>Meta/Reps:</Text>
            <TextInput
              style={styles.smallInput}
              value={metaInput}
              onChangeText={setMetaInput}
              placeholder="3x12"
              placeholderTextColor="#666"
            />
          </View>

          {activeTab === "library" ? (
            <>
              {/* --- NOVO: BARRA DE BUSCA --- */}
              <View style={styles.searchContainer}>
                <FontAwesome5
                  name="search"
                  size={14}
                  color="#666"
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={{ flex: 1, color: "#fff" }}
                  placeholder="Buscar exercício (ex: Supino)..."
                  placeholderTextColor="#666"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchText("")}>
                    <FontAwesome5 name="times-circle" size={14} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 50 }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  {[
                    "todos",
                    "peito",
                    "costas",
                    "pernas",
                    "ombros",
                    "bracos",
                    "abdomen",
                    "cardio",
                  ].map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => setFilterMuscle(m)}
                      style={[
                        styles.filterChip,
                        filterMuscle === m && {
                          backgroundColor: "#FFD700",
                          borderColor: "#FFD700",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          filterMuscle === m && { color: "#000" },
                        ]}
                      >
                        {m.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <ScrollView contentContainerStyle={styles.list}>
                {filteredDatabase.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.dbItem}
                    onPress={() => addToQueue(item)}
                  >
                    <View style={styles.dbIcon}>
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={24}
                        color="#FFD700"
                      />
                    </View>
                    <View>
                      <Text style={styles.dbTitle}>{item.name}</Text>
                      <Text style={styles.dbSub}>RPG: "{item.rpgTitle}"</Text>
                    </View>
                    <FontAwesome5
                      name="plus-circle"
                      size={20}
                      color="#4CAF50"
                      style={{ marginLeft: "auto" }}
                    />
                  </TouchableOpacity>
                ))}
                {filteredDatabase.length === 0 && (
                  <Text
                    style={{
                      color: "#666",
                      textAlign: "center",
                      marginTop: 20,
                    }}
                  >
                    Nenhum exercício encontrado.
                  </Text>
                )}
              </ScrollView>
            </>
          ) : (
            <ScrollView contentContainerStyle={styles.customContainer}>
              <Text style={styles.label}>Nome do Exercício</Text>
              <TextInput
                style={styles.createInput}
                placeholder="Ex: Agachamento Búlgaro"
                placeholderTextColor="#666"
                value={customName}
                onChangeText={setCustomName}
              />

              {/* --- NOVO: SUGESTÃO INTELIGENTE --- */}
              {similarExercises.length > 0 && (
                <View style={styles.suggestionBox}>
                  <Text
                    style={{
                      color: "#FFD700",
                      fontSize: 12,
                      marginBottom: 5,
                      fontWeight: "bold",
                    }}
                  >
                    ✨ ENCONTRADO NA BIBLIOTECA:
                  </Text>
                  {similarExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.suggestionItem}
                      onPress={() => addToQueue(ex)}
                    >
                      <Text style={{ color: "#ccc" }}>• {ex.name}</Text>
                      <Text
                        style={{
                          color: "#4CAF50",
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        USAR ESTE
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>
                Arquétipo (A "Vibe" do RPG)
              </Text>
              {Object.keys(RPG_TEMPLATES).map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.archetypeItem,
                    customArchetype === key && {
                      borderColor: "#FFD700",
                      backgroundColor: "#332b00",
                    },
                  ]}
                  onPress={() => setCustomArchetype(key)}
                >
                  <Text
                    style={[
                      styles.archetypeTitle,
                      customArchetype === key && { color: "#FFD700" },
                    ]}
                  >
                    {RPG_TEMPLATES[key].titles[0]}
                  </Text>
                  <Text style={styles.archetypeDesc}>
                    {RPG_TEMPLATES[key].lore}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={addCustomToQueue}
              >
                <Text style={styles.addBtnText}>CRIAR E ADICIONAR</Text>
              </TouchableOpacity>
              <View style={{ height: 50 }} />
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#1A1A1A",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  backBtn: { paddingRight: 20 },
  title: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  content: { padding: 20 },

  card: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 20,
  },
  label: {
    color: "#888",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252525",
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  input: { flex: 1, color: "#fff", paddingVertical: 10 },
  createInput: {
    backgroundColor: "#252525",
    color: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    fontSize: 16,
  },

  splitSelector: { flexDirection: "row", gap: 10, marginBottom: 20 },
  splitBtn: {
    flex: 1,
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    position: "relative",
  },
  splitBtnActive: { backgroundColor: "#FFD700", borderColor: "#FFD700" },
  splitText: { fontWeight: "bold", color: "#888", fontSize: 12 },
  splitBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#29B6F6",
  },
  queueNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  queueTitle: { color: "#fff", fontWeight: "bold" },
  queueMeta: { color: "#888", fontSize: 12 },
  emptyState: {
    alignItems: "center",
    padding: 20,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
  },

  addBtn: {
    backgroundColor: "#FFD700",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    gap: 10,
    marginTop: 10,
  },
  addBtnText: { fontWeight: "bold", color: "#000" },

  footer: {
    padding: 20,
    backgroundColor: "#1A1A1A",
    borderTopWidth: 1,
    borderColor: "#333",
  },
  sendBtn: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },

  modalContainer: { flex: 1, backgroundColor: "#121212" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#333" },
  tab: { flex: 1, padding: 15, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderColor: "#FFD700" },
  tabText: { color: "#666", fontWeight: "bold" },

  metaInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#1A1A1A",
    justifyContent: "center",
  },
  smallInput: {
    backgroundColor: "#333",
    color: "#fff",
    width: 100,
    padding: 5,
    borderRadius: 5,
    textAlign: "center",
  },

  // ESTILOS DE BUSCA
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252525",
    margin: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    height: 45,
  },

  // ESTILOS DE SUGESTÃO
  suggestionBox: {
    backgroundColor: "#332b00",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  suggestionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#443300",
  },

  filterRow: {
    paddingHorizontal: 15,
    gap: 10,
    paddingBottom: 10,
    alignItems: "center",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  filterText: { color: "#888", fontSize: 10, fontWeight: "bold" },
  list: { padding: 15 },
  dbItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  dbIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  dbTitle: { color: "#fff", fontWeight: "bold" },
  dbSub: { color: "#888", fontSize: 10, fontStyle: "italic" },
  customContainer: { padding: 20 },
  archetypeItem: {
    padding: 15,
    backgroundColor: "#1E1E1E",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  archetypeTitle: { color: "#eee", fontWeight: "bold", marginBottom: 5 },
  archetypeDesc: { color: "#666", fontSize: 12 },
});
