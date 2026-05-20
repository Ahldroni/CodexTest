import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const CURRENT_FILE = path.join(DATA_DIR, "current.json");
const SEASONS_FILE = path.join(DATA_DIR, "seasons.json");
const CURRENT_SEASON = {
  id: "tww-s1",
  expansion: "The War Within",
  name: "The War Within Season 1",
  shortName: "TWW S1",
  played: true,
  file: "data/current.json"
};

const CHARACTERS = [
  { region: "eu", realm: "silvermoon", name: "Warlockzz" },
  { region: "eu", realm: "silvermoon", name: "Ahldroni" }
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

function characterUrl({ region, realm, name }) {
  return `https://raider.io/characters/${region}/${encodeURIComponent(realm)}/${encodeURIComponent(name)}`;
}

function profileApiUrl(character) {
  const url = new URL("https://raider.io/api/v1/characters/profile");
  url.searchParams.set("region", character.region);
  url.searchParams.set("realm", character.realm);
  url.searchParams.set("name", character.name);
  url.searchParams.set(
    "fields",
    [
      "mythic_plus_scores_by_season:current",
      "mythic_plus_best_runs",
      "mythic_plus_alternate_runs",
      "gear",
      "raid_progression"
    ].join(",")
  );
  return url;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": "Ahldroni-CodexTest-GitHub-Pages-Updater"
    }
  });

  if (!response.ok) {
    throw new Error(`Raider.IO request failed: ${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

function getCurrentScore(profile) {
  const seasonScores = profile.mythic_plus_scores_by_season || [];
  const current = seasonScores.find((entry) => entry.season === "current") || seasonScores[0];
  return Number(current?.scores?.all || 0);
}

function getRaidProgress(profile) {
  const raids = Object.values(profile.raid_progression || {});
  return raids.reduce(
    (summary, raid) => ({
      normal: Math.max(summary.normal, Number(raid.normal_bosses_killed || 0)),
      heroic: Math.max(summary.heroic, Number(raid.heroic_bosses_killed || 0)),
      mythic: Math.max(summary.mythic, Number(raid.mythic_bosses_killed || 0)),
      total: Math.max(summary.total, Number(raid.total_bosses || 0))
    }),
    { normal: 0, heroic: 0, mythic: 0, total: 0 }
  );
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

function normalizeCharacter(profile, configuredCharacter) {
  const raidProgress = getRaidProgress(profile);
  const bestRuns = (profile.mythic_plus_best_runs || []).map((run) => normalizeRun(run, profile.name));
  const alternateRuns = (profile.mythic_plus_alternate_runs || []).map((run) => normalizeRun(run, profile.name));
  const score = getCurrentScore(profile);
  const className = profile.class || "Unknown";

  return {
    name: profile.name || configuredCharacter.name,
    display_name: profile.name || configuredCharacter.name,
    realm: profile.realm || configuredCharacter.realm,
    region: profile.region || configuredCharacter.region,
    class_name: className,
    spec: profile.active_spec_name || "Unknown",
    role: String(profile.active_spec_role || "unknown").toLowerCase(),
    level: Number(profile.level || 0),
    ilvl: Number(profile.gear?.item_level_equipped || 0),
    score,
    color: score ? CLASS_COLORS[className] || "#aaa" : "#aaa",
    avatar: profile.thumbnail_url || "",
    url: profile.profile_url || characterUrl(configuredCharacter),
    raid_progress: {
      normal: raidProgress.normal,
      heroic: raidProgress.heroic,
      mythic: raidProgress.mythic
    },
    best_runs: bestRuns,
    alternate_runs: alternateRuns,
    raid_progression: profile.raid_progression || {}
  };
}

function getSeasonTopCharacter(characters) {
  return characters
    .slice()
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0];
}

function getAllRuns(characters) {
  return characters.flatMap((character) => [
    ...(character.best_runs || []),
    ...(character.alternate_runs || [])
  ]);
}

function buildDungeons(characters) {
  const grouped = new Map();

  for (const character of characters) {
    for (const run of getAllRuns([character])) {
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

function buildSummary(characters, dungeons) {
  const scoredCharacters = characters.filter((character) => Number(character.score || 0) > 0);
  const allRuns = getAllRuns(characters);
  const highestRun = allRuns
    .slice()
    .sort((left, right) => right.level - left.level || right.score - left.score)[0];
  const raidProgress = characters.reduce(
    (summary, character) => ({
      heroic: Math.max(summary.heroic, Number(character.raid_progress?.heroic || 0)),
      total: Math.max(summary.total, ...Object.values(character.raid_progression || {}).map((raid) => Number(raid.total_bosses || 0)), 0)
    }),
    { heroic: 0, total: 0 }
  );

  return {
    total_score: Number(scoredCharacters.reduce((total, character) => total + Number(character.score || 0), 0).toFixed(1)),
    scored_characters: scoredCharacters.length,
    character_count: characters.length,
    highest_key: {
      level: highestRun?.level || 0,
      short_name: highestRun?.short_name || "N/A"
    },
    heroic_bosses: raidProgress.heroic,
    raid_bosses: raidProgress.total,
    dungeon_count: dungeons.length
  };
}

async function readExistingSeasons() {
  try {
    return JSON.parse(await readFile(SEASONS_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });

  const profileResults = await Promise.allSettled(
    CHARACTERS.map(async (character) => normalizeCharacter(await fetchJson(profileApiUrl(character)), character))
  );
  const profiles = profileResults
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const failedProfiles = profileResults.filter((result) => result.status === "rejected");

  for (const failure of failedProfiles) {
    console.warn(failure.reason);
  }

  if (!profiles.length) {
    throw new Error("No Raider.IO character profiles could be loaded.");
  }
  const characters = profiles.sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
  const activeCharacters = characters.filter((character) => Number(character.score || 0) > 0);
  const topCharacter = getSeasonTopCharacter(characters);
  const dungeons = buildDungeons(characters);

  const currentData = {
    profile_name: "Ahldroni",
    generated_at: new Date().toISOString(),
    season_label: CURRENT_SEASON.id,
    summary: buildSummary(characters, dungeons),
    top_character: topCharacter,
    active_characters: activeCharacters,
    characters,
    dungeons,
    background_image: topCharacter?.avatar || ""
  };

  const existingSeasons = await readExistingSeasons();
  const preservedSeasons = existingSeasons.filter((season) => season.id !== CURRENT_SEASON.id);
  const seasons = [CURRENT_SEASON, ...preservedSeasons];

  await writeJson(CURRENT_FILE, currentData);
  await writeJson(SEASONS_FILE, seasons);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
