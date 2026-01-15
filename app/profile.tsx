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
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { FontAwesome5, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { ITEMS_DATABASE } from "../constants/items";

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [heroData, setHeroData] = useState<any>(null);
  const [heroId, setHeroId] = useState<string | null>(null);

  const [trainingGoal, setTrainingGoal] = useState(3);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<
    "weapon" | "armor" | "shield" | "accessory" | "book" | null
  >(null);

  useEffect(() => {
    const init = async () => {
      const currUser = auth.currentUser;
      const targetUserId = params.userId || currUser?.uid;

      if (!targetUserId) return;
      setIsOwnProfile(targetUserId === currUser?.uid);

      try {
        const q = query(
          collection(db, "heroes"),
          where("userId", "==", targetUserId)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          setHeroData(data);
          setHeroId(docSnap.id);
          setTrainingGoal(data.settings?.trainingGoal || 3);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [params.userId]);

  const handleSave = async () => {
    if (!heroId || !isOwnProfile) return;
    try {
      const heroRef = doc(db, "heroes", heroId);
      await updateDoc(heroRef, { "settings.trainingGoal": trainingGoal });
      Alert.alert("Perfil Atualizado", "Suas preferências foram salvas.");
    } catch (e) {
      Alert.alert("Erro", "Falha ao salvar.");
    }
  };

  const handleEquip = async (itemId: string) => {
    if (!selectedSlot || !heroId) return;
    const newEquipped = {
      ...(heroData.equipped || {}),
      [selectedSlot]: itemId,
    };
    setHeroData({ ...heroData, equipped: newEquipped });
    await updateDoc(doc(db, "heroes", heroId), {
      [`equipped.${selectedSlot}`]: itemId,
    });
    setModalVisible(false);
  };

  const renderSlot = (
    slot: "weapon" | "armor" | "shield" | "accessory" | "book",
    iconDefault: string,
    label: string
  ) => {
    const itemId = heroData?.equipped?.[slot];
    const item = itemId ? ITEMS_DATABASE[itemId] : null;

    return (
      <View style={{ alignItems: "center" }}>
        <TouchableOpacity
          style={[
            styles.slot,
            item && {
              borderColor: item.color,
              backgroundColor: item.color + "20",
            },
          ]}
          onPress={() => {
            if (isOwnProfile) {
              setSelectedSlot(slot);
              setModalVisible(true);
            }
          }}
          disabled={!isOwnProfile}
        >
          {item ? (
            <MaterialCommunityIcons
              name={item.icon as any}
              size={30}
              color={item.color}
            />
          ) : (
            <MaterialCommunityIcons
              name={iconDefault as any}
              size={30}
              color="#333"
            />
          )}
          {isOwnProfile && (
            <View style={styles.editBadge}>
              <FontAwesome5 name="plus" size={8} color="#000" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.slotLabel}>{label}</Text>
      </View>
    );
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFD700" size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwnProfile
            ? "MEU PERFIL"
            : `PERFIL DE ${heroData?.name?.toUpperCase()}`}
        </Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* EQUIPAMENTOS PRINCIPAIS */}
        <View style={styles.avatarSection}>
          <View style={styles.equipmentColumn}>
            {renderSlot("weapon", "sword", "ARMA")}
            <View style={{ height: 15 }} />
            {renderSlot("accessory", "ring", "AMULETO")}
          </View>
          <View style={styles.centerAvatar}>
            <View style={[styles.avatarCircle, { borderColor: "#FFD700" }]}>
              <FontAwesome5 name="user-ninja" size={60} color="#FFD700" />
            </View>
            <Text style={styles.heroName}>{heroData?.name}</Text>
            <Text style={styles.heroClass}>
              {heroData?.class} • Nível {heroData?.level}
            </Text>
          </View>
          <View style={styles.equipmentColumn}>
            {renderSlot("armor", "tshirt-crew", "ARMADURA")}
            <View style={{ height: 15 }} />
            {renderSlot("shield", "shield", "ESCUDO")}
          </View>
        </View>

        {/* SLOT EXTRA (LIVRO/ESPECIAL) */}
        <View style={styles.extraSlotRow}>
          {renderSlot("book", "book", "EXTRA / LIVRO")}
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>XP Atual</Text>
            <Text style={styles.statValue}>
              {heroData?.stats?.xp || 0} / {(heroData?.level || 1) * 100}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={[styles.statValue, { color: "#FF4444" }]}>
              🔥 {heroData?.stats?.streak || 0}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Ouro</Text>
            <Text style={[styles.statValue, { color: "#FFD700" }]}>
              🟡 {heroData?.stats?.gold || 0}
            </Text>
          </View>
        </View>

        {isOwnProfile && (
          <View style={styles.configCard}>
            <Text style={styles.configTitle}>META DE DISCIPLINA</Text>
            <Text style={styles.configDesc}>
              Quantos dias por semana você vai treinar?
            </Text>
            <View style={styles.goalControl}>
              <TouchableOpacity
                onPress={() => setTrainingGoal(Math.max(1, trainingGoal - 1))}
                style={styles.goalBtn}
              >
                <FontAwesome5 name="minus" size={16} color="#fff" />
              </TouchableOpacity>
              <View style={styles.goalDisplay}>
                <Text style={styles.goalNumber}>{trainingGoal}</Text>
                <Text style={styles.goalText}>DIAS</Text>
              </View>
              <TouchableOpacity
                onPress={() => setTrainingGoal(Math.min(7, trainingGoal + 1))}
                style={styles.goalBtn}
              >
                <FontAwesome5 name="plus" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>SALVAR PREFERÊNCIAS</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Equipar Item</Text>
            <ScrollView style={{ maxHeight: 300, width: "100%" }}>
              {(heroData?.inventory || []).map(
                (itemId: string, index: number) => {
                  const item = ITEMS_DATABASE[itemId];
                  if (!item) return null;

                  // Filtra tipo para o slot selecionado
                  let isCompatible = false;
                  if (selectedSlot === item.type) isCompatible = true;
                  // Lógica para 'book' pode ser item.type === 'book'
                  // Lógica para 'accessory' pode ser item.type === 'accessory'

                  if (!isCompatible) return null;

                  return (
                    <TouchableOpacity
                      key={index}
                      style={styles.invItem}
                      onPress={() => handleEquip(itemId)}
                    >
                      <MaterialCommunityIcons
                        name={item.icon as any}
                        size={24}
                        color={item.color}
                      />
                      <Text style={styles.invName}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                }
              )}
              <TouchableOpacity
                style={styles.invItem}
                onPress={() => handleEquip("")}
              >
                <FontAwesome5 name="times" size={20} color="#FF4444" />
                <Text style={[styles.invName, { color: "#FF4444" }]}>
                  Remover Equipamento
                </Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#1E1E1E",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  backBtn: { padding: 10 },
  content: { padding: 20 },
  avatarSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  extraSlotRow: { alignItems: "center", marginBottom: 30 },
  centerAvatar: { alignItems: "center", marginHorizontal: 20 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#222",
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  heroName: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  heroClass: { color: "#888", fontSize: 12, textTransform: "uppercase" },
  equipmentColumn: { justifyContent: "center", alignItems: "center" },
  slot: {
    width: 50,
    height: 50,
    backgroundColor: "#1A1A1A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#444",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  slotLabel: { color: "#666", fontSize: 8, marginTop: 4, fontWeight: "bold" },
  editBadge: {
    position: "absolute",
    bottom: -5,
    right: -5,
    backgroundColor: "#FFD700",
    width: 15,
    height: 15,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 20,
    justifyContent: "space-between",
    marginBottom: 25,
    borderWidth: 1,
    borderColor: "#333",
  },
  statRow: { alignItems: "center", flex: 1 },
  statLabel: { color: "#888", fontSize: 10, marginBottom: 5 },
  statValue: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  statDivider: { width: 1, height: "100%", backgroundColor: "#333" },
  configCard: {
    backgroundColor: "#1E1E1E",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  configTitle: {
    color: "#FFA726",
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  configDesc: { color: "#888", fontSize: 12, marginBottom: 20 },
  goalControl: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 20,
  },
  goalBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  goalDisplay: { alignItems: "center" },
  goalNumber: { color: "#fff", fontSize: 36, fontWeight: "bold" },
  goalText: { color: "#FFA726", fontSize: 10, fontWeight: "bold" },
  saveBtn: {
    backgroundColor: "#FFA726",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveText: { color: "#000", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#252525",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    maxHeight: "60%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  invItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    width: "100%",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    gap: 15,
  },
  invName: { color: "#ccc", fontWeight: "bold" },
  closeBtn: { marginTop: 10, padding: 10 },
  closeText: { color: "#888" },
});
