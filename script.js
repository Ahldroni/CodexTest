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

const FALLBACK_AVATAR_PATH = "assets/avatar-fallback.svg";

const seasonState = {
  seasons: [],
  activeSeason: null,
  activeData: null,
  dataCache: new Map(),
  progressionEntries: [],
  progressionFailedCount: 0,
  activeFilter: "all",
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
  return getRoleFilters().includes(role) ? role : "all";
}

function updateUrlState() {
  if (seasonState.isRestoringUrl || !seasonState.activeSeason) {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("season", seasonState.activeSeason.id);

  if (seasonState.activeFilter === "all") {
    url.searchParams.delete("role");
  } else {
    url.searchParams.set("role", seasonState.activeFilter);
  }

  try {
    window.history.replaceState({}, "", url);
  } catch {
    // Some browsers restrict history updates for local file URLs.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatSeasonLabel(seasonLabel) {
  return seasonLabel.replace(/^season-/, "").toUpperCase();
}

function buildHeroTags(data) {
  const heroicProgress = `${data.summary.heroic_bosses}/${data.summary.raid_bosses}`;
  const tags = [
    `Season ${formatSeasonLabel(data.season_label)}`,
    `Warband Score ${data.summary.total_score.toFixed(1)}`,
    `Heroic Raid ${heroicProgress}`
  ];

  if (data.is_placeholder) {
    tags.push("Manual placeholder data");
  }

  return tags;
}

function hasRealAvatar(character) {
  return Boolean(character?.avatar && character.avatar.trim());
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

function getSeasonTopCharacter(data) {
  const characters = Array.isArray(data.characters) ? data.characters : [];
  const scoredCharacters = characters.filter((character) => Number(character.score) > 0);
  const candidateCharacters = scoredCharacters.length ? scoredCharacters : characters;
  const selectedCharacter = candidateCharacters
    .slice()
    .sort((left, right) => Number(right.score || 0) - Number(left.score || 0))[0];

  return mergeTopCharacterData(selectedCharacter, data.top_character);
}

function renderChampion(character) {
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
  championScore.textContent = character.score.toFixed(1);
}

function renderSummary(data) {
  summaryTotalScore.textContent = data.summary.total_score.toFixed(1);
  summaryScoredCharacters.textContent = `${data.summary.scored_characters} / ${data.summary.character_count}`;
  summaryHighestKey.textContent = `+${data.summary.highest_key.level} ${data.summary.highest_key.short_name}`;
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
    spotlightCopy.textContent = "No active Mythic+ characters found in the current data snapshot.";
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
            : "Tank-side route coverage and lower-key stability.";
      return `
        <a class="spotlight__card" href="${character.url}" target="_blank" rel="noreferrer">
          <strong>${character.display_name} · ${character.score.toFixed(1)}</strong>
          <span>${character.spec} ${character.class_name} · ${character.realm} ${character.region}</span>
          <span>${summary}</span>
        </a>
      `;
    })
    .join("");
}

function renderCards(characters) {
  const maxScore = Math.max(...characters.map((character) => character.score), 0);
  const fallbackHandler = `this.onerror=null;this.src='${FALLBACK_AVATAR_PATH}';`;

  cards.innerHTML = characters
    .map((character) => {
      const scoreWidth = maxScore ? Math.max(3, (character.score / maxScore) * 100) : 0;
      const scoreLabel = character.score ? character.score.toFixed(1) : "0";
      const badgeClass = character.score ? "badge" : "badge badge--zero";
      return `
        <a class="card" href="${character.url}" target="_blank" rel="noreferrer" data-role="${character.role}" data-scored="${character.score > 0}">
          <img class="card__avatar" src="${getCharacterAvatar(character)}" alt="${character.display_name} character portrait" onerror="${fallbackHandler}">
          <div>
            <div class="card__top">
              <div>
                <p class="card__name">${character.display_name}</p>
                <p class="card__meta">${character.spec} ${character.class_name} · ${character.role.toUpperCase()}</p>
              </div>
              <span class="${badgeClass}" style="background:${character.score ? character.color : ""}">${scoreLabel}</span>
            </div>
            <p class="card__realm">Level ${character.level} · ${character.realm} ${character.region}</p>
          </div>
          <div class="card__bars">
            <div class="bar" aria-hidden="true"><span style="--score-width:${scoreWidth}%"></span></div>
            <span class="ilvl">${Math.round(character.ilvl)} ilvl</span>
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
      seasonState.activeFilter === "all" ||
      (seasonState.activeFilter === "scored" && card.dataset.scored === "true") ||
      card.dataset.role === seasonState.activeFilter;
    card.classList.toggle("is-hidden", !isMatch);
  });
}

function renderRuns(runs, character) {
  const safeRuns = Array.isArray(runs) ? runs : [];
  if (runsTitle) {
    runsTitle.textContent = `${character.display_name} Push Board`;
  }

  if (runsProfileLink) {
    runsProfileLink.href = character.url;
    runsProfileLink.textContent = `${character.display_name} Profile`;
  }

  if (!safeRuns.length) {
    runList.innerHTML = `
      <div class="empty-state">
        No best runs are available for ${character.display_name} in this season snapshot yet.
      </div>
    `;
    return;
  }

  runList.innerHTML = safeRuns
    .map((run) => `
      <div class="run">
        <span class="run__level">+${run.level}</span>
        <div>
          <p class="run__name">${run.dungeon}</p>
          <p class="run__meta">${run.short_name} · ${formatDate(run.completed_at)}</p>
        </div>
        <strong class="run__score">${run.score.toFixed(1)}</strong>
      </div>
    `)
    .join("");
}

function renderDungeons(dungeons) {
  dungeonGrid.innerHTML = dungeons
    .map((dungeon) => {
      const detail = dungeon.entries.length
        ? `Best: ${dungeon.entries.map((entry) => `${entry.character} +${entry.level}`).join(" · ")}`
        : "No scored runs yet";
      return `
        <div class="dungeon">
          <strong>${dungeon.short_name}</strong>
          <span>${dungeon.name}</span>
          <span>${detail}</span>
        </div>
      `;
    })
    .join("");
}

function getTopCharacterByRole(characters, role) {
  return characters
    .filter((character) => character.role === role && character.score > 0)
    .sort((left, right) => right.score - left.score)[0];
}

function getMostActiveDungeon(dungeons) {
  return dungeons
    .map((dungeon) => {
      const entries = dungeon.entries || [];
      const bestEntry = entries
        .slice()
        .sort((left, right) => right.level - left.level || right.score - left.score)[0];
      return {
        name: dungeon.name,
        shortName: dungeon.short_name,
        runCount: entries.length,
        bestLevel: bestEntry ? bestEntry.level : 0
      };
    })
    .sort((left, right) => right.runCount - left.runCount || right.bestLevel - left.bestLevel)[0];
}

function getFirstKeystoneMasterRun(runs) {
  const KSM_KEY_LEVEL = 15;
  return runs
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

      return `${roleLabels[role]}: ${character.display_name} (${character.score.toFixed(1)})`;
    })
    .filter(Boolean);
}

function buildSeasonAchievements(data, topCharacter) {
  const mostActiveDungeon = getMostActiveDungeon(data.dungeons);
  const firstKsmRun = getFirstKeystoneMasterRun(topCharacter.best_runs || []);
  const roleHighlights = buildRoleHighlight(data.characters);

  return [
    {
      label: "Highest Mythic+ Score",
      value: `${topCharacter.display_name} · ${topCharacter.score.toFixed(1)}`,
      detail: `${topCharacter.spec} ${topCharacter.class_name} led the season scoreboard.`
    },
    {
      label: "Highest Key Completed",
      value: `+${data.summary.highest_key.level} ${data.summary.highest_key.short_name}`,
      detail: "Best recorded keystone level in the season snapshot."
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
        : "No +15 or higher run was present in the available best-run data."
    },
    {
      label: "Role Highlights",
      value: roleHighlights.length ? `${roleHighlights.length} role${roleHighlights.length === 1 ? "" : "s"} represented` : "No role leaders",
      detail: roleHighlights.length ? roleHighlights.join(" · ") : "No scored role data was available."
    }
  ];
}

function renderAchievements(data, season, topCharacter) {
  achievementsSeason.textContent = season.name;
  achievementGrid.innerHTML = buildSeasonAchievements(data, topCharacter)
    .map((achievement) => `
      <article class="achievement">
        <span>${achievement.label}</span>
        <strong>${achievement.value}</strong>
        <p>${achievement.detail}</p>
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
  seasonSelect.disabled = seasonState.seasons.length < 2;
  seasonSelect.value = seasonState.activeSeason ? seasonState.activeSeason.id : seasonState.seasons[0].id;
}

function bindSeasonSelector() {
  seasonSelect.onchange = () => {
    try {
      setActiveSeason(seasonSelect.value);
    } catch (error) {
      footerStatus.textContent = "Season data unavailable. The dashboard is still showing the last loaded season.";
      console.error(error);
    }
  };
}

function loadSeasonData(season) {
  const dataKey = season.dataKey || season.id;
  if (seasonState.dataCache.has(dataKey)) {
    return seasonState.dataCache.get(dataKey);
  }

  const data = window.MPLUS_SEASON_DATA?.[dataKey];
  if (!isUsableSeasonData(data)) {
    throw new Error(`Local season data missing or empty for ${season.id}.`);
  }

  seasonState.dataCache.set(dataKey, data);
  return data;
}

function isUsableSeasonData(data) {
  return Boolean(
    data &&
      data.summary &&
      data.top_character &&
      Array.isArray(data.characters) &&
      data.characters.length &&
      Array.isArray(data.dungeons)
  );
}

function buildProgressionEntry(season, data) {
  return {
    seasonId: season.id,
    seasonName: season.name,
    score: Number(data.summary.total_score) || 0,
    highestKey: Number(data.summary.highest_key.level) || 0,
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
    updateProgressionStatus();
    return;
  }

  const maxScore = Math.max(...seasonState.progressionEntries.map((entry) => entry.score), 1);
  progressionCanvas.innerHTML = seasonState.progressionEntries
    .map((entry) => {
      const width = Math.max(4, (entry.score / maxScore) * 100);
      return `
        <article class="progression-bar" data-season-id="${entry.seasonId}">
          <div>
            <strong>${entry.seasonName}</strong>
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

function loadProgressionData() {
  const results = seasonState.seasons.map((season) => {
    try {
      const data = loadSeasonData(season);
      return buildProgressionEntry(season, data);
    } catch (error) {
      console.error(`Could not load progression data for ${season.id}.`, error);
      return null;
    }
  });

  seasonState.progressionEntries = results.filter(Boolean);
  seasonState.progressionFailedCount = results.length - seasonState.progressionEntries.length;
  renderProgressionView();
}

function loadSeasons() {
  const seasons = window.MPLUS_SEASONS || [];
  if (!Array.isArray(seasons)) {
    throw new Error("Local season manifest must be an array.");
  }

  return seasons.filter((season) => {
    if (season.played !== true) {
      return false;
    }

    const data = window.MPLUS_SEASON_DATA?.[season.dataKey || season.id];
    return isUsableSeasonData(data);
  });
}

function renderDashboard(data, season) {
  seasonState.activeSeason = season;
  seasonState.activeData = data;
  const topCharacter = getSeasonTopCharacter(data);

  heroTags.innerHTML = buildHeroTags(data).map((tag) => `<span>${tag}</span>`).join("");
  renderChampion(topCharacter);
  renderSummary(data);
  renderSpotlight(data.active_characters, topCharacter);
  renderCards(data.characters);
  renderRuns(topCharacter.best_runs, topCharacter);
  renderDungeons(data.dungeons);
  renderAchievements(data, season, topCharacter);
  renderSeasonSelector();
  footerStatus.textContent = `Data source: public Raider.IO profile and character API. ${season.name} last updated ${formatDate(data.generated_at)}.`;
  bindFilters();
  applyRosterFilter();
  updateProgressionViewHighlight();
}

function restoreActiveSeasonSelection() {
  if (seasonState.activeSeason) {
    seasonSelect.value = seasonState.activeSeason.id;
  }
}

function setActiveSeason(seasonId) {
  if (seasonState.isLoading) {
    return;
  }

  const season = seasonState.seasons.find((candidate) => candidate.id === seasonId);
  if (!season) {
    throw new Error(`Season ${seasonId} is not available.`);
  }

  seasonState.isLoading = true;
  seasonSelect.disabled = true;

  try {
    const data = loadSeasonData(season);
    renderDashboard(data, season);
    updateUrlState();
  } catch (error) {
    restoreActiveSeasonSelection();
    throw error;
  } finally {
    seasonState.isLoading = false;
    seasonSelect.disabled = seasonState.seasons.length < 2;
  }
}

function loadData() {
  try {
    seasonState.seasons = loadSeasons();
    const urlState = getUrlState();
    const requestedSeason = seasonState.seasons.find((season) => season.id === urlState.season);
    const defaultSeason = requestedSeason || seasonState.seasons[0];
    seasonState.activeFilter = getValidRoleFilter(urlState.role);

    if (!defaultSeason) {
      throw new Error("No played Mythic+ seasons are available.");
    }

    bindSeasonSelector();
    setActiveSeason(defaultSeason.id);
    loadProgressionData();
  } catch (error) {
    footerStatus.textContent = "Local data unavailable. Check that the data scripts are loaded before script.js.";
    spotlightCopy.textContent = "The site could not load the embedded Mythic+ snapshot.";
    cards.innerHTML = "";
    runList.innerHTML = "";
    dungeonGrid.innerHTML = "";
    achievementGrid.innerHTML = "";
    achievementsSeason.textContent = "Achievements unavailable.";
    seasonSelect.innerHTML = "<option>Seasons unavailable</option>";
    seasonSelect.disabled = true;
    progressionStatus.textContent = "Season history unavailable.";
    console.error(error);
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
  getSeasonTopCharacter,
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

  try {
    setActiveSeason(season.id);
  } catch (error) {
    footerStatus.textContent = "Season data unavailable. The dashboard is still showing the last loaded season.";
    console.error(error);
  } finally {
    seasonState.isRestoringUrl = false;
  }
});

loadData();
