const cards = document.querySelector("#character-cards");
const runList = document.querySelector("#run-list");
const dungeonGrid = document.querySelector("#dungeon-grid");
const spotlightRail = document.querySelector("#spotlight-rail");
const heroTags = document.querySelector("#hero-tags");
const championAvatar = document.querySelector("#champion-avatar");
const championName = document.querySelector("#champion-name");
const championMeta = document.querySelector("#champion-meta");
const championScore = document.querySelector("#champion-score");
const summaryTotalScore = document.querySelector("#summary-total-score");
const summaryScoredCharacters = document.querySelector("#summary-scored-characters");
const summaryHighestKey = document.querySelector("#summary-highest-key");
const summaryLastFetched = document.querySelector("#summary-last-fetched");
const spotlightCopy = document.querySelector("#spotlight-copy");
const footerStatus = document.querySelector("#footer-status");
const seasonSelect = document.querySelector("#season-select");
const progressionCanvas = document.querySelector("#progression-chart");
const progressionStatus = document.querySelector("#progression-status");
const achievementsSeason = document.querySelector("#achievements-season");
const achievementGrid = document.querySelector("#achievement-grid");
const runsTitle = document.querySelector("#runs-title");
const runsProfileLink = document.querySelector("#runs-profile-link");

const SEASONS_URL = "data/seasons.json";
const FALLBACK_AVATAR_PATH = "assets/avatar-fallback.svg";

const seasonState = {
  seasons: [],
  activeSeason: null,
  activeData: null,
  dataCache: new Map(),
  progressionEntries: [],
  progressionFailedCount: 0,
  activeFilter: "scored",
  isLoading: false,
  isRestoringUrl: false
};

const EXPANSION_GROUP_ORDER = [
  "The War Within",
  "Dragonflight",
  "Shadowlands",
  "Battle for Azeroth",
  "Legion"
];

function getRoleFilters() {
  return [...document.querySelectorAll(".segment")].map((button) => button.dataset.filter);
}

function getUrlState() {
  const params = new URLSearchParams(window.location.search);
  return {
    season: params.get("season"),
    role: params.get("role")
  };
}

function getValidRoleFilter(role) {
  return getRoleFilters().includes(role) ? role : "scored";
}

function updateUrlState() {
  if (seasonState.isRestoringUrl || !seasonState.activeSeason) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("season", seasonState.activeSeason.id);

  if (seasonState.activeFilter === "scored") {
    url.searchParams.delete("role");
  } else {
    url.searchParams.set("role", seasonState.activeFilter);
  }

  window.history.replaceState({}, "", url);
}

function setLoadingState(message) {
  footerStatus.textContent = message;
  spotlightCopy.textContent = message;
}

