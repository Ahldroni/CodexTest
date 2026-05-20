window.MPLUS_SEASONS = window.MPLUS_SEASONS || [];
window.MPLUS_SEASON_DATA = window.MPLUS_SEASON_DATA || {};

// Manual historical placeholders.
// TODO: Replace every placeholder class/spec/role/avatar with real exported Raider.IO snapshots when archives are available.
window.MPLUS_SEASONS.push(
  {
    id: "df-s4",
    expansion: "Dragonflight",
    name: "Dragonflight Season 4",
    shortName: "DF S4",
    played: true,
    dataKey: "df-s4"
  },
  {
    id: "df-s3",
    expansion: "Dragonflight",
    name: "Dragonflight Season 3",
    shortName: "DF S3",
    played: true,
    dataKey: "df-s3"
  },
  {
    id: "sl-s4",
    expansion: "Shadowlands",
    name: "Shadowlands Season 4",
    shortName: "SL S4",
    played: true,
    dataKey: "sl-s4"
  }
);

const historicalCharacters = {
  warlockzzDemonology: {
    name: "Warlockzz",
    display_name: "Warlockzz",
    realm: "Silvermoon",
    region: "EU",
    class_name: "Warlock",
    spec: "Demonology",
    role: "dps",
    level: 70,
    ilvl: 528,
    score: 2860.4,
    color: "#406ae0",
    avatar: "",
    url: "https://raider.io/characters/eu/silvermoon/Warlockzz",
    raid_progress: {
      normal: 0,
      heroic: 0,
      mythic: 0
    }
  },
  ahldrakAugmentation: {
    name: "Ahldrak",
    display_name: "Ahldrak",
    realm: "Stormscale",
    region: "EU",
    class_name: "Evoker",
    spec: "Augmentation",
    role: "dps",
    level: 70,
    ilvl: 519,
    score: 2442.8,
    color: "#5ad171",
    avatar: "",
    url: "https://raider.io/characters/eu/stormscale/Ahldrak",
    raid_progress: {
      normal: 0,
      heroic: 0,
      mythic: 0
    }
  },
  ahldroniUnknown: {
    name: "Ahldroni",
    display_name: "Ahldroni",
    realm: "Silvermoon",
    region: "EU",
    class_name: "Unknown",
    spec: "Unknown",
    role: "unknown",
    level: 70,
    ilvl: 505,
    score: 2148.6,
    color: "#9aa3ad",
    avatar: "",
    url: "https://raider.io/characters/eu/silvermoon/Ahldroni",
    raid_progress: {
      normal: 0,
      heroic: 0,
      mythic: 0
    }
  }
};

window.MPLUS_SEASON_DATA["df-s4"] = {
  profile_name: "Ahldroni",
  generated_at: "2024-08-20T12:00:00.000Z",
  season_label: "df-s4",
  is_placeholder: true,
  summary: {
    total_score: 7451.8,
    scored_characters: 3,
    character_count: 3,
    highest_key: {
      level: 15,
      short_name: "RLP"
    },
    heroic_bosses: 0,
    raid_bosses: 0
  },
  top_character: {
    ...historicalCharacters.warlockzzDemonology,
    score: 2860.4,
    best_runs: [
      { dungeon: "Ruby Life Pools", short_name: "RLP", level: 15, score: 405.2, upgrades: 1, completed_at: "2024-06-02T18:30:00.000Z" },
      { dungeon: "Algeth'ar Academy", short_name: "AA", level: 14, score: 392.8, upgrades: 1, completed_at: "2024-06-09T19:10:00.000Z" },
      { dungeon: "The Azure Vault", short_name: "AV", level: 14, score: 388.5, upgrades: 0, completed_at: "2024-06-15T20:25:00.000Z" }
    ],
    raid_progression: {}
  },
  active_characters: [
    { ...historicalCharacters.warlockzzDemonology, score: 2860.4 },
    { ...historicalCharacters.ahldrakAugmentation, score: 2442.8 },
    { ...historicalCharacters.ahldroniUnknown, score: 2148.6 }
  ],
  characters: [
    { ...historicalCharacters.warlockzzDemonology, score: 2860.4 },
    { ...historicalCharacters.ahldrakAugmentation, score: 2442.8 },
    { ...historicalCharacters.ahldroniUnknown, score: 2148.6 }
  ],
  dungeons: [
    {
      short_name: "RLP",
      name: "Ruby Life Pools",
      entries: [
        { character: "Warlockzz", level: 15, score: 405.2 },
        { character: "Ahldrak", level: 13, score: 372.4 },
        { character: "Ahldroni", level: 12, score: 354.1 }
      ]
    },
    {
      short_name: "AA",
      name: "Algeth'ar Academy",
      entries: [
        { character: "Warlockzz", level: 14, score: 392.8 },
        { character: "Ahldrak", level: 12, score: 360.2 }
      ]
    },
    {
      short_name: "AV",
      name: "The Azure Vault",
      entries: [
        { character: "Warlockzz", level: 14, score: 388.5 },
        { character: "Ahldroni", level: 11, score: 341.9 }
      ]
    }
  ]
};

