import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const SEASONS_FILE = path.join(DATA_DIR, "seasons.json");

const TRACKED_CHARACTERS = [
  { region: "eu", realm: "silvermoon", name: "Warlockzz" },
  { region: "eu", realm: "silvermoon", name: "Ahldroni" }
];

const STATIC_SEASONS = [
  {
    id: "df-s4",
    apiSeasonId: "season-df-4",
    fileName: "df-s4.json",
    expansion: "Dragonflight",
    name: "Dragonflight Season 4",
    shortName: "DF S4"
  },
  {
    id: "df-s3",
    apiSeasonId: "season-df-3",
    fileName: "df-s3.json",
    expansion: "Dragonflight",
    name: "Dragonflight Season 3",
    shortName: "DF S3"
  },
  {
    id: "sl-s4",
    apiSeasonId: "season-sl-4",
    fileName: "sl-s4.json",
    expansion: "Shadowlands",
    name: "Shadowlands Season 4",
    shortName: "SL S4"
  }
];

const CLASS_COLORS = {
  "Death Knight": "#c41e3a",
  "Demon Hunter": "#a330c9",
  Druid: "#ff7c0a",
  Evoker: "#33937f",
  Hunter: "#aad372",
  Mage: "#3fc7eb",
  Monk: "#00ff98",
  Paladin: "#f48cba",
  Priest: "#ffffff",
  Rogue: "#fff468",
  Shaman: "#0070dd",
  Warlock: "#8788ee",
  Warrior: "#c69b6d"
};

function characterKey(character) {
  return `${character.region.toLowerCase()}:${character.realm.toLowerCase()}:${character.name.toLowerCase()}`;
}

function characterUrl(character) {
  return `https://raider.io/characters/${character.region}/${encodeURIComponent(character.realm)}/${encodeURIComponent(character.name)}`;
}

