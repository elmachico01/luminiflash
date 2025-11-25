let localHistory = []; // Almacena el historial local del chat
let selectedImage = null; // Almacena la imagen seleccionada temporalmente

// Referencias a elementos del DOM
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const fileInput = document.getElementById('file-input');

// --- Función de Auto-Scroll Inteligente ---
function scrollToBottom() {
    // Espera unos milisegundos para que el DOM se actualice gráficamente antes de hacer scroll
    setTimeout(() => {
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth' // Desplazamiento suave
        });
    }, 50);
}

// --- Redimensionamiento automático del área de texto ---
userInput.addEventListener('input', function() {
    this.style.height = 'auto'; // Reseteamos altura
    this.style.height = (this.scrollHeight) + 'px'; // Ajustamos a la altura del contenido
    if(this.value === '') this.style.height = 'auto'; // Si está vacío, volvemos al automático
});

// Enviar mensaje al presionar Enter (sin Shift)
userInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Evitar el salto de línea por defecto
        sendMessage();
    }
});

// Gestión de Archivos (Imágenes)
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        // Cuando la lectura del archivo termina:
        reader.onload = function(evt) {
            selectedImage = {
                data: evt.target.result.split(',')[1], // Obtenemos solo la parte base64 pura
                mime: file.type, // Tipo de archivo (ej. image/png)
                preview: evt.target.result // URL completa para la vista previa
            };
            // Mostrar la imagen en el área de vista previa
            document.getElementById('img-preview').src = selectedImage.preview;
            document.getElementById('preview-area').classList.remove('hidden');
            // Desplaza un poco hacia abajo para mostrar que se ha cargado la imagen si es necesario
            scrollToBottom();
        };
        // Leer el archivo como URL de datos
        reader.readAsDataURL(file);
    }
});

// Función para eliminar la imagen seleccionada antes de enviar
function removeImage() {
    selectedImage = null;
    fileInput.value = ''; // Limpiar el input file
    document.getElementById('preview-area').classList.add('hidden'); // Ocultar contenedor
}

// Función principal asíncrona para enviar mensajes
async function sendMessage() {
    const text = userInput.value.trim();
    // Si no hay texto ni imagen, no hacer nada
    if (!text && !selectedImage) return;

    // 1. Añadir TU mensaje a la interfaz de usuario
    appendMessage(text, 'user', selectedImage?.preview);
    
    // Reiniciar el campo de entrada y el área de imagen
    userInput.value = '';
    userInput.style.height = 'auto';
    const imageToSend = selectedImage; // Guardar referencia para enviar
    removeImage();

    // Guardar en el historial local
    localHistory.push({ role: "user", text: text });

    // 2. Mostrar mensaje de carga "Procesando..."
    const loadingId = appendMessage("Procesando...", 'bot', null, true);

    try {
        // Enviar petición al Backend
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                history: localHistory,
                message: text,
                image: imageToSend
            })
        });

        const data = await response.json();
        
        // Eliminar el mensaje de carga una vez recibida la respuesta
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();

        if (data.error) {
            // Mostrar error si el backend devuelve uno
            appendMessage("Error: " + data.error, 'bot');
        } else {
            // 3. Añadir la RESPUESTA del bot a la interfaz
            appendMessage(data.response, 'bot');
            // Guardar respuesta en el historial local
            localHistory.push({ role: "model", text: data.response });
        }

    } catch (err) {
        // Manejo de errores de red o conexión
        const loadingEl = document.getElementById(loadingId);
        if(loadingEl) loadingEl.remove();
        appendMessage("Error de conexión.", 'bot');
    }
}

// Función para añadir mensajes visualmente al DOM
function appendMessage(text, role, imgSrc = null, isLoading = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`; // Asigna clase 'user' o 'bot'
    msgDiv.id = isLoading ? 'loading-msg' : 'msg-' + Date.now();
    
    // HTML del Avatar (solo para el bot)
    const avatarHtml = role === 'bot' ? 
        `<div class="avatar"><span class="material-symbols-rounded">${isLoading ? 'hourglass_empty' : 'smart_toy'}</span></div>` : '';

    // Contenido HTML del mensaje
    let contentHtml = `<div class="content">`;
    if (imgSrc) {
        // Si hay imagen, añadirla antes del texto
        contentHtml += `<img src="${imgSrc}" style="display:block; margin-bottom:15px;">`;
    }
    contentHtml += `${text}</div>`;

    // Combinar avatar (si aplica) y contenido
    msgDiv.innerHTML = role === 'bot' ? (avatarHtml + contentHtml) : (contentHtml); 

    chatBox.appendChild(msgDiv);
    
    // --> DESPLAZAMIENTO AUTOMÁTICO HACIA ABAJO <--
    scrollToBottom();
    
    return msgDiv.id;
}

// --- FUNCIÓN PARA GUARDAR EL CHAT ---
function downloadChat() {
    if(localHistory.length === 0) {
        alert("¡No hay chat para guardar!");
        return;
    }

    // Construir el contenido del archivo de texto
    let textContent = "--- CHAT LUMINI ---\n\n";
    localHistory.forEach(msg => {
        const role = msg.role === 'user' ? "TÚ" : "LUMINI";
        textContent += `[${role}]:\n${msg.text}\n\n----------------\n\n`;
    });

    // Crear un Blob con el texto y generar enlace de descarga
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Nombre del archivo con fecha
    a.download = 'lumini-chat-' + new Date().toISOString().slice(0,10) + '.txt';
    document.body.appendChild(a);
    a.click(); // Simular clic para descargar
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Liberar memoria
}