function showErrorState(error, message = "Dashboard data could not be loaded.") {
  footerStatus.textContent = message;
  spotlightCopy.textContent = "Check that the JSON files exist in /data and that GitHub Pages is serving the latest commit.";
  heroTags.innerHTML = "";
  championAvatar.src = FALLBACK_AVATAR_PATH;
  championAvatar.alt = "Fallback character portrait";
  championName.textContent = "Data unavailable";
  championMeta.textContent = "";
  championScore.textContent = "...";
  summaryTotalScore.textContent = "...";
  summaryScoredCharacters.textContent = "...";
  summaryHighestKey.textContent = "...";
  summaryLastFetched.textContent = "...";
  cards.innerHTML = "";
  runList.innerHTML = "";
  dungeonGrid.innerHTML = "";
  spotlightRail.innerHTML = "";
  achievementGrid.innerHTML = "";
  achievementsSeason.textContent = "Achievements unavailable.";
  seasonSelect.innerHTML = "<option>Seasons unavailable</option>";
  seasonSelect.disabled = true;
  progressionCanvas.innerHTML = "";
  progressionStatus.textContent = "Season history unavailable.";
  console.error(error);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "default" });
  if (!response.ok) {
    throw new Error(`Could not load ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(dateString) {
  if (!dateString) {
    return "Unknown date";
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatSeasonLabel(seasonLabel) {
  return String(seasonLabel || "").replace(/^season-/, "").toUpperCase();
}

function buildHeroTags(data) {
  const summary = data.summary || {};
  const heroicProgress = `${summary.heroic_bosses || 0}/${summary.raid_bosses || 0}`;
  const tags = [
    `Season ${formatSeasonLabel(data.season_label)}`,
    `Warband Score ${Number(summary.total_score || 0).toFixed(1)}`,
    `Heroic Raid ${heroicProgress}`
  ];

  if (data.is_placeholder) {
    tags.push("Manual placeholder data");
  }

  return tags;
}

function hasRealAvatar(character) {
  return Boolean(character?.avatar && String(character.avatar).trim());
}

function getCharacterAvatar(character) {
  return hasRealAvatar(character) ? character.avatar : FALLBACK_AVATAR_PATH;
}

function handleAvatarError(image) {
  image.onerror = null;
  image.src = FALLBACK_AVATAR_PATH;
}

function getCharacterIdentity(character) {
  return character?.name || character?.display_name || "";
}

function getCharacterDungeonEntryNames(data) {
  const names = new Set();
  (Array.isArray(data.dungeons) ? data.dungeons : []).forEach((dungeon) => {
    (dungeon.entries || []).forEach((entry) => {
      if (entry.character) {
        names.add(entry.character);
      }
    });
  });
  return names;
}

function hasSeasonRuns(character) {
  return Boolean(
    character &&
      ((Array.isArray(character.best_runs) && character.best_runs.length) ||
        (Array.isArray(character.mythic_plus_best_runs) && character.mythic_plus_best_runs.length))
  );
}

function getScoredCharacters(characters, data = {}) {
  const dungeonEntryNames = getCharacterDungeonEntryNames(data);
  return (Array.isArray(characters) ? characters : [])
    .filter((character) => {
      const identity = getCharacterIdentity(character);
      return (
        Number(character.score || 0) > 0 ||
        hasSeasonRuns(character) ||
        dungeonEntryNames.has(identity) ||
        dungeonEntryNames.has(character.display_name)
      );
    })
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
}

function mergeTopCharacterData(selectedCharacter, dataTopCharacter) {
  if (!selectedCharacter) {
    return dataTopCharacter || null;
  }

  if (getCharacterIdentity(selectedCharacter) !== getCharacterIdentity(dataTopCharacter)) {
    return selectedCharacter;
  }

  return {
    ...dataTopCharacter,
    ...selectedCharacter,
    best_runs: selectedCharacter.best_runs || dataTopCharacter.best_runs || [],
    raid_progression: selectedCharacter.raid_progression || dataTopCharacter.raid_progression || {}
  };
}

function getSortedCharacters(data) {
  return getScoredCharacters(data.characters, data);
}

function getSeasonTopCharacter(data) {
  const characters = getScoredCharacters(data.characters, data);
  const selectedCharacter = characters.find((character) => Number(character.score) > 0) || characters[0];
  return mergeTopCharacterData(selectedCharacter, data.top_character);
}

function normalizeRun(run, characterName = "") {
  if (!run) {
    return null;
  }

  return {
    dungeon: run.dungeon || run.name || run.short_name || "Unknown dungeon",
    short_name: run.short_name || run.shortName || run.dungeon || "UNK",
    level: Number(run.level || run.mythic_level || 0),
    score: Number(run.score || 0),
    upgrades: Number(run.upgrades || 0),
    completed_at: run.completed_at || run.completedAt || null,
    character: run.character || characterName
  };
}

function getSeasonBestRuns(data) {
  const runs = [];
  const seen = new Set();

  const addRun = (run, characterName) => {
    const normalized = normalizeRun(run, characterName);
    if (!normalized || !normalized.level) {
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

  getScoredCharacters(data.characters, data).forEach((character) => {
    (character.best_runs || []).forEach((run) => addRun(run, character.display_name || character.name));
  });

  (data.top_character?.best_runs || []).forEach((run) => {
    addRun(run, data.top_character.display_name || data.top_character.name);
  });

  (Array.isArray(data.dungeons) ? data.dungeons : []).forEach((dungeon) => {
    (dungeon.entries || []).forEach((entry) => {
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
    });
  });

  return runs.sort((left, right) => right.level - left.level || right.score - left.score);
}

function renderChampion(character) {
  if (!character) {
    return;
  }

  if (document.body && hasRealAvatar(character)) {
    document.body.style.setProperty("--hero-image", `url("${character.avatar}")`);
  } else {
    document.body?.style?.removeProperty?.("--hero-image");
  }

  championAvatar.onerror = () => handleAvatarError(championAvatar);
  championAvatar.src = getCharacterAvatar(character);
  championAvatar.alt = `${character.display_name} character portrait`;
  championName.textContent = character.display_name;
  championMeta.textContent = `${character.spec} ${character.class_name} · ${character.realm} ${character.region}`;
  championScore.textContent = Number(character.score || 0).toFixed(1);
}

function buildRenderedSummary(data, characters, bestRuns) {
  const summary = data.summary || {};
  const highestRun = bestRuns[0];
  return {
    ...summary,
    total_score: characters.reduce((total, character) => total + Number(character.score || 0), 0),
    scored_characters: characters.length,
    character_count: characters.length,
    highest_key: highestRun
      ? { level: highestRun.level, short_name: highestRun.short_name }
      : summary.highest_key || { level: 0, short_name: "N/A" }
  };
}

function renderSummary(data, characters, bestRuns) {
  const summary = buildRenderedSummary(data, characters, bestRuns);
  const highestKey = summary.highest_key || { level: 0, short_name: "N/A" };
  summaryTotalScore.textContent = Number(summary.total_score || 0).toFixed(1);
  summaryScoredCharacters.textContent = `${summary.scored_characters || 0} / ${summary.character_count || 0}`;
  summaryHighestKey.textContent = highestKey.level ? `+${highestKey.level} ${highestKey.short_name}` : "No key data";
  summaryLastFetched.textContent = formatDate(data.generated_at);
}

function getSpotlightCharacters(activeCharacters, topCharacter) {
  const seen = new Set();
  return [topCharacter, ...(activeCharacters || [])]
    .filter(Boolean)
    .filter((character) => {
      const identity = getCharacterIdentity(character);
      if (!identity || seen.has(identity)) {
        return false;
      }

      seen.add(identity);
      return true;
    });
}

function renderSpotlight(activeCharacters, topCharacter) {
  const spotlightCharacters = getSpotlightCharacters(activeCharacters, topCharacter);
  if (!spotlightCharacters.length) {
    spotlightCopy.textContent = "No active Mythic+ characters found in this season dataset.";
    spotlightRail.innerHTML = "";
    return;
  }

  const highlightNames = spotlightCharacters.map((character) => character.display_name);
  spotlightCopy.textContent = `${highlightNames[0]} leads this season's push, with ${highlightNames[1] || "no secondary scorer yet"}${highlightNames[2] ? ` and ${highlightNames[2]} filling out the active ladder` : ""}.`;

  spotlightRail.innerHTML = spotlightCharacters
    .map((character, index) => {
      const summary =
        index === 0
          ? "Primary push character and current score leader."
          : index === 1
            ? "Secondary ladder coverage with active alt progression."
            : "Additional route coverage and lower-key stability.";
      return `
        <a class="spotlight__card" href="${escapeHtml(character.url)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(character.display_name)} · ${Number(character.score || 0).toFixed(1)}</strong>
          <span>${escapeHtml(character.spec)} ${escapeHtml(character.class_name)} · ${escapeHtml(character.realm)} ${escapeHtml(character.region)}</span>
          <span>${summary}</span>
        </a>
      `;
    })
    .join("");
}

function renderCards(characters) {
  const sortedCharacters = characters.slice().sort((left, right) => Number(right.score || 0) - Number(left.score || 0));
  const maxScore = Math.max(...sortedCharacters.map((character) => Number(character.score || 0)), 0);
  const fallbackHandler = `this.onerror=null;this.src='${FALLBACK_AVATAR_PATH}';`;

  cards.innerHTML = sortedCharacters
    .map((character) => {
      const score = Number(character.score || 0);
      const scoreWidth = maxScore ? Math.max(3, (score / maxScore) * 100) : 0;
      const scoreLabel = score ? score.toFixed(1) : "0";
      const badgeClass = score ? "badge" : "badge badge--zero";
      return `
        <a class="card" href="${escapeHtml(character.url)}" target="_blank" rel="noreferrer" data-role="${escapeHtml(character.role)}" data-scored="${score > 0}">
          <img class="card__avatar" src="${escapeHtml(getCharacterAvatar(character))}" alt="${escapeHtml(character.display_name)} character portrait" onerror="${fallbackHandler}">
          <div>
            <div class="card__top">
              <div>
                <p class="card__name">${escapeHtml(character.display_name)}</p>
                <p class="card__meta">${escapeHtml(character.spec)} ${escapeHtml(character.class_name)} · ${escapeHtml(String(character.role || "unknown").toUpperCase())}</p>
              </div>
              <span class="${badgeClass}" style="background:${score ? escapeHtml(character.color || "") : ""}">${scoreLabel}</span>
            </div>
            <p class="card__realm">Level ${Number(character.level || 0)} · ${escapeHtml(character.realm)} ${escapeHtml(character.region)}</p>
          </div>
          <div class="card__bars">
            <div class="bar" aria-hidden="true"><span style="--score-width:${scoreWidth}%"></span></div>
            <span class="ilvl">${Math.round(Number(character.ilvl || 0))} ilvl</span>
          </div>
        </a>
      `;
    })
    .join("");
}

function applyRosterFilter() {
  document.querySelectorAll(".segment").forEach((segment) => {
    segment.classList.toggle("is-active", segment.dataset.filter === seasonState.activeFilter);
  });

  document.querySelectorAll(".card").forEach((card) => {
    const isMatch =
      (seasonState.activeFilter === "scored" && card.dataset.scored === "true") ||
      card.dataset.role === seasonState.activeFilter;
    card.classList.toggle("is-hidden", !isMatch);
  });
}

function renderRuns(runs, topCharacter) {
  const safeRuns = Array.isArray(runs) ? runs : [];
  if (runsTitle) {
    runsTitle.textContent = `${topCharacter.display_name} Season Runs`;
  }

  if (runsProfileLink) {
    runsProfileLink.href = topCharacter.url;
    runsProfileLink.textContent = `${topCharacter.display_name} Profile`;
  }

  if (!safeRuns.length) {
    runList.innerHTML = `
      <div class="empty-state">
        No best runs are available for this season snapshot yet.
      </div>
    `;
    return;
  }

  runList.innerHTML = safeRuns
    .map((run) => `
      <div class="run">
        <span class="run__level">+${run.level}</span>
        <div>
          <p class="run__name">${escapeHtml(run.dungeon)}</p>
          <p class="run__meta">${escapeHtml(run.short_name)}${run.character ? ` · ${escapeHtml(run.character)}` : ""}${run.completed_at ? ` · ${formatDate(run.completed_at)}` : ""}</p>
        </div>
        <strong class="run__score">${Number(run.score || 0).toFixed(1)}</strong>
      </div>
    `)
    .join("");
}

function renderDungeons(dungeons) {
  dungeonGrid.innerHTML = (Array.isArray(dungeons) ? dungeons : [])
    .map((dungeon) => {
      const entries = dungeon.entries || [];
      const detail = entries.length
        ? `Best: ${entries.map((entry) => `${escapeHtml(entry.character)} +${Number(entry.level || 0)}`).join(" · ")}`
        : "No scored runs yet";
      return `
        <div class="dungeon">
          <strong>${escapeHtml(dungeon.short_name)}</strong>
          <span>${escapeHtml(dungeon.name)}</span>
          <span>${detail}</span>
        </div>
      `;
    })
    .join("");
}

function getTopCharacterByRole(characters, role) {
  return characters
    .filter((character) => character.role === role && Number(character.score) > 0)
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0];
}

