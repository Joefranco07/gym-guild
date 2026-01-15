import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome5 } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
// AQUI ESTÁ A CORREÇÃO: Apenas um "../"
import { auth, db } from "../firebaseConfig";

const { width } = Dimensions.get("window");

export default function CityHub() {
  const router = useRouter();
  const [heroData, setHeroData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usamos doc() diretamente na coleção 'heroes'
        const docRef = doc(db, "heroes", user.uid);
        const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setHeroData(docSnap.data());
          } else {
            // Se não achar o herói, talvez redirecionar?
            // router.replace("/create");
          }
          setLoading(false);
        });
        return () => unsubscribeSnapshot();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const stats = heroData
    ? heroData.stats
    : { xp: 0, hp: 100, gold: 0, gems: 0 };
  const heroName = heroData ? heroData.name : "Aventureiro";
  const heroLevel = heroData ? heroData.level : 1;

  const isTrainer = heroData?.isTrainer === true;

  const xpTarget = heroLevel * 100;
  const xpPercentage = Math.min(100, (stats.xp / xpTarget) * 100);

  const menuItems = [
    {
      id: "dungeon",
      title: "Masmorra",
      subtitle: "Treino Diário",
      icon: "dungeon",
      color: "#ef5350",
    },
    {
      id: "arena",
      title: "Arena",
      subtitle: "PvP",
      icon: "fist-raised",
      color: "#FFA726",
    },
    {
      id: "guild",
      title: "Guilda",
      subtitle: "Social",
      icon: "users",
      color: "#AB47BC",
    },
    {
      id: "trainer",
      title: "Mestre",
      subtitle: "Criar Treino",
      icon: "chess-king",
      color: "#FFD700",
      restricted: true,
    },
    {
      id: "temple",
      title: "Templo",
      subtitle: "Foco",
      icon: "place-of-worship",
      color: "#29B6F6",
    },
    {
      id: "inventory",
      title: "Inventário",
      subtitle: "Itens",
      icon: "shopping-bag",
      color: "#66BB6A",
    },
    {
      id: "quests",
      title: "Missões",
      subtitle: "Extras",
      icon: "scroll",
      color: "#8D6E63",
    },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (item.restricted && !isTrainer) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TouchableOpacity
        style={styles.profileSection}
        onPress={() => router.push("/profile")}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}>
          <FontAwesome5 name="user-ninja" size={35} color="#FFD700" />
        </View>
        <View style={styles.profileInfo}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#FFD700"
              style={{ alignSelf: "flex-start" }}
            />
          ) : (
            <Text style={styles.heroName}>
              {heroName} {isTrainer && "👑"}
            </Text>
          )}
          <Text style={styles.heroLevel}>
            Nível {heroLevel} {isTrainer ? "Mestre" : "Aventureiro"}
          </Text>

          <View style={styles.barContainer}>
            <Text style={styles.barLabel}>XP</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${xpPercentage}%`, backgroundColor: "#29B6F6" },
                ]}
              />
            </View>
          </View>

          <View style={styles.barContainer}>
            <Text style={styles.barLabel}>HP</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${stats.hp}%`, backgroundColor: "#ef5350" },
                ]}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.resourcesContainer}>
        <View style={styles.resourceItem}>
          <FontAwesome5 name="coins" size={16} color="#FFD700" />
          <Text style={styles.resourceText}>{stats.gold} Ouro</Text>
        </View>
        <View style={styles.resourceDivider} />
        <View style={styles.resourceItem}>
          <FontAwesome5 name="gem" size={16} color="#E040FB" />
          <Text style={styles.resourceText}>{stats.gems} Gemas</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        {visibleMenuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => {
              if (item.id === "dungeon") router.push("/dungeon");
              else if (item.id === "quests") router.push("/quests");
              else if (item.id === "guild") router.push("/guild");
              else if (item.id === "inventory") router.push("/inventory");
              else if (item.id === "temple") router.push("/temple");
              else if (item.id === "arena") router.push("/arena");
              else if (item.id === "trainer") router.push("/trainer");
              else alert(`Em breve: ${item.title}`);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: item.color + "20" },
              ]}
            >
              <FontAwesome5
                name={item.icon as any}
                size={24}
                color={item.color}
              />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.logoutText}>Sair do Jogo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#121212" },
  profileSection: {
    flexDirection: "row",
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#2C2C2C",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFD700",
    marginRight: 20,
  },
  profileInfo: { flex: 1 },
  heroName: { color: "#FFF", fontSize: 20, fontWeight: "bold" },
  heroLevel: { color: "#FFD700", fontSize: 14, marginBottom: 8 },
  barContainer: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  barLabel: { color: "#888", fontSize: 10, width: 25, fontWeight: "bold" },
  track: {
    flex: 1,
    height: 8,
    backgroundColor: "#333",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 4 },
  resourcesContainer: {
    flexDirection: "row",
    backgroundColor: "#252525",
    padding: 15,
    justifyContent: "space-around",
    marginBottom: 10,
    elevation: 5,
    borderBottomWidth: 1,
    borderColor: "#333",
  },
  resourceItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  resourceText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  resourceDivider: { width: 1, height: "100%", backgroundColor: "#444" },
  gridContainer: {
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: width / 2 - 25,
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  cardSubtitle: { color: "#888", fontSize: 12, marginTop: 2 },
  logoutButton: {
    width: "100%",
    padding: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  logoutText: { color: "#666", textDecorationLine: "underline" },
});
