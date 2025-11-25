require('dotenv').config(); // Cargar las variables de entorno desde el archivo .env
const express = require('express'); // Importar el framework Express
const cors = require('cors'); // Importar CORS para permitir peticiones entre dominios
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Importar la librería de Google AI

const app = express(); // Inicializar la aplicación Express

// FUNDAMENTAL: Aumentamos el límite para permitir la carga de imágenes pesadas (base64)
app.use(express.json({ limit: '50mb' })); 
app.use(cors()); // Habilitar CORS

const PORT = 3000; // Definir el puerto del servidor

// Configuración de la API Key
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY); // Inicializar el cliente de Google AI

// Usamos Flash que es rápido y soporta imágenes
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Definir la ruta POST para el chat
app.post('/api/chat', async (req, res) => {
    try {
        // Desestructurar los datos recibidos del cuerpo de la petición
        const { history, message, image } = req.body;
        console.log("Mensaje recibido:", message);

        // Construimos el historial para Gemini
        // Nota: Convertimos el historial del frontend al formato requerido por Google
        let chatHistory = [];
        if (history && Array.isArray(history)) {
            chatHistory = history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            }));
        }

        // Iniciar la sesión de chat incluyendo el historial previo
        const chat = model.startChat({
            history: chatHistory
        });

        // Preparamos el contenido a enviar (Texto + Imagen opcional)
        let contentParts = [];
        
        // Si existe un mensaje de texto, lo añadimos
        if (message) contentParts.push({ text: message });
        
        // Si existe una imagen, la añadimos con la estructura correcta
        if (image) {
            contentParts.push({
                inlineData: {
                    data: image.data,     // base64 puro
                    mimeType: image.mime  // ej: image/png
                }
            });
            console.log("Imagen adjunta detectada");
        }

        // Si no hay ni texto ni imagen, devolvemos un error
        if (contentParts.length === 0) {
            return res.status(400).json({ error: "Mensaje vacío" });
        }

        // Enviar el mensaje al modelo y esperar la respuesta
        const result = await chat.sendMessage(contentParts);
        const response = await result.response;
        const text = response.text(); // Extraer el texto de la respuesta

        // Enviar la respuesta final al cliente (frontend)
        res.json({ response: text });

    } catch (error) {
        // Manejo de errores: registrar en consola y enviar respuesta de error al cliente
        console.error("ERROR CRÍTICO BACKEND:", error);
        res.status(500).json({ error: error.message || "Error interno del servidor API" });
    }
});

// Iniciar el servidor y escuchar en el puerto definido
app.listen(PORT, () => {
    console.log(`Backend LUMINI activo en el puerto ${PORT}`);
});