function getMostActiveDungeon(dungeons) {
  return (Array.isArray(dungeons) ? dungeons : [])
    .map((dungeon) => {
      const entries = dungeon.entries || [];
      const bestEntry = entries
        .slice()
        .sort((left, right) => Number(right.level || 0) - Number(left.level || 0) || Number(right.score || 0) - Number(left.score || 0))[0];
      return {
        name: dungeon.name,
        shortName: dungeon.short_name,
        runCount: entries.length,
        bestLevel: bestEntry ? Number(bestEntry.level || 0) : 0
      };
    })
    .sort((left, right) => right.runCount - left.runCount || right.bestLevel - left.bestLevel)[0];
}

function getFirstKeystoneMasterRun(runs) {
  const KSM_KEY_LEVEL = 15;
  return (Array.isArray(runs) ? runs : [])
    .filter((run) => run.level >= KSM_KEY_LEVEL && run.completed_at)
    .sort((left, right) => new Date(left.completed_at) - new Date(right.completed_at))[0];
}

function buildRoleHighlight(characters) {
  const roleLabels = {
    tank: "Tank",
    healer: "Healer",
    dps: "DPS"
  };

  return ["tank", "healer", "dps"]
    .map((role) => {
      const character = getTopCharacterByRole(characters, role);
      if (!character) {
        return null;
      }

      return `${roleLabels[role]}: ${character.display_name} (${Number(character.score || 0).toFixed(1)})`;
    })
    .filter(Boolean);
}