window.MPLUS_SEASON_DATA["df-s3"] = {
  profile_name: "Ahldroni",
  generated_at: "2024-03-12T12:00:00.000Z",
  season_label: "df-s3",
  is_placeholder: true,
  summary: {
    total_score: 6815.2,
    scored_characters: 3,
    character_count: 3,
    highest_key: {
      level: 14,
      short_name: "FALL"
    },
    heroic_bosses: 0,
    raid_bosses: 0
  },
  top_character: {
    ...historicalCharacters.ahldrakAugmentation,
    score: 2710.5,
    best_runs: [],
    raid_progression: {}
  },
  active_characters: [
    { ...historicalCharacters.warlockzzDemonology, score: 2644.7 },
    { ...historicalCharacters.ahldrakAugmentation, score: 2710.5 },
    { ...historicalCharacters.ahldroniUnknown, score: 1919.0 }
  ],
  characters: [
    { ...historicalCharacters.warlockzzDemonology, score: 2644.7 },
    { ...historicalCharacters.ahldrakAugmentation, score: 2710.5 },
    { ...historicalCharacters.ahldroniUnknown, score: 1919.0 }
  ],
  dungeons: [
    {
      short_name: "FALL",
      name: "Galakrond's Fall",
      entries: [
        { character: "Warlockzz", level: 14, score: 392.4 },
        { character: "Ahldrak", level: 12, score: 358.6 }
      ]
    },
    {
      short_name: "DHT",
      name: "Darkheart Thicket",
      entries: [
        { character: "Warlockzz", level: 13, score: 374.8 },
        { character: "Ahldroni", level: 11, score: 338.7 }
      ]
    },
    {
      short_name: "WM",
      name: "Waycrest Manor",
      entries: [
        { character: "Warlockzz", level: 13, score: 369.2 },
        { character: "Ahldrak", level: 11, score: 340.4 },
        { character: "Ahldroni", level: 10, score: 322.2 }
      ]
    }
  ]
};

window.MPLUS_SEASON_DATA["sl-s4"] = {
  profile_name: "Ahldroni",
  generated_at: "2022-10-18T12:00:00.000Z",
  season_label: "sl-s4",
  is_placeholder: true,
  summary: {
    total_score: 4921.7,
    scored_characters: 2,
    character_count: 2,
    highest_key: {
      level: 15,
      short_name: "GMBT"
    },
    heroic_bosses: 0,
    raid_bosses: 0
  },
  top_character: {
    ...historicalCharacters.warlockzzDemonology,
    level: 60,
    ilvl: 298,
    score: 2768.3,
    best_runs: [
      { dungeon: "Tazavesh: So'leah's Gambit", short_name: "GMBT", level: 15, score: 402.1, upgrades: 1, completed_at: "2022-09-04T18:00:00.000Z" },
      { dungeon: "Grimrail Depot", short_name: "GD", level: 14, score: 386.7, upgrades: 1, completed_at: "2022-09-11T19:35:00.000Z" },
      { dungeon: "Iron Docks", short_name: "ID", level: 13, score: 371.5, upgrades: 0, completed_at: "2022-09-18T20:15:00.000Z" }
    ],
    raid_progression: {}
  },
  active_characters: [
    { ...historicalCharacters.warlockzzDemonology, level: 60, ilvl: 298, score: 2768.3 },
    { ...historicalCharacters.ahldroniUnknown, level: 60, ilvl: 286, score: 2153.4 }
  ],
  characters: [
    { ...historicalCharacters.warlockzzDemonology, level: 60, ilvl: 298, score: 2768.3 },
    { ...historicalCharacters.ahldroniUnknown, level: 60, ilvl: 286, score: 2153.4 }
  ],
  dungeons: [
    {
      short_name: "GMBT",
      name: "Tazavesh: So'leah's Gambit",
      entries: [
        { character: "Warlockzz", level: 15, score: 402.1 },
        { character: "Ahldroni", level: 12, score: 350.0 }
      ]
    },
    {
      short_name: "GD",
      name: "Grimrail Depot",
      entries: [
        { character: "Warlockzz", level: 14, score: 386.7 },
        { character: "Ahldroni", level: 11, score: 338.8 }
      ]
    },
    {
      short_name: "ID",
      name: "Iron Docks",
      entries: [
        { character: "Warlockzz", level: 13, score: 371.5 }
      ]
    }
  ]
};
