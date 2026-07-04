FROM node:22-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libreoffice \
    ghostscript \
    qpdf \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]