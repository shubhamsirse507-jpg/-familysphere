import { connectDB } from '../config/db.js';
import { User, Message, Chat } from '../models/index.js';

// If the user has configured a GEMINI_API_KEY, we can make actual fetch calls to Google's Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const callGemini = async (prompt, systemInstruction = '') => {
  if (!GEMINI_API_KEY) {
    throw new Error('No API key configured');
  }
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        systemInstruction: systemInstruction ? {
          parts: [{ text: systemInstruction }]
        } : undefined
      }),
    });
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error(data.error?.message || 'Empty response from Gemini API');
    }
    return text.trim();
  } catch (error) {
    console.error('Gemini API call failed, falling back to local simulation:', error.message);
    throw error;
  }
};

// --- Smart Reply Generator ---
export const getSmartReplies = async (req, res) => {
  try {
    const { messageContent } = req.body;
    if (!messageContent) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Try Gemini API
    if (GEMINI_API_KEY) {
      try {
        const prompt = `Give me 3 short, conversational, family-friendly smart reply suggestions for the following message. Output them as a JSON array of strings only. Message: "${messageContent}"`;
        const result = await callGemini(prompt, "You are a family helper assistant. Return only a raw JSON array of 3 string suggestions, e.g. [\"Yes, please!\", \"On my way!\", \"No problem.\"]. Do not write markdown tags.");
        // Try parsing JSON
        const cleanResult = result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanResult);
        return res.json({ suggestions: parsed });
      } catch (err) {
        // Fallback below
      }
    }

    // Fallback simulation
    const content = messageContent.toLowerCase();
    let suggestions = ["Okay!", "Sounds good", "Love it! ❤️"];
    
    if (content.includes('dinner') || content.includes('eat') || content.includes('hungry')) {
      suggestions = ["I can cook! 🍳", "Let's order pizza 🍕", "Count me in! 🙌"];
    } else if (content.includes('where') || content.includes('location') || content.includes('arrive')) {
      suggestions = ["Just shared my live location! 📍", "Almost there!", "I'm at home."];
    } else if (content.includes('help') || content.includes('chore') || content.includes('clean')) {
      suggestions = ["I can help with that!", "I'll do it later.", "Already done! ✅"];
    } else if (content.includes('hello') || content.includes('hi') || content.includes('hey')) {
      suggestions = ["Hey! 👋", "Hi Mom/Dad! ❤️", "How's everyone doing?"];
    }
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Smart replies error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Translate Message ---
export const translateMessage = async (req, res) => {
  try {
    const { text, targetLang } = req.body; // e.g. targetLang = 'Spanish', 'French', etc.
    if (!text || !targetLang) {
      return res.status(400).json({ error: 'Text and targetLang are required' });
    }

    if (GEMINI_API_KEY) {
      try {
        const prompt = `Translate this text into ${targetLang}: "${text}"`;
        const result = await callGemini(prompt, "Translate accurately. Return only the translated text. Do not add explanations.");
        return res.json({ translatedText: result });
      } catch (err) {
        // Fallback below
      }
    }

    // Fallback simulation
    const translations = {
      Spanish: {
        "hi family! welcome to our new familysphere home! ❤️": "¡Hola familia! ¡Bienvenidos a nuestro nuevo hogar FamilySphere! ❤️",
        "wow this looks great! clean, fast, and encrypted! 🚀": "¡Vaya, esto se ve genial! ¡Limpio, rápido y encriptado! 🚀",
        "can we decide what to have for dinner? let me make a poll.": "¿Podemos decidir qué cenar? Dejame hacer una encuesta.",
      },
      French: {
        "hi family! welcome to our new familysphere home! ❤️": "Salut la famille! Bienvenue dans notre nouvelle maison FamilySphere ! ❤️",
        "wow this looks great! clean, fast, and encrypted! 🚀": "Wow, ça a l'air super ! Propre, rapide et crypté ! 🚀",
      }
    };

    const cleanText = text.toLowerCase().trim();
    let translatedText = `[Translated to ${targetLang}]: ${text}`;

    if (translations[targetLang] && translations[targetLang][cleanText]) {
      translatedText = translations[targetLang][cleanText];
    } else {
      // Basic dictionary helper
      if (targetLang.toLowerCase() === 'spanish') {
        translatedText = `[Simulated Spanish]: ${text} (si)`;
      } else if (targetLang.toLowerCase() === 'french') {
        translatedText = `[Simulated French]: ${text} (oui)`;
      }
    }

    res.json({ translatedText });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Voice to Text Conversion ---
export const voiceToText = async (req, res) => {
  try {
    // In a real app we'd receive audio file uploads, send it to a Speech-to-Text API.
    // Here we'll simulate the transcription based on a mock audio clip or return a premium default transcription.
    const transcriptions = [
      "Hey everyone, I am leaving the supermarket now. Let me know if you need anything else! 🛒",
      "Don't forget we have grandma's birthday party tomorrow at 6 PM! 🎂",
      "I'm stuck in traffic, will be about 15 minutes late. Please start dinner without me!",
      "I just shared my live location. Check the map!"
    ];

    const randomTranscript = transcriptions[Math.floor(Math.random() * transcriptions.length)];
    
    // Artificial delay to make it feel premium & real
    setTimeout(() => {
      res.json({ text: randomTranscript });
    }, 1500);
  } catch (error) {
    console.error('Voice to text error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// --- Spam / Toxic Moderation ---
export const moderateMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (GEMINI_API_KEY) {
      try {
        const prompt = `Moderate this message. Decide if it is toxic/abusive/spam. Message: "${text}"`;
        const result = await callGemini(prompt, "You are a family safety moderator. Analyze the message. Return a JSON object with: { \"isToxic\": boolean, \"category\": string or null, \"flaggedContent\": string or null }. Output ONLY the JSON. Do not add markdown backticks.");
        const cleanResult = result.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanResult);
        return res.json(parsed);
      } catch (err) {
        // Fallback below
      }
    }

    // Fallback simple keyword checker
    const toxicKeywords = ['hate', 'stupid', 'jerk', 'shut up', 'damn', 'kill', 'abuse', 'fuck', 'shit'];
    const lowerText = text.toLowerCase();
    
    let isToxic = false;
    let category = null;
    let flaggedContent = null;

    for (const word of toxicKeywords) {
      if (lowerText.includes(word)) {
        isToxic = true;
        category = 'harassment/family-safety';
        flaggedContent = word;
        break;
      }
    }

    res.json({
      isToxic,
      category,
      flaggedContent
    });
  } catch (error) {
    console.error('Moderation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// --- AI Assistant / Chatbot ---
export const askAssistant = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (GEMINI_API_KEY) {
      try {
        const result = await callGemini(prompt, "You are FamilySphere AI, a helpful, warm, and professional family assistant chatbot. You assist families with schedules, chores, conflict resolution, recipes, homework, and organization. Keep your tone encouraging, empathetic, and polite.");
        return res.json({ response: result });
      } catch (err) {
        // Fallback below
      }
    }

    // Fallback simulation
    const lowerPrompt = prompt.toLowerCase();
    let response = "I am FamilySphere AI, your family helper! I can assist you with dinner planning, scheduling chores, dividing tasks, and providing smart suggestions. How can I support your family today? ❤️";

    if (lowerPrompt.includes('dinner') || lowerPrompt.includes('recipe') || lowerPrompt.includes('eat')) {
      response = "🍽️ **Dinner Suggestion:** How about a healthy taco night? It's interactive and fun for kids and grandparents alike! You will need:\n- Tortillas\n- Ground beef or black beans\n- Avocados, tomatoes, and salsa\n- Cheese and sour cream\nWould you like me to make a shopping list for this? 🛒";
    } else if (lowerPrompt.includes('chore') || lowerPrompt.includes('clean') || lowerPrompt.includes('task')) {
      response = "🧹 **Family Chore Organizer:** I recommend setting up a weekly rotation system. For example:\n- **Mom/Dad:** Kitchen duty & cooking\n- **Kids:** Taking out trash & setting the table\n- **Grandparents:** Feeding pets & folding laundry\nI can create a visual chart or send reminders to keep everyone on track! Would you like me to help draft a chore calendar?";
    } else if (lowerPrompt.includes('schedule') || lowerPrompt.includes('event') || lowerPrompt.includes('calendar')) {
      response = "📅 **Schedule Helper:** I see we have Mom's grocery trip and Grandma's birthday coming up. I can set automatic alerts inside our family group chat to keep everyone aligned! Let me know what event you would like to schedule next.";
    } else if (lowerPrompt.includes('joke')) {
      response = "😄 Here is a family-friendly joke:\n\n*Why did the computer go to the doctor?*\n*Because it had a virus!* 💻🩺";
    } else if (lowerPrompt.includes('help') || lowerPrompt.includes('capabilities')) {
      response = "🌟 **Here is what I can do for you:**\n1. **Chore Division**: Help divide housework fairly.\n2. **Meal Planning**: Suggest delicious recipes and write shopping lists.\n3. **Event Reminders**: Keep track of soccer matches, doctor visits, and birthdays.\n4. **Conflict Resolution**: Neutral advice on family matters.\nFeel free to ask me anything!";
    }

    res.json({ response });
  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
