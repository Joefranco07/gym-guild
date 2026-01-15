export interface GymExercise {
  id: string;
  name: string;
  muscle:
    | "peito"
    | "costas"
    | "pernas"
    | "ombros"
    | "bracos"
    | "abdomen"
    | "cardio"
    | "fullbody";
  category: "forca" | "hipertrofia" | "cardio" | "alongamento" | "funcional";
  locations: ("gym" | "home" | "park")[]; // Onde é possível fazer
  rpgTitle: string;
  rpgLore: string;
  icon: string; // MaterialCommunityIcons
}

// --- ADICIONE ISTO AQUI (ESTAVA FALTANDO) ---
export const RPG_TEMPLATES: any = {
  heavy_lift: {
    titles: ["Mover a Montanha", "Erguer o Monólito", "Força de Titã"],
    lore: "O objeto é incrivelmente pesado. Use toda sua força para movê-lo.",
  },
  fast_cardio: {
    titles: ["Fuga Frenética", "Mensageiro do Vento", "Perseguição"],
    lore: "Não olhe para trás! Apenas continue se movendo o mais rápido possível.",
  },
  balance_core: {
    titles: ["Postura da Garça", "Equilíbrio na Corda", "Mente de Pedra"],
    lore: "O chão é instável. Mantenha o foco e o corpo rígido para não cair.",
  },
  high_reps: {
    titles: ["A Batalha Longa", "Resistência de Ferro", "Golpes Infinitos"],
    lore: "O inimigo não cansa. Você também não pode cansar. Continue!",
  },
  stretching: {
    titles: ["Recuperar Mana", "Curar Feridas", "Alinhar os Chakras"],
    lore: "Respire fundo e deixe a energia fluir pelos seus membros.",
  },
};

