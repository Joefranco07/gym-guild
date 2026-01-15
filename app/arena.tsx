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
  TextInput,
  Modal,
  Linking,
  Share,
  Switch,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
// Firebase
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  where,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

export default function ArenaScreen() {
  const router = useRouter();

  // Navegação
  const [view, setView] = useState<
    "menu" | "ranking" | "ranking_friends" | "challenges"
  >("menu");

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [heroName, setHeroName] = useState("");
  const [myFriends, setMyFriends] = useState<string[]>([]);

  // Dados
  const [rankingList, setRankingList] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");

  // Inputs
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    null
  );
  const [resultValue, setResultValue] = useState("");
  const [resultLink, setResultLink] = useState("");

  // Amigo
  const [friendModalVisible, setFriendModalVisible] = useState(false);
  const [friendInput, setFriendInput] = useState("");

  // --- INIT ---
  useEffect(() => {
    const currUser = auth.currentUser;
    if (currUser) {
      setUser(currUser);
      // MUDANÇA: Buscando em 'heroes'
      const q = query(
        collection(db, "heroes"),
        where("userId", "==", currUser.uid)
      );
      const unsub = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setHeroName(data.name);
          setMyFriends(data.friends || []);
        }
      });
      return () => unsub();
    }
  }, []);

  // --- CARREGAMENTO ---
  const loadRanking = async (type: "global" | "friends") => {
    setLoading(true);
    setView(type === "global" ? "ranking" : "ranking_friends");

    try {
      // MUDANÇA: Buscando em 'heroes'
      const q = query(collection(db, "heroes"), limit(50));
      const snap = await getDocs(q);
      let list = snap.docs.map((d) => d.data());

      if (type === "friends") {
        const whitelist = [...myFriends, user.uid];
        list = list.filter((hero) => whitelist.includes(hero.userId));
      }

      setRankingList(
        list.sort((a: any, b: any) => (b.stats?.xp || 0) - (a.stats?.xp || 0))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadChallenges = () => {
    setView("challenges");
    const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setChallenges(list);
    });
  };

  const getFilteredChallenges = () => {
    const now = new Date();
    return challenges.filter((c) => {
      const createdAt = c.createdAt?.toDate
        ? c.createdAt.toDate()
        : new Date(c.createdAt);
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const isExpired = diffTime > 86400000;

      if (isExpired) return false;

      const matchesSearch =
        c.title.toLowerCase().includes(searchText.toLowerCase()) ||
        c.creator.toLowerCase().includes(searchText.toLowerCase());

      return matchesSearch;
    });
  };

  // --- AÇÕES ---

  // 1. ADICIONAR AMIGO
  const handleAddFriend = async () => {
    if (!friendInput) return Alert.alert("Erro", "Digite ID ou Email.");

    const inputTrimmed = friendInput.trim();
    let targetUserId = "";

    setLoading(true);
    try {
      // A. BUSCAR O AMIGO (Target) em 'heroes'
      let qFriend = query(
        collection(db, "heroes"),
        where("userId", "==", inputTrimmed)
      );
      let snapFriend = await getDocs(qFriend);

      if (snapFriend.empty) {
        qFriend = query(
          collection(db, "heroes"),
          where("email", "==", inputTrimmed)
        );
        if ((await getDocs(qFriend)).empty) {
          qFriend = query(
            collection(db, "heroes"),
            where("email", "==", inputTrimmed.toLowerCase())
          );
        }
        snapFriend = await getDocs(qFriend);
      }

      if (snapFriend.empty) {
        setLoading(false);
        return Alert.alert(
          "Não encontrado",
          "Nenhum herói encontrado com este ID ou Email."
        );
      }

      const friendData = snapFriend.docs[0].data();
      targetUserId = friendData.userId;

      if (targetUserId === user.uid) {
        setLoading(false);
        return Alert.alert("Erro", "Você não pode adicionar a si mesmo.");
      }

      if (myFriends.includes(targetUserId)) {
        setLoading(false);
        return Alert.alert(
          "Já são aliados",
          `${friendData.name} já está na sua lista.`
        );
      }

      // B. BUSCAR O MEU DOCUMENTO (Current User) em 'heroes'
      const qMe = query(
        collection(db, "heroes"),
        where("userId", "==", user.uid)
      );
      const snapMe = await getDocs(qMe);

      if (snapMe.empty) {
        setLoading(false);
        return Alert.alert(
          "Erro Crítico",
          "Seu perfil de herói não foi encontrado."
        );
      }

      const myDocId = snapMe.docs[0].id;

      // C. ATUALIZAR
      await updateDoc(doc(db, "heroes", myDocId), {
        friends: arrayUnion(targetUserId),
      });

      Alert.alert(
        "Aliado Encontrado!",
        `${friendData.name} foi adicionado à sua lista.`
      );
      setFriendInput("");
      setFriendModalVisible(false);

      if (view === "ranking_friends") loadRanking("friends");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erro", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!newTitle || !newDesc) return Alert.alert("Erro", "Preencha tudo.");
    try {
      await addDoc(collection(db, "challenges"), {
        title: newTitle,
        description: newDesc,
        creator: heroName || "Anônimo",
        creatorUid: user.uid,
        isPrivate: isPrivate,
        createdAt: new Date(),
        entries: [],
      });
      setModalVisible(false);
      setNewTitle("");
      setNewDesc("");
      setIsPrivate(false);
      Alert.alert("Sucesso", "Desafio criado por 24h.");
    } catch (e) {
      Alert.alert("Erro", "Falha ao criar.");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Excluir", "Confirma?", [
      { text: "Não" },
      {
        text: "Sim",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "challenges", id));
          } catch (e) {}
        },
      },
    ]);
  };

  const handleShare = async (c: any) => {
    try {
      await Share.share({
        message: `Gym RPG: Desafio "${c.title}"!\n${c.description}`,
      });
    } catch (e) {}
  };

  const handleSubmitResult = async () => {
    if (!resultValue || !selectedChallengeId) return;
    try {
      await updateDoc(doc(db, "challenges", selectedChallengeId), {
        entries: arrayUnion({
          hero: heroName,
          value: resultValue,
          link: resultLink,
          date: new Date().toDateString(),
        }),
      });
      setSubmitModalVisible(false);
      setResultValue("");
      setResultLink("");
      Alert.alert("Boa!", "Resultado registrado.");
    } catch (e) {
      Alert.alert("Erro", "Falha ao enviar.");
    }
  };

  // --- RENDERIZAÇÃO ---
  // (Mantive toda a estrutura de renderização igual)
  if (view === "menu") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.title}>ARENA DE COMBATE</Text>
          <Text style={styles.subtitle}>Prove seu valor.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.menuScroll}>
          <TouchableOpacity
            style={styles.bigCard}
            onPress={() => loadRanking("global")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FFD700" }]}>
              <FontAwesome5 name="globe-americas" size={40} color="#000" />
            </View>
            <Text style={styles.bigCardTitle}>TOP GLOBAL</Text>
            <Text style={styles.bigCardSub}>Os mais fortes do servidor</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bigCard}
            onPress={() => loadRanking("friends")}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#4CAF50" }]}>
              <FontAwesome5 name="user-friends" size={35} color="#000" />
            </View>
            <Text style={[styles.bigCardTitle, { color: "#4CAF50" }]}>
              MEUS AMIGOS
            </Text>
            <Text style={styles.bigCardSub}>Ranking da sua galera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bigCard}
            onPress={() => loadChallenges()}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#FF4444" }]}>
              <MaterialCommunityIcons
                name="sword-cross"
                size={40}
                color="#000"
              />
            </View>
            <Text style={[styles.bigCardTitle, { color: "#FF4444" }]}>
              DESAFIOS (PvP)
            </Text>
            <Text style={styles.bigCardSub}>Competições de 24 horas</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>VOLTAR À CIDADE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (view === "ranking" || view === "ranking_friends") {
    return (
      <View style={styles.container}>
        <View style={styles.headerSimple}>
          <TouchableOpacity
            onPress={() => setView("menu")}
            style={styles.miniBackBtn}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {view === "ranking" ? "TOP GLOBAL" : "AMIGOS"}
          </Text>

          {view === "ranking_friends" && (
            <TouchableOpacity
              onPress={() => setFriendModalVisible(true)}
              style={styles.addBtn}
            >
              <FontAwesome5 name="user-plus" size={14} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator
              color="#FFA726"
              size="large"
              style={{ marginTop: 50 }}
            />
          ) : rankingList.length === 0 ? (
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Text style={styles.emptyText}>Lista vazia.</Text>
              {view === "ranking_friends" && (
                <Text style={{ color: "#666" }}>
                  Adicione amigos pelo ID ou Email!
                </Text>
              )}
            </View>
          ) : (
            <FlatList
              data={rankingList}
              // CORREÇÃO CRÍTICA AQUI: Usando userId + index para evitar erro de chave
              keyExtractor={(item, index) =>
                item.userId ? `${item.userId}-${index}` : `key-${index}`
              }
              contentContainerStyle={{ padding: 15 }}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.rankRow,
                    item.userId === user.uid && {
                      borderColor: "#FFD700",
                      borderWidth: 1,
                      backgroundColor: "#2A1A00",
                    },
                  ]}
                >
                  <View style={styles.rankPosition}>
                    {index < 3 ? (
                      <Text style={{ fontSize: 24 }}>
                        {["🥇", "🥈", "🥉"][index]}
                      </Text>
                    ) : (
                      <Text style={styles.rankNumber}>#{index + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName}>
                      {item.name} {item.userId === user.uid && "(Você)"}
                    </Text>
                    <Text style={styles.rankClass}>
                      {item.class?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.rankLevel}>Nv. {item.level}</Text>
                    <Text style={{ color: "#666", fontSize: 10 }}>
                      {item.stats?.xp || 0} XP
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* MODAL ADICIONAR AMIGO */}
        <Modal
          visible={friendModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setFriendModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Adicionar Aliado</Text>
              <Text
                style={{
                  color: "#ccc",
                  marginBottom: 15,
                  textAlign: "center",
                }}
              >
                Digite o ID ou o Email do seu amigo.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: amigo@email.com ou ID"
                placeholderTextColor="#666"
                value={friendInput}
                onChangeText={setFriendInput}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleAddFriend}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.btnText}>BUSCAR E ADICIONAR</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setFriendModalVisible(false)}
              >
                <Text style={{ color: "#888" }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // TELA 3: DESAFIOS
  return (
    <View style={styles.container}>
      <View style={styles.headerSimple}>
        <TouchableOpacity
          onPress={() => setView("menu")}
          style={styles.miniBackBtn}
        >
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DESAFIOS (24H)</Text>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
        >
          <FontAwesome5 name="plus" size={16} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <FontAwesome5
          name="search"
          size={16}
          color="#666"
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar..."
          placeholderTextColor="#666"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {getFilteredChallenges().length === 0 ? (
          <Text style={styles.emptyText}>Nenhum desafio ativo.</Text>
        ) : (
          getFilteredChallenges().map((challenge) => (
            <View
              key={challenge.id}
              style={[
                styles.challengeCard,
                challenge.isPrivate && { borderColor: "#AB47BC" },
              ]}
            >
              <View style={styles.challengeHeader}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text
                      style={[
                        styles.challengeTitle,
                        challenge.isPrivate && { color: "#AB47BC" },
                      ]}
                    >
                      {challenge.title}
                    </Text>
                    {challenge.isPrivate && (
                      <FontAwesome5
                        name="user-friends"
                        size={12}
                        color="#AB47BC"
                      />
                    )}
                  </View>
                  <Text style={styles.challengeCreator}>
                    por {challenge.creator}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 15 }}>
                  <TouchableOpacity onPress={() => handleShare(challenge)}>
                    <FontAwesome5 name="share-alt" size={18} color="#29B6F6" />
                  </TouchableOpacity>
                  {challenge.creatorUid === user?.uid && (
                    <TouchableOpacity
                      onPress={() => handleDelete(challenge.id)}
                    >
                      <FontAwesome5 name="trash" size={18} color="#FF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text style={styles.challengeDesc}>{challenge.description}</Text>
              {challenge.entries && challenge.entries.length > 0 && (
                <View style={styles.entriesBox}>
                  {challenge.entries.map((entry: any, idx: number) => (
                    <View key={idx} style={styles.entryRow}>
                      <Text style={styles.entryText}>
                        <Text style={{ fontWeight: "bold", color: "#FFA726" }}>
                          {entry.hero}:
                        </Text>{" "}
                        {entry.value}
                      </Text>
                      {entry.link ? (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(entry.link)}
                        >
                          <FontAwesome5
                            name="external-link-alt"
                            size={12}
                            color="#4FC3F7"
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  setSelectedChallengeId(challenge.id);
                  setSubmitModalVisible(true);
                }}
              >
                <Text style={styles.actionText}>PARTICIPAR / POSTAR</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* MODAL CRIAR DESAFIO */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Desafio</Text>
            <TextInput
              style={styles.input}
              placeholder="Título"
              placeholderTextColor="#666"
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Descrição"
              placeholderTextColor="#666"
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
            />
            <View style={styles.switchRow}>
              <Text style={{ color: "#fff" }}>Público / Amigos</Text>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: "#4CAF50", true: "#AB47BC" }}
                thumbColor={"#fff"}
              />
            </View>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={handleCreateChallenge}
            >
              <Text style={styles.btnText}>PUBLICAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#888" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL RESULTADO */}
      <Modal
        visible={submitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enviar Prova</Text>
            <TextInput
              style={styles.input}
              placeholder="Resultado"
              placeholderTextColor="#666"
              value={resultValue}
              onChangeText={setResultValue}
            />
            <TextInput
              style={styles.input}
              placeholder="Link (Opcional)"
              placeholderTextColor="#666"
              value={resultLink}
              onChangeText={setResultLink}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: "#4CAF50" }]}
              onPress={handleSubmitResult}
            >
              <Text style={styles.btnText}>ENVIAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSubmitModalVisible(false)}
            >
              <Text style={{ color: "#888" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  header: { padding: 30, paddingTop: 60, alignItems: "center" },
  title: {
    fontSize: 28,
    color: "#FFA726",
    fontWeight: "bold",
    letterSpacing: 2,
  },
  subtitle: { color: "#888", marginTop: 5 },

  menuScroll: { padding: 20, gap: 20, paddingBottom: 100 },

  bigCard: {
    backgroundColor: "#1E1E1E",
    padding: 30,
    borderRadius: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  bigCardTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  bigCardSub: { color: "#888", textAlign: "center", marginTop: 5 },

  backBtn: { position: "absolute", bottom: 30, alignSelf: "center" },
  backText: { color: "#666", fontWeight: "bold" },

  headerSimple: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#1E1E1E",
    borderBottomWidth: 1,
    borderColor: "#333",
    justifyContent: "space-between",
  },
  miniBackBtn: { padding: 10 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  addBtn: {
    backgroundColor: "#FFA726",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    margin: 15,
    marginBottom: 5,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: { flex: 1, color: "#fff" },
  listContainer: { flex: 1 },
  list: { padding: 15 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 30,
    fontStyle: "italic",
  },

  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  rankPosition: { width: 40, alignItems: "center" },
  rankNumber: { color: "#888", fontWeight: "bold", fontSize: 18 },
  rankName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  rankClass: { color: "#FFA726", fontSize: 10 },
  rankLevel: { color: "#FFD700", fontWeight: "bold" },

  challengeCard: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 5,
  },
  challengeTitle: { color: "#FFA726", fontSize: 16, fontWeight: "bold" },
  challengeCreator: { color: "#666", fontSize: 10 },
  challengeDesc: { color: "#ccc", marginBottom: 15, marginTop: 5 },
  entriesBox: {
    backgroundColor: "#151515",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  entryText: { color: "#ddd", fontSize: 12 },
  actionBtn: {
    backgroundColor: "#333",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#555",
  },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#252525",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFA726",
  },
  modalTitle: {
    color: "#FFA726",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1E1E1E",
    color: "#fff",
    padding: 12,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#444",
  },
  modalBtn: {
    backgroundColor: "#FFA726",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 10,
  },
  btnText: { fontWeight: "bold", color: "#000" },
  closeBtn: { alignItems: "center", padding: 10 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
});
