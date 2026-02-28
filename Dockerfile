FROM node:20-bookworm

# 1. Install sistem dependencies
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    python3 \
    python3-pip \
    chromium \
    --no-install-recommends && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# 2. Install Python library
RUN pip3 install pillow --break-system-packages

# 3. Set working directory
WORKDIR /app

# 4. Copy package.json
COPY package*.json ./

# 5. Install dependencies (termasuk concurrently)
RUN npm install --omit=dev

# 6. Copy semua file bot
COPY . .

# 7. Buat direktori penting
RUN mkdir -p auth_baileys temp helpers

# Expose port
EXPOSE 3000

# 8. Jalankan KEDUA bot sekaligus
CMD ["npx", "concurrently", "node index.js", "node discord-index.js"]