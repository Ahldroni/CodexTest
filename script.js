const characters = [
  {
    name: "Warlockzz",
    realm: "Silvermoon",
    region: "EU",
    className: "Warlock",
    spec: "Demonology",
    role: "dps",
    level: 90,
    ilvl: 275,
    score: 3080.6,
    color: "#6560e4",
    avatar: "https://render.worldofwarcraft.com/eu/character/silvermoon/15/217155343-avatar.jpg?alt=/wow/static/images/2d/avatar/6-0.jpg",
    url: "https://raider.io/characters/eu/silvermoon/Warlockzz"
  },
  {
    name: "Ahldrak",
    realm: "Stormscale",
    region: "EU",
    className: "Evoker",
    spec: "Augmentation",
    role: "dps",
    level: 90,
    ilvl: 232,
    score: 1395.5,
    color: "#a1ff87",
    avatar: "https://render.worldofwarcraft.com/eu/character/stormscale/193/167457729-avatar.jpg?alt=/wow/static/images/2d/avatar/70-0.jpg",
    url: "https://raider.io/characters/eu/stormscale/Ahldrak"
  },
  {
    name: "Ahldroni",
    realm: "Silvermoon",
    region: "EU",
    className: "Druid",
    spec: "Guardian",
    role: "tank",
    level: 90,
    ilvl: 240,
    score: 730.5,
    color: "#d9ffca",
    avatar: "https://render.worldofwarcraft.com/eu/character/silvermoon/183/209840311-avatar.jpg?alt=/wow/static/images/2d/avatar/91-0.jpg",
    url: "https://raider.io/characters/eu/silvermoon/Ahldroni"
  },
  {
    name: "Lifekiller",
    realm: "Stormrage",
    region: "EU",
    className: "Death Knight",
    spec: "Unholy",
    role: "dps",
    level: 90,
    ilvl: 188,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/stormrage/145/138253713-avatar.jpg?alt=/wow/static/images/2d/avatar/2-0.jpg",
    url: "https://raider.io/characters/eu/stormrage/Lifekiller"
  },
  {
    name: "Kexa",
    realm: "Stormscale",
    region: "EU",
    className: "Mage",
    spec: "Fire",
    role: "dps",
    level: 70,
    ilvl: 485,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/stormscale/15/117908239-avatar.jpg?alt=/wow/static/images/2d/avatar/8-0.jpg",
    url: "https://raider.io/characters/eu/stormscale/Kexa"
  },
  {
    name: "Megakuk",
    displayName: "Megakûk",
    realm: "Silvermoon",
    region: "EU",
    className: "Monk",
    spec: "Windwalker",
    role: "dps",
    level: 70,
    ilvl: 499,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/silvermoon/151/215001751-avatar.jpg?alt=/wow/static/images/2d/avatar/8-0.jpg",
    url: "https://raider.io/characters/eu/silvermoon/Megak%C3%BBk"
  },
  {
    name: "Kexa-alt",
    displayName: "Kexã",
    realm: "Silvermoon",
    region: "EU",
    className: "Mage",
    spec: "Frost",
    role: "dps",
    level: 80,
    ilvl: 82,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/silvermoon/173/215467181-avatar.jpg?alt=/wow/static/images/2d/avatar/8-0.jpg",
    url: "https://raider.io/characters/eu/silvermoon/Kex%C3%A3"
  },
  {
    name: "Fyndir",
    displayName: "Fyñdir",
    realm: "Silvermoon",
    region: "EU",
    className: "Demon Hunter",
    spec: "Havoc",
    role: "dps",
    level: 80,
    ilvl: 529,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/silvermoon/105/215584361-avatar.jpg?alt=/wow/static/images/2d/avatar/10-0.jpg",
    url: "https://raider.io/characters/eu/silvermoon/Fy%C3%B1dir"
  },
  {
    name: "Xavier",
    displayName: "Xãvier",
    realm: "Silvermoon",
    region: "EU",
    className: "Warlock",
    spec: "Destruction",
    role: "dps",
    level: 70,
    ilvl: 335,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/silvermoon/248/215940856-avatar.jpg?alt=/wow/static/images/2d/avatar/6-0.jpg",
    url: "https://raider.io/characters/eu/silvermoon/X%C3%A3vier"
  },
  {
    name: "Starseeker",
    realm: "Stormrage",
    region: "EU",
    className: "Priest",
    spec: "Shadow",
    role: "dps",
    level: 80,
    ilvl: 83,
    score: 0,
    color: "#aaa",
    avatar: "https://render.worldofwarcraft.com/eu/character/stormrage/221/143915229-avatar.jpg?alt=/wow/static/images/2d/avatar/10-0.jpg",
    url: "https://raider.io/characters/eu/stormrage/Starseeker"
  }
];

