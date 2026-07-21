import type { IntakeCategory, IntakeState, PatientMessage } from "./sessionStore.js";

export type IntakeField = {
  id: string;
  label: string;
  question: string;
  answered: (text: string) => boolean;
};

export type DeterministicIntake = {
  category: IntakeCategory;
  informationGaps: string[];
  followUpQuestion: string | null;
  nextField: string | null;
  answeredFields: string[];
};

const has = (text: string, pattern: RegExp) => pattern.test(text);
const any = (text: string, patterns: RegExp[]) => patterns.some(pattern => has(text, pattern));

// Patient language is intentionally matched with short, conservative phrases. These are
// routing cues only; they never infer a diagnosis or translate a patient's meaning.
const categoryMatchers: Array<[IntakeCategory, RegExp[]]> = [
  ["respiratory", [/\b(?:fever|cough|cold|flu|breath(?:ing)?|shortness of breath|wheeze|phlegm|sore throat)\b/i, /\b(?:jvar|jwar|daggu|daggulu|saans|shwas|khansi|bukhar)\b/i, /\b(?:jvaram|daggu|oopiri|upiri|gonthu)\b/i]],
  ["digestive", [/\b(?:stomach|abdominal|belly|nausea|nauseated|vomit(?:ing)?|diarrh(?:ea|oe)|loose stools?|constipat|bowel|indigestion|bloat|acid reflux)\b/i, /\b(?:pet|ulti|matli|dast|kabz|pachan)\b/i, /\b(?:kadupu|vanti|vikaram|malabaddhakam)\b/i]],
  ["urinary", [/\b(?:urine|urinate|urination|pee|bladder|kidney|burn(?:ing)? when i (?:pee|urinate)|frequency)\b/i, /\b(?:peshab|mutra|mootra|jalan.*(?:peshab|pee))\b/i, /\b(?:mootram|mutram|urination)\b/i]],
  ["skin", [/\b(?:rash|itch(?:y|ing)?|hives?|skin|blister|lesion|redness|swelling)\b/i, /\b(?:khujli|daane?|daag|chhale)\b/i, /\b(?:charmam|durada|manta)\b/i]],
  ["neurological", [/\b(?:dizz(?:y|iness)|vertigo|faint(?:ed|ing)?|headache|migraine|numb|weak(?:ness)?|tingl|seizure|balance|vision)\b/i, /\b(?:chakkar|sir dard|kamzori|behosh|sunpan)\b/i, /\b(?:thalano|tala tiru|tal tiru|tala noppi|balahin)\b/i]],
  ["injury", [/\b(?:injur(?:y|ed)|hurt|pain|twist(?:ed)?|fall|fell|cut|bruise|sprain|fracture|burn)\b/i, /\b(?:dard|chot|gir|moch|soojan)\b/i, /\b(?:noppi|debba|padipoy|virigina)\b/i]],
];

const allText = (messages: PatientMessage[]) => messages.map(message => message.content).join(" ");

export function classifyCategory(messages: PatientMessage[]): IntakeCategory {
  const text = allText(messages);
  return categoryMatchers.find(([, matchers]) => any(text, matchers))?.[0] ?? "general";
}

const onset = (text: string) => any(text, [
  /\b(?:today|yesterday|tomorrow|morning|evening|night|since|started|start|began|begin|for \d+\s*(?:hour|day|week|month)s?|two days?|a couple of days?|couple of days?|few days?|one week|a week|one month|a month)\b/i,
  /\b(?:kal|aaj|subah|raat|se|shuru|din|hafte|mahine|do din|kuch din|ek hafte|ek saptah)\b/i,
  /\b(?:ninna|nēnu|nundi|modal|roj|roju|vāram|varam|rendu rojulu|konni rojulu|oka varam|oka nela)\b/i,
  /(?:दो दिन|कुछ दिन|एक सप्ताह|एक हफ्ते|कुछ हफ्ते|दो सप्ताह|कल से)/u,
  /(?:రెండు రోజులు|కొన్ని రోజులు|ఒక వారం|కొన్ని వారాలు|నిన్నటి నుంచి)/u,
]);
const severity = (text: string) => any(text, [
  /\b(?:mild|moderate|severe|intense|worst|scale|out of 10|pain level|better|worse|improv|increas|decreas)\b/i,
  /\b(?:halka|tez|teevr|bahut|dard kitna|behtar|badhtar)\b/i,
  /\b(?:teevram|teevra|takkua|ekkuva|taggindi|perigindi)\b/i,
]);
const history = (text: string) => any(text, [
  /\b(?:history|condition|surgery|pregnan|diabet|asthma|allerg|medical|medicines?|medication|tablet|drug)\b/i,
  /\b(?:itihaas|bimari|operation|garbh|dawai|dava|allergy)\b/i,
  /\b(?:charitra|vyadhi|shastrachikitsa|mandu|alergy)\b/i,
]);

