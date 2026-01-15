import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Share,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebaseConfig";

export default function GuildScreen() {
  const router = useRouter();

  // Estados Gerais
  const [user, setUser] = useState<any>(null);
  const [heroData, setHeroData] = useState<any>(null);
  const [guildData, setGuildData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Chat
  const [tab, setTab] = useState<"members" | "chat">("members");
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Inputs de Guilda
  const [guildName, setGuildName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);

  // --- 1. CARREGAR USUÁRIO E HERÓI ---
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currUser) => {
      if (currUser) {
        setUser(currUser);
        const q = query(
          collection(db, "heroes"),
          where("userId", "==", currUser.uid)
        );
        const unsubHero = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const hData = snapshot.docs[0].data();
            setHeroData({ ...hData, id: snapshot.docs[0].id });
          } else {
            setLoading(false);
          }
        });
        return () => unsubHero();
      } else {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // --- 2. CARREGAR DADOS DA GUILDA E CHAT ---
  useEffect(() => {
    if (!heroData) return;

    if (heroData.guildId) {
      // 2.1 Ouve a Guilda
      const guildRef = doc(db, "guilds", heroData.guildId);
      const unsubGuild = onSnapshot(guildRef, (gSnap) => {
        if (gSnap.exists()) {
          setGuildData({ ...gSnap.data(), id: gSnap.id });
          fetchMembers(heroData.guildId);
        } else {
          setGuildData(null);
          setMembers([]);
        }
        setLoading(false);
      });

      // 2.2 Ouve o Chat
      const chatQuery = query(
        collection(db, "guilds", heroData.guildId, "messages"),
        orderBy("createdAt", "asc")
      );
      const unsubChat = onSnapshot(chatQuery, (snapshot) => {
        const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
      });

      return () => {
        unsubGuild();
        unsubChat();
      };
    } else {
      setGuildData(null);
      setMembers([]);
      setLoading(false);
    }
  }, [heroData]);

  // Scroll automático do chat
  useEffect(() => {
    if (messages.length > 0 && tab === "chat") {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        500
      );
    }
  }, [messages, tab]);

  const fetchMembers = async (guildId: string) => {
    try {
      const q = query(
        collection(db, "heroes"),
        where("guildId", "==", guildId)
      );
      const snapshot = await getDocs(q);
      const membersList = snapshot.docs.map((d) => d.data());
      setMembers(membersList.sort((a: any, b: any) => b.level - a.level));
    } catch (err) {
      console.log(err);
    }
  };

  // --- AÇÕES ---
  const handleCreateGuild = async () => {
    if (!guildName)
      return Alert.alert("Nome Inválido", "Dê um nome à sua guilda.");
    setCreating(true);
    try {
      const code = (
        guildName.substring(0, 3) + Math.floor(100 + Math.random() * 900)
      )
        .toUpperCase()
        .replace(/\s/g, "");
      const newGuildRef = doc(collection(db, "guilds"));
      const newGuildData = {
        name: guildName,
        code: code,
        leaderId: user.uid,
        createdAt: new Date(),
        weeklyXp: 0,
        targetXp: 5000,
        level: 1,
      };
      await setDoc(newGuildRef, newGuildData);
      await updateDoc(doc(db, "heroes", heroData.id), {
        guildId: newGuildRef.id,
      });
      Alert.alert("Guilda Criada!", `Código: ${code}`);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível criar.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGuild = async () => {
    if (!joinCode) return Alert.alert("Código vazio", "Digite o código.");
    setCreating(true);
    try {
      const q = query(
        collection(db, "guilds"),
        where("code", "==", joinCode.toUpperCase().trim())
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        Alert.alert("Erro", "Guilda não encontrada.");
        setCreating(false);
        return;
      }
      const guildDoc = snapshot.docs[0];
      await updateDoc(doc(db, "heroes", heroData.id), { guildId: guildDoc.id });
      Alert.alert("Sucesso!", `Bem-vindo à ${guildDoc.data().name}.`);
    } catch (error) {
      Alert.alert("Erro", "Falha ao entrar.");
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = async () => {
    Alert.alert("Sair da Guilda", "Deseja abandonar seus companheiros?", [
      { text: "Ficar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          setCreating(true);
          try {
            await updateDoc(doc(db, "heroes", heroData.id), { guildId: null });
            if (members.length <= 1) {
              await deleteDoc(doc(db, "guilds", guildData.id));
            }
          } catch (error) {
            Alert.alert("Erro", "Falha ao sair.");
          } finally {
            setCreating(false);
          }
        },
      },
    ]);
  };

  const shareCode = async () => {
    if (!guildData) return;
    try {
      await Share.share({
        message: `Entre na guilda "${guildData.name}"! Código: ${guildData.code}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !guildData?.id) return;
    const text = chatInput;
    setChatInput("");
    try {
      await addDoc(collection(db, "guilds", guildData.id, "messages"), {
        text: text,
        sender: heroData.name,
        senderId: user.uid,
        createdAt: new Date(),
      });
    } catch (e) {
      console.error(e);
    }
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {!guildData ? (
        <ScrollView contentContainerStyle={styles.noGuildContent}>
          <FontAwesome5
            name="users"
            size={60}
            color="#666"
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.title}>BUSCAR ALIANÇA</Text>
          <Text style={styles.subtitle}>Juntos vamos mais longe.</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Criar Nova Guilda</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da Guilda"
              placeholderTextColor="#666"
              value={guildName}
              onChangeText={setGuildName}
              maxLength={15}
            />
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleCreateGuild}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnText}>FUNDAR GUILDA</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.orText}>— OU —</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entrar com Código</Text>
            <TextInput
              style={styles.input}
              placeholder="Código (Ex: LOBOS123)"
              placeholderTextColor="#666"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={handleJoinGuild}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnText}>ENTRAR</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.guildHeader}>
            <View>
              <Text style={styles.guildName}>{guildData.name}</Text>
              <TouchableOpacity onPress={shareCode}>
                <Text style={styles.guildCode}>
                  Código: {guildData.code}{" "}
                  <FontAwesome5 name="copy" size={12} />
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleLeave}>
              <MaterialCommunityIcons
                name="exit-run"
                size={24}
                color="#FF4444"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === "members" && styles.activeTab]}
              onPress={() => setTab("members")}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === "members" && { color: "#AB47BC" },
                ]}
              >
                MEMBROS
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === "chat" && styles.activeTab]}
              onPress={() => setTab("chat")}
            >
              <Text
                style={[styles.tabText, tab === "chat" && { color: "#AB47BC" }]}
              >
                CHAT DA PARTY
              </Text>
            </TouchableOpacity>
          </View>

          {tab === "members" ? (
            <ScrollView contentContainerStyle={styles.guildContent}>
              <View style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalTitle}>META SEMANAL</Text>
                  <Text style={styles.goalValue}>
                    {guildData.weeklyXp} / {guildData.targetXp} XP
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(
                          100,
                          (guildData.weeklyXp / guildData.targetXp) * 100
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.goalDesc}>
                  {guildData.weeklyXp >= guildData.targetXp
                    ? "🎉 META ATINGIDA!"
                    : "Treinem na Masmorra para ajudar!"}
                </Text>
              </View>
              <Text style={styles.sectionTitle}>
                MEMBROS ({members.length})
              </Text>
              {members.map((member, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.memberRow}
                  onPress={() =>
                    router.push({
                      pathname: "/profile",
                      params: { userId: member.userId },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberRank}>#{index + 1}</Text>
                    <View>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberClass}>
                        {member.class?.toUpperCase() || "HERÓI"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.memberLevel}>Nv. {member.level}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            // --- CORREÇÃO DO CHAT AQUI ---
            <KeyboardAvoidingView
              // Usando 'padding' para ambos geralmente é mais seguro com offsets altos
              behavior={Platform.OS === "ios" ? "padding" : "padding"}
              // Aumentamos o offset para "empurrar" mais para cima
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 100}
              style={{ flex: 1, backgroundColor: "#1E1E1E" }}
            >
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
                renderItem={({ item }) => {
                  const isMe = item.senderId === user.uid;
                  return (
                    <View
                      style={[
                        styles.msgRow,
                        isMe
                          ? { justifyContent: "flex-end" }
                          : { justifyContent: "flex-start" },
                      ]}
                    >
                      <View
                        style={[
                          styles.msgBubble,
                          isMe ? styles.msgBubbleMe : styles.msgBubbleOther,
                        ]}
                      >
                        {!isMe && (
                          <Text style={styles.msgSender}>{item.sender}</Text>
                        )}
                        <Text style={styles.msgText}>{item.text}</Text>
                      </View>
                    </View>
                  );
                }}
              />
              <View style={styles.chatInputArea}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Mensagem para a guilda..."
                  placeholderTextColor="#666"
                  value={chatInput}
                  onChangeText={setChatInput}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                />
                <TouchableOpacity
                  onPress={handleSendMessage}
                  style={styles.sendBtn}
                >
                  <FontAwesome5 name="paper-plane" size={16} color="#000" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      )}

      {/* Botão Voltar escondido se o teclado estiver aberto na aba Chat (Opcional, mas ajuda a layout) */}
      {tab !== "chat" && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>VOLTAR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  noGuildContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    color: "#FFD700",
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subtitle: { color: "#888", textAlign: "center", marginBottom: 30 },
  card: {
    width: "100%",
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#333",
    marginBottom: 15,
  },
  cardTitle: { color: "#fff", fontWeight: "bold", marginBottom: 10 },
  input: {
    backgroundColor: "#252525",
    color: "#fff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#444",
  },
  createBtn: {
    backgroundColor: "#FFD700",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  joinBtn: {
    backgroundColor: "#AB47BC",
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  btnText: { fontWeight: "bold", color: "#000" },
  orText: { color: "#444", marginBottom: 15 },

  guildHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#1E1E1E",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  guildName: { color: "#FFD700", fontSize: 22, fontWeight: "bold" },
  guildCode: { color: "#888", fontSize: 14, marginTop: 5 },
  guildContent: { padding: 20 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  tab: { flex: 1, padding: 15, alignItems: "center" },
  activeTab: { borderBottomWidth: 3, borderColor: "#AB47BC" },
  tabText: { color: "#666", fontWeight: "bold", fontSize: 12 },

  goalCard: {
    backgroundColor: "#251025",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#AB47BC",
    marginBottom: 30,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  goalTitle: { color: "#AB47BC", fontWeight: "bold" },
  goalValue: { color: "#fff", fontWeight: "bold" },
  track: {
    height: 12,
    backgroundColor: "#402040",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 10,
  },
  fill: { height: "100%", backgroundColor: "#AB47BC", borderRadius: 6 },
  goalDesc: {
    color: "#ccc",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
  sectionTitle: { color: "#666", fontWeight: "bold", marginBottom: 10 },
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  memberInfo: { flexDirection: "row", alignItems: "center", gap: 15 },
  memberRank: { color: "#666", fontWeight: "bold", width: 25 },
  memberName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  memberClass: { color: "#888", fontSize: 10 },
  memberLevel: { color: "#FFD700", fontWeight: "bold" },

  // --- ESTILOS DO CHAT CORRIGIDOS ---
  msgRow: { flexDirection: "row", marginBottom: 10 },
  msgBubble: { maxWidth: "80%", padding: 10, borderRadius: 12 },
  msgBubbleMe: {
    backgroundColor: "#4A148C",
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderColor: "#AB47BC",
  },
  msgBubbleOther: { backgroundColor: "#333", borderTopLeftRadius: 2 },
  msgSender: {
    color: "#AB47BC",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  msgText: { color: "#fff" },

  chatInputArea: {
    flexDirection: "row",
    paddingHorizontal: 15,
    // AQUI: Padding top e bottom maiores para "levantar" o input
    paddingTop: 15,
    paddingBottom: 40,
    backgroundColor: "#151515",
    borderTopWidth: 1,
    borderColor: "#333",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#252525",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: "#fff",
    marginRight: 10,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#AB47BC",
    justifyContent: "center",
    alignItems: "center",
  },

  backButton: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    padding: 10,
    zIndex: -1,
  },
  backText: { color: "#666" },
});
