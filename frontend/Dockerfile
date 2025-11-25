FROM nginx:alpine

# Rimuovi la configurazione di default di Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia la tua configurazione personalizzata
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia i file del sito (HTML, CSS, JS)
COPY . /usr/share/nginx/html

EXPOSE 80

# Nginx parte automaticamente con l'immagine base, non serve CMD