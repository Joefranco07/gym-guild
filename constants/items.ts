// app/constants/items.ts

export interface Item {
  id: string;
  name: string;
  type: "consumable" | "weapon" | "armor" | "shield" | "accessory" | "book";
  rarity: "common" | "rare" | "epic" | "legendary";
  price?: number; // Se não tiver preço, não vende na loja (item de drop)
  icon: string;
  color: string;
  description: string; // A Lore

  // A Lógica do RPG
  bonuses?: {
    xpFlat?: number; // Ex: +10 XP por treino
    xpMultiplier?: number; // Ex: 1.1 (representa +10%)
    goldMultiplier?: number; // Ex: 1.2 (+20% ouro)
    eventChance?: number; // Ex: 0.1 (+10% chance de evento)
    badEventChance?: number; // Ex: 0.1 (+10% chance de evento ruim)
  };

  // Condição para Drop (Apenas informativo por enquanto)
  dropCondition?: string;
}

export const ITEMS_DATABASE: Record<string, Item> = {
  // --- CONSUMÍVEIS (LOJA) ---
  potion_small: {
    id: "potion_small",
    name: "Poção de XP (P)",
    type: "consumable",
    rarity: "common",
    price: 50,
    icon: "flask",
    color: "#4CAF50",
    description: "Um gole rápido de conhecimento. Garante +20 XP instantâneo.",
  },
  potion_large: {
    id: "potion_large",
    name: "Elixir de XP (G)",
    type: "consumable",
    rarity: "rare",
    price: 200,
    icon: "flask-round-bottom",
    color: "#9C27B0",
    description: "Destilado de suor de dragão. Garante +100 XP instantâneo.",
  },

  // --- EQUIPAMENTOS BÁSICOS (LOJA) ---
  sword_wood: {
    id: "sword_wood",
    name: "Espada de Treino",
    type: "weapon",
    rarity: "common",
    price: 150,
    icon: "sword",
    color: "#8D6E63",
    description: "Feita de carvalho robusto. Boa para aprender os movimentos.",
    bonuses: { xpFlat: 2 }, // +2 XP por treino
  },
  shield_wood: {
    id: "shield_wood",
    name: "Escudo de Carvalho",
    type: "shield",
    rarity: "common",
    price: 150,
    icon: "shield",
    color: "#8D6E63",
    description: "Protege contra farpas, mas não contra fogo.",
    bonuses: { xpFlat: 1 },
  },
  sword_iron: {
    id: "sword_iron",
    name: "Lâmina de Ferro",
    type: "weapon",
    rarity: "common",
    price: 500,
    icon: "sword-cross",
    color: "#B0BEC5",
    description: "Padrão da guarda da cidade. Pesada e confiável.",
    bonuses: { xpFlat: 5 },
  },
  armor_plate: {
    id: "armor_plate",
    name: "Peitoral de Aço",
    type: "armor",
    rarity: "rare",
    price: 1000,
    icon: "tshirt-crew",
    color: "#FFD700",
    description: "Brilha sob o sol. Impõe respeito na Arena.",
    bonuses: { xpMultiplier: 1.05 }, // +5% XP total
  },

  // --- ITENS ESPECIAIS (SUAS IDEIAS) ---

  // 1. O Item do Caos (Vende na Loja, caro)
  amulet_chaos: {
    id: "amulet_chaos",
    name: "Amuleto do Caos",
    type: "accessory",
    rarity: "epic",
    price: 2000,
    icon: "skull",
    color: "#FF4444",
    description:
      "Sussurra desafios perigosos no seu ouvido. Alto risco, alta recompensa.",
    bonuses: {
      badEventChance: 0.15, // Aumenta chance de evento ruim/difícil
      xpMultiplier: 1.2, // Mas dá +20% de XP em tudo
    },
  },

  // 2. O Livro de Leitura (Para o Templo)
  book_ancient: {
    id: "book_ancient",
    name: "Grimório Antigo",
    type: "book",
    rarity: "rare",
    price: 800,
    icon: "book-open-page-variant",
    color: "#29B6F6",
    description: "A leitura deste livro acalma a mente e fortalece o espírito.",
    bonuses: { xpFlat: 20 }, // Bônus específico para quando usar o Templo
  },

  // --- ITENS DE DROP (NÃO TÊM PREÇO) ---

  // 3. Drop de Streak 10
  medal_discipline: {
    id: "medal_discipline",
    name: "Medalha da Constância",
    type: "accessory",
    rarity: "rare",
    icon: "medal",
    color: "#00BCD4",
    description: "Concedida àqueles que nunca falham. (Drop: Streak 10)",
    dropCondition: "streak_10",
    bonuses: { goldMultiplier: 1.1 }, // +10% de Ouro
  },

  // 4. Drop do Boss Dia 30
  sword_demon: {
    id: "sword_demon",
    name: "A Matadora de Demônios",
    type: "weapon",
    rarity: "legendary",
    icon: "fire",
    color: "#D50000",
    description:
      "A lâmina ainda está quente com o sangue do Lorde Demônio. (Drop: Boss 30)",
    dropCondition: "boss_30",
    bonuses: {
      xpMultiplier: 1.5, // +50% XP!!!
      goldMultiplier: 1.5,
    },
  },
};

// Helper para transformar o Objeto em Array (para usar em listas como a Loja)
export const ITEMS_ARRAY = Object.values(ITEMS_DATABASE);
