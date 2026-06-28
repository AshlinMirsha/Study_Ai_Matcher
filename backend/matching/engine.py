"""
matching app - AI Matching Engine.

Computes a weighted compatibility score (0-100) between two students,
based on the criteria from the project spec:

    Subject            (most important - they need a shared topic)
    Available Time      (shared schedule slots)
    Skill Level          (same level studies better together)
    Study Goal           (similar goals via simple text similarity)
    Department
    Year of study
    Preferred Language

Two strategies are provided:
    1. `score_pair()`            - transparent, rule-based weighted score.
       This is the default, since it's explainable and needs no training data.
    2. `goal_text_similarity()`  - uses scikit-learn's TF-IDF + cosine
       similarity to compare free-text study goals ("the AI" part of
       "study goal" matching, as requested in the spec).

The overall design keeps the rule-based weights for matching fairness
(subject/schedule/skill matter most) but plugs in real ML (TF-IDF vectors)
for the one genuinely fuzzy text-comparison piece: comparing study goals
written in the student's own words.
"""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Weights must sum to 100 - tune these to change matching priorities.
WEIGHTS = {
    'subject': 30,
    'schedule': 20,
    'skill_level': 15,
    'goal': 15,
    'department': 8,
    'year': 7,
    'language': 5,
}


def goal_text_similarity(goal_a: str, goal_b: str) -> float:
    """
    Returns 0-1 similarity between two free-text study goal strings
    using TF-IDF vectorization + cosine similarity (scikit-learn).
    Falls back to 0 if either string is empty.
    """
    goal_a, goal_b = (goal_a or '').strip(), (goal_b or '').strip()
    if not goal_a or not goal_b:
        return 0.0
    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf = vectorizer.fit_transform([goal_a, goal_b])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(sim)
    except ValueError:
        # happens if both strings are made entirely of stopwords
        return 0.0


def schedule_overlap_ratio(slots_a, slots_b) -> float:
    """
    slots_a / slots_b: iterables of (day, time_block) tuples.
    Returns the fraction of slot overlap relative to the smaller
    availability set (so a very busy student isn't unfairly penalised
    against a student with few slots, and vice versa).
    """
    set_a, set_b = set(slots_a), set(slots_b)
    if not set_a or not set_b:
        return 0.0
    overlap = set_a & set_b
    smaller = min(len(set_a), len(set_b))
    return len(overlap) / smaller if smaller else 0.0


def score_pair(student_a, student_b) -> dict:
    """
    student_a / student_b: dicts shaped like:
        {
            'subjects': set([...subject ids...]),
            'department': str,
            'year_of_study': int,
            'skill_level': 'beginner' | 'intermediate' | 'advanced',
            'preferred_language': str,
            'study_goals': str,
            'availability': set([(day, time_block), ...]),
        }

    Returns a dict with the overall score (0-100) and a breakdown,
    so the frontend can explain *why* two students were matched.
    """
    breakdown = {}

    # --- Subject match -----------------------------------------------
    common_subjects = student_a['subjects'] & student_b['subjects']
    union_subjects = student_a['subjects'] | student_b['subjects']
    subject_ratio = len(common_subjects) / len(union_subjects) if union_subjects else 0.0
    breakdown['subject'] = subject_ratio * WEIGHTS['subject']

    # --- Schedule match -------------------------------------------------
    schedule_ratio = schedule_overlap_ratio(student_a['availability'], student_b['availability'])
    breakdown['schedule'] = schedule_ratio * WEIGHTS['schedule']

    # --- Skill level match (exact = full marks, adjacent = half) --------
    levels = ['beginner', 'intermediate', 'advanced']
    try:
        la, lb = levels.index(student_a['skill_level']), levels.index(student_b['skill_level'])
        diff = abs(la - lb)
        skill_ratio = 1.0 if diff == 0 else (0.5 if diff == 1 else 0.0)
    except ValueError:
        skill_ratio = 0.0
    breakdown['skill_level'] = skill_ratio * WEIGHTS['skill_level']

    # --- Study goal similarity (TF-IDF / cosine, scikit-learn) ----------
    goal_ratio = goal_text_similarity(student_a['study_goals'], student_b['study_goals'])
    breakdown['goal'] = goal_ratio * WEIGHTS['goal']

    # --- Department match -------------------------------------------------
    dept_ratio = 1.0 if student_a['department'] == student_b['department'] else 0.0
    breakdown['department'] = dept_ratio * WEIGHTS['department']

    # --- Year of study match (exact = full, 1 year apart = half) --------
    year_diff = abs(student_a['year_of_study'] - student_b['year_of_study'])
    year_ratio = 1.0 if year_diff == 0 else (0.5 if year_diff == 1 else 0.0)
    breakdown['year'] = year_ratio * WEIGHTS['year']

    # --- Preferred language match ----------------------------------------
    lang_ratio = 1.0 if student_a['preferred_language'] == student_b['preferred_language'] else 0.0
    breakdown['language'] = lang_ratio * WEIGHTS['language']

    total_score = round(sum(breakdown.values()), 2)

    return {
        'score': total_score,
        'breakdown': {k: round(v, 2) for k, v in breakdown.items()},
        'common_subjects': common_subjects,
    }
