const SEASONS_URL = "data/seasons.json";
const FALLBACK_AVATAR = "assets/avatar-fallback.svg";

const state = {
  seasons: [],
  selectedSeasonId: "",
  selectedSeason: null,
  selectedData: null,
  seasonData: new Map()
};

const app = document.querySelector("#app");
const seasonSelect = document.querySelector("#season-select");
const statusNode = document.querySelector("#status");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatNumber(value, digits = 1) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function formatDate(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function getUrlSeason() {
  return new URLSearchParams(window.location.search).get("season");
}

function setUrlSeason(seasonId) {
  const url = new URL(window.location.href);
  url.searchParams.set("season", seasonId);
  window.history.replaceState({}, "", url);
}

function isCurrentSeason(season) {
  return Boolean(season?.isCurrent);
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "default" });
  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}`);
  }

  return response.json();
}

function seasonTheme(season, data) {
  const explicitTheme = String(season?.theme || data?.theme || "").trim().toLowerCase();
  if (explicitTheme) {
    return explicitTheme === "midnight" ? "midnight" : "legion";
  }

  const themeSource = `${season?.id || ""} ${season?.name || ""} ${data?.season_id || ""}`.toLowerCase();
  if (themeSource.includes("mn") || themeSource.includes("midnight") || season?.expansion === "Current") {
    return "midnight";
  }

  return "legion";
}

function seasonTitle(season, data) {
  return season?.name || data?.season_label || "Mythic+ Season";
}

function seasonShortName(season, data) {
  return season?.shortName || data?.season_label || season?.id || "Season";
}

function getCharacters(data) {
  const candidates = [
    data?.all_characters,
    data?.characters,
    data?.active_characters
  ];

  return (candidates.find(Array.isArray) || [])
    .filter(Boolean)
    .map((character) => ({
      ...character,
      display_name: character.display_name || character.name || "Unknown",
      profile_url: character.profile_url || character.url || "#",
      url: character.profile_url || character.url || "#",
      score: Number(character.score || 0)
    }))
    .sort((left, right) => right.score - left.score);
}

function normalizeRun(run, characterName = "") {
  if (!run) {
    return null;
  }

  const level = Number(run.level || run.mythic_level || 0);
  if (!level) {
    return null;
  }

  return {
    dungeon: run.dungeon || run.name || run.short_name || "Unknown dungeon",
    shortName: run.short_name || run.shortName || run.dungeon || "UNK",
    level,
    score: Number(run.score || 0),
    upgrades: Number(run.upgrades || 0),
    completedAt: run.completed_at || run.completedAt || "",
    character: run.character || characterName || "Unknown"
  };
}

function collectBestRuns(data) {
  const runs = [];
  const seen = new Set();

  function addRun(rawRun, characterName) {
    const run = normalizeRun(rawRun, characterName);
    if (!run) {
      return;
    }

    const key = `${run.character}|${run.shortName}|${run.level}|${run.score}|${run.completedAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      runs.push(run);
    }
  }

  getCharacters(data).forEach((character) => {
    const name = character.display_name || character.name;
    [
      character.best_runs,
      character.mythic_plus_best_runs,
      character.mythic_plus_alternate_runs,
      character.all_runs
    ].filter(Array.isArray).forEach((runList) => {
      runList.forEach((run) => addRun(run, name));
    });
  });

  [
    data?.best_runs,
    data?.mythic_plus_best_runs,
    data?.top_character?.best_runs,
    data?.top_character?.mythic_plus_best_runs
  ].filter(Array.isArray).forEach((runList) => {
    runList.forEach((run) => addRun(run, data?.top_character?.display_name || data?.top_character?.name));
  });

  return runs.sort((left, right) => {
    return right.level - left.level || right.score - left.score || String(right.completedAt).localeCompare(String(left.completedAt));
  });
}

