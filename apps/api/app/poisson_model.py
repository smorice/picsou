from dataclasses import dataclass
import math


@dataclass(frozen=True)
class FootballPoissonInput:
    expected_goals_home: float
    expected_goals_away: float
    max_goals: int = 8


@dataclass(frozen=True)
class FootballPoissonResult:
    home_win_probability: float
    draw_probability: float
    away_win_probability: float


def poisson_pmf(lmbd: float, goals: int) -> float:
    if lmbd < 0 or goals < 0:
        return 0.0
    return math.exp(-lmbd) * (lmbd ** goals) / math.factorial(goals)


def football_outcome_probabilities(inp: FootballPoissonInput) -> FootballPoissonResult:
    max_goals = max(2, min(14, inp.max_goals))
    home = [poisson_pmf(max(0.0, inp.expected_goals_home), g) for g in range(max_goals + 1)]
    away = [poisson_pmf(max(0.0, inp.expected_goals_away), g) for g in range(max_goals + 1)]

    home_win = 0.0
    draw = 0.0
    away_win = 0.0

    for i, p_home in enumerate(home):
        for j, p_away in enumerate(away):
            joint = p_home * p_away
            if i > j:
                home_win += joint
            elif i == j:
                draw += joint
            else:
                away_win += joint

    total = home_win + draw + away_win
    if total <= 0:
        return FootballPoissonResult(0.0, 0.0, 0.0)

    # Normalize to remove truncation error from finite max_goals.
    return FootballPoissonResult(
        home_win_probability=home_win / total,
        draw_probability=draw / total,
        away_win_probability=away_win / total,
    )
