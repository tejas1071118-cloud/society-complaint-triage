const { GoogleGenAI, Type, Schema } = require('@google/genai');
const crypto = require('crypto');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

const taggingSchema = {
  type: Type.OBJECT,
  properties: {
    category: {
      type: Type.STRING,
      enum: ["Water", "Lift", "Parking", "Noise", "Cleaning", "Security", "Other"],
      description: "The category of the issue."
    },
    urgency_level: {
      type: Type.STRING,
      enum: ["Critical", "High", "Medium", "Low"],
      description: "Critical = safety risk/loss of essential service. High = essential service degraded. Medium = inconvenience. Low = cosmetic."
    },
    summary: {
      type: Type.STRING,
      description: "One crisp English line (max 15 words) summarizing the issue."
    },
    language_detected: {
      type: Type.STRING,
      enum: ["en", "hi", "hinglish"],
      description: "The primary language of the complaint (en, hi, hinglish)."
    },
    safety_risk: {
      type: Type.INTEGER,
      description: "0-10 (danger to life, health, or property)"
    },
    service_impact: {
      type: Type.INTEGER,
      description: "0-10 (how essential the affected service is: water, lift, power, security > parking, noise > cosmetic)"
    },
    vulnerable_residents: {
      type: Type.BOOLEAN,
      description: "true/false (mentions elderly, children, patients, disabled, pregnant, etc. in English, Hindi or Hinglish)"
    },
    reasoning: {
      type: Type.STRING,
      description: "one short sentence explaining the rating, in English"
    },
    suggested_action: {
      type: Type.STRING,
      description: "one short actionable next step for the committee (e.g. 'Call lift maintenance vendor immediately')"
    },
    suggested_owner_role: {
      type: Type.STRING,
      description: "e.g. Secretary, Treasurer, Maintenance In-charge, Security Head"
    }
  },
  required: ["category", "urgency_level", "summary", "language_detected", "safety_risk", "service_impact", "vulnerable_residents", "reasoning", "suggested_action", "suggested_owner_role"]
};

function parseTolerantJson(text) {
  try {
    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanText = cleanText.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(cleanText);
  } catch (err) {
    throw new Error('Failed to parse tolerant JSON');
  }
}

function getKeywordFallback(text, flatCount = 1, ageInHours = 0) {
  const t = text.toLowerCase();
  
  // Category
  let category = "Other";
  if (t.includes('water') || t.includes('pani') || t.includes('leak')) { category = "Water"; }
  else if (t.includes('lift') || t.includes('elevator')) { category = "Lift"; }
  else if (t.includes('park') || t.includes('car') || t.includes('slot')) { category = "Parking"; }
  else if (t.includes('noise') || t.includes('loud') || t.includes('music')) { category = "Noise"; }
  else if (t.includes('clean') || t.includes('garbage') || t.includes('kachra')) { category = "Cleaning"; }
  else if (t.includes('guard') || t.includes('security') || t.includes('gate') || t.includes('stranger')) { category = "Security"; }
  
  // Urgency logic
  let urgency = "Medium";
  let safety_risk = 0;
  let service_impact = 3;
  
  // Safety words (whole word matches)
  const safetyRegex = /\b(stuck|fire|smoke|shock|leak|emergency|police|ambulance|blood|hurt|injur|gir gaya)\b/i;
  const isSafetyRisk = safetyRegex.test(t);
  
  if (isSafetyRisk) {
    urgency = "Critical";
    safety_risk = 9;
    service_impact = 9;
  } else {
    // Urgency & duration words
    const urgentRegex = /(since morning|2 din se|kal se|bahut|urgent|emergency|immediately|jaldi|fast|now)/i;
    const isUrgent = urgentRegex.test(t);
    
    // Base category weight
    if (category === "Lift" || category === "Water" || category === "Security") {
        urgency = isUrgent ? "High" : "Medium";
        service_impact = isUrgent ? 8 : 6;
    } else {
        urgency = isUrgent ? "Medium" : "Low";
        service_impact = isUrgent ? 5 : 2;
    }
    
    // Scale up by flat count and age
    if (flatCount > 3 || ageInHours > 24) {
        if (urgency === "Low") { urgency = "Medium"; service_impact += 2; }
        else if (urgency === "Medium") { urgency = "High"; service_impact += 2; }
        else if (urgency === "High") { urgency = "Critical"; service_impact += 2; }
    }
  }
  
  const words = text.split(' ');
  const summary = words.slice(0, 12).join(' ') + (words.length > 12 ? '...' : '');

  return {
    category,
    urgency_level: urgency,
    summary,
    language_detected: "en",
    safety_risk,
    service_impact: Math.min(10, service_impact),
    vulnerable_residents: /(child|kid|bachch|elder|old|patient|pregn|disab)/i.test(t),
    reasoning: "AI unavailable, rule-based.",
    suggested_action: "Review manually",
    suggested_owner_role: category === "Security" ? "Security Head" : (category === "Water" || category === "Lift" ? "Maintenance In-charge" : "Secretary")
  };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const batchTaggingSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      complaint_id: { type: Type.STRING, description: "The ID of the complaint provided in the prompt" },
      ...taggingSchema.properties
    },
    required: ["complaint_id", ...taggingSchema.required]
  }
};

