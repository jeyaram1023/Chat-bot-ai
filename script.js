// --- Common Elements and Variables (used across pages) ---
const API_KEY = "AIzaSyD4wOt4sa5AqL12n_cV-_hpG1QlSE-gEcE"; // Replace with your actual API key
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null,
    },
    language: localStorage.getItem("chatbotLanguage") || "en", // Default or saved language
};

let ttsEnabled = false;
let currentSpeechUtterance = null; // To control play/pause

// Helper function to create message elements in the chat
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
};

// Function to convert text to speech
const speak = (text) => {
    if (currentSpeechUtterance && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); // Stop any ongoing speech
    }

    if (ttsEnabled && 'speechSynthesis' in window) {
        const sentences = text.split(/[.!?\n]/g).filter(s => s.trim() !== "");
        const maxChunkLength = 1500; // Increased chunk length for better flow

        const chunks = [];
        let currentChunk = "";

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length <= maxChunkLength) {
                currentChunk += sentence + ". ";
            } else {
                chunks.push(currentChunk.trim());
                currentChunk = sentence + ". ";
            }
        }
        if (currentChunk.trim() !== "") {
            chunks.push(currentChunk.trim());
        }

        const speakChunk = (index) => {
            if (index >= chunks.length) {
                currentSpeechUtterance = null;
                // Update Play/Pause button on Image Analyzer if applicable
                const playPauseButton = document.getElementById('play-pause-description-button');
                if (playPauseButton && playPauseButton.textContent === '⏸️ Pause') {
                    playPauseButton.textContent = '⏯️ Play/Pause';
                }
                return; // Stop if all chunks are processed
            }

            currentSpeechUtterance = new SpeechSynthesisUtterance(chunks[index]);
            currentSpeechUtterance.lang = userData.language; // Set TTS language
            currentSpeechUtterance.rate = 1;
            currentSpeechUtterance.pitch = 1;

            currentSpeechUtterance.onend = () => {
                speakChunk(index + 1); // Speak the next chunk when the current one ends
            };

            currentSpeechUtterance.onerror = (event) => {
                console.error('SpeechSynthesisUtterance.onerror', event);
            };

            window.speechSynthesis.speak(currentSpeechUtterance);
        };

        speakChunk(0); // Start speaking the first chunk
    } else {
        console.error("Text-to-speech not supported or disabled in this browser.");
    }
};

const pauseSpeech = () => {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
    }
};

const resumeSpeech = () => {
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
};

const stopSpeech = () => {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    currentSpeechUtterance = null;
    const playPauseButton = document.getElementById('play-pause-description-button');
    if (playPauseButton && playPauseButton.textContent === '⏸️ Pause') {
        playPauseButton.textContent = '⏯️ Play/Pause';
    }
};

