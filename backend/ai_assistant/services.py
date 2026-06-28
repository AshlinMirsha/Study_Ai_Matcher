"""
ai_assistant app - Module 8 business logic: study suggestions, chatbot
replies, and quiz generation. Each function tries the configured AI
provider first and falls back to a rule-based equivalent so the
feature works even without an API key set.
"""
import random
from .ai_provider import generate_text, generate_json

# --------------------------------------------------------------------
# Rule-based fallback templates (used when no AI key is configured,
# or the AI call fails for any reason)
# --------------------------------------------------------------------
_SUGGESTION_TEMPLATES = [
    "Study {subject} for {hours} hours today.",
    "Revise {subject} - focus on the topics you found hardest.",
    "Complete a problem set in {subject} to reinforce today's concepts.",
    "Spend {hours} hours reviewing your weak areas in {subject}.",
    "Pair up with your study partner and go over {subject} together.",
]


def generate_daily_suggestions(student_profile, weak_subjects, count=3) -> list[str]:
    """
    Returns a list of suggestion strings, e.g.
    ["Study DSA for 2 hours today.", "Revise Python Lists.", ...]
    """
    subjects = [s.name for s in weak_subjects] or [s.name for s in student_profile.subjects.all()] or ['your subjects']
    goal = student_profile.study_goals or 'making consistent progress'

    prompt = (
        f"You are a study coach. The student's weak subjects are: {', '.join(subjects)}. "
        f"Their goal is: {goal}. Their skill level is {student_profile.skill_level}. "
        f"Give exactly {count} short, specific, actionable daily study suggestions "
        f"(under 15 words each), one per line, no numbering."
    )
    ai_text = generate_text(prompt)
    if ai_text:
        lines = [l.strip('-• ').strip() for l in ai_text.strip().split('\n') if l.strip()]
        if lines:
            return lines[:count]

    # Rule-based fallback
    results = []
    for _ in range(count):
        template = random.choice(_SUGGESTION_TEMPLATES)
        results.append(template.format(subject=random.choice(subjects), hours=random.choice([1, 2, 3])))
    return results


def chatbot_reply(student, history, user_message: str) -> str:
    """
    history: list of {'role': 'user'|'assistant', 'content': str}
    Returns the chatbot's reply text.
    """
    convo_text = "\n".join(f"{h['role']}: {h['content']}" for h in history[-10:])
    prompt = (
        "You are a friendly, encouraging study assistant chatbot helping a student. "
        "Keep answers concise and practical.\n\n"
        f"Conversation so far:\n{convo_text}\n\n"
        f"Student: {user_message}\nAssistant:"
    )
    ai_text = generate_text(prompt)
    if ai_text:
        return ai_text.strip()

    # Rule-based fallback: simple keyword-based canned responses
    msg = user_message.lower()
    if any(w in msg for w in ['hi', 'hello', 'hey']):
        return f"Hi {student.name.split()[0]}! What would you like to study today?"
    if 'binary search' in msg:
        return "Binary search works on sorted arrays: compare the middle element, then recurse into the half that could contain your target. Time complexity is O(log n)."
    if 'python list' in msg:
        return "Python lists are ordered, mutable sequences. Key methods: append(), pop(), sort(), and slicing with list[start:end]."
    if 'help' in msg or 'suggest' in msg:
        return "I can suggest a study plan, explain a topic, or quiz you. What would you like?"
    return "I'm currently running in offline mode (no AI key configured), so my answers are limited. Try asking about a specific topic like 'binary search' or 'python lists', or configure GEMINI_API_KEY/OPENAI_API_KEY for full AI answers."


_FALLBACK_QUIZ_BANK = {
    'python': [
        {
            'question_text': 'What does len([1, 2, 3]) return?',
            'option_a': '2', 'option_b': '3', 'option_c': '4', 'option_d': 'Error',
            'correct_option': 'b',
        },
        {
            'question_text': 'Which keyword defines a function in Python?',
            'option_a': 'func', 'option_b': 'def', 'option_c': 'function', 'option_d': 'lambda',
            'correct_option': 'b',
        },
    ],
    'dsa': [
        {
            'question_text': 'What is the time complexity of binary search?',
            'option_a': 'O(n)', 'option_b': 'O(n log n)', 'option_c': 'O(log n)', 'option_d': 'O(1)',
            'correct_option': 'c',
        },
        {
            'question_text': 'Which data structure uses LIFO order?',
            'option_a': 'Queue', 'option_b': 'Stack', 'option_c': 'Tree', 'option_d': 'Graph',
            'correct_option': 'b',
        },
    ],
}


def generate_quiz_questions(topic: str, num_questions=5) -> list[dict]:
    """
    Returns a list of question dicts:
        {question_text, option_a..d, correct_option}
    """
    prompt = (
        f"Create {num_questions} multiple-choice quiz questions about: {topic}. "
        "Return a JSON array, each item shaped exactly like: "
        '{"question_text": "...", "option_a": "...", "option_b": "...", '
        '"option_c": "...", "option_d": "...", "correct_option": "a"} '
        "(correct_option must be one of a/b/c/d)."
    )
    ai_questions = generate_json(prompt)
    if isinstance(ai_questions, list) and ai_questions:
        valid = [
            q for q in ai_questions
            if isinstance(q, dict) and 'question_text' in q and 'correct_option' in q
        ]
        if valid:
            return valid[:num_questions]

    # Rule-based fallback: pull from the small built-in bank by topic keyword
    topic_lower = topic.lower()
    for key, bank in _FALLBACK_QUIZ_BANK.items():
        if key in topic_lower:
            return bank[:num_questions]
    # generic fallback if topic isn't in the bank
    return _FALLBACK_QUIZ_BANK['python'][:num_questions]