function buildSeasonAchievements(data, topCharacter, bestRuns) {
  const mostActiveDungeon = getMostActiveDungeon(data.dungeons);
  const firstKsmRun = getFirstKeystoneMasterRun(bestRuns);
  const roleHighlights = buildRoleHighlight(data.characters || []);
  const highestRun = bestRuns[0];

  return [
    {
      label: "Highest Mythic+ Score",
      value: `${topCharacter.display_name} · ${Number(topCharacter.score || 0).toFixed(1)}`,
      detail: `${topCharacter.spec} ${topCharacter.class_name} led the season scoreboard.`
    },
    {
      label: "Highest Key Completed",
      value: highestRun ? `+${highestRun.level} ${highestRun.short_name}` : "No key data",
      detail: highestRun ? `${highestRun.character || topCharacter.display_name} recorded the top available run.` : "No run data was available."
    },
    {
      label: "Most Active Dungeon",
      value: mostActiveDungeon
        ? `${mostActiveDungeon.shortName} · ${mostActiveDungeon.runCount} scorer${mostActiveDungeon.runCount === 1 ? "" : "s"}`
        : "No dungeon activity",
      detail: mostActiveDungeon
        ? `${mostActiveDungeon.name} has the broadest roster coverage.`
        : "No dungeon entries were available in this dataset."
    },
    {
      label: "First Keystone Master Signal",
      value: firstKsmRun ? `${firstKsmRun.short_name} +${firstKsmRun.level}` : "Not yet inferred",
      detail: firstKsmRun
        ? `${formatDate(firstKsmRun.completed_at)} was the first available +15 or higher run in the snapshot.`
        : "No +15 or higher dated run was present in the available run data."
    },
    {
      label: "Role Highlights",
      value: roleHighlights.length ? `${roleHighlights.length} role${roleHighlights.length === 1 ? "" : "s"} represented` : "No role leaders",
      detail: roleHighlights.length ? roleHighlights.join(" · ") : "No scored role data was available."
    }
  ];
}