// Function to translate text using Google Translate API (Placeholder, needs a server-side proxy for real use)
const translateText = async (text, targetLanguage) => {
    // For a real application, you'd use a server-side proxy for Google Translate API
    // Direct client-side calls are generally not recommended due to API key exposure and CORS.
    // This is a simplified client-side representation.
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

// Predefined responses
const predefinedResponses = {
    hi: {
        en: "Hi there! How can I help you?",
        es: "¡Hola! ¿Cómo puedo ayudarte?",
        fr: "Salut! Comment puis-je vous aider?",
        de: "Hallo! Wie kann ich Ihnen helfen?",
        hi: "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?",
        ja: "こんにちは！何かお手伝いできますか？",
        zh: "你好！我能帮你什么？",
        ta: "வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?",
    },
    hello: {
        en: "Hello! What can I do for you today?",
        es: "Hola! ¿Qué puedo hacer por ti hoy?",
        fr: "Bonjour! Que puis-je faire pour vous aujourd'hui?",
        de: "Hallo! Was kann ich heute für Sie tun?",
        hi: "नमस्ते! आज मैं आपके लिए क्या कर सकता हूँ?",
        ja: "こんにちは！今日は何かお手伝いできますか？",
        zh: "你好！今天我能为你做什么？",
        ta: "வணக்கம்! இன்று நான் உங்களுக்கு என்ன செய்ய முடியும்?",
    },
    whoAreYou: {
        en: "I am Smart Vision AI, an AI assistant created by Team Mac. Team members: Maheedhar, Thoufiq, Lahari, Revathi, Sukanya. I can help with image analysis and chat.",
        es: "Soy Smart Vision AI, un asistente de IA creado por Team Mac. Miembros del equipo: Maheedhar, Thoufiq, Lahari, Revathi, Sukanya. Puedo ayudar con el análisis de imágenes y el chat.",
        fr: "Je suis Smart Vision AI, un assistant IA créé par Team Mac. Membres de l'équipe : Maheedhar, Thoufiq, Lahari, Revathi, Sukanya. Je peux vous aider avec l'analyse d'images et le chat.",
        de: "Ich bin Smart Vision AI, ein KI-Assistent, der von Team Mac erstellt wurde. Teammitglieder: Maheedhar, Thoufiq, Lahari, Revathi, Sukanya. Ich kann bei der Bildanalyse und im Chat helfen.",
        hi: "मैं स्मार्ट विजन एआई हूँ, टीम मैक द्वारा बनाया गया एक एआई सहायक। टीम के सदस्य: महेश्वर, तौफीक, लाहिरी, रेवती, सुकन्या। मैं छवि विश्लेषण और चैट में मदद कर सकता हूँ।",
        ja: "私はチームMacによって作成されたAIアシスタント、Smart Vision AIです。チームメンバー：マヒダル、トゥフィク、ラハリ、レヴァティ、スカンヤ。画像分析とチャットを支援できます。",
        zh: "我是Smart Vision AI，一个由Team Mac创建的AI助手。团队成员：Maheedhar、Thoufiq、Lahari、Revathi、Sukanya。我可以帮助进行图像分析和聊天。",
        ta: "நான் ஸ்மார்ட் விஷன் ஏஐ, டீம் மேக் குழுவால் உருவாக்கப்பட்ட ஒரு AI உதவியாளர். குழு உறுப்பினர்கள்: மகீதர், தௌஃபிக், லஹரி, ரேவதி, சுகன்யா. நான் பட பகுப்பாய்வு மற்றும் அரட்டையில் உதவ முடியும்.",
    },
    mahi: {
        en: "Maheedhar is one of the talented individuals who created me.",
        es: "Maheedhar es una de las personas talentosas que me crearon.",
        fr: "Maheedhar est l'un des individus talentueux qui m'ont créé.",
        de: "Maheedhar ist einer der talentierten Individuen, die mich erschaffen haben.",
        hi: "महेश्वर उन प्रतिभाशाली व्यक्तियों में से एक हैं जिन्होंने मुझे बनाया है।",
        ja: "マヒダルは私を作成した才能ある人物の一人です。",
        zh: "Maheedhar是创造我的才华横溢的个人之一。",
        ta: "மஹிதர் என்னை உருவாக்கிய திறமையான நபர்களில் ஒருவர்.",
    },
    playVideo: {
        en: "Opening YouTube for you!",
        es: "Abriendo YouTube para ti!",
        fr: "Ouverture de YouTube pour vous!",
        de: "Öffne YouTube für dich!",
        hi: "आपके लिए यूट्यूब खोल रहा हूँ!",
        ja: "YouTubeを開いています！",
        zh: "正在为你打开YouTube！",
        ta: "உங்களுக்காக YouTube திறக்கிறது!",
    },
    openGoogle: {
        en: "Navigating to Google now!",
        es: "Navegando a Google ahora!",
        fr: "Accès à Google maintenant!",
        de: "Gehe jetzt zu Google!",
        hi: "अब गूगल पर जा रहा हूँ!",
        ja: "今すぐGoogleに移動します！",
        zh: "正在导航到Google！",
        ta: "இப்போது Google-க்கு செல்கிறது!",
    },
    openMaps: {
        en: "Opening Google Maps for you!",
        es: "Abriendo Google Maps para ti!",
        fr: "Ouverture de Google Maps pour vous!",
        de: "Öffne Google Maps für dich!",
        hi: "आपके लिए गूगल मैप्स खोल रहा हूँ!",
        ja: "Googleマップを開いています！",
        zh: "正在为你打开Google地图！",
        ta: "உங்களுக்காக Google Maps திறக்கிறது!",
    },
    arise: {
        en: "Opening face detection interface.",
        es: "Abriendo la interfaz de detección de rostros.",
        fr: "Ouverture de l'interface de détection de visage.",
        de: "Gesichtserkennungsoberfläche wird geöffnet.",
        hi: "चेहरा पहचान इंटरफ़ेस खोल रहा है।",
        ja: "顔検出インターフェースを開いています。",
        zh: "正在打开人脸识别界面。",
        ta: "முக அங்கீகார இடைமுகம் திறக்கிறது.",
    }
};

// Function to navigate to index1.html (for "arise" command and camera)
const navigateToFaceDetection = () => {
    // For a real-world app, "index1.html" would be your actual face detection page.
    // Make sure index1.html exists and implements the face detection logic.
    window.open("index1.html", "_blank");
};


// --- Logic Specific to Image Analyzer (`image.html`) ---
if (document.getElementById('image-input')) {
    const imageInput = document.getElementById('image-input');
    const imageUploadArea = document.getElementById('image-upload-area');
    const uploadedImagePreview = document.getElementById('uploaded-image-preview');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const clearImageButton = document.getElementById('clear-image-button');
    const analyzeImageButton = document.getElementById('analyze-image-button');
    const aiDescriptionText = document.getElementById('ai-description-text');
    const speakDescriptionButton = document.getElementById('speak-description-button');
    const playPauseDescriptionButton = document.getElementById('play-pause-description-button');

    // Load TTS preference for Image Analyzer too
    ttsEnabled = localStorage.getItem("ttsEnabled") === "true";
    if (speakDescriptionButton) {
        speakDescriptionButton.textContent = ttsEnabled ? "🔊 Speak (On)" : "🔊 Speak (Off)";
    }

    // Drag and Drop functionality
    imageUploadArea.addEventListener('click', () => imageInput.click());
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#007bff';
        imageUploadArea.style.backgroundColor = '#e6f7ff';
    });
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.style.borderColor = '#ccc';
        imageUploadArea.style.backgroundColor = '#f9f9f9';
    });
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.style.borderColor = '#ccc';
        imageUploadArea.style.backgroundColor = '#f9f9f9';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });

    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });

    clearImageButton.addEventListener('click', () => {
        userData.file = { data: null, mime_type: null };
        uploadedImagePreview.src = '#';
        uploadedImagePreview.classList.add('hidden');
        imagePreviewContainer.classList.add('hidden');
        clearImageButton.classList.add('hidden');
        analyzeImageButton.classList.add('disabled');
        analyzeImageButton.disabled = true;
        aiDescriptionText.textContent = '';
        speakDescriptionButton.classList.add('hidden');
        playPauseDescriptionButton.classList.add('hidden');
        stopSpeech(); // Stop any speech
    });

    analyzeImageButton.addEventListener('click', async () => {
        if (userData.file.data) {
            aiDescriptionText.textContent = 'Analyzing image...';
            speakDescriptionButton.classList.add('hidden');
            playPauseDescriptionButton.classList.add('hidden');
            stopSpeech(); // Stop any previous speech

            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: "Describe this image in detail. Mention objects, colors, textures, and arrangement." },
                            { inline_data: { data: userData.file.data, mime_type: userData.file.mime_type } },
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
                if (!response.ok) throw new Error(data.error.message || "Unknown API error");

                const apiResponseText = data.candidates[0].content.parts[0].text
                    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold markdown
                    .trim();

                const translatedResponse = await translateText(apiResponseText, userData.language);
                aiDescriptionText.textContent = translatedResponse;
                speakDescriptionButton.classList.remove('hidden');
                playPauseDescriptionButton.classList.remove('hidden');

                if (ttsEnabled) {
                    speak(translatedResponse);
                }

            } catch (error) {
                console.error("Image analysis error:", error);
                aiDescriptionText.textContent = `Error: ${error.message}`;
                aiDescriptionText.style.color = "#ff0000";
            }
        }
    });

    speakDescriptionButton.addEventListener('click', () => {
        const textToSpeak = aiDescriptionText.textContent;
        if (textToSpeak && textToSpeak !== 'Analyzing image...' && textToSpeak.startsWith('Error') === false) {
            ttsEnabled = !ttsEnabled;
            localStorage.setItem("ttsEnabled", ttsEnabled); // Save TTS preference
            speakDescriptionButton.textContent = ttsEnabled ? "🔊 Speak (On)" : "🔊 Speak (Off)";

            if (ttsEnabled) {
                speak(textToSpeak);
                playPauseDescriptionButton.textContent = '⏸️ Pause';
            } else {
                stopSpeech();
                playPauseDescriptionButton.textContent = '⏯️ Play/Pause';
            }
        }
    });

    playPauseDescriptionButton.addEventListener('click', () => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            pauseSpeech();
            playPauseDescriptionButton.textContent = '▶️ Play';
        } else if (window.speechSynthesis.paused) {
            resumeSpeech();
            playPauseDescriptionButton.textContent = '⏸️ Pause';
        } else {
            // If nothing is speaking, start speaking
            const textToSpeak = aiDescriptionText.textContent;
            if (textToSpeak && textToSpeak !== 'Analyzing image...' && textToSpeak.startsWith('Error') === false) {
                speak(textToSpeak);
                playPauseDescriptionButton.textContent = '⏸️ Pause';
                ttsEnabled = true; // Enable TTS if started from play
                localStorage.setItem("ttsEnabled", true);
                speakDescriptionButton.textContent = "🔊 Speak (On)";
            }
        }
    });

    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (e.g., JPEG, PNG, GIF).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(',')[1];
            userData.file = {
                data: base64String,
                mime_type: file.type,
            };
            uploadedImagePreview.src = e.target.result;
            uploadedImagePreview.classList.remove('hidden');
            imagePreviewContainer.classList.remove('hidden');
            clearImageButton.classList.remove('hidden');
            analyzeImageButton.classList.remove('disabled');
            analyzeImageButton.disabled = false;
            aiDescriptionText.textContent = ''; // Clear previous description
            speakDescriptionButton.classList.add('hidden');
            playPauseDescriptionButton.classList.add('hidden');
            stopSpeech();
        };
        reader.readAsDataURL(file);
    }
}


