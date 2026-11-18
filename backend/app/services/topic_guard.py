"""Topic classification for the Palay Assistant and the assessment advisor.

Stage 1 keeps clearly off-topic messages from reaching the metered LLM. The
general assistant requires a topic word or an existing on-topic turn before a
short follow-up is allowed. The assessment advisor already owns a topic (the
scan result), so its contextual classifier accepts short questions and
references to "this" result without weakening the long-message guard.
"""

import re

from app.models.chat import ChatTurn

GUARD_IN_SCOPE = "in_scope"
GUARD_GREETING = "greeting"
GUARD_OFF_TOPIC = "off_topic"

# Recall over precision is deliberate: an in-scope question must never be
# canned-refused; anything that slips through is still refused by the stage-2
# system prompt. Terms are matched on word boundaries ("rice" never matches
# "price", "palay" never matches "palayok").
TOPIC_TERMS: tuple[str, ...] = (
    # core subject words
    "palay",
    "palayan",
    "paddy",
    "paddy rice",
    "rice",
    "bigas",
    "grain",
    "grains",
    "cereal",
    "harvest",
    "anihan",
    "pag-aani",
    "ani",
    "thresh",
    "ginikan",
    # quality, defects and grading
    "quality",
    "kalidad",
    "grading",
    "grade",
    "grado",
    "market grade",
    "damaged",
    "immature",
    "chalky",
    "discolor",
    "foreign matter",
    "impurit",
    "dumi",
    "basang palay",
    "green grains",
    "suob",
    # mold and spoilage
    "amag",
    "mold",
    "molds",
    "mildew",
    "fungus",
    "fungal",
    "mycotoxin",
    "aflatoxin",
    # moisture and drying
    "moisture",
    "halumigmig",
    "water content",
    "dry",
    "drying",
    "dried",
    "pagpapatuyo",
    "patuyuin",
    "tuyuin",
    "papatuyuin",
    "sun dry",
    "sundrying",
    "dryer",
    "dryers",
    "flatbed dryer",
    # storage
    "storage",
    "storing",
    "store",
    "imbak",
    "imbakan",
    "pag-iimbak",
    "iimbak",
    "naka-imbak",
    "bodega",
    "warehouse",
    "kamalig",
    "sack",
    "sacks",
    "sako",
    "sakos",
    "aeration",
    "pahanginan",
    # pests and vermin
    "pest",
    "pests",
    "peste",
    "bukbok",
    "weevil",
    "weevils",
    "daga",
    "daga sa bigas",
    # seed and variety
    "variety",
    "varieties",
    "cultivar",
    "inbred",
    "hybrid",
    "binhi",
    "binhing palay",
    "seed",
    "seeds",
    # milling and market
    "milling",
    "milled",
    "giling",
    "paggiling",
    "kiskisan",
    "rice mill",
    "mill",
    "mills",
    "presyo",
    "price",
    "sell",
    "selling",
    "benta",
    "bentahan",
)

# Greetings are let through to the model so it can greet back warmly and steer
# the visitor toward rice/palay topics instead of answering with a canned
# refusal.
GREETING_TERMS: tuple[str, ...] = (
    "hello",
    "hi",
    "hey",
    "good morning",
    "good afternoon",
    "good evening",
    "good day",
    "good night",
    "kamusta",
    "kumusta",
    "musta",
    "kamusta po",
    "kumusta po",
    "salamat",
    "salamat po",
    "maraming salamat",
    "thanks",
    "thank you",
    "thank you po",
    "ok",
    "okay",
    "oo",
    "opo",
    "sige",
    "ayos",
)

# Contextual follow-ups ("paano?", "sige, ituloy") carry no topic terms of their
# own; they are in-scope only when the conversation already touched a topic term.
MAX_FOLLOW_UP_WORDS = 4