function buildDungeonCoverage(data, runs) {
  const byDungeon = new Map();

  (Array.isArray(data?.dungeons) ? data.dungeons : []).forEach((dungeon) => {
    const key = dungeon.short_name || dungeon.shortName || dungeon.name;
    byDungeon.set(key, {
      name: dungeon.name || key || "Unknown dungeon",
      shortName: dungeon.short_name || dungeon.shortName || key || "UNK",
      runs: []
    });
  });

  runs.forEach((run) => {
    const key = run.shortName || run.dungeon;
    if (!byDungeon.has(key)) {
      byDungeon.set(key, {
        name: run.dungeon,
        shortName: run.shortName,
        runs: []
      });
    }
    byDungeon.get(key).runs.push(run);
  });

  return [...byDungeon.values()]
    .map((dungeon) => ({
      ...dungeon,
      bestRun: dungeon.runs.slice().sort((left, right) => right.level - left.level || right.score - left.score)[0] || null,
      characterCount: new Set(dungeon.runs.map((run) => run.character).filter(Boolean)).size
    }))
    .sort((left, right) => {
      return Number(Boolean(right.bestRun)) - Number(Boolean(left.bestRun)) || (right.bestRun?.level || 0) - (left.bestRun?.level || 0) || left.name.localeCompare(right.name);
    });
}

function buildSummary(data, characters, runs, dungeons) {
  const highestRun = runs[0] || null;
  const totalScore = characters.reduce((total, character) => total + Number(character.score || 0), 0);
  const summary = data?.summary || {};

  return {
    totalScore: totalScore || Number(summary.total_score || 0),
    characterCount: characters.length || Number(summary.character_count || 0),
    scoredCharacters: characters.filter((character) => Number(character.score || 0) > 0).length || Number(summary.scored_characters || 0),
    highestKey: highestRun || summary.highest_key || null,
    dungeonCount: dungeons.length || Number(summary.dungeon_count || 0),
    heroicBosses: Number(summary.heroic_bosses || 0),
    raidBosses: Number(summary.raid_bosses || 0)
  };
}

function avatarFor(character) {
  const avatar = String(character?.avatar || "").trim();
  return avatar || FALLBACK_AVATAR;
}

function imageErrorAttribute() {
  return `this.onerror=null;this.src='${FALLBACK_AVATAR}';`;
}

function characterMeta(character) {
  return [
    character.spec,
    character.class_name,
    character.realm,
    character.region ? String(character.region).toUpperCase() : ""
  ].filter(Boolean).join(" · ");
}

function renderHero(season, data, characters, runs, summary, theme) {
  const leader = characters[0] || data?.top_character || {};
  const highestLabel = summary.highestKey?.level
    ? `+${summary.highestKey.level} ${summary.highestKey.shortName || summary.highestKey.short_name || ""}`.trim()
    : "No timed keys";
  const themeCopy = theme === "midnight"
    ? "Midnight routing, score pressure, and dungeon spread for the active push."
    : "Archived season pathing with a fel-lit look for past campaign context.";

  return `
    <section class="hero section-rise">
      <div class="hero__copy">
        <p class="eyebrow">${escapeHtml(seasonShortName(season, data))} / ${escapeHtml(theme)} theme</p>
        <h1>${escapeHtml(data?.profile_name || "Ahldroni")} Mythic+ Dashboard</h1>
        <p class="lede">${escapeHtml(themeCopy)} This page is rebuilt from the season JSON each time you switch seasons.</p>
        <div class="metric-strip" aria-label="Season summary">
          <div><strong>${formatNumber(summary.totalScore)}</strong><span>Warband score</span></div>
          <div><strong>${summary.scoredCharacters}/${summary.characterCount}</strong><span>Scored characters</span></div>
          <div><strong>${escapeHtml(highestLabel)}</strong><span>Highest key</span></div>
          <div><strong>${summary.dungeonCount}</strong><span>Dungeons tracked</span></div>
        </div>
      </div>
      <article class="leader-card" aria-label="Season leader">
        <img src="${escapeHtml(avatarFor(leader))}" alt="${escapeHtml(leader.display_name || leader.name || "Character")} portrait" onerror="${imageErrorAttribute()}">
        <div>
          <span>Season leader</span>
          <h2>${escapeHtml(leader.display_name || leader.name || "No character yet")}</h2>
          <p>${escapeHtml(characterMeta(leader) || "Awaiting character data")}</p>
        </div>
        <strong>${formatNumber(leader.score || 0)}</strong>
      </article>
    </section>
  `;
}