// --- Logic Specific to Live Chat (`voice.html`) ---
if (document.getElementById('chat-body')) {
    const chatBody = document.querySelector(".chat-body");
    const messageInput = document.querySelector(".message-input");
    const sendMessageButton = document.querySelector("#send-message");
    const fileInput = document.querySelector("#file-input");
    const voiceInputButton = document.querySelector("#voice-input");
    const clearFileButton = document.querySelector("#clear-file");
    const toggleTTSButton = document.querySelector("#toggle-tts");
    const languageSelector = document.querySelector("#language-selector");
    const saveChatButton = document.querySelector("#save-chat");
    const clearChatButton = document.querySelector("#clear-chat");
    const resetChatButton = document.querySelector("#reset-chat");

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = userData.language; // Set initial language

    // Load saved language preference
    const savedLanguage = localStorage.getItem("chatbotLanguage");
    if (savedLanguage) {
        userData.language = savedLanguage;
        languageSelector.value = savedLanguage;
        recognition.lang = savedLanguage; // Set speech recognition language
    }

    // Load TTS preference
    ttsEnabled = localStorage.getItem("ttsEnabled") === "true";
    toggleTTSButton.textContent = ttsEnabled ? "Disable TTS" : "Enable TTS";
    if (ttsEnabled) {
        toggleTTSButton.classList.add('active');
    } else {
        toggleTTSButton.classList.remove('active');
        stopSpeech(); // Stop speech if TTS is disabled
    }

    // Function to generate the bot response using the Gemini API
    const generateBotResponse = async (incomingMessageDiv) => {
        const messageElement = incomingMessageDiv.querySelector(".message-text");

        const userMessage = userData.message.toLowerCase().trim();

        // Check for predefined responses first
        let responseFound = false;
        let botResponseText = '';

        if (userMessage === "hi") {
            botResponseText = predefinedResponses.hi[userData.language] || predefinedResponses.hi.en;
            responseFound = true;
        } else if (userMessage === "hello") {
            botResponseText = predefinedResponses.hello[userData.language] || predefinedResponses.hello.en;
            responseFound = true;
        } else if (userMessage === "mahi") {
            botResponseText = predefinedResponses.mahi[userData.language] || predefinedResponses.mahi.en;
            responseFound = true;
        } else if (userMessage === "play video" || userMessage === "open youtube") {
            botResponseText = predefinedResponses.playVideo[userData.language] || predefinedResponses.playVideo.en;
            window.open("https://www.youtube.com", "_blank"); // Open YouTube in a new tab
            responseFound = true;
        } else if (userMessage === "open maps") {
            botResponseText = predefinedResponses.openMaps[userData.language] || predefinedResponses.openMaps.en;
            window.open("https://maps.google.com", "_blank"); // Open Google Maps in a new tab
            responseFound = true;
        } else if (userMessage === "open google") {
            botResponseText = predefinedResponses.openGoogle[userData.language] || predefinedResponses.openGoogle.en;
            window.open("https://www.google.co.in/", "_blank"); // Open Google in a new tab
            responseFound = true;
        } else if (userMessage === "who are you?" || userMessage === "who r u?" || userMessage === "who r u" ||
                   userMessage === "who are u" || userMessage === "who are u?" || userMessage === "who are you" ||
                   userMessage === "what are you" || userMessage === "who invented u" || userMessage === "who invented you") {
            botResponseText = predefinedResponses.whoAreYou[userData.language] || predefinedResponses.whoAreYou.en;
            responseFound = true;
        } else if (userMessage === "arise") {
            botResponseText = predefinedResponses.arise[userData.language] || predefinedResponses.arise.en;
            navigateToFaceDetection(); // Navigate to index1.html
            responseFound = true;
        }

        if (responseFound) {
            messageElement.innerText = botResponseText;
            incomingMessageDiv.classList.remove("thinking");
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
            sendMessageButton.disabled = false;
            speak(botResponseText);
            return; // Stop further processing
        }

        // If no predefined response, proceed with API call
        const translatedUserMessage = await translateText(userData.message, "en"); // Translate to English for API

        // Prepare the body for the API request
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: translatedUserMessage || "Describe this image." },
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
            if (!response.ok) throw new Error(data.error.message || "Unknown API error");

            const apiResponseText = data.candidates[0].content.parts[0].text
                .replace(/\*\*(.*?)\*\*/g, "$1") // Remove markdown bolding
                .trim();

            // Translate bot response to user's language
            const translatedResponse = await translateText(apiResponseText, userData.language);
            messageElement.innerText = translatedResponse;

            // Add speak button next to each bot message
            const speakButton = document.createElement('button');
            speakButton.classList.add('speak-message-button');
            speakButton.innerHTML = '🔊';
            speakButton.title = 'Speak this message';
            speakButton.onclick = () => speak(translatedResponse);
            incomingMessageDiv.appendChild(speakButton);

            speak(translatedResponse); // Speak the bot's response
        } catch (error) {
            console.error(error);
            messageElement.innerText = `Error: ${error.message}`;
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
        sendMessageButton.disabled = true;

        // Check if the message is "arise"
        if (userData.message.toLowerCase() === "arise") {
            navigateToFaceDetection(); // Navigate to index1.html
            // Create a message for "arise" command
            const messageContent = `<div class="message-text">${userData.message}</div>`;
            const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
            chatBody.appendChild(outgoingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

            setTimeout(() => {
                const botResponseText = predefinedResponses.arise[userData.language] || predefinedResponses.arise.en;
                const messageContentBot = `
                    <div class="bot-avatar"></div>
                    <div class="message-text">${botResponseText}</div>`;
                const incomingMessageDiv = createMessageElement(messageContentBot, "bot-message");
                chatBody.appendChild(incomingMessageDiv);
                chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

                const speakButton = document.createElement('button');
                speakButton.classList.add('speak-message-button');
                speakButton.innerHTML = '🔊';
                speakButton.title = 'Speak this message';
                speakButton.onclick = () => speak(botResponseText);
                incomingMessageDiv.appendChild(speakButton);

                speak(botResponseText);
                sendMessageButton.disabled = false;
            }, 600);
            return; // Stop further processing
        }


        // Create and display user message
        const messageContent = `<div class="message-text">${userData.message || "Uploaded file"}</div>
            ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""
        }`;
        const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
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

        // Clear file data after sending
        userData.file = { data: null, mime_type: null };
        if (clearFileButton) { // Ensure button exists before trying to access
            clearFileButton.style.display = "none";
        }
        document.querySelector(".file-preview, .file-name")?.remove(); // Remove preview
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
        if (userMessage || userData.file.data) { // Allow sending with just a file
            handleOutgoingMessage(e); // Trigger the function
        }
    });

    // Handle file input change
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        // Add file type validation
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && !file.type.startsWith('text/')) {
            alert('Please upload an image, video, audio, or text file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64String = e.target.result.split(",")[1];
            // Store file data in userData
            userData.file = {
                data: base64String,
                mime_type: file.type,
            };
            // Display file name or preview
            // Remove any existing preview/filename before adding new one
            document.querySelector(".file-preview, .file-name")?.remove();

            if (file.type.startsWith("image/")) {
                const preview = `<img src="${e.target.result}" alt="Uploaded Image" class="attachment file-preview" />`;
                messageInput.insertAdjacentHTML("beforebegin", preview);
            } else {
                const fileName = `<div class="file-name">${file.name}</div>`;
                messageInput.insertAdjacentHTML("beforebegin", fileName);
            }
            fileInput.value = ""; // Clear the input
            clearFileButton.style.display = "inline-block"; // Show the clear button

            // Enable send button if a file is attached
            sendMessageButton.disabled = false;
        };
        reader.readAsDataURL(file);
    });

    // Handle clear file button click
    clearFileButton.addEventListener("click", () => {
        userData.file = { data: null, mime_type: null }; // Clear file data
        fileInput.value = ""; // Clear the input
        clearFileButton.style.display = "none"; // Hide the clear button
        document.querySelector(".file-preview, .file-name")?.remove(); // Remove preview
        sendMessageButton.disabled = messageInput.value.trim() === ""; // Disable if no text
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
            messageInput.value = "Listening..."; // Provide immediate feedback
            sendMessageButton.disabled = true;
        }
    });

    // Handle speech recognition result
    recognition.addEventListener("result", async (e) => {
        const transcript = e.results[0][0].transcript.trim().toLowerCase();
        messageInput.value = transcript;
        voiceInputButton.classList.remove("recording");
        userData.message = transcript;

        // Handle special commands from voice input
        let responseHandled = false;

        if (transcript === "arise") {
            navigateToFaceDetection(); // Navigate to index1.html
            const response = predefinedResponses.arise[userData.language] || predefinedResponses.arise.en;
            const outgoingMessageDiv = createMessageElement(`<div class="message-text">${transcript}</div>`, "user-message");
            chatBody.appendChild(outgoingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
            setTimeout(() => {
                const incomingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "bot-message");
                chatBody.appendChild(incomingMessageDiv);
                chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
                const speakButton = document.createElement('button');
                speakButton.classList.add('speak-message-button');
                speakButton.innerHTML = '🔊';
                speakButton.title = 'Speak this message';
                speakButton.onclick = () => speak(response);
                incomingMessageDiv.appendChild(speakButton);
                speak(response);
                sendMessageButton.disabled = false;
            }, 600);
            responseHandled = true;
        } else if (transcript === "play video" || transcript === "open youtube") {
            const response = predefinedResponses.playVideo[userData.language] || predefinedResponses.playVideo.en;
            const outgoingMessageDiv = createMessageElement(`<div class="message-text">${transcript}</div>`, "user-message");
            chatBody.appendChild(outgoingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
            setTimeout(() => {
                const incomingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "bot-message");
                chatBody.appendChild(incomingMessageDiv);
                chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
                const speakButton = document.createElement('button');
                speakButton.classList.add('speak-message-button');
                speakButton.innerHTML = '🔊';
                speakButton.title = 'Speak this message';
                speakButton.onclick = () => speak(response);
                incomingMessageDiv.appendChild(speakButton);
                speak(response);
                sendMessageButton.disabled = false;
            }, 600);
            window.open("https://www.youtube.com", "_blank"); // Open YouTube in a new tab
            responseHandled = true;
        } else if (transcript === "open maps") {
            const response = predefinedResponses.openMaps[userData.language] || predefinedResponses.openMaps.en;
            const outgoingMessageDiv = createMessageElement(`<div class="message-text">${transcript}</div>`, "user-message");
            chatBody.appendChild(outgoingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
            setTimeout(() => {
                const incomingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "bot-message");
                chatBody.appendChild(incomingMessageDiv);
                chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
                const speakButton = document.createElement('button');
                speakButton.classList.add('speak-message-button');
                speakButton.innerHTML = '🔊';
                speakButton.title = 'Speak this message';
                speakButton.onclick = () => speak(response);
                incomingMessageDiv.appendChild(speakButton);
                speak(response);
                sendMessageButton.disabled = false;
            }, 600);
            window.open("https://maps.google.com", "_blank"); // Open Google Maps in a new tab
            responseHandled = true;
        } else if (transcript === "open google") {
            const response = predefinedResponses.openGoogle[userData.language] || predefinedResponses.openGoogle.en;
            const outgoingMessageDiv = createMessageElement(`<div class="message-text">${transcript}</div>`, "user-message");
            chatBody.appendChild(outgoingMessageDiv);
            chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
            setTimeout(() => {
                const incomingMessageDiv = createMessageElement(`<div class="message-text">${response}</div>`, "bot-message");
                chatBody.appendChild(incomingMessageDiv);
                chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
                const speakButton = document.createElement('button');
                speakButton.classList.add('speak-message-button');
                speakButton.innerHTML = '🔊';
                speakButton.title = 'Speak this message';
                speakButton.onclick = () => speak(response);
                incomingMessageDiv.appendChild(speakButton);
                speak(response);
                sendMessageButton.disabled = false;
            }, 600);
            window.open("https://www.google.co.in/", "_blank"); // Open Google in a new tab
            responseHandled = true;
        }

        if (!responseHandled) {
            handleOutgoingMessage(new Event("auto-send")); // Trigger normal message handling
        }
    });

    // Handle speech recognition end
    recognition.addEventListener("end", () => {
        voiceInputButton.classList.remove("recording");
        sendMessageButton.disabled = false; // Re-enable send button
    });

    // Handle speech recognition error
    recognition.addEventListener("error", (e) => {
        console.error("Speech recognition error:", e.error);
        voiceInputButton.classList.remove("recording");
        alert("Speech recognition failed. Please ensure your microphone is enabled and try again.");
        sendMessageButton.disabled = false; // Re-enable send button
        messageInput.value = ""; // Clear input on error
    });

    // Toggle TTS
    toggleTTSButton.addEventListener("click", () => {
        ttsEnabled = !ttsEnabled;
        toggleTTSButton.textContent = ttsEnabled ? "Disable TTS" : "Enable TTS";
        if (ttsEnabled) {
            toggleTTSButton.classList.add('active');
        } else {
            toggleTTSButton.classList.remove('active');
            stopSpeech(); // Stop speech if TTS is disabled
        }
        localStorage.setItem("ttsEnabled", ttsEnabled); // Save TTS preference
    });

    // Handle language selection
    languageSelector.addEventListener("change", (e) => {
        userData.language = e.target.value;
        recognition.lang = userData.language; // Update speech recognition language
        localStorage.setItem("chatbotLanguage", userData.language); // Save language preference
    });

    // Handle camera button click
    document.getElementById("camera-button").addEventListener("click", () => {
        navigateToFaceDetection(); // Navigate to index1.html
    });

    // Chat options functionality
    saveChatButton.addEventListener('click', () => {
        const messages = [];
        chatBody.querySelectorAll('.message').forEach(msgDiv => {
            const type = msgDiv.classList.contains('user-message') ? 'user' : 'bot';
            const text = msgDiv.querySelector('.message-text')?.textContent.trim() || '';
            const imageSrc = msgDiv.querySelector('.attachment')?.src || null;
            messages.push({ type, text, imageSrc });
        });
        const chatData = JSON.stringify(messages, null, 2);
        const blob = new Blob([chatData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chatbot_chat_history.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Chat saved!');
    });

    clearChatButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear the entire chat? This action cannot be undone.")) {
            chatBody.innerHTML = '';
            stopSpeech(); // Stop any ongoing speech
            alert('Chat cleared!');
        }
    });

    resetChatButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to reset the chat? This will clear all messages and reset settings.")) {
            chatBody.innerHTML = '';
            userData.file = { data: null, mime_type: null };
            userData.message = null;
            messageInput.value = '';
            clearFileButton.style.display = 'none';
            document.querySelector(".file-preview, .file-name")?.remove();
            stopSpeech();
            alert('Chat reset!');
        }
    });

    // Restore chat history from localStorage on page load (Optional, but good for UX)
    // You would need to add logic to save chat messages to localStorage when they are added.
    // For simplicity, this example doesn't include saving history to localStorage.
}