const field = (id: string, label: string, question: string, answered: (text: string) => boolean): IntakeField => ({ id, label, question, answered });

const fields: Record<IntakeCategory, IntakeField[]> = {
  respiratory: [
    field("onset", "Onset and duration", "When did the fever or cough begin, and has it changed since it started?", onset),
    field("severity", "Severity and change", "How severe are the fever or cough symptoms right now, and are they improving or worsening?", severity),
    field("temperature", "Measured temperature", "If you measured your temperature, what was the reading and when was it taken?", text => /\b(?:\d{2}(?:\.\d)?\s*(?:°|degrees?)?\s*(?:f|c)|temperature|thermometer|temp)\b/i.test(text)),
    field("breathing", "Breathing", "Are you having any trouble breathing, shortness of breath, or breathing faster than usual?", text => /\b(?:breath(?:ing)?|shortness|wheeze|breathless|saans|shwas|oopiri|upiri)\b/i.test(text)),
    field("chest", "Chest discomfort", "Do you have chest discomfort or pain when breathing or coughing?", text => /\b(?:chest|breastbone|rib|seene|chati|gunde)\b/i.test(text)),
    field("hydration", "Hydration", "Are you able to drink fluids and urinate normally?", text => /\b(?:drink|fluids?|water|hydration|urinate|urine|paani|jal|neeru)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant history such as asthma, pregnancy, or another condition a clinician should know about?", history),
  ],
  digestive: [
    field("onset", "Onset and duration", "When did the stomach or bowel symptoms begin, and have they changed?", onset),
    field("location", "Affected area", "Where is the stomach or abdominal discomfort, and does it move anywhere else?", text => /\b(?:stomach|abdomen|belly|upper|lower|left|right| पेट|pet|kadupu)\b/i.test(text)),
    field("severity", "Severity and change", "How severe is the discomfort right now, and is it getting better or worse?", severity),
    field("intake", "Eating and drinking", "Are you able to keep down food and fluids?", text => /\b(?:eat|food|drink|fluid|water|keep.*down|paani|khana|neeru)\b/i.test(text)),
    field("bowel", "Bowel or vomiting changes", "Have you noticed vomiting or a change in bowel movements?", text => /\b(?:vomit|nausea|stool|bowel|diarrh|loose|constipat|ulti|dast|vanti)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant digestive history, surgery, pregnancy, or medicine use to include?", history),
  ],
  urinary: [
    field("onset", "Onset and duration", "When did the urinary symptoms begin, and have they changed?", onset),
    field("urinaryPattern", "Urination pattern", "How often are you urinating, and is there burning or difficulty?", text => /\b(?:urine|urinate|pee|peshab|mutra|mootram|burn|jalan|frequency|often|difficulty)\b/i.test(text)),
    field("urineChanges", "Urine changes", "Have you noticed a change in urine colour, smell, or any blood?", text => /\b(?:urine|pee|colour|color|smell|blood|cloudy|red|dark)\b/i.test(text)),
    field("feverFlank", "Fever or side/back discomfort", "Do you have fever, chills, or discomfort in your side or back?", text => /\b(?:fever|chill|side|back|flank|jwar|bukhar|thand|kamar|venuka)\b/i.test(text)),
    field("hydration", "Hydration", "Are you able to drink fluids and urinate normally for you?", text => /\b(?:drink|fluid|water|hydration|paani|neeru|normal)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant urinary history, pregnancy, or medicine use to include?", history),
  ],
  skin: [
    field("onset", "Onset and duration", "When did the skin change begin, and has it spread or changed?", onset),
    field("location", "Affected area", "Where on the body is the skin change located?", text => /\b(?:skin|rash|arm|leg|face|neck|back|chest|hand|foot|body|area|where|khujli|charm)\b/i.test(text)),
    field("appearance", "Appearance and spread", "What does it look like, and is it spreading, blistering, or oozing?", text => /\b(?:red|colour|color|bump|spot|blister|ooz|spread|swelling|itch|rash|daag|daane)\b/i.test(text)),
    field("sensation", "Sensation", "Is it itchy, painful, numb, or otherwise uncomfortable?", text => /\b(?:itch|pain|hurt|numb|burn|manta|durada|dard|noppi)\b/i.test(text)),
    field("exposure", "Recent exposure", "Was there a new product, food, medicine, bite, or other exposure before it appeared?", text => /\b(?:new|product|soap|food|medicine|medication|bite|exposure|contact|dawai|mandu)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant skin or allergy history to include?", history),
  ],
  neurological: [
    field("onset", "Onset and duration", "When did the dizziness, headache, or weakness begin, and was it sudden or gradual?", onset),
    field("severity", "Severity and change", "How severe is it right now, and is it getting better or worse?", severity),
    field("triggers", "Triggers and function", "What brings it on, and can you walk, speak, and see normally?", text => /\b(?:stand|move|trigger|walk|speak|speech|vision|see|normal|chakkar|sir|tala)\b/i.test(text)),
    field("associated", "Associated changes", "Have you fainted, felt numb or weak on one side, or had a new severe headache?", text => /\b(?:faint|numb|weak|one side|headache|vomit|seizure|behosh|kamzori|sunpan)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant neurological history, injury, or medicine use to include?", history),
  ],
  injury: [
    field("onset", "Onset and mechanism", "When did the injury or pain begin, and what happened just before it?", text => onset(text) || /\b(?:fall|fell|twist|hit|撞|accident|injur|cut|burn|sprain)\b/i.test(text)),
    field("location", "Location and movement", "Where is the pain or injury, and does it move anywhere else?", text => /\b(?:pain|hurt|injur|ankle|knee|back|neck|arm|leg|hand|foot|where|dard|chot|noppi|debba)\b/i.test(text)),
    field("severity", "Severity and change", "How severe is the pain right now, and is it getting better or worse?", severity),
    field("function", "Function", "Can you move the area and use it as usual?", text => /\b(?:move|walk|use|weight|function|normal|cannot|can't|unable|chal|hila)\b/i.test(text)),
    field("skin", "Skin or bleeding", "Is there swelling, a wound, bruising, or bleeding that should be recorded?", text => /\b(?:swel|wound|bruise|bleed|blood|cut|open|soojan)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant injury history, medication use, or allergy information to include?", history),
  ],
  general: [
    field("onset", "Onset and duration", "When did this begin, and has it changed since it started?", onset),
    field("severity", "Severity and change", "How severe is it right now, and is it getting better or worse?", severity),
    field("location", "Affected area", "Where do you notice it, if there is a specific affected area?", text => /\b(?:where|location|left|right|upper|lower|head|chest|stomach|back|area|कहाँ|kahan)\b/i.test(text)),
    field("history", "Relevant history", "Is there relevant health history, medicine use, or allergy information to include?", history),
  ],
};

export function deterministicIntake(messages: PatientMessage[], state?: IntakeState): DeterministicIntake {
  const category = state?.category && state.category !== "general" && messages.length ? state.category : classifyCategory(messages);
  const definition = fields[category];
  const text = allText(messages);
  const answeredFields = definition.filter(item => item.answered(text)).map(item => item.id);
  const asked = new Set(state?.askedFields ?? []);
  const informationGaps = definition.filter(item => !answeredFields.includes(item.id)).map(item => item.label);
  const next = definition.find(item => !answeredFields.includes(item.id) && !asked.has(item.id));
  return {
    category,
    informationGaps,
    followUpQuestion: next?.question ?? null,
    nextField: next?.id ?? null,
    answeredFields: [...new Set(answeredFields)],
  };
}

export function answeredFieldIds(category: IntakeCategory, text: string): string[] {
  return fields[category].filter(item => item.answered(text)).map(item => item.id);
}

export function hasSupportedIntakeContent(text: string): boolean {
  return /\b(?:fever|cough|cold|flu|breath(?:ing)?|stomach|abdominal|belly|nausea|vomit|diarrh|urine|urinate|pee|rash|itch|skin|dizz|headache|migraine|weak|pain|hurt|injur|fall|cut|bruise|symptom|unwell|sick|tired|concern|problem)\b/i.test(text)
    || /\b(?:jvar|jwar|daggu|khansi|bukhar|saans|pet|ulti|matli|dast|peshab|mutra|khujli|chakkar|sir dard|kamzori|dard|chot)\b/i.test(text)
    || /(?:జ్వరం|దగ్గు|కడుపు|వాంతి|మూత్రం|దురద|తలతిరుగు|తలనొప్పి|నొప్పి|గాయం|बीुखार|खाँसी|पेट|उल्टी|पेशाब|खुजली|चक्कर|सिरदर्द|दर्द|चोट)/u.test(text);
}

function durationPhrase(text: string): string | null {
  const match = text.match(/\b(?:for\s+)?(?:two|a couple of|couple of|few|one|a)\s+(?:hours?|days?|weeks?|months?)\b/i)
    ?? text.match(/\b(?:since\s+)?(?:yesterday|today|last night|this morning)\b/i)
    ?? text.match(/\b(?:do din|kuch din|ek hafte|kal se|rendu rojulu|konni rojulu|oka varam|ninna(?:ti)? nundi)\b/i)
    ?? text.match(/(?:दो दिन|कुछ दिन|एक सप्ताह|एक हफ्ते|कल से|రెండు రోజులు|కొన్ని రోజులు|ఒక వారం|నిన్నటి నుంచి)/u);
  return match?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function durationDescriptor(value: string): string {
  const clean = value.replace(/^for\s+/i, "").trim();
  return /^(?:since\s+)?(?:today|yesterday|last night|this morning|kal|aaj|ninna)/i.test(clean) ? `since ${clean.replace(/^since\s+/i, "")}` : `lasting ${clean}`;
}

function symptomPhrase(text: string): string | null {
  const match = text.match(/\b(?:fever|cough|cold|flu|headache|dizziness|stomach pain|stomach discomfort|nausea|vomiting|rash|urinary symptoms?|pain|injury)\b/i)
    ?? text.match(/\b(?:jvar|jwar|daggu|bukhar|khansi|chakkar|sir dard|pet|dard|chot)\b/i)
    ?? text.match(/(?:జ్వరం|దగ్గు|తలనొప్పి|కడుపు|నొప్పి|గాయం|बुखार|खाँसी|सिरदर्द|पेट|दर्द|चोट)/u);
  return match?.[0] ?? null;
}

function explicitNegation(text: string, phrase: RegExp): boolean {
  const match = phrase.exec(text);
  if (!match || match.index === undefined) return false;
  const before = text.slice(Math.max(0, match.index - 48), match.index);
  const after = text.slice(match.index + match[0].length, match.index + match[0].length + 80);
  return /\b(?:no|not|without|denied|deny|nahi|nahin)\b|नहीं|लेदु/u.test(before) || /\b(?:denied|absent)\b/i.test(after);
}

export function deterministicAcknowledgement(category: IntakeCategory, text: string, newlyAnswered: string[], isCorrection = false): string {
  const duration = durationPhrase(text);
  const symptom = symptomPhrase(text);
  const breathingDenied = explicitNegation(text, /(?:trouble\s+)?breathing|breathing\s+difficulty|shortness\s+of\s+breath/i);
  const chestDenied = explicitNegation(text, /chest\s+(?:discomfort|pain)/i);
  const temperature = text.match(/\b\d{2}(?:\.\d)?\s*(?:°|degrees?)?\s*[cf]\b/i)?.[0]?.replace(/\s+/g, " ").trim();
  if (category === "respiratory" && breathingDenied && chestDenied) {
    return temperature ? `Recorded: temperature ${temperature}; breathing difficulty and chest discomfort denied.` : "Recorded: breathing difficulty and chest discomfort denied.";
  }
  if (newlyAnswered.includes("onset") && symptom && duration) return `Recorded: ${symptom.toLocaleLowerCase()} ${durationDescriptor(duration).toLocaleLowerCase()}.`;
  if (newlyAnswered.includes("temperature")) {
    return `Recorded: ${temperature ?? "measured temperature"}.`;
  }
  if (newlyAnswered.length > 0 || isCorrection) {
    const labels = newlyAnswered.length ? newlyAnswered.map(id => ({ severity: "severity and change", temperature: "temperature", breathing: "breathing status", chest: "chest discomfort status", hydration: "hydration", history: "relevant history", location: "affected area", urinaryPattern: "urination pattern", urineChanges: "urine changes", feverFlank: "fever or side/back discomfort", intake: "eating and drinking", bowel: "bowel or vomiting changes", appearance: "appearance and spread", sensation: "sensation", exposure: "recent exposure", triggers: "triggers and function", associated: "associated changes", function: "function", skin: "skin or bleeding", onset: "onset and duration" } as Record<string, string>)[id] ?? id).join(", ") : "the corrected patient statement";
    return `Recorded: ${labels}.`;
  }
  return "That information is already recorded. Please answer the focused question below.";
}

export const UNMAPPED_MESSAGE = "I could not map that statement to a supported intake field. Please describe the symptom, when it began, or how it has changed.";

export function rememberQuestion(state: IntakeState, intake: DeterministicIntake): IntakeState {
  if (!intake.nextField || state.askedFields.includes(intake.nextField)) return { ...state, category: intake.category };
  return { category: intake.category, askedFields: [...state.askedFields, intake.nextField] };
}

export function currentPatientStatements(messages: PatientMessage[]): PatientMessage[] {
  const correctionIndex = messages.findLastIndex(message => /^(?:actually|correction:|i meant|असल में|निजानिकि|నిజానికి)/i.test(message.content.trim()));
  return correctionIndex >= 0 ? messages.slice(correctionIndex) : messages;
}

export function categoryLabel(category: IntakeCategory): string {
  return ({ respiratory: "respiratory/fever-cough", digestive: "digestive", urinary: "urinary", skin: "skin/rash", neurological: "dizziness/neurological", injury: "injury/pain", general: "general" })[category];
}
