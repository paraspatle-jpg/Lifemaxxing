import math

# Fibonacci XP curve for level transitions:
# 1→2: 10, 2→3: 20, 3→4: 30, 4→5: 50, 5→6: 80, 6→7: 130 ...
# Each value after the first two is the sum of the previous two.

def _xp_to_next(level: int) -> int:
    """XP required to advance FROM `level` to `level + 1`."""
    if level <= 0:
        return 10
    if level == 1:
        return 10
    if level == 2:
        return 20
    a, b = 10, 20
    for _ in range(level - 2):
        a, b = b, a + b
    return b


def xp_for_level(level: int) -> int:
    """Total cumulative XP needed to *reach* `level`."""
    if level <= 1:
        return 0
    total = 0
    for l in range(1, level):
        total += _xp_to_next(l)
    return total


def level_from_xp(xp: int) -> int:
    """Current level given total XP."""
    if xp <= 0:
        return 1
    level = 1
    accumulated = 0
    while True:
        needed = _xp_to_next(level)
        if accumulated + needed > xp:
            return level
        accumulated += needed
        level += 1


def xp_progress(xp: int) -> dict:
    level = level_from_xp(xp)
    current_threshold = xp_for_level(level)
    xp_to_next = _xp_to_next(level)
    xp_in_level = xp - current_threshold
    percent = round((xp_in_level / xp_to_next) * 100, 1) if xp_to_next > 0 else 100.0
    return {
        "level": level,
        "total_xp": xp,
        "xp_in_level": xp_in_level,
        "xp_to_next_level": xp_to_next,
        "percent_to_next": percent,
        "title": get_title(level),
    }


def get_title(level: int) -> str:
    if level <= 5:   return "Novice"
    if level <= 10:  return "Apprentice"
    if level <= 20:  return "Adept"
    if level <= 30:  return "Expert"
    if level <= 50:  return "Master"
    return "Elite"


def streak_bonus_multiplier(streak: int) -> float:
    if streak >= 30: return 1.5
    if streak >= 14: return 1.3
    if streak >= 7:  return 1.2
    if streak >= 3:  return 1.1
    return 1.0


# Task XP constraints
TASK_XP_MIN = 5
TASK_XP_MAX = 50
TASK_XP_STEP = 5

def validate_task_xp(xp: int) -> str | None:
    """Returns an error message or None if valid."""
    if xp < TASK_XP_MIN or xp > TASK_XP_MAX:
        return f"XP must be between {TASK_XP_MIN} and {TASK_XP_MAX}."
    if xp % TASK_XP_STEP != 0:
        return f"XP must be a multiple of {TASK_XP_STEP}."
    return None