function renderAchievements(data, season, topCharacter, bestRuns) {
  achievementsSeason.textContent = season.name;
  achievementGrid.innerHTML = buildSeasonAchievements(data, topCharacter, bestRuns)
    .map((achievement) => `
      <article class="achievement">
        <span>${escapeHtml(achievement.label)}</span>
        <strong>${escapeHtml(achievement.value)}</strong>
        <p>${escapeHtml(achievement.detail)}</p>
      </article>
    `)
    .join("");
}

function bindFilters() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.onclick = () => {
      seasonState.activeFilter = button.dataset.filter;
      applyRosterFilter();
      updateUrlState();
    };
  });
}

function renderRoleFilters(characters) {
  const availableRoles = new Set(characters.map((character) => character.role).filter(Boolean));
  document.querySelectorAll(".segment").forEach((button) => {
    const filter = button.dataset.filter;
    const shouldShow = filter === "scored" || availableRoles.has(filter);
    button.hidden = !shouldShow;
  });

  if (seasonState.activeFilter !== "scored" && !availableRoles.has(seasonState.activeFilter)) {
    seasonState.activeFilter = "scored";
  }
}

function renderSeasonSelector() {
  const groupedSeasons = seasonState.seasons.reduce((groups, season) => {
    const expansion = season.expansion || "Other";
    groups.set(expansion, [...(groups.get(expansion) || []), season]);
    return groups;
  }, new Map());

  const orderedExpansions = [
    ...EXPANSION_GROUP_ORDER.filter((expansion) => groupedSeasons.has(expansion)),
    ...[...groupedSeasons.keys()].filter((expansion) => !EXPANSION_GROUP_ORDER.includes(expansion)).sort()
  ];

  seasonSelect.innerHTML = orderedExpansions
    .map((expansion) => `
      <optgroup label="${escapeHtml(expansion)}">
        ${groupedSeasons
          .get(expansion)
          .map((season) => `<option value="${escapeHtml(season.id)}">${escapeHtml(season.shortName || season.name)}</option>`)
          .join("")}
      </optgroup>
    `)
    .join("");
  seasonSelect.disabled = seasonState.isLoading || seasonState.seasons.length < 2;
  seasonSelect.value = seasonState.activeSeason ? seasonState.activeSeason.id : seasonState.seasons[0]?.id || "";
}