function renderSeasonSelector() {
  return `
    <section class="season-panel section-rise" aria-labelledby="season-heading">
      <div>
        <p class="eyebrow">Season control</p>
        <h2 id="season-heading">Switch the whole board</h2>
        <p>Changing the season updates <code>?season=...</code>, reloads the selected JSON, and fully rerenders every section.</p>
      </div>
      <label class="select-wrap">
        <span>Selected season</span>
        <select id="season-select-inline" aria-label="Selected season">
          ${state.seasons.map((season) => `
            <option value="${escapeHtml(season.id)}" ${season.id === state.selectedSeasonId ? "selected" : ""}>
              ${escapeHtml(season.name || season.id)}
            </option>
          `).join("")}
        </select>
      </label>
    </section>
  `;
}

function renderStandings(characters) {
  const maxScore = Math.max(...characters.map((character) => character.score), 1);
  const rows = characters.length ? characters.map((character, index) => {
    const width = Math.max(4, (character.score / maxScore) * 100);
    return `
      <article class="standing-card">
        <span class="rank">#${index + 1}</span>
        <img src="${escapeHtml(avatarFor(character))}" alt="${escapeHtml(character.display_name)} portrait" onerror="${imageErrorAttribute()}">
        <div class="standing-card__main">
          <h3>${escapeHtml(character.display_name)}</h3>
          <p>${escapeHtml(characterMeta(character))}</p>
          <div class="score-bar" aria-hidden="true"><span style="width:${width}%"></span></div>
        </div>
        <strong>${formatNumber(character.score)}</strong>
      </article>
    `;
  }).join("") : `<p class="empty">No scored characters in this season snapshot.</p>`;

  return `
    <section class="grid-section section-rise" aria-labelledby="standings-heading">
      <div class="section-heading">
        <p class="eyebrow">Roster</p>
        <h2 id="standings-heading">Standings</h2>
      </div>
      <div class="standings">${rows}</div>
    </section>
  `;
}

function renderRuns(runs) {
  const rows = runs.slice(0, 12).map((run) => `
    <article class="run-card">
      <span class="key-level">+${run.level}</span>
      <div>
        <h3>${escapeHtml(run.dungeon)}</h3>
        <p>${escapeHtml(run.shortName)} · ${escapeHtml(run.character)} · ${formatDate(run.completedAt)}</p>
      </div>
      <strong>${formatNumber(run.score)}</strong>
    </article>
  `).join("");

  return `
    <section class="grid-section section-rise" aria-labelledby="runs-heading">
      <div class="section-heading">
        <p class="eyebrow">Aggregated from every character</p>
        <h2 id="runs-heading">Best Runs</h2>
      </div>
      <div class="run-grid">${rows || `<p class="empty">No best runs found for this season.</p>`}</div>
    </section>
  `;
}

function renderDungeons(dungeons) {
  const cards = dungeons.map((dungeon) => {
    const best = dungeon.bestRun;
    const stateClass = best ? "is-covered" : "is-empty";
    const bestLabel = best ? `+${best.level} by ${best.character}` : "No run recorded";
    return `
      <article class="dungeon-card ${stateClass}">
        <div>
          <strong>${escapeHtml(dungeon.shortName)}</strong>
          <h3>${escapeHtml(dungeon.name)}</h3>
        </div>
        <p>${escapeHtml(bestLabel)}</p>
        <span>${dungeon.runs.length} runs · ${dungeon.characterCount} characters</span>
      </article>
    `;
  }).join("");

  return `
    <section class="grid-section section-rise" aria-labelledby="coverage-heading">
      <div class="section-heading">
        <p class="eyebrow">Route map</p>
        <h2 id="coverage-heading">Dungeon Coverage</h2>
      </div>
      <div class="dungeon-grid">${cards || `<p class="empty">No dungeon coverage available.</p>`}</div>
    </section>
  `;
}

