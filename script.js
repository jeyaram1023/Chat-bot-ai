const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const voiceInputButton = document.querySelector("#voice-input");
const clearFileButton = document.querySelector("#clear-file");
const toggleTTSButton = document.querySelector("#toggle-tts");
const languageSelector = document.querySelector("#language-selector");

const API_KEY = "AIzaSyD6t67ErOa0NY7ZoAhREjzIhuuoK2IZzV0"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
  language: "en", // Default language
};

// Supported languages and their codes
const languages = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  hi: "Hindi",
  ja: "Japanese",
  zh: "Chinese",
};

// Initialize Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = userData.language; // Set initial language

// Initialize TTS
let ttsEnabled = false;

// Function to navigate to index1.html
const navigateToFaceDetection = () => {
  window.open("index1.html", "_blank");
};

// Helper function to create message elements in the chat
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Function to convert text to speech
const speak = (text) => {
  if (ttsEnabled && 'speechSynthesis' in window) {
    const sentences = text.split(/[.!?]/g).filter(s => s.trim() !== "");
    const maxChunkLength = 1500000000; // Maximum characters per chunk
    const chunks = [];

    // Split sentences into chunks
    let currentChunk = "";
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkLength) {
        currentChunk += sentence + ".";
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = sentence + ".";
      }
    }
    if (currentChunk.trim() !== "") {
      chunks.push(currentChunk.trim());
    }

    // Function to speak a chunk
    const speakChunk = (index) => {
      if (index >= chunks.length) return; // Stop if all chunks are processed

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = userData.language; // Set TTS language
      utterance.rate = 1;
      utterance.pitch = 1;

      // Speak the next chunk when the current one ends
      utterance.onend = () => {
        speakChunk(index + 1);
      };

      window.speechSynthesis.speak(utterance);
    };

    // Start speaking the first chunk
    speakChunk(0);
  } else {
    console.error("Text-to-speech not supported in this browser.");
  }
};

