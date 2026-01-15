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
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
// IMPORTAÇÃO DO NOVO BANCO DE DADOS
import { ITEMS_DATABASE, ITEMS_ARRAY } from "../constants/items";

export default function InventoryScreen() {
  const router = useRouter();

  // Estados
  const [heroData, setHeroData] = useState<any>(null);
  const [heroId, setHeroId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"bag" | "shop">("bag");

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

  // --- HELPER: TRADUZIR BÔNUS PARA TEXTO ---
  const getEffectString = (item: any) => {
    if (item.type === "consumable") return null;
    if (!item.bonuses) return null;

    const parts = [];
    if (item.bonuses.xpFlat) parts.push(`+${item.bonuses.xpFlat} XP Base`);
    if (item.bonuses.xpMultiplier)
      parts.push(`+${Math.round((item.bonuses.xpMultiplier - 1) * 100)}% XP`);
    if (item.bonuses.goldMultiplier)
      parts.push(
        `+${Math.round((item.bonuses.goldMultiplier - 1) * 100)}% Ouro`
      );
    if (item.bonuses.eventChance)
      parts.push(`+${Math.round(item.bonuses.eventChance * 100)}% Chance`);
    if (item.bonuses.badEventChance)
      parts.push(
        `⚠️ +${Math.round(item.bonuses.badEventChance * 100)}% Perigo`
      );

    return parts.join(" | ");
  };

  // --- COMPRAR ITEM ---
  const handleBuy = async (item: any) => {
    if (!item.price) return;

    // Verifica posse
    const currentInv = heroData.inventory || [];
    const isOwned = item.type !== "consumable" && currentInv.includes(item.id);

    if (isOwned) return;

    if ((heroData.stats.gold || 0) < item.price) {
      return Alert.alert(
        "Saldo Insuficiente",
        "Vá treinar na Masmorra para ganhar mais ouro!"
      );
    }

    Alert.alert(
      "Confirmar Compra",
      `Comprar ${item.name} por ${item.price} Ouro?`,
      [
        { text: "Cancelar" },
        {
          text: "Comprar",
          onPress: async () => {
            try {
              const heroRef = doc(db, "heroes", heroId!);
              await updateDoc(heroRef, {
                "stats.gold": heroData.stats.gold - item.price,
                inventory: [...currentInv, item.id],
              });
              Alert.alert("Sucesso!", `${item.name} foi adicionado à mochila.`);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ]
    );
  };

  // --- USAR ITEM ---
  const handleUse = async (itemId: string) => {
    const itemInfo = ITEMS_DATABASE[itemId];
    if (!itemInfo) return;

    if (itemInfo.type !== "consumable") {
      return Alert.alert(
        "Equipamento",
        "Para equipar armas e armaduras, vá até o seu PERFIL (clicando no seu avatar na Cidade)."
      );
    }

    try {
      const heroRef = doc(db, "heroes", heroId!);
      let removed = false;
      const newInv = heroData.inventory.filter((id: string) => {
        if (!removed && id === itemId) {
          removed = true;
          return false;
        }
        return true;
      });

      let xpGain = 0;
      if (itemId === "potion_small") xpGain = 20;
      else if (itemId === "potion_large") xpGain = 100;

      let currentLevel = heroData.level;
      let currentXp = (heroData.stats.xp || 0) + xpGain;
      let leveledUp = false;

      while (currentXp >= currentLevel * 100) {
        currentXp -= currentLevel * 100;
        currentLevel++;
        leveledUp = true;
      }

      if (leveledUp) {
        Alert.alert(
          "LEVEL UP! 🎉",
          `A poção fez efeito! Você subiu para o nível ${currentLevel}.`
        );
      } else {
        Alert.alert("Glup, glup...", `Você ganhou +${xpGain} XP.`);
      }

      await updateDoc(heroRef, {
        inventory: newInv,
        "stats.xp": currentXp,
        level: currentLevel,
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#FFD700" style={{ marginTop: 50 }} />
      </View>
    );

  const myItems = (heroData?.inventory || [])
    .map((id: string) => ITEMS_DATABASE[id])
    .filter(Boolean);

  const shopItems = ITEMS_ARRAY.filter((item) => item.price !== undefined);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>MERCADO</Text>
          <Text style={styles.subtitle}>
            Gaste suas riquezas com sabedoria.
          </Text>
        </View>
        <View style={styles.goldBadge}>
          <FontAwesome5 name="coins" size={16} color="#FFD700" />
          <Text style={styles.goldText}>{heroData?.stats?.gold || 0}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "bag" && styles.activeTab]}
          onPress={() => setTab("bag")}
        >
          <Text style={[styles.tabText, tab === "bag" && styles.activeTabText]}>
            🎒 MOCHILA ({myItems.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === "shop" && styles.activeTab]}
          onPress={() => setTab("shop")}
        >
          <Text
            style={[styles.tabText, tab === "shop" && styles.activeTabText]}
          >
            ⚖️ LOJA
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {/* --- ABA MOCHILA --- */}
        {tab === "bag" &&
          (myItems.length === 0 ? (
            <Text style={styles.emptyText}>
              Sua mochila está vazia. Vá à Loja!
            </Text>
          ) : (
            myItems.map((item: any, index: number) => {
              const effectText = getEffectString(item);
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.card}
                  onPress={() => handleUse(item.id)}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: item.color + "20" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={30}
                      color={item.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {effectText ? (
                      <Text style={styles.itemEffect}>{effectText}</Text>
                    ) : (
                      <Text style={styles.itemType}>
                        {item.type === "consumable"
                          ? "Clique para Usar"
                          : "Equipamento"}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          ))}

        {/* --- ABA LOJA --- */}
        {tab === "shop" &&
          shopItems.map((item) => {
            const effectText = getEffectString(item);

            // VERIFICA SE JÁ TEM
            const isOwned =
              item.type !== "consumable" &&
              (heroData?.inventory || []).includes(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.shopCard, isOwned && { opacity: 0.5 }]}
                onPress={() => handleBuy(item)}
                disabled={isOwned}
              >
                <View
                  style={[
                    styles.shopIcon,
                    { backgroundColor: item.color + "20" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={30}
                    color={item.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shopName}>{item.name}</Text>
                  {effectText && (
                    <Text style={styles.itemEffect}>{effectText}</Text>
                  )}
                  <Text style={styles.shopDesc}>{item.description}</Text>
                </View>
                <View
                  style={[
                    styles.priceTag,
                    isOwned && { backgroundColor: "#333" },
                  ]}
                >
                  {isOwned ? (
                    <Text
                      style={{
                        color: "#888",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      COMPRADO
                    </Text>
                  ) : (
                    <>
                      <Text style={styles.priceText}>{item.price}</Text>
                      <FontAwesome5 name="coins" size={12} color="#000" />
                    </>
                  )}
                </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  title: { color: "#FFD700", fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "#666", fontSize: 12 },
  goldBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#332b00",
    padding: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#FFD700",
  },
  goldText: { color: "#FFD700", fontWeight: "bold", fontSize: 16 },

  tabs: { flexDirection: "row", backgroundColor: "#1E1E1E" },
  tabBtn: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  activeTab: { borderColor: "#FFD700", backgroundColor: "#252525" },
  tabText: { color: "#666", fontWeight: "bold", fontSize: 12 },
  activeTabText: { color: "#FFD700" },

  grid: { padding: 15 },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 50,
    fontStyle: "italic",
  },

  // Estilo Mochila
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
    gap: 15,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: { color: "#eee", fontWeight: "bold" },
  itemType: { color: "#4CAF50", fontSize: 11, fontWeight: "bold" },
  itemEffect: {
    color: "#4CAF50",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 2,
    marginBottom: 2,
  },

  // Estilo Loja
  shopCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
    gap: 15,
  },
  shopIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  shopName: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  shopDesc: { color: "#888", fontSize: 11, maxWidth: "95%" },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFD700",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    gap: 5,
  },
  priceText: { color: "#000", fontWeight: "bold", fontSize: 14 },

  backButton: {
    margin: 20,
    marginTop: 0,
    padding: 15,
    backgroundColor: "#252525",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  backText: { color: "#888", fontWeight: "bold" },
});
