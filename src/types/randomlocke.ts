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
  | "berry"
  | "battle_item"
  | "key_item"
  | "other";

export type InventoryStatus = "available" | "equipped" | "used" | "sold" | "reserved";

export type Pokemon = {
  id: string;
  species: string;
  nickname: string;
  level: number;
  types: string[];
  ability: string;
  moves: string[];
  item: string;
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

export type GameState = {
  pokemon: Pokemon[];
  routes: Route[];
  battles: Battle[];
  inventory: InventoryItem[];
  levelCaps: LevelCap[];
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
