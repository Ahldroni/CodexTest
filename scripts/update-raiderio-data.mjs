import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.resolve("data");
const SEASONS_FILE = path.join(DATA_DIR, "seasons.json");

const TRACKED_CHARACTERS = [
  { region: "eu", realm: "silvermoon", name: "Warlockzz" },
  { region: "eu", realm: "silvermoon", name: "Ahldroni" }
];

const CURRENT_SEASON = {
  id: "midnight-current",
  apiSeasonId: "season-mn-1",
  fileName: "midnight-current.json",
  expansion: "Midnight",
  name: "Midnight Season 1",
  shortName: "Midnight S1",
  isCurrent: true,
  theme: "midnight"
};

const HISTORICAL_SEASONS = [
  { id: "tww-s3", apiSeasonId: "season-tww-3", fileName: "tww-s3.json", expansion: "The War Within", name: "The War Within Season 3", shortName: "TWW S3", theme: "war-within" },
  { id: "tww-s2", apiSeasonId: "season-tww-2", fileName: "tww-s2.json", expansion: "The War Within", name: "The War Within Season 2", shortName: "TWW S2", theme: "war-within" },
  { id: "tww-s1", apiSeasonId: "season-tww-1", fileName: "tww-s1.json", expansion: "The War Within", name: "The War Within Season 1", shortName: "TWW S1", theme: "war-within" },
  { id: "df-s4", apiSeasonId: "season-df-4", fileName: "df-s4.json", expansion: "Dragonflight", name: "Dragonflight Season 4", shortName: "DF S4", theme: "dragonflight" },
  { id: "df-s3", apiSeasonId: "season-df-3", fileName: "df-s3.json", expansion: "Dragonflight", name: "Dragonflight Season 3", shortName: "DF S3", theme: "dragonflight" },
  { id: "df-s2", apiSeasonId: "season-df-2", fileName: "df-s2.json", expansion: "Dragonflight", name: "Dragonflight Season 2", shortName: "DF S2", theme: "dragonflight" },
  { id: "df-s1", apiSeasonId: "season-df-1", fileName: "df-s1.json", expansion: "Dragonflight", name: "Dragonflight Season 1", shortName: "DF S1", theme: "dragonflight" },
  { id: "sl-s4", apiSeasonId: "season-sl-4", fileName: "sl-s4.json", expansion: "Shadowlands", name: "Shadowlands Season 4", shortName: "SL S4", theme: "shadowlands" },
  { id: "sl-s3", apiSeasonId: "season-sl-3", fileName: "sl-s3.json", expansion: "Shadowlands", name: "Shadowlands Season 3", shortName: "SL S3", theme: "shadowlands" },
  { id: "sl-s2", apiSeasonId: "season-sl-2", fileName: "sl-s2.json", expansion: "Shadowlands", name: "Shadowlands Season 2", shortName: "SL S2", theme: "shadowlands" },
  { id: "sl-s1", apiSeasonId: "season-sl-1", fileName: "sl-s1.json", expansion: "Shadowlands", name: "Shadowlands Season 1", shortName: "SL S1", theme: "shadowlands" },
  { id: "bfa-s4", apiSeasonId: "season-bfa-4", fileName: "bfa-s4.json", expansion: "Battle for Azeroth", name: "Battle for Azeroth Season 4", shortName: "BFA S4", theme: "bfa" },
  { id: "bfa-s3", apiSeasonId: "season-bfa-3", fileName: "bfa-s3.json", expansion: "Battle for Azeroth", name: "Battle for Azeroth Season 3", shortName: "BFA S3", theme: "bfa" },
  { id: "bfa-s2", apiSeasonId: "season-bfa-2", fileName: "bfa-s2.json", expansion: "Battle for Azeroth", name: "Battle for Azeroth Season 2", shortName: "BFA S2", theme: "bfa" },
  { id: "bfa-s1", apiSeasonId: "season-bfa-1", fileName: "bfa-s1.json", expansion: "Battle for Azeroth", name: "Battle for Azeroth Season 1", shortName: "BFA S1", theme: "bfa" },
  { id: "legion-7-3-2", apiSeasonId: "season-7.3.2", fileName: "legion-7-3-2.json", expansion: "Legion", name: "Legion 7.3.2", shortName: "Legion", theme: "legion" }
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

function role(profile) {
  return String(profile.active_spec_role || "unknown").toLowerCase();
}

function normalizeIdentity(profile, configuredCharacter) {
  const className = profile.class || "Unknown";
  const profileUrl = profile.profile_url || characterUrl(configuredCharacter);

  return {
    key: characterKey(configuredCharacter),
    name: profile.name || configuredCharacter.name,
    display_name: profile.name || configuredCharacter.name,
    realm: profile.realm || configuredCharacter.realm,
    region: profile.region || configuredCharacter.region,
    class_name: className,
    spec: profile.active_spec_name || "Unknown",
    role: role(profile),
    level: Number(profile.level || 0),
    ilvl: Number(profile.gear?.item_level_equipped || 0),
    color: CLASS_COLORS[className] || "#aaa",
    avatar: profile.thumbnail_url || "",
    profile_url: profileUrl,
    url: profileUrl,
    raid_progression: profile.raid_progression || {}
  };
}

function normalizeRun(run, characterName) {
  return {
    dungeon: run.dungeon || "Unknown dungeon",
    short_name: run.short_name || run.dungeon || "UNK",
    level: Number(run.mythic_level || run.level || 0),
    score: Number(run.score || 0),
    upgrades: Number(run.num_keystone_upgrades || run.upgrades || 0),
    completed_at: run.completed_at || null,
    character: characterName,
    url: run.url || ""
  };
}

function seasonScore(profile, apiSeasonId) {
  const season = (profile.mythic_plus_scores_by_season || []).find((entry) => entry.season === apiSeasonId);
  return Number(season?.scores?.all || 0);
}

function scoreColor(profile, apiSeasonId, fallback) {
  const season = (profile.mythic_plus_scores_by_season || []).find((entry) => entry.season === apiSeasonId);
  return season?.segments?.all?.color || fallback;
}

function hasPlayedSeason(character) {
  return Number(character.score || 0) > 0 || character.best_runs.length > 0 || character.alternate_runs.length > 0;
}

function runsForCharacter(character) {
  return [...character.best_runs, ...character.alternate_runs];
}

function buildSeasonMeta(season) {
  return {
    id: season.id,
    apiSeasonId: season.apiSeasonId,
    expansion: season.expansion,
    name: season.name,
    shortName: season.shortName,
    isCurrent: Boolean(season.isCurrent),
    theme: season.theme,
    file: `data/${season.fileName}`
  };
}

function buildBestRuns(characters) {
  const seen = new Set();
  const runs = [];

  for (const character of characters) {
    for (const run of runsForCharacter(character)) {
      if (!run.level) {
        continue;
      }

      const key = `${character.key}|${run.short_name}|${run.level}|${run.score}|${run.completed_at || ""}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      runs.push({ ...run, character: character.display_name });
    }
  }

  return runs.sort((left, right) => right.level - left.level || right.score - left.score);
}

function buildDungeons(characters) {
  const grouped = new Map();

  for (const character of characters) {
    for (const run of runsForCharacter(character)) {
      if (!run.level) {
        continue;
      }

      const key = run.short_name || run.dungeon;
      const dungeon = grouped.get(key) || {
        short_name: run.short_name,
        name: run.dungeon,
        entries: new Map()
      };
      const existing = dungeon.entries.get(character.key);
      const entry = {
        character: character.display_name,
        level: run.level,
        score: run.score,
        upgrades: run.upgrades,
        completed_at: run.completed_at,
        url: run.url
      };

      if (!existing || entry.level > existing.level || (entry.level === existing.level && entry.score > existing.score)) {
        dungeon.entries.set(character.key, entry);
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

function buildSummary(characters, bestRuns, dungeons) {
  const totalScore = characters.reduce((total, character) => total + Number(character.score || 0), 0);
  const highestRun = bestRuns[0];

  return {
    total_score: Number(totalScore.toFixed(1)),
    average_score: characters.length ? Number((totalScore / characters.length).toFixed(1)) : 0,
    scored_characters: characters.length,
    character_count: characters.length,
    dungeon_count: dungeons.length,
    best_run_count: bestRuns.length,
    highest_key: {
      level: highestRun?.level || 0,
      short_name: highestRun?.short_name || "N/A"
    }
  };
}

async function fetchIdentityProfiles() {
  const results = await Promise.allSettled(
    TRACKED_CHARACTERS.map(async (character) => {
      const profile = await fetchJson(profileApiUrl(character, ["gear", "raid_progression"]));
      return {
        configuredCharacter: character,
        identity: normalizeIdentity(profile, character)
      };
    })
  );

  const loaded = results.filter((result) => result.status === "fulfilled").map((result) => result.value);

  for (const failure of results.filter((result) => result.status === "rejected")) {
    console.warn(failure.reason);
  }

  if (!loaded.length) {
    throw new Error("No Raider.IO character identity profiles could be loaded.");
  }

  return loaded;
}

async function fetchSeasonCharacter(identityProfile, season) {
  const { configuredCharacter, identity } = identityProfile;
  const profile = await fetchJson(
    profileApiUrl(configuredCharacter, [
      `mythic_plus_scores_by_season:${season.apiSeasonId}`,
      `mythic_plus_best_runs:${season.apiSeasonId}`,
      `mythic_plus_alternate_runs:${season.apiSeasonId}`
    ])
  );
  const bestRuns = (profile.mythic_plus_best_runs || []).map((run) => normalizeRun(run, identity.display_name));
  const alternateRuns = (profile.mythic_plus_alternate_runs || []).map((run) => normalizeRun(run, identity.display_name));
  const character = {
    ...identity,
    score: seasonScore(profile, season.apiSeasonId),
    color: scoreColor(profile, season.apiSeasonId, identity.color),
    best_runs: bestRuns,
    alternate_runs: alternateRuns,
    mythic_plus_best_runs: bestRuns,
    mythic_plus_alternate_runs: alternateRuns
  };

  return hasPlayedSeason(character) ? character : null;
}

async function buildSeasonData(season, identityProfiles, generatedAt) {
  const results = await Promise.allSettled(
    identityProfiles.map((identityProfile) => fetchSeasonCharacter(identityProfile, season))
  );
  const characters = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .filter(Boolean)
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));

  for (const failure of results.filter((result) => result.status === "rejected")) {
    console.warn(failure.reason);
  }

  if (!characters.length) {
    return null;
  }

  const dungeons = buildDungeons(characters);
  const bestRuns = buildBestRuns(characters);

  return {
    season: buildSeasonMeta(season),
    generated_at: generatedAt,
    summary: buildSummary(characters, bestRuns, dungeons),
    characters,
    dungeons,
    best_runs: bestRuns
  };
}

async function removeExistingJson() {
  await mkdir(DATA_DIR, { recursive: true });
  const files = await readdir(DATA_DIR);

  await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => unlink(path.join(DATA_DIR, file)))
  );
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const generatedAt = new Date().toISOString();
  const identityProfiles = await fetchIdentityProfiles();
  const seasonsToTry = [CURRENT_SEASON, ...HISTORICAL_SEASONS];
  const generatedSeasons = [];
  const generatedData = [];

  for (const season of seasonsToTry) {
    const seasonData = await buildSeasonData(season, identityProfiles, generatedAt);

    if (!seasonData) {
      continue;
    }

    generatedSeasons.push(seasonData.season);
    generatedData.push({ fileName: season.fileName, data: seasonData });
  }

  if (!generatedData.some((entry) => entry.data.season.id === CURRENT_SEASON.id)) {
    throw new Error(`No played current season data found for ${CURRENT_SEASON.apiSeasonId}.`);
  }

  await removeExistingJson();

  for (const entry of generatedData) {
    await writeJson(path.join(DATA_DIR, entry.fileName), entry.data);
  }

  await writeJson(SEASONS_FILE, generatedSeasons);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