const bestRuns = [
  ["+15", "Seat of the Triumvirate", "SEAT", 413.6, "Apr 21, 2026"],
  ["+14", "Skyreach", "SR", 400.6, "May 5, 2026"],
  ["+13", "Maisara Caverns", "MC", 387.6, "Apr 21, 2026"],
  ["+13", "Pit of Saron", "POS", 384.8, "Apr 14, 2026"],
  ["+13", "Algeth'ar Academy", "AA", 381.4, "May 4, 2026"],
  ["+12", "Nexus-Point Xenas", "NPX", 372.3, "Apr 20, 2026"],
  ["+12", "Windrunner Spire", "WS", 370.5, "Apr 20, 2026"],
  ["+12", "Magisters' Terrace", "MT", 369.8, "Apr 21, 2026"]
];

const dungeons = [
  ["AA", "Algeth'ar Academy", "Best: Warlockzz +13 · Ahldrak +7 · Ahldroni +4"],
  ["MT", "Magisters' Terrace", "Best: Warlockzz +12"],
  ["MC", "Maisara Caverns", "Best: Warlockzz +13 · Ahldrak +5"],
  ["NPX", "Nexus-Point Xenas", "Best: Warlockzz +12 · Ahldrak +6 · Ahldroni +4"],
  ["POS", "Pit of Saron", "Best: Warlockzz +13 · Ahldrak +6 · Ahldroni +2"],
  ["SEAT", "Seat of the Triumvirate", "Best: Warlockzz +15 · Ahldrak +6"],
  ["SR", "Skyreach", "Best: Warlockzz +14 · Ahldroni +2"],
  ["WS", "Windrunner Spire", "Best: Warlockzz +12 · Ahldrak +2"]
];

const maxScore = Math.max(...characters.map((character) => character.score));
const cards = document.querySelector("#character-cards");
const runList = document.querySelector("#run-list");
const dungeonGrid = document.querySelector("#dungeon-grid");
const spotlightRail = document.querySelector("#spotlight-rail");

const activeCharacters = [...characters]
  .filter((character) => character.score > 0)
  .sort((left, right) => right.score - left.score);

cards.innerHTML = characters
  .map((character) => {
    const label = character.displayName || character.name;
    const scoreWidth = maxScore ? Math.max(3, (character.score / maxScore) * 100) : 0;
    const scoreLabel = character.score ? character.score.toFixed(1) : "0";
    const badgeClass = character.score ? "badge" : "badge badge--zero";
    return `
      <a class="card" href="${character.url}" target="_blank" rel="noreferrer" data-role="${character.role}" data-scored="${character.score > 0}">
        <img class="card__avatar" src="${character.avatar}" alt="${label} character portrait">
        <div>
          <div class="card__top">
            <div>
              <p class="card__name">${label}</p>
              <p class="card__meta">${character.spec} ${character.className} · ${character.role.toUpperCase()}</p>
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

runList.innerHTML = bestRuns
  .map(([level, dungeon, shortName, score, date]) => `
    <div class="run">
      <span class="run__level">${level}</span>
      <div>
        <p class="run__name">${dungeon}</p>
        <p class="run__meta">${shortName} · ${date}</p>
      </div>
      <strong class="run__score">${score.toFixed(1)}</strong>
    </div>
  `)
  .join("");

dungeonGrid.innerHTML = dungeons
  .map(([shortName, name, detail]) => `
    <div class="dungeon">
      <strong>${shortName}</strong>
      <span>${name}</span>
      <span>${detail}</span>
    </div>
  `)
  .join("");

spotlightRail.innerHTML = activeCharacters
  .map((character, index) => {
    const label = character.displayName || character.name;
    const summary =
      index === 0
        ? "Primary push character and current score leader."
        : index === 1
          ? "Secondary ladder coverage with active alt progression."
          : "Tank-side route coverage and lower-key stability.";
    return `
      <a class="spotlight__card" href="${character.url}" target="_blank" rel="noreferrer">
        <strong>${label} · ${character.score.toFixed(1)}</strong>
        <span>${character.spec} ${character.className} · ${character.realm} ${character.region}</span>
        <span>${summary}</span>
      </a>
    `;
  })
  .join("");

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((segment) => segment.classList.remove("is-active"));
    button.classList.add("is-active");
    const filter = button.dataset.filter;

    document.querySelectorAll(".card").forEach((card) => {
      const isMatch =
        filter === "all" ||
        (filter === "scored" && card.dataset.scored === "true") ||
        card.dataset.role === filter;
      card.classList.toggle("is-hidden", !isMatch);
    });
  });
});