// Function to translate text using Google Translate API
const translateText = async (text, targetLanguage) => {
  const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`;
  const requestBody = {
    q: text,
    target: targetLanguage,
  };

  try {
    const response = await fetch(translateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);
    return data.data.translations[0].translatedText; // Return translated text
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original text if translation fails
  }
};

// Function to generate the bot response using the Gemini API
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  // Predefined responses
  const predefinedResponses = {
    hi: {
      en: "hi",
      es: "hola",
      fr: "salut",
      de: "hallo",
      hi: "नमस्ते",
      ja: "こんにちは",
      zh: "你好",
    },
    hello: {
      en: "hello",
      es: "hola",
      fr: "bonjour",
      de: "hallo",
      hi: "नमस्ते",
      ja: "こんにちは",
      zh: "你好",
    },
    whoAreYou: {
      en: "(I'm ChatGPT, your AI assistant by OpenAI. I help with:

📘 Learning & explanations

💻 Coding & debugging

✍️ Writing editing

🎨 Creative ideas

🌐 Web & app projects


Think of me as your smart digital buddy!)
  ",
      es: "Un chatbot creado por Mahi",
      fr: "Un chatbot créé par Mahi",
      de: "Ein Chatbot, erstellt von Mahi",
      hi: "मही द्वारा बनाया गया एक चैटबॉट",
      ja: "マヒによって作成されたチャットボット",
      zh: "由Mahi创建的聊天机器人",
    },
    mahi: {
      en: "The man who created me",
      es: "El hombre que me creó",
      fr: "L'homme qui m'a créé",
      de: "Der Mann, der mich erschaffen hat",
      hi: "वह व्यक्ति जिसने मुझे बनाया",
      ja: "私を作った人",
      zh: "创造我的人",
    },
    playVideo: {
      en: "Opening YouTube...",
      es: "Abriendo YouTube...",
      fr: "Ouverture de YouTube...",
      de: "Öffne YouTube...",
      hi: "YouTube खोल रहा है...",
      ja: "YouTubeを開いています...",
      zh: "正在打开YouTube...",
    },
    openGoogle: {
      en: "Opening Google...",
      es: "Abriendo Google...",
      fr: "Ouverture de Google...",
      de: "Öffne Google...",
      hi: "Google खोल रहा है...",
      ja: "Googleを開いています...",
      zh: "正在打开Google...",
    },
    openMaps: {
      en: "Opening Google Maps...",
    },
  
  };

  // Check if the user's message is "hi"
  if (userData.message.toLowerCase().trim() === "hi") {
    const response = predefinedResponses.hi[userData.language] || predefinedResponses.hi.en;
    messageElement.innerText = response;
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    sendMessageButton.disabled = false;
    speak(response);
    return;
  }

  // Check if the user's message is "hello"
  if (userData.message.toLowerCase().trim() === "hello") {
    const response = predefinedResponses.hello[userData.language] || predefinedResponses.hello.en;
    messageElement.innerText = response;
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    sendMessageButton.disabled = false;
    speak(response);
    return;
  }

  // Check if the user's message is "mahi"
  if (userData.message.toLowerCase().trim() === "mahi") {
    const response = predefinedResponses.mahi[userData.language] || predefinedResponses.mahi.en;
    messageElement.innerText = response;
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    sendMessageButton.disabled = false;
    speak(response);
    return;
  }

  // Check if the user's message is "play video"
if (userData.message.toLowerCase().trim() === "play video" ||
    userData.message.toLowerCase().trim() === "open youtube") {
  const response = predefinedResponses.playVideo[userData.language] || predefinedResponses.playVideo.en;
  messageElement.innerText = response;
  incomingMessageDiv.classList.remove("thinking");
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  sendMessageButton.disabled = false;
  speak(response);

  // Open YouTube in a new tab
  window.open("https://www.youtube.com", "_blank");
  return;
}
// Check if the user's message is "openGoogle maps"
if (userData.message.toLowerCase().trim() === "open maps") {
  const response = predefinedResponses.openMaps[userData.language] || predefinedResponses.openMaps.en;
  messageElement.innerText = response;
  incomingMessageDiv.classList.remove("thinking");
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  sendMessageButton.disabled = false;
  speak(response);

  // Open YouTube in a new tab
  window.open("https://maps.google.com/maps", "_blank");
  return;
}

if (userData.message.toLowerCase().trim() === "open google") {
  const response = predefinedResponses.openGoogle[userData.language] || predefinedResponses.openGoogle.en;
  messageElement.innerText = response;
  incomingMessageDiv.classList.remove("thinking");
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  sendMessageButton.disabled = false;
  speak(response);

  // Open YouTube in a new tab
  window.open("https://www.google.co.in/", "_blank");
  return;
}

  // Check if the user's message is "who are you?" or similar
  if (
    userData.message.toLowerCase().trim() === "who are you?" || 
    userData.message.toLowerCase().trim() === "who r u?" ||
    userData.message.toLowerCase().trim() === "who r u" ||
    userData.message.toLowerCase().trim() === "who are u" ||
    userData.message.toLowerCase().trim() === "who are u?" ||
    userData.message.toLowerCase().trim() === "who are you" ||
    userData.message.toLowerCase().trim() === "what are you" ||
    userData.message.toLowerCase().trim() === "who invented u"||
    userData.message.toLowerCase().trim() === "who invented you"
  ) {
    const response = predefinedResponses.whoAreYou[userData.language] || predefinedResponses.whoAreYou.en;
    messageElement.innerText = response;
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    sendMessageButton.disabled = false;
    speak(response);
    return;
  }

  // If no predefined response, proceed with API call
  const userMessage = await translateText(userData.message, "en"); // Translate to English for API

  // Prepare the body for the API request
  const requestBody = {
    contents: [
      {
        parts: [
          { text: userMessage || "Describe this image." },
          ...userData.file.data
            ? [{ inline_data: { data: userData.file.data, mime_type: userData.file.mime_type } }]
            : [],
        ],
      },
    ],
  };

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .trim();

    // Translate bot response to user's language
    const translatedResponse = await translateText(apiResponseText, userData.language);
    messageElement.innerText = translatedResponse;
    speak(translatedResponse); // Speak the bot's response
  } catch (error) {
    console.error(error);
    messageElement.innerText = error.message;
    messageElement.style.color = "#ff0000";
  } finally {
    incomingMessageDiv.classList.remove("thinking");
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    sendMessageButton.disabled = false;
  }
};

// Handle outgoing user messages
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";

  // Check if the message is "arise"
  if (userData.message.toLowerCase() === "arise") {
    navigateToFaceDetection(); // Navigate to index1.html
    return; // Stop further processing
  }

  // Create and display user message
  const messageContent = `<div class="message-text"></div>
                          ${
                            userData.file.data
                              ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />`
                              : ""
                          }`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").textContent = userData.message || "Uploaded file";
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  // Simulate bot response with thinking indicator after a delay
  setTimeout(() => {
    const messageContent = `
      <div class="bot-avatar"></div>
      <div class="message-text">
        <div class="thinking-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>`;
    const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (e.key === "Enter" && userMessage) {
    e.preventDefault(); // Prevent default form submission behavior
    handleOutgoingMessage(e); // Trigger the function
  }
});

// Handle Send button click
sendMessageButton.addEventListener("click", (e) => {
  const userMessage = messageInput.value.trim();
  if (userMessage) {
    handleOutgoingMessage(e); // Trigger the function
  }
});

// Handle file input change
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64String = e.target.result.split(",")[1];

    // Store file data in userData
    userData.file = {
      data: base64String,
      mime_type: file.type,
    };

    // Display file name or preview
    if (file.type.startsWith("image/")) {
      const preview = `<img src="${e.target.result}" alt="Uploaded Image" class="file-preview" />`;
      messageInput.insertAdjacentHTML("beforebegin", preview);
    } else {
      const fileName = `<div class="file-name">${file.name}</div>`;
      messageInput.insertAdjacentHTML("beforebegin", fileName);
    }

    fileInput.value = ""; // Clear the input
    clearFileButton.style.display = "inline-block"; // Show the clear button
  };

  reader.readAsDataURL(file);
});

