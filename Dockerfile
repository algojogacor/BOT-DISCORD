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

# 3. Set working directory root
WORKDIR /app

# 4. Copy package.json root
COPY package*.json ./

# 5. Install dependencies root
RUN npm install --omit=dev

# 6. Copy semua file bot (ini akan meng-copy folder wa-fm-v2 juga)
COPY . .

# 7. Buat direktori penting
RUN mkdir -p auth_baileys temp helpers

# 8. Pindah ke folder wa-fm-v2 dan install dependencies-nya
WORKDIR /app/wa-fm-v2
RUN npm install --omit=dev

# 9. Kembali ke direktori root /app
WORKDIR /app

# 10. Expose port untuk Koyeb
EXPOSE 3000

# 11. Jalankan menggunakan start-all.js
CMD ["node", "start-all.js"]