function timelineItems() {
  return state.seasons.map((season) => {
    const data = state.seasonData.get(season.id);
    const characters = getCharacters(data || {});
    const runs = collectBestRuns(data || {});
    const dungeons = buildDungeonCoverage(data || {}, runs);
    const summary = buildSummary(data || {}, characters, runs, dungeons);
    const highestKey = summary.highestKey?.level
      ? `+${summary.highestKey.level} ${summary.highestKey.shortName || summary.highestKey.short_name || ""}`.trim()
      : "No key";

    return { season, summary, highestKey };
  });
}

function renderTimeline() {
  const items = timelineItems().map(({ season, summary, highestKey }) => `
    <article class="timeline-item ${season.id === state.selectedSeasonId ? "is-active" : ""}">
      <span></span>
      <div>
        <strong>${escapeHtml(seasonShortName(season))}</strong>
        <p>${formatNumber(summary.totalScore)} score · ${escapeHtml(highestKey)}</p>
      </div>
    </article>
  `).join("");

  return `
    <section class="timeline-section section-rise" aria-labelledby="timeline-heading">
      <div class="section-heading centered">
        <p class="eyebrow">Progression</p>
        <h2 id="timeline-heading">Season Timeline</h2>
      </div>
      <div class="timeline" aria-label="Season progression timeline">${items}</div>
    </section>
  `;
}

function renderAchievements(data, characters, runs, dungeons, summary) {
  const bestRun = runs[0];
  const widestDungeon = dungeons.slice().sort((left, right) => right.characterCount - left.characterCount || (right.bestRun?.level || 0) - (left.bestRun?.level || 0))[0];
  const leader = characters[0];
  const raidProgress = summary.raidBosses ? `${summary.heroicBosses}/${summary.raidBosses} heroic raid` : "Raid progress unavailable";

  const achievements = [
    {
      label: "Ceiling key",
      value: bestRun ? `+${bestRun.level} ${bestRun.shortName}` : "No key",
      detail: bestRun ? `${bestRun.character} scored ${formatNumber(bestRun.score)}` : "No run data available"
    },
    {
      label: "Coverage anchor",
      value: widestDungeon ? widestDungeon.shortName : "N/A",
      detail: widestDungeon ? `${widestDungeon.runs.length} runs across ${widestDungeon.characterCount} characters` : "No dungeon data available"
    },
    {
      label: "Roster lead",
      value: leader ? leader.display_name : "N/A",
      detail: leader ? `${formatNumber(leader.score)} score as ${leader.spec || leader.class_name || "unknown spec"}` : "No character data available"
    },
    {
      label: "Raid marker",
      value: raidProgress,
      detail: `Snapshot generated ${formatDate(data?.generated_at)}`
    }
  ];

  return `
    <section class="grid-section section-rise" aria-labelledby="achievements-heading">
      <div class="section-heading">
        <p class="eyebrow">Highlights</p>
        <h2 id="achievements-heading">Achievements</h2>
      </div>
      <div class="achievement-grid">
        ${achievements.map((item) => `
          <article class="achievement-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function bindInlineSeasonSelect() {
  const inlineSelect = document.querySelector("#season-select-inline");
  if (!inlineSelect) {
    return;
  }

  inlineSelect.addEventListener("change", () => {
    selectSeason(inlineSelect.value);
  });
}