function bindSeasonSelector() {
  seasonSelect.onchange = () => {
    setActiveSeason(seasonSelect.value).catch((error) => {
      footerStatus.textContent = "Season data unavailable. The dashboard is still showing the last loaded season.";
      restoreActiveSeasonSelection();
      console.error(error);
    });
  };
}

function getSeasonFile(season) {
  return season.file || season.path || `data/${season.dataKey || season.id}.json`;
}

async function loadSeasonData(season) {
  const file = getSeasonFile(season);
  if (seasonState.dataCache.has(file)) {
    return seasonState.dataCache.get(file);
  }

  const data = await fetchJson(file);
  if (!isUsableSeasonData(data)) {
    throw new Error(`Season data missing or empty for ${season.id}.`);
  }

  seasonState.dataCache.set(file, data);
  return data;
}

function isUsableSeasonData(data) {
  return Boolean(
    data &&
      data.summary &&
      Array.isArray(data.characters) &&
      getScoredCharacters(data.characters, data).length &&
      Array.isArray(data.dungeons)
  );
}

function buildProgressionEntry(season, data) {
  return {
    seasonId: season.id,
    seasonName: season.name,
    score: Number(data.summary?.total_score) || 0,
    highestKey: Number(data.summary?.highest_key?.level) || 0,
    generatedAt: data.generated_at
  };
}

function updateProgressionStatus() {
  if (!progressionStatus) {
    return;
  }

  const loadedCount = seasonState.progressionEntries.length;
  if (!loadedCount) {
    progressionStatus.textContent = "Season history unavailable.";
    return;
  }

  const failedCopy = seasonState.progressionFailedCount
    ? ` ${seasonState.progressionFailedCount} season dataset could not be loaded.`
    : "";
  progressionStatus.textContent = `${loadedCount} season${loadedCount === 1 ? "" : "s"} loaded.${failedCopy}`;
}

function updateProgressionViewHighlight() {
  document.querySelectorAll(".progression-bar").forEach((bar) => {
    bar.classList.toggle("is-active", bar.dataset.seasonId === seasonState.activeSeason?.id);
  });
}

function renderProgressionView() {
  if (!progressionCanvas || !seasonState.progressionEntries.length) {
    if (progressionCanvas) {
      progressionCanvas.innerHTML = "";
    }
    updateProgressionStatus();
    return;
  }

  const maxScore = Math.max(...seasonState.progressionEntries.map((entry) => entry.score), 1);
  progressionCanvas.innerHTML = seasonState.progressionEntries
    .map((entry) => {
      const width = Math.max(4, Math.min(100, (entry.score / maxScore) * 100));
      return `
        <article class="progression-bar" data-season-id="${escapeHtml(entry.seasonId)}">
          <div>
            <strong>${escapeHtml(entry.seasonName)}</strong>
            <span>${entry.score.toFixed(1)} score · +${entry.highestKey} best key</span>
          </div>
          <div class="progression-bar__track" aria-hidden="true">
            <span style="--progress-width:${width}%"></span>
          </div>
        </article>
      `;
    })
    .join("");
  updateProgressionViewHighlight();
  updateProgressionStatus();
}