// Handle clear file button click
clearFileButton.addEventListener("click", () => {
  userData.file = { data: null, mime_type: null }; // Clear file data
  fileInput.value = ""; // Clear the input
  clearFileButton.style.display = "none"; // Hide the clear button
  document.querySelector(".file-preview, .file-name")?.remove(); // Remove preview
});

// Handle file upload button click
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());

// Handle voice input button click
voiceInputButton.addEventListener("click", () => {
  if (voiceInputButton.classList.contains("recording")) {
    recognition.stop(); // Stop recording if already active
    voiceInputButton.classList.remove("recording");
  } else {
    recognition.start(); // Start recording
    voiceInputButton.classList.add("recording");
  }
});

// Handle speech recognition result
recognition.addEventListener("result", (e) => {
  const transcript = e.results[0][0].transcript.trim().toLowerCase();
  messageInput.value = transcript;
  voiceInputButton.classList.remove("recording");

  userData.message = transcript;
handleOutgoingMessage(new Event("auto-send"));

  // Check if the recognized text is "arise"
  if (transcript === "arise") {
    navigateToFaceDetection(); // Navigate to index1.html
    return; // Stop further processing
  }
  // Handle special commands
  if (transcript === "play video" || transcript === "open youtube") {
    const response = predefinedResponses.playVideo[userData.language] || predefinedResponses.playVideo.en;
    const outgoingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Open YouTube in a new tab
    window.open("https://www.youtube.com", "_blank");
    return; // Stop further processing
  }
  if (transcript === "open maps") {
    const response = predefinedResponses.openMaps[userData.language] || predefinedResponses.openMaps.en;
    const outgoingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Open YouTube in a new tab
    window.open("https://maps.google.com/maps", "_blank");
    return; // Stop further processing
  }

  if (transcript === "open google") {
    const response = predefinedResponses.openGoogle[userData.language] || predefinedResponses.openGoogle.en;
    const outgoingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Open Google in a new tab
    window.open("https://www.google.co.in/", "_blank");
    return; // Stop further processing
  }
 
});


// Handle speech recognition end
recognition.addEventListener("end", () => {
  voiceInputButton.classList.remove("recording");
});

// Handle speech recognition error
recognition.addEventListener("error", (e) => {
  console.error("Speech recognition error:", e.error);
  voiceInputButton.classList.remove("recording");
  alert("Speech recognition failed. Please ensure your microphone is enabled and try again.");
});

// Toggle TTS
toggleTTSButton.addEventListener("click", () => {
  ttsEnabled = !ttsEnabled;
  toggleTTSButton.textContent = ttsEnabled ? "Disable TTS" : "Enable TTS";
});

// Handle language selection
languageSelector.addEventListener("change", (e) => {
  userData.language = e.target.value;
  recognition.lang = userData.language; // Update speech recognition language
  localStorage.setItem("chatbotLanguage", userData.language); // Save language preference
});

// Load saved language preference
const savedLanguage = localStorage.getItem("chatbotLanguage");
if (savedLanguage) {
  userData.language = savedLanguage;
  languageSelector.value = savedLanguage;
  recognition.lang = savedLanguage; // Set speech recognition language
}

// Handle camera button click
document.getElementById("camera-button").addEventListener("click", () => {
  navigateToFaceDetection(); // Navigate to index1.html
});

///