export const GYM_DATABASE: GymExercise[] = [
  // ============================================================
  // PEITO (CHEST) - PUSH
  // ============================================================
  {
    id: "bench_press_barbell",
    name: "Supino Reto (Barra)",
    muscle: "peito",
    category: "forca",
    locations: ["gym"],
    rpgTitle: "Empurrar o Portão",
    rpgLore: "O portão do castelo caiu sobre você! Empurre para sobreviver.",
    icon: "weight-lifter",
  },
  {
    id: "bench_press_dumbbell",
    name: "Supino Reto (Halteres)",
    muscle: "peito",
    category: "hipertrofia",
    locations: ["gym", "home"], // Home se tiver halteres
    rpgTitle: "Equilíbrio de Escudos",
    rpgLore: "Mantenha dois escudos pesados erguidos contra os gigantes.",
    icon: "dumbbell",
  },
  {
    id: "push_up",
    name: "Flexão de Braço",
    muscle: "peito",
    category: "funcional",
    locations: ["gym", "home", "park"],
    rpgTitle: "Levantar da Lama",
    rpgLore: "Você caiu no pântano durante a batalha. Levante-se rápido!",
    icon: "human-handsup",
  },
  {
    id: "push_up_diamond",
    name: "Flexão Diamante",
    muscle: "peito", // Foco triceps
    category: "forca",
    locations: ["gym", "home", "park"],
    rpgTitle: "Foco do Monge",
    rpgLore: "Concentre sua energia em um único ponto para quebrar a pedra.",
    icon: "triangle-outline",
  },
  {
    id: "crossover",
    name: "Cross Over (Polia)",
    muscle: "peito",
    category: "hipertrofia",
    locations: ["gym"],
    rpgTitle: "Fechar o Portal",
    rpgLore: "Use as correntes mágicas para fechar a fenda dimensional.",
    icon: "vector-combine",
  },

  // ============================================================
  // COSTAS (BACK) - PULL
  // ============================================================
  {
    id: "pull_up",
    name: "Barra Fixa (Pronada)",
    muscle: "costas",
    category: "forca",
    locations: ["gym", "park"],
    rpgTitle: "Escalar Muralha",
    rpgLore: "Infiltre-se na fortaleza inimiga subindo o muro externo.",
    icon: "ladder",
  },
  {
    id: "chin_up",
    name: "Barra Fixa (Supinada)",
    muscle: "bracos", // Foco biceps
    category: "forca",
    locations: ["gym", "park"],
    rpgTitle: "Içar a Vela",
    rpgLore: "Puxe as cordas para levantar a vela principal do navio.",
    icon: "arm-flex",
  },
  {
    id: "lat_pulldown",
    name: "Puxada Alta (Polia)",
    muscle: "costas",
    category: "hipertrofia",
    locations: ["gym"],
    rpgTitle: "Derrubar o Teto",
    rpgLore: "Puxe as correntes para desabar o teto sobre os orcs.",
    icon: "arrow-down-bold",
  },
  {
    id: "row_barbell",
    name: "Remada Curvada (Barra)",
    muscle: "costas",
    category: "forca",
    locations: ["gym"],
    rpgTitle: "Remar contra a Maré",
    rpgLore: "A tempestade é forte, mas seus braços são mais.",
    icon: "rowing",
  },
  {
    id: "deadlift",
    name: "Levantamento Terra",
    muscle: "costas", // E pernas
    category: "forca",
    locations: ["gym"],
    rpgTitle: "Erguer o Tesouro",
    rpgLore: "O baú do dragão é imenso e pesado. Tire-o do chão.",
    icon: "treasure-chest",
  },

  // ============================================================
  // PERNAS (LEGS) - SQUAT/LUNGE
  // ============================================================
  {
    id: "squat_barbell",
    name: "Agachamento Livre",
    muscle: "pernas",
    category: "forca",
    locations: ["gym"],
    rpgTitle: "O Peso do Mundo",
    rpgLore: "Atlas precisa de descanso. Segure o céu por um momento.",
    icon: "human-handsdown",
  },
  {
    id: "leg_press",
    name: "Leg Press 45",
    muscle: "pernas",
    category: "hipertrofia",
    locations: ["gym"],
    rpgTitle: "Prensa Hidráulica",
    rpgLore: "Empurre o mecanismo da porta de pedra com as pernas.",
    icon: "engine",
  },
  {
    id: "lunge",
    name: "Afundo / Passada",
    muscle: "pernas",
    category: "funcional",
    locations: ["gym", "home", "park"],
    rpgTitle: "Marcha do Gigante",
    rpgLore: "Avance pelo terreno difícil com passos largos e firmes.",
    icon: "shoe-print",
  },
  {
    id: "calf_raise",
    name: "Elevação de Panturrilha",
    muscle: "pernas",
    category: "hipertrofia",
    locations: ["gym", "home", "park"],
    rpgTitle: "Alcance a Prateleira",
    rpgLore: "Fique na ponta dos pés para pegar a poção na estante alta.",
    icon: "foot-print",
  },
  {
    id: "squat_jump",
    name: "Agachamento com Salto",
    muscle: "pernas",
    category: "funcional",
    locations: ["home", "park", "gym"],
    rpgTitle: "Salto na Ravina",
    rpgLore: "O chão está cedendo! Pule para a pedra segura.",
    icon: "arrow-up-bold",
  },

  // ============================================================
  // OMBROS (SHOULDERS)
  // ============================================================
  {
    id: "overhead_press",
    name: "Desenvolvimento (Barra/Halter)",
    muscle: "ombros",
    category: "forca",
    locations: ["gym", "home"],
    rpgTitle: "Arremesso de Rocha",
    rpgLore: "Erga a pedra acima da cabeça para jogá-la da muralha.",
    icon: "human-handsup",
  },
  {
    id: "lateral_raise",
    name: "Elevação Lateral",
    muscle: "ombros",
    category: "hipertrofia",
    locations: ["gym", "home"],
    rpgTitle: "Asas de Dragão",
    rpgLore: "Abra os braços e mantenha a postura de voo.",
    icon: "bird",
  },

  // ============================================================
  // BRAÇOS (ARMS)
  // ============================================================
  {
    id: "bicep_curl",
    name: "Rosca Direta",
    muscle: "bracos",
    category: "hipertrofia",
    locations: ["gym", "home"],
    rpgTitle: "Carregar Suprimentos",
    rpgLore: "Leve os barris de hidromel para a taverna.",
    icon: "arm-flex",
  },
  {
    id: "tricep_extension",
    name: "Tríceps Testa / Corda",
    muscle: "bracos",
    category: "hipertrofia",
    locations: ["gym"],
    rpgTitle: "Golpe de Martelo",
    rpgLore: "Estenda o braço para finalizar o golpe na bigorna.",
    icon: "hammer",
  },

  // ============================================================
  // ABDOMEN (CORE)
  // ============================================================
  {
    id: "plank",
    name: "Prancha Isométrica",
    muscle: "abdomen",
    category: "funcional",
    locations: ["gym", "home", "park"],
    rpgTitle: "Escudo Humano",
    rpgLore: "Flechas voando! Mantenha o corpo rígido como aço.",
    icon: "minus",
  },
  {
    id: "crunch",
    name: "Abdominal Supra",
    muscle: "abdomen",
    category: "funcional",
    locations: ["gym", "home", "park"],
    rpgTitle: "Levantar do Túmulo",
    rpgLore: "Os mortos-vivos se levantam usando a força do ventre.",
    icon: "human",
  },
  {
    id: "mountain_climber",
    name: "Mountain Climber",
    muscle: "abdomen",
    category: "cardio",
    locations: ["gym", "home", "park"],
    rpgTitle: "Escalada Rápida",
    rpgLore: "A montanha está desmoronando. Suba rápido!",
    icon: "image-filter-hdr",
  },

  // ============================================================
  // CARDIO / AERÓBICO
  // ============================================================
  {
    id: "run_treadmill",
    name: "Esteira (Corrida)",
    muscle: "cardio",
    category: "cardio",
    locations: ["gym"],
    rpgTitle: "Fuga do Dragão",
    rpgLore: "Ele acordou e está faminto. Corra pela sua vida!",
    icon: "run-fast",
  },
  {
    id: "run_outdoor",
    name: "Corrida de Rua",
    muscle: "cardio",
    category: "cardio",
    locations: ["park", "street" as any],
    rpgTitle: "Mensageiro Real",
    rpgLore: "Entregue a carta ao rei antes do pôr do sol.",
    icon: "map-marker-path",
  },
  {
    id: "bike",
    name: "Bicicleta Ergométrica",
    muscle: "cardio",
    category: "cardio",
    locations: ["gym", "home"],
    rpgTitle: "Cavalgada",
    rpgLore: "Seu cavalo galopa incansavelmente pelas planícies.",
    icon: "bike",
  },
  {
    id: "burpees",
    name: "Burpees",
    muscle: "fullbody",
    category: "cardio",
    locations: ["gym", "home", "park"],
    rpgTitle: "Combate Desesperado",
    rpgLore: "Cair, levantar, pular. A batalha é caótica!",
    icon: "fire",
  },
  {
    id: "jumping_jacks",
    name: "Polichinelos",
    muscle: "fullbody",
    category: "cardio",
    locations: ["gym", "home", "park"],
    rpgTitle: "Ritual de Chuva",
    rpgLore: "Pule e bata as mãos para invocar a tempestade.",
    icon: "weather-pouring",
  },

  // ============================================================
  // ALONGAMENTO / MOBILIDADE
  // ============================================================
  {
    id: "stretch_hamstring",
    name: "Alongamento Posterior",
    muscle: "pernas",
    category: "alongamento",
    locations: ["gym", "home", "park"],
    rpgTitle: "Reverência ao Rei",
    rpgLore: "Curve-se diante do trono sem dobrar os joelhos.",
    icon: "human-greeting",
  },
  {
    id: "yoga_pose",
    name: "Postura de Yoga (Cão/Gato)",
    muscle: "fullbody",
    category: "alongamento",
    locations: ["home", "gym"],
    rpgTitle: "Sintonia Animal",
    rpgLore: "Imite os movimentos da natureza para recuperar mana.",
    icon: "yin-yang",
  },
];