function profileApiUrl(character, fields) {
  const url = new URL("https://raider.io/api/v1/characters/profile");
  url.searchParams.set("region", character.region);
  url.searchParams.set("realm", character.realm);
  url.searchParams.set("name", character.name);
  url.searchParams.set("fields", fields.join(","));
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Ahldroni-CodexTest-GitHub-Pages-Updater"
    }
  });

  if (!response.ok) {
    throw new Error(`Raider.IO request failed: ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

function getRole(profile) {
  return String(profile.active_spec_role || "unknown").toLowerCase();
}

function normalizeIdentity(profile, configuredCharacter) {
  const className = profile.class || "Unknown";
  return {
    key: characterKey(configuredCharacter),
    name: profile.name || configuredCharacter.name,
    display_name: profile.name || configuredCharacter.name,
    realm: profile.realm || configuredCharacter.realm,
    region: profile.region || configuredCharacter.region,
    class_name: className,
    spec: profile.active_spec_name || "Unknown",
    role: getRole(profile),
    level: Number(profile.level || 0),
    ilvl: Number(profile.gear?.item_level_equipped || 0),
    color: CLASS_COLORS[className] || "#aaa",
    avatar: profile.thumbnail_url || "",
    url: profile.profile_url || characterUrl(configuredCharacter),
    raid_progression: profile.raid_progression || {}
  };
}

function getRaidSummary(raidProgression) {
  return Object.values(raidProgression || {}).reduce(
    (summary, raid) => ({
      normal: Math.max(summary.normal, Number(raid.normal_bosses_killed || 0)),
      heroic: Math.max(summary.heroic, Number(raid.heroic_bosses_killed || 0)),
      mythic: Math.max(summary.mythic, Number(raid.mythic_bosses_killed || 0)),
      total: Math.max(summary.total, Number(raid.total_bosses || 0))
    }),
    { normal: 0, heroic: 0, mythic: 0, total: 0 }
  );
}

function getCurrentSeasonId(profile) {
  const currentSeason = (profile.mythic_plus_scores_by_season || []).find((entry) => entry.season);
  return currentSeason?.season || "current";
}

function normalizeRun(run, characterName) {
  return {
    dungeon: run.dungeon || "Unknown dungeon",
    short_name: run.short_name || run.dungeon || "UNK",
    level: Number(run.mythic_level || run.level || 0),
    score: Number(run.score || 0),
    upgrades: Number(run.num_keystone_upgrades || run.upgrades || 0),
    completed_at: run.completed_at || null,
    character: characterName
  };
}

function getSeasonScore(profile, seasonId) {
  const seasonScores = profile.mythic_plus_scores_by_season || [];
  const season = seasonScores.find((entry) => entry.season === seasonId) || seasonScores[0];
  return Number(season?.scores?.all || 0);
}

function isPlayedSeasonCharacter(character) {
  return Boolean(
    character &&
      (Number(character.score || 0) > 0 ||
        (Array.isArray(character.best_runs) && character.best_runs.length) ||
        (Array.isArray(character.mythic_plus_best_runs) && character.mythic_plus_best_runs.length) ||
        (Array.isArray(character.mythic_plus_alternate_runs) && character.mythic_plus_alternate_runs.length))
  );
}

function getSeasonTopCharacter(characters) {
  return characters
    .slice()
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0];
}

function getCharacterRuns(character) {
  return [
    ...(character.best_runs || []),
    ...(character.mythic_plus_best_runs || []),
    ...(character.mythic_plus_alternate_runs || [])
  ];
}

function getSeasonBestRuns(seasonData) {
  const runs = [];
  const seen = new Set();

  const addRun = (run, characterName) => {
    const normalized = normalizeRun(run, characterName);
    if (!normalized.level) {
      return;
    }

    const key = [
      normalized.character,
      normalized.short_name,
      normalized.level,
      normalized.score
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      runs.push(normalized);
    }
  };

  for (const character of seasonData.characters || []) {
    for (const run of getCharacterRuns(character)) {
      addRun(run, character.display_name || character.name);
    }
  }

  for (const dungeon of seasonData.dungeons || []) {
    for (const entry of dungeon.entries || []) {
      addRun(
        {
          dungeon: dungeon.name,
          short_name: dungeon.short_name,
          level: entry.level,
          score: entry.score,
          completed_at: entry.completed_at,
          character: entry.character
        },
        entry.character
      );
    }
  }

  return runs.sort((left, right) => right.level - left.level || right.score - left.score);
}

function buildDungeons(characters) {
  const grouped = new Map();

  for (const character of characters) {
    for (const run of getCharacterRuns(character)) {
      const key = run.short_name || run.dungeon;
      const dungeon = grouped.get(key) || {
        short_name: run.short_name,
        name: run.dungeon,
        entries: new Map()
      };
      const existing = dungeon.entries.get(character.display_name);
      if (!existing || run.level > existing.level || (run.level === existing.level && run.score > existing.score)) {
        dungeon.entries.set(character.display_name, {
          character: character.display_name,
          level: run.level,
          score: run.score,
          completed_at: run.completed_at
        });
      }
      grouped.set(key, dungeon);
    }
  }

  return [...grouped.values()]
    .map((dungeon) => ({
      short_name: dungeon.short_name,
      name: dungeon.name,
      entries: [...dungeon.entries.values()].sort((left, right) => right.level - left.level || right.score - left.score)
    }))
    .sort((left, right) => left.short_name.localeCompare(right.short_name));
}

function buildSummary(characters, bestRuns) {
  const raidProgress = characters.reduce(
    (summary, character) => {
      const raid = getRaidSummary(character.raid_progression);
      return {
        heroic: Math.max(summary.heroic, raid.heroic),
        total: Math.max(summary.total, raid.total)
      };
    },
    { heroic: 0, total: 0 }
  );
  const highestRun = bestRuns[0];

  return {
    total_score: Number(characters.reduce((total, character) => total + Number(character.score || 0), 0).toFixed(1)),
    scored_characters: characters.length,
    character_count: characters.length,
    highest_key: {
      level: highestRun?.level || 0,
      short_name: highestRun?.short_name || "N/A"
    },
    heroic_bosses: raidProgress.heroic,
    raid_bosses: raidProgress.total,
    dungeon_count: bestRuns.length
  };
}

function getCurrentSeasonMeta(seasonId) {
  return {
    id: seasonId,
    apiSeasonId: seasonId,
    fileName: "current.json",
    expansion: "Current",
    name: `Current Mythic+ Season (${seasonId})`,
    shortName: "Current"
  };
}

async function fetchIdentityProfiles() {
  const results = await Promise.allSettled(
    TRACKED_CHARACTERS.map(async (character) => {
      const profile = await fetchJson(
        profileApiUrl(character, [
          "mythic_plus_scores_by_season:current",
          "gear",
          "raid_progression"
        ])
      );
      return {
        configuredCharacter: character,
        profile,
        identity: normalizeIdentity(profile, character)
      };
    })
  );

  const loaded = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  for (const failure of results.filter((result) => result.status === "rejected")) {
    console.warn(failure.reason);
  }

  if (!loaded.length) {
    throw new Error("No Raider.IO character identity profiles could be loaded.");
  }

  return loaded;
}

async function fetchSeasonCharacter(identityProfile, seasonId) {
  const { configuredCharacter, identity } = identityProfile;
  const profile = await fetchJson(
    profileApiUrl(configuredCharacter, [
      `mythic_plus_scores_by_season:${seasonId}`,
      `mythic_plus_best_runs:${seasonId}`,
      `mythic_plus_alternate_runs:${seasonId}`,
      "gear",
      "raid_progression"
    ])
  );
  const bestRuns = (profile.mythic_plus_best_runs || []).map((run) => normalizeRun(run, identity.display_name));
  const alternateRuns = (profile.mythic_plus_alternate_runs || []).map((run) => normalizeRun(run, identity.display_name));
  const score = getSeasonScore(profile, seasonId);

  return {
    ...identity,
    class_name: profile.class || identity.class_name,
    spec: profile.active_spec_name || identity.spec,
    role: getRole(profile) || identity.role,
    level: Number(profile.level || identity.level || 0),
    ilvl: Number(profile.gear?.item_level_equipped || identity.ilvl || 0),
    score,
    color: score ? profile.mythic_plus_scores_by_season?.[0]?.segments?.all?.color || identity.color : identity.color,
    raid_progression: profile.raid_progression || identity.raid_progression || {},
    best_runs: bestRuns,
    mythic_plus_best_runs: bestRuns,
    mythic_plus_alternate_runs: alternateRuns
  };
}

async function buildSeasonData(season, identityProfiles) {
  const apiSeasonId = season.apiSeasonId || season.id;
  const results = await Promise.allSettled(
    identityProfiles.map((identityProfile) => fetchSeasonCharacter(identityProfile, apiSeasonId))
  );
  const characters = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter(isPlayedSeasonCharacter)
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));

  for (const failure of results.filter((result) => result.status === "rejected")) {
    console.warn(failure.reason);
  }

  if (!characters.length) {
    return null;
  }

  const dungeons = buildDungeons(characters);
  const seasonData = {
    profile_name: "Ahldroni",
    generated_at: new Date().toISOString(),
    season_id: season.id,
    season_label: apiSeasonId,
    summary: {},
    top_character: getSeasonTopCharacter(characters),
    active_characters: characters,
    characters,
    dungeons,
    background_image: getSeasonTopCharacter(characters)?.avatar || ""
  };
  const bestRuns = getSeasonBestRuns(seasonData);
  seasonData.summary = buildSummary(characters, bestRuns);
  return seasonData;
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const identityProfiles = await fetchIdentityProfiles();
  const currentSeasonId = getCurrentSeasonId(identityProfiles[0].profile);
  const seasonsToGenerate = [
    getCurrentSeasonMeta(currentSeasonId),
    ...STATIC_SEASONS.filter((season) => season.id !== currentSeasonId)
  ];
  const seasonManifest = [];

  for (const season of seasonsToGenerate) {
    const seasonData = await buildSeasonData(season, identityProfiles);
    if (!seasonData) {
      continue;
    }

    const filePath = path.join(DATA_DIR, season.fileName);
    await writeJson(filePath, seasonData);

    seasonManifest.push({
      id: season.id,
      apiSeasonId: season.apiSeasonId || season.id,
      expansion: season.expansion,
      name: season.name,
      shortName: season.shortName,
      played: true,
      file: `data/${season.fileName}`
    });

    if (season.fileName === "current.json") {
      await writeJson(path.join(DATA_DIR, `${season.id}.json`), seasonData);
    }
  }

  if (!seasonManifest.length) {
    throw new Error("No played Mythic+ seasons could be generated.");
  }

  await writeJson(SEASONS_FILE, seasonManifest);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
