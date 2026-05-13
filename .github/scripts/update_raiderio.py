#!/usr/bin/env python3

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


BASE_URL = "https://raider.io"
PROFILE_NAME = "Ahldroni"
OUTPUT_PATH = Path(__file__).resolve().parents[2] / "data" / "raiderio.json"
JS_OUTPUT_PATH = Path(__file__).resolve().parents[2] / "data" / "raiderio-data.js"


def fetch_json(path: str, params: dict[str, Any]) -> dict[str, Any]:
    query = urlencode(params)
    url = f"{BASE_URL}{path}?{query}"
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            "Accept": "application/json,text/plain,*/*",
        },
    )
    with urlopen(request) as response:
        return json.load(response)


def display_name(name: str) -> str:
    return name


def build_character_url(region: str, realm: str, name: str) -> str:
    return f"{BASE_URL}/characters/{region.lower()}/{quote(realm.lower())}/{quote(name)}"


def parse_role(spec_role: str | None) -> str:
    if not spec_role:
      return "dps"
    value = spec_role.lower()
    return "tank" if value == "tank" else "healer" if value == "healer" else "dps"


def build_characters(raw_characters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    characters: list[dict[str, Any]] = []
    for entry in raw_characters:
        character = entry["character"]
        region = character["region"]["slug"].upper()
        realm = character["realm"]["name"]
        score = float(entry["keystoneScores"]["allScore"])
        characters.append(
            {
                "name": character["name"],
                "display_name": display_name(character["name"]),
                "realm": realm,
                "region": region,
                "class_name": character["class"]["name"],
                "spec": character["spec"]["name"],
                "role": parse_role(character["spec"].get("role")),
                "level": character["level"],
                "ilvl": float(character["itemLevelEquipped"]),
                "score": score,
                "color": entry["keystoneScores"]["allScoreColor"],
                "avatar": f"https://render.worldofwarcraft.com/{character['region']['slug']}/{character['thumbnail']}",
                "url": build_character_url(character["region"]["slug"], character["realm"]["slug"], character["name"]),
                "raid_progress": entry["raidProgress"]["progress"],
            }
        )
    return sorted(characters, key=lambda item: (-item["score"], item["display_name"]))


def fetch_detailed_character(character: dict[str, Any]) -> dict[str, Any]:
    region = character["region"].lower()
    realm = character["realm"]
    name = character["name"]
    detail = fetch_json(
        "/api/v1/characters/profile",
        {
            "region": region,
            "realm": realm,
            "name": name,
            "fields": "mythic_plus_scores_by_season:current,mythic_plus_best_runs:current,raid_progression,gear",
        },
    )

    season_data = detail.get("mythic_plus_scores_by_season") or []
    season_entry = season_data[0] if season_data else {}
    best_runs = []
    for run in detail.get("mythic_plus_best_runs") or []:
        best_runs.append(
            {
                "dungeon": run["dungeon"],
                "short_name": run["short_name"],
                "level": int(run["mythic_level"]),
                "score": float(run["score"]),
                "upgrades": int(run["num_keystone_upgrades"]),
                "completed_at": run["completed_at"],
            }
        )

    return {
        "season": season_entry.get("season", "current"),
        "score": float(season_entry.get("scores", {}).get("all", character["score"])),
        "best_runs": best_runs,
        "raid_progression": detail.get("raid_progression", {}),
        "profile_url": detail.get("profile_url", character["url"]),
    }


def build_dungeons(active_characters: list[dict[str, Any]]) -> list[dict[str, Any]]:
    dungeon_map: dict[str, dict[str, Any]] = defaultdict(lambda: {"entries": []})

    for character in active_characters:
        for run in character["best_runs"]:
            current = dungeon_map[run["short_name"]]
            current["short_name"] = run["short_name"]
            current["name"] = run["dungeon"]
            current["entries"].append(
                {
                    "character": character["display_name"],
                    "level": run["level"],
                    "score": run["score"],
                }
            )

    results = []
    for short_name, dungeon in dungeon_map.items():
        dungeon["entries"] = sorted(dungeon["entries"], key=lambda item: (-item["level"], -item["score"], item["character"]))
        results.append(
            {
                "short_name": short_name,
                "name": dungeon["name"],
                "entries": dungeon["entries"][:3],
            }
        )

    return sorted(results, key=lambda item: item["short_name"])


def build_summary(characters: list[dict[str, Any]], active_characters: list[dict[str, Any]], top_character: dict[str, Any]) -> dict[str, Any]:
    highest_run = max(
        top_character["best_runs"],
        key=lambda run: (run["level"], run["score"]),
    )
    total_score = sum(character["score"] for character in characters)
    raid_progress = top_character.get("raid_progression", {}).get("tier-mn-1", {})

    return {
        "total_score": round(total_score, 1),
        "scored_characters": sum(1 for character in characters if character["score"] > 0),
        "character_count": len(characters),
        "highest_key": {
            "level": highest_run["level"],
            "short_name": highest_run["short_name"],
        },
        "heroic_bosses": int(raid_progress.get("heroic_bosses_killed", 0)),
        "raid_bosses": int(raid_progress.get("total_bosses", 0)),
    }


def main() -> None:
    view_characters = fetch_json("/api/user/view-characters", {"name": PROFILE_NAME})
    raw_characters = view_characters["viewUserCharactersApi"]["characters"]
    characters = build_characters(raw_characters)

    active_characters: list[dict[str, Any]] = []
    season_label = "current"
    for character in characters:
        if character["score"] <= 0:
            continue
        detail = fetch_detailed_character(character)
        season_label = detail["season"]
        active_characters.append(
            {
                **character,
                "score": round(detail["score"], 1),
                "best_runs": detail["best_runs"],
                "url": detail["profile_url"],
                "raid_progression": detail["raid_progression"],
            }
        )

    active_characters.sort(key=lambda item: (-item["score"], item["display_name"]))
    top_character = active_characters[0] if active_characters else None
    if not top_character:
        raise RuntimeError("No active characters with Mythic+ score were found.")

    by_name = {character["name"]: character for character in active_characters}
    hydrated_characters = []
    for character in characters:
        hydrated_characters.append({**character, "score": round(by_name.get(character["name"], character)["score"], 1) if character["name"] in by_name else character["score"]})

    payload = {
        "profile_name": PROFILE_NAME,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "season_label": season_label,
        "summary": build_summary(hydrated_characters, active_characters, top_character),
        "top_character": top_character,
        "active_characters": active_characters[:3],
        "characters": hydrated_characters,
        "dungeons": build_dungeons(active_characters),
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    JS_OUTPUT_PATH.write_text(
        "window.__RAIDERIO_DATA__ = " + json.dumps(payload, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
