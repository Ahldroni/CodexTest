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

const SEASONS_MANIFEST_PATH = "data/seasons.json";

const seasonState = {
  seasons: [],
  activeSeason: null,
  activeData: null,
  activeFilter: "all",
  isLoading: false
};

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
  return [
    `Season ${formatSeasonLabel(data.season_label)}`,
    `Warband Score ${data.summary.total_score.toFixed(1)}`,
    `Heroic Raid ${heroicProgress}`
  ];
}

function renderChampion(character) {
  if (document.body && character.avatar) {
    document.body.style.setProperty("--hero-image", `url("${character.avatar}")`);
  }
  championAvatar.src = character.avatar;
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

function renderSpotlight(activeCharacters) {
  if (!activeCharacters.length) {
    spotlightCopy.textContent = "No active Mythic+ characters found in the current data snapshot.";
    spotlightRail.innerHTML = "";
    return;
  }

  const highlightNames = activeCharacters.map((character) => character.display_name);
  spotlightCopy.textContent = `${highlightNames[0]} leads the current push, with ${highlightNames[1] || "no secondary scorer yet"}${highlightNames[2] ? ` and ${highlightNames[2]} filling out the active ladder` : ""}.`;

  spotlightRail.innerHTML = activeCharacters
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

  cards.innerHTML = characters
    .map((character) => {
      const scoreWidth = maxScore ? Math.max(3, (character.score / maxScore) * 100) : 0;
      const scoreLabel = character.score ? character.score.toFixed(1) : "0";
      const badgeClass = character.score ? "badge" : "badge badge--zero";
      return `
        <a class="card" href="${character.url}" target="_blank" rel="noreferrer" data-role="${character.role}" data-scored="${character.score > 0}">
          <img class="card__avatar" src="${character.avatar}" alt="${character.display_name} character portrait">
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

function renderRuns(runs) {
  runList.innerHTML = runs
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

function bindFilters() {
  document.querySelectorAll(".segment").forEach((button) => {
    button.onclick = () => {
      seasonState.activeFilter = button.dataset.filter;
      applyRosterFilter();
    };
  });
}

function renderSeasonSelector() {
  seasonSelect.innerHTML = seasonState.seasons
    .map((season) => `<option value="${season.id}">${season.name}</option>`)
    .join("");
  seasonSelect.disabled = seasonState.seasons.length < 2;
  seasonSelect.value = seasonState.activeSeason ? seasonState.activeSeason.id : seasonState.seasons[0].id;
}

function bindSeasonSelector() {
  seasonSelect.onchange = async () => {
    try {
      await setActiveSeason(seasonSelect.value);
    } catch (error) {
      footerStatus.textContent = "Season data unavailable. The dashboard is still showing the last loaded season.";
      console.error(error);
    }
  };
}

async function fetchJson(path) {
  const response = await fetch(`${path}?ts=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} loading ${path}`);
  }

  return response.json();
}

async function loadSeasons() {
  const seasons = await fetchJson(SEASONS_MANIFEST_PATH);
  if (!Array.isArray(seasons)) {
    throw new Error("The seasons manifest must be a JSON array.");
  }

  return seasons.filter((season) => season.played === true);
}

function renderDashboard(data, season) {
  seasonState.activeSeason = season;
  seasonState.activeData = data;

  heroTags.innerHTML = buildHeroTags(data).map((tag) => `<span>${tag}</span>`).join("");
  renderChampion(data.top_character);
  renderSummary(data);
  renderSpotlight(data.active_characters);
  renderCards(data.characters);
  renderRuns(data.top_character.best_runs);
  renderDungeons(data.dungeons);
  renderSeasonSelector();
  footerStatus.textContent = `Data source: public Raider.IO profile and character API. ${season.name} last updated ${formatDate(data.generated_at)}.`;
  bindFilters();
  applyRosterFilter();
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
  seasonSelect.disabled = true;

  try {
    const data = await fetchJson(season.file);
    renderDashboard(data, season);
  } catch (error) {
    if (seasonState.activeSeason) {
      seasonSelect.value = seasonState.activeSeason.id;
    }
    throw error;
  } finally {
    seasonState.isLoading = false;
    seasonSelect.disabled = seasonState.seasons.length < 2;
  }
}

async function loadData() {
  try {
    seasonState.seasons = await loadSeasons();
    const defaultSeason = seasonState.seasons[0];

    if (!defaultSeason) {
      throw new Error("No played Mythic+ seasons are available.");
    }

    bindSeasonSelector();
    await setActiveSeason(defaultSeason.id);
  } catch (error) {
    footerStatus.textContent = "Data source unavailable. Automatic refresh is configured, but the latest JSON could not be loaded.";
    spotlightCopy.textContent = "The site could not load the generated Raider.IO snapshot.";
    cards.innerHTML = "";
    runList.innerHTML = "";
    dungeonGrid.innerHTML = "";
    seasonSelect.innerHTML = "<option>Seasons unavailable</option>";
    seasonSelect.disabled = true;
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
  setActiveSeason
};

loadData();
