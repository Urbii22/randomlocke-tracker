export type PokemonStatus =
  | "alive"
  | "box"
  | "dead"
  | "candidate"
  | "sacrificable"
  | "forbidden"
  | "shiny_extra";

export type RouteStatus =
  | "pending"
  | "one_used"
  | "completed"
  | "failed"
  | "shiny_extra"
  | "legendary_ignored";

export type BattleType = "gym" | "friend" | "rival" | "boss" | "other";

export type InventoryCategory =
  | "tm"
  | "held_item"
  | "medicine"
  | "pokeball"
  | "berry"
  | "battle_item"
  | "key_item"
  | "other";

export type InventoryStatus = "available" | "equipped" | "used" | "sold" | "reserved";

export type MoveCategory = "physical" | "special" | "status" | "unknown";

export type PokemonMove = {
  name: string;
  type: string;
  power: number | null;
  accuracy: number | null;
  category: MoveCategory;
};

export type PokemonStats = {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
};

export type PokemonSaveSource = "manual" | "party" | "box";

export type Pokemon = {
  id: string;
  species: string;
  nickname: string;
  level: number;
  types: string[];
  ability: string;
  moves: PokemonMove[];
  item: string;
  stats?: PokemonStats;
  source?: PokemonSaveSource;
  partySlot?: number;
  box?: number;
  slot?: number;
  lastSeenInSaveAt?: string;
  status: PokemonStatus;
  role: string;
  value: number;
  notes: string;
  routeCaught: string;
  deathCause: string;
  deathLocation: string;
};

export type Route = {
  id: string;
  name: string;
  capture1PokemonId: string;
  capture2PokemonId: string;
  status: RouteStatus;
  notes: string;
};

export type RouteDraft = Omit<Route, "id">;

export type Battle = {
  id: string;
  name: string;
  type: BattleType;
  levelCap?: number;
  notes: string;
  completed: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  location: string;
  status: InventoryStatus;
  holderPokemonId: string;
  notes: string;
};

export type InventoryItemDraft = Omit<InventoryItem, "id">;

export type LevelCap = {
  gym: number;
  leader: string;
  cap: number;
};

export type GameSettings = {
  saveFilePath: string;
  lastSaveSyncAt?: string;
  lastSaveProgress?: SaveProgress;
};

export type SaveProgress = {
  badges: number;
  location?: SaveLocation;
};

export type SaveLocation = {
  mapId: number;
  zone: number;
  x: number;
  y: number;
  z: number;
  name: string;
};

export type GameState = {
  pokemon: Pokemon[];
  routes: Route[];
  battles: Battle[];
  inventory: InventoryItem[];
  levelCaps: LevelCap[];
  settings: GameSettings;
  updatedAt: string;
};

export type PokemonDraft = Omit<Pokemon, "id">;

export type DashboardSummary = {
  teamCount: number;
  boxCount: number;
  deadCount: number;
  candidateCount: number;
  currentLevelCap: number;
  nextGym?: Battle;
  nextFriendBattle?: Battle;
};