async function tagComplaintsBatch(complaintsList) {
  if (!complaintsList || complaintsList.length === 0) return [];
  
  const headerText = `Analyze the following housing society complaints. Return a JSON array with the analysis for EACH complaint, matching its complaint_id exactly.
  
Rules for urgency_level:
- Critical: safety risk or total loss of essential service (people stuck in lift, fire/smoke, no water for 24h+, break-in, gas smell).
- High: essential service degraded for many residents.
- Medium: inconvenience with a workaround.
- Low: cosmetic or suggestion.

Complaints:`;

  const parts = [{ text: headerText }];
  for (const c of complaintsList) {
      parts.push({ text: `\n\nID: ${c.id}\nComplaint: "${c.text}"` });
      if (c.imagePart) {
          parts.push(c.imagePart);
      }
  }

  let delay = 4000;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
          throw new Error('No API key provided, falling back to rule-based.');
      }
      const response = await ai.models.generateContent({
        model: modelName,
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: batchTaggingSchema,
          maxOutputTokens: 2048,
        }
      });
      return parseTolerantJson(response.text);
    } catch (error) {
      console.error(`Gemini Tagging Error (Attempt ${attempt}):`, error.message || error);
      
      let retryDelay = delay;
      if (error.status === 429) {
          // try to extract retry delay from error details if any
          const match = (error.message || '').match(/retry in ([\d\.]+)s/);
          if (match) retryDelay = parseFloat(match[1]) * 1000 + 1000;
      }
      
      if (attempt < 3) {
          await sleep(retryDelay);
          delay *= 2; // exponential backoff
      }
    }
  }
  
  // Return rule-based fallback array
  return complaintsList.map(c => ({
      complaint_id: c.id,
      ...getKeywordFallback(c.text, c.flatCount || 1, c.ageInHours || 0)
  }));
}

// Fast local similarity using Jaccard on tokens
function tokenize(text) {
  const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  return new Set(t.split(/\s+/).filter(w => w.length > 2));
}

function calculateSimilarity(textA, textB) {
  const setA = tokenize(textA);
  const setB = tokenize(textB);
  let intersection = 0;
  for (let elem of setA) {
    if (setB.has(elem)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeAndHash(text) {
  const norm = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(norm).digest('hex');
}

async function draftReply(issueCategory, currentStatus, internalNotes, residentLanguage, complaintsContext) {
    let languageInstruction = "Write the reply in English.";
    if (residentLanguage === 'hi') {
        languageInstruction = "Write the reply in Hindi (Devanagari script).";
    } else if (residentLanguage === 'hinglish') {
        languageInstruction = "Write the reply in Hinglish (Hindi words written using English alphabet).";
    }

    const prompt = `You are a polite assistant drafting a short reply to a housing society resident on behalf of the committee.
Context:
- Issue Category: ${issueCategory}
- Current Status: ${currentStatus}
- Internal Notes: ${internalNotes || 'None'}
- What residents said: ${complaintsContext}

Task: Write a polite, short reply (max 3 sentences) to the resident explaining the current status. 
${languageInstruction} Do not include placeholders, just the reply text.`;

    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
            throw new Error('No API key');
        }
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Gemini Draft Reply Error:", error);
        return "We are looking into your complaint. Thank you for your patience.";
    }
}

async function checkHealth() {
    try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('your_')) {
            return { status: 'offline', error: 'No API key provided' };
        }
        await ai.models.generateContent({
            model: modelName,
            contents: 'ping',
            config: { maxOutputTokens: 5 }
        });
        return { status: 'online' };
    } catch (error) {
        let msg = error.message;
        if (msg.includes('429') || (error.status && error.status === 429)) msg = 'Rate limited (429)';
        return { status: 'offline', error: msg };
    }
}

module.exports = {
  tagComplaintsBatch,
  calculateSimilarity,
  normalizeAndHash,
  draftReply,
  checkHealth,
  getKeywordFallback
};