# The assessment advisor always has a topic (the scan), so it accepts short
# questions and explicit references to the result. Longer off-topic messages
# still fail closed before the LLM call.
MAX_CONTEXT_QUESTION_WORDS = 3
MAX_CONTEXT_REFERENCE_WORDS = 12
CONTEXT_QUESTION_TERMS: tuple[str, ...] = (
    "bakit",
    "paano",
    "saan",
    "kailan",
    "ano",
    "alin",
    "sino",
    "magkano",
    "why",
    "how",
    "what",
    "where",
    "when",
    "which",
    "who",
)
CONTEXT_REFERENCE_TERMS: tuple[str, ...] = (
    "ito",
    "iyan",
    "iyon",
    "ganito",
    "ganyan",
    "ganoon",
    "resulta",
    "result",
    "results",
    "scan",
    "sample",
    "this",
    "that",
    "these",
    "those",
    "gagawin",
    "gawin",
    "sunod",
    "next",
)
CONTEXT_FOLLOW_UP_TERMS: tuple[str, ...] = (
    "paliwanag",
    "ipaliwanag",
    "dagdagan",
    "palawakin",
    "halimbawa",
    "sige",
    "ituloy",
    "explain",
    "elaborate",
    "example",
    "details",
    "detail",
    "more",
    "what now",
    "what can i do",
    "what should i do",
    "ano ngayon",
    "ano ang gagawin",
)


def build_term_pattern(terms: tuple[str, ...]) -> re.Pattern[str]:
    sorted_terms = sorted(terms, key=len, reverse=True)
    joined = "|".join(re.escape(term) for term in sorted_terms)
    return re.compile(rf"(?<![a-z0-9])(?:{joined})(?![a-z0-9])")


TOPIC_PATTERN = build_term_pattern(TOPIC_TERMS)
GREETING_PATTERN = build_term_pattern(GREETING_TERMS)
CONTEXT_QUESTION_PATTERN = build_term_pattern(CONTEXT_QUESTION_TERMS)
CONTEXT_REFERENCE_PATTERN = build_term_pattern(CONTEXT_REFERENCE_TERMS)
CONTEXT_FOLLOW_UP_PATTERN = build_term_pattern(CONTEXT_FOLLOW_UP_TERMS)


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip()


def classify_turn(turns: list[ChatTurn]) -> str:
    """Stage-1 guard: in-scope / greeting / off-topic for the latest user message."""
    if not turns:
        return GUARD_OFF_TOPIC
    latest = normalize_text(turns[-1].content)
    if TOPIC_PATTERN.search(latest):
        return GUARD_IN_SCOPE
    if GREETING_PATTERN.search(latest):
        return GUARD_GREETING
    is_short_follow_up = len(latest.split()) <= MAX_FOLLOW_UP_WORDS
    if is_short_follow_up and any(
        turn.role == "user" and TOPIC_PATTERN.search(normalize_text(turn.content))
        for turn in turns[:-1]
    ):
        return GUARD_IN_SCOPE
    return GUARD_OFF_TOPIC


def classify_contextual_turn(turns: list[ChatTurn]) -> str:
    """Stage-1 guard for the assessment advisor, where the scan is the topic."""
    if not turns:
        return GUARD_OFF_TOPIC
    latest = normalize_text(turns[-1].content)
    if TOPIC_PATTERN.search(latest):
        return GUARD_IN_SCOPE
    if GREETING_PATTERN.search(latest):
        return GUARD_GREETING

    word_count = len(latest.split())
    if word_count <= MAX_CONTEXT_QUESTION_WORDS and CONTEXT_QUESTION_PATTERN.search(latest):
        return GUARD_IN_SCOPE
    if word_count <= MAX_CONTEXT_REFERENCE_WORDS and (
        CONTEXT_REFERENCE_PATTERN.search(latest) or CONTEXT_FOLLOW_UP_PATTERN.search(latest)
    ):
        return GUARD_IN_SCOPE
    return GUARD_OFF_TOPIC