function render() {
  const data = state.selectedData || {};
  const season = state.selectedSeason || {};
  const theme = seasonTheme(season, data);
  const characters = getCharacters(data);
  const runs = collectBestRuns(data);
  const dungeons = buildDungeonCoverage(data, runs);
  const summary = buildSummary(data, characters, runs, dungeons);

  document.body.dataset.theme = theme;
  document.title = `${seasonShortName(season, data)} Mythic+ Dashboard`;
  statusNode.textContent = `${seasonTitle(season, data)} loaded from ${season.file || "season data"}.`;

  app.innerHTML = [
    renderHero(season, data, characters, runs, summary, theme),
    renderSeasonSelector(),
    renderStandings(characters),
    renderRuns(runs),
    renderDungeons(dungeons),
    renderTimeline(),
    renderAchievements(data, characters, runs, dungeons, summary)
  ].join("");

  bindInlineSeasonSelect();
}

async function loadSeasonData(season) {
  if (state.seasonData.has(season.id)) {
    return state.seasonData.get(season.id);
  }

  const data = await fetchJson(season.file);
  state.seasonData.set(season.id, data);
  return data;
}

async function selectSeason(seasonId, updateUrl = true) {
  const season = state.seasons.find((item) => item.id === seasonId) || state.seasons[0];
  if (!season) {
    throw new Error("No seasons are configured.");
  }

  state.selectedSeasonId = season.id;
  state.selectedSeason = season;
  statusNode.textContent = `Loading ${seasonTitle(season)}...`;

  if (seasonSelect) {
    seasonSelect.value = season.id;
  }

  if (updateUrl) {
    setUrlSeason(season.id);
  }

  state.selectedData = await loadSeasonData(season);
  render();
}

function populateGlobalSeasonSelect() {
  const currentOptions = state.seasons
    .filter(isCurrentSeason)
    .map((season) => `<option value="${escapeHtml(season.id)}">${escapeHtml(season.name || season.id)}</option>`)
    .join("");
  const pastOptions = state.seasons
    .filter((season) => !isCurrentSeason(season))
    .map((season) => `<option value="${escapeHtml(season.id)}">${escapeHtml(season.expansion || "Past")} / ${escapeHtml(season.name || season.id)}</option>`)
    .join("");

  seasonSelect.innerHTML = `
    ${currentOptions ? `<optgroup label="Current season">${currentOptions}</optgroup>` : ""}
    ${pastOptions ? `<optgroup label="Past seasons">${pastOptions}</optgroup>` : ""}
  `;
  seasonSelect.disabled = false;
}

async function preloadTimelineData() {
  await Promise.allSettled(state.seasons.map((season) => loadSeasonData(season)));
}

async function init() {
  try {
    state.seasons = (await fetchJson(SEASONS_URL))
      .filter((season) => season && season.id && season.file)
      .sort((left, right) => Number(Boolean(right.isCurrent)) - Number(Boolean(left.isCurrent)));
    populateGlobalSeasonSelect();

    const requestedSeason = getUrlSeason();
    const initialSeason = state.seasons.find((season) => season.id === requestedSeason) || state.seasons[0];
    await selectSeason(initialSeason?.id, true);
    preloadTimelineData().then(render);

    seasonSelect.addEventListener("change", () => {
      selectSeason(seasonSelect.value);
    });

    window.addEventListener("popstate", () => {
      const seasonFromUrl = getUrlSeason();
      if (seasonFromUrl) {
        selectSeason(seasonFromUrl, false);
      }
    });
  } catch (error) {
    console.error(error);
    document.body.dataset.theme = "midnight";
    statusNode.textContent = "Dashboard data could not be loaded.";
    app.innerHTML = `
      <section class="error-panel">
        <p class="eyebrow">Load error</p>
        <h1>Mythic+ dashboard unavailable</h1>
        <p>Check that <code>${SEASONS_URL}</code> and the referenced season JSON files are present on GitHub Pages.</p>
      </section>
    `;
  }
}

init();