async function loadProgressionData() {
  const results = await Promise.allSettled(
    seasonState.seasons.map(async (season) => buildProgressionEntry(season, await loadSeasonData(season)))
  );

  seasonState.progressionEntries = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  seasonState.progressionFailedCount = results.filter((result) => result.status === "rejected").length;
  renderProgressionView();
}

async function loadSeasons() {
  const seasons = await fetchJson(SEASONS_URL);
  if (!Array.isArray(seasons)) {
    throw new Error("Season manifest must be an array.");
  }

  return seasons.filter((season) => season.played === true && getSeasonFile(season));
}

function renderDashboard(data, season) {
  seasonState.activeSeason = season;
  seasonState.activeData = data;
  const topCharacter = getSeasonTopCharacter(data);
  const sortedCharacters = getScoredCharacters(data.characters, data);
  const activeCharacters = sortedCharacters;
  const bestRuns = getSeasonBestRuns(data);

  heroTags.innerHTML = buildHeroTags(data).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  renderChampion(topCharacter);
  renderSummary(data, sortedCharacters, bestRuns);
  renderSpotlight(activeCharacters, topCharacter);
  renderCards(sortedCharacters);
  renderRuns(bestRuns, topCharacter);
  renderDungeons(data.dungeons);
  renderAchievements(data, season, topCharacter, bestRuns);
  renderSeasonSelector();
  footerStatus.textContent = `Data source: public Raider.IO profile and character API. ${season.name} last updated ${formatDate(data.generated_at)}.`;
  bindFilters();
  renderRoleFilters(sortedCharacters);
  applyRosterFilter();
  updateProgressionViewHighlight();
}

function restoreActiveSeasonSelection() {
  if (seasonState.activeSeason) {
    seasonSelect.value = seasonState.activeSeason.id;
  }
}

async function setActiveSeason(seasonId) {
  if (seasonState.isLoading) {
    return;
  }

  const season = seasonState.seasons.find((candidate) => candidate.id === seasonId);
  if (!season) {
    throw new Error(`Season ${seasonId} is not available.`);
  }

  seasonState.isLoading = true;
  renderSeasonSelector();
  setLoadingState(`Loading ${season.name}...`);

  try {
    const data = await loadSeasonData(season);
    renderDashboard(data, season);
    updateUrlState();
  } catch (error) {
    restoreActiveSeasonSelection();
    throw error;
  } finally {
    seasonState.isLoading = false;
    renderSeasonSelector();
  }
}

async function loadData() {
  try {
    setLoadingState("Loading Raider.IO season data...");
    seasonState.seasons = await loadSeasons();
    const urlState = getUrlState();
    const requestedSeason = seasonState.seasons.find((season) => season.id === urlState.season);
    const defaultSeason = requestedSeason || seasonState.seasons[0];
    seasonState.activeFilter = getValidRoleFilter(urlState.role);

    if (!defaultSeason) {
      throw new Error("No played Mythic+ seasons are available.");
    }

    bindSeasonSelector();
    await setActiveSeason(defaultSeason.id);
    await loadProgressionData();
  } catch (error) {
    showErrorState(error, "Data unavailable. The dashboard expects GitHub Pages to serve JSON files from /data.");
  }
}

window.dashboardSeasonApi = {
  get seasons() {
    return [...seasonState.seasons];
  },
  get activeSeason() {
    return seasonState.activeSeason;
  },
  get activeData() {
    return seasonState.activeData;
  },
  getSeasonBestRuns,
  getSeasonTopCharacter,
  getScoredCharacters,
  setActiveSeason
};

window.addEventListener("popstate", () => {
  if (!seasonState.seasons.length) {
    return;
  }

  const urlState = getUrlState();
  const season = seasonState.seasons.find((candidate) => candidate.id === urlState.season) || seasonState.seasons[0];
  seasonState.activeFilter = getValidRoleFilter(urlState.role);
  seasonState.isRestoringUrl = true;

  setActiveSeason(season.id)
    .catch((error) => {
      footerStatus.textContent = "Season data unavailable. The dashboard is still showing the last loaded season.";
      console.error(error);
    })
    .finally(() => {
      seasonState.isRestoringUrl = false;
    });
});

loadData();
