import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, PageBreak } from "docx";
import { createRequire } from "module";
import { execFile } from "child_process";
import { promisify } from "util";

const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");
const imageSizePackage = require("image-size");
const imageSize = imageSizePackage.imageSize || imageSizePackage.default || imageSizePackage;
const IS_LINUX = process.platform === "linux";

let pdfPoppler = null;

if (!IS_LINUX) {
  pdfPoppler = require("pdf-poppler");
}
const XLSX = require("xlsx");
const { router: authRoutes, db } = require("./authRoutes.cjs");
const jwt = require("jsonwebtoken");

const execFileAsync = promisify(execFile);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "pdfdoer_local_secret_change_later";

const __dirname = process.cwd();
const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "outputs");
const fontsDir = path.join(__dirname, "assets", "fonts");
const LIBREOFFICE_PATH = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
const QPDF_PATH = "C:\\Program Files\\qpdf 12.3.2\\bin\\qpdf.exe";
const TESSERACT_PATH = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
db.exec(`
  CREATE TABLE IF NOT EXISTS guest_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_key TEXT NOT NULL UNIQUE,
    ip_address TEXT DEFAULT '',
    device_id TEXT DEFAULT '',
    actions_used INTEGER DEFAULT 0,
    actions_limit INTEGER DEFAULT 3,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
function ensureGuestUsageColumns() {
  const columns = db
    .prepare("PRAGMA table_info(guest_usage)")
    .all()
    .map((column) => column.name);

  const addColumnIfMissing = (columnName, columnDefinition) => {
    if (!columns.includes(columnName)) {
      db.prepare(`ALTER TABLE guest_usage ADD COLUMN ${columnName} ${columnDefinition}`).run();
    }
  };

  addColumnIfMissing("guest_key", "TEXT DEFAULT ''");
  addColumnIfMissing("ip_address", "TEXT DEFAULT ''");
  addColumnIfMissing("device_id", "TEXT DEFAULT ''");
  addColumnIfMissing("actions_used", "INTEGER DEFAULT 0");
  addColumnIfMissing("actions_limit", "INTEGER DEFAULT 3");
  addColumnIfMissing("created_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
  addColumnIfMissing("updated_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
}

ensureGuestUsageColumns();
app.use(helmet());

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(
  "/fonts",
  express.static(fontsDir, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);
app.use(
  "/outputs",
  express.static(outputDir, {
    setHeaders: (res, filePath) => {
      const fileName = path.basename(filePath);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
      );

      if (fileName.toLowerCase().endsWith(".txt")) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
      }
    },
  })
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

function getBaseName(fileName) {
  return path.parse(fileName).name;
}

function getFileUrl(req, fileName) {
  return `${req.protocol}://${req.get("host")}/outputs/${fileName}`;
}

function cleanupUploadedFiles(files) {
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.log("Cleanup skipped:", error.message);
    }
  }
}
function getClientIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();

  return (
    forwardedFor ||
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown-ip"
  );
}

function getDeviceId(req) {
  return String(req.headers["x-pdfdoer-device-id"] || "")
    .trim()
    .replace(/[^\w.-]/g, "")
    .slice(0, 120);
}

function getGuestKey(req) {
  const ipAddress = getClientIp(req);
  const deviceId = getDeviceId(req);

  if (deviceId) {
    return `device:${deviceId}|ip:${ipAddress}`;
  }

  return `ip:${ipAddress}`;
}

function getOptionalAuthUser(req) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db
      .prepare("SELECT * FROM users WHERE id = ?")
      .get(decoded.id);

    return user || null;
  } catch {
    return null;
  }
}

function getUsageContext(req) {
  const user = getOptionalAuthUser(req);

  if (user) {
    const tier = user.tier || "free";
    const actionsLimit = tier === "pro" ? 999 : Number(user.actions_limit || 10);
    const actionsUsed = Number(user.actions_used || 0);

    return {
      type: "user",
      userId: user.id,
      email: user.email,
      tier,
      actionsUsed,
      actionsLimit,
      remaining: Math.max(0, actionsLimit - actionsUsed),
    };
  }

  const ipAddress = getClientIp(req);
  const deviceId = getDeviceId(req);
  const guestKey = getGuestKey(req);

  let guest = db
    .prepare("SELECT * FROM guest_usage WHERE guest_key = ?")
    .get(guestKey);

  if (!guest) {
    db.prepare(`
      INSERT INTO guest_usage (guest_key, ip_address, device_id, actions_used, actions_limit)
      VALUES (?, ?, ?, 0, 3)
    `).run(guestKey, ipAddress, deviceId);

    guest = db
      .prepare("SELECT * FROM guest_usage WHERE guest_key = ?")
      .get(guestKey);
  }

  const actionsLimit = Number(guest.actions_limit || 3);
  const actionsUsed = Number(guest.actions_used || 0);

  return {
    type: "guest",
    guestKey,
    ipAddress,
    deviceId,
    tier: "guest",
    actionsUsed,
    actionsLimit,
    remaining: Math.max(0, actionsLimit - actionsUsed),
  };
}

function getLimitReachedMessage(usageContext) {
  if (usageContext.type === "guest") {
    return "Guest limit reached. You have used your 3 free PDF actions. Please sign up for a free account to get 10 actions.";
  }

  if (usageContext.tier === "free") {
    return "Free account limit reached. You have used your 10 PDF actions. Please upgrade to Pro to continue.";
  }

  return "Pro usage limit reached. Please contact PDFDoer support.";
}

function formatUsage(usageContext) {
  return {
    tier: usageContext.tier,
    actionsUsed: usageContext.actionsUsed,
    actionsLimit: usageContext.actionsLimit,
    remaining: usageContext.remaining,
  };
}

function recordSuccessfulUsage(usageContext) {
  if (usageContext.type === "guest") {
    db.prepare(`
      UPDATE guest_usage
      SET actions_used = actions_used + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE guest_key = ?
    `).run(usageContext.guestKey);

    const updatedGuest = db
      .prepare("SELECT * FROM guest_usage WHERE guest_key = ?")
      .get(usageContext.guestKey);

    const actionsLimit = Number(updatedGuest.actions_limit || 3);
    const actionsUsed = Number(updatedGuest.actions_used || 0);

    return {
      tier: "guest",
      actionsUsed,
      actionsLimit,
      remaining: Math.max(0, actionsLimit - actionsUsed),
    };
  }

  db.prepare(`
    UPDATE users
    SET actions_used = actions_used + 1
    WHERE id = ?
  `).run(usageContext.userId);

  const updatedUser = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(usageContext.userId);

  const tier = updatedUser.tier || "free";
  const actionsLimit = tier === "pro" ? 999 : Number(updatedUser.actions_limit || 10);
  const actionsUsed = Number(updatedUser.actions_used || 0);

  return {
    tier,
    actionsUsed,
    actionsLimit,
    remaining: Math.max(0, actionsLimit - actionsUsed),
  };
}
function safeRemoveFolder(folderPath) {
  try {
    if (folderPath && fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.log("Temp folder cleanup skipped:", error.message);
  }
}

function parseHexColor(hexColor = "#0f172a") {
  const cleanHex = String(hexColor).replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    return rgb(0.06, 0.09, 0.16);
  }

  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;

  return rgb(r, g, b);
}

function normalizePercent(value, fallback) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, numberValue));
}

function parsePageSelection(pageText, totalPages) {
  const text = String(pageText || "").trim();

  if (!text) {
    throw new Error("Please enter the page numbers you want to delete.");
  }

  const pagesToDelete = new Set();
  const parts = text.split(",");

  for (const part of parts) {
    const cleanPart = part.trim();

    if (!cleanPart) continue;

    if (cleanPart.includes("-")) {
      const [startText, endText] = cleanPart.split("-");
      const start = Number(startText.trim());
      const end = Number(endText.trim());

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error("Invalid page range. Example: 1,3,5-7");
      }

      if (start < 1 || end < 1 || start > end || end > totalPages) {
        throw new Error(`Invalid page range. This PDF has ${totalPages} pages.`);
      }

      for (let page = start; page <= end; page++) {
        pagesToDelete.add(page - 1);
      }
    } else {
      const page = Number(cleanPart);

      if (!Number.isInteger(page)) {
        throw new Error("Invalid page number. Example: 1,3,5-7");
      }

      if (page < 1 || page > totalPages) {
        throw new Error(`Invalid page number. This PDF has ${totalPages} pages.`);
      }

      pagesToDelete.add(page - 1);
    }
  }

  return pagesToDelete;
}

async function deletePagesFromPdf(file, outputPath, pagesToDeleteText) {
  const bytes = fs.readFileSync(file.path);
  const originalPdf = await PDFDocument.load(bytes);
  const totalPages = originalPdf.getPageCount();

  const pagesToDelete = parsePageSelection(pagesToDeleteText, totalPages);

  if (pagesToDelete.size === 0) {
    throw new Error("Please enter at least one valid page to delete.");
  }

  if (pagesToDelete.size >= totalPages) {
    throw new Error("You cannot delete all pages. At least one page must remain.");
  }

  const newPdf = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    if (!pagesToDelete.has(i)) {
      const [copiedPage] = await newPdf.copyPages(originalPdf, [i]);
      newPdf.addPage(copiedPage);
    }
  }

  const outputBytes = await newPdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

function getCropBoxFromOptions(options) {
  const cropBox = options.cropBox || {};

  const x = normalizePercent(cropBox.x, 10);
  const y = normalizePercent(cropBox.y, 10);
  const width = normalizePercent(cropBox.width, 80);
  const height = normalizePercent(cropBox.height, 80);

  if (width <= 0 || height <= 0) {
    throw new Error("Invalid crop area. Please select a larger crop box.");
  }

  if (x + width > 100 || y + height > 100) {
    throw new Error("Invalid crop area. The crop box is outside the page.");
  }

  return { x, y, width, height };
}

async function cropPdf(file, outputPath, options = {}) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();

  if (!pages.length) {
    throw new Error("This PDF has no pages to crop.");
  }

  const cropBox = getCropBoxFromOptions(options);
  const pageMode = options.pageMode || "all";
  const currentPage = Number(options.currentPage || 1);

  if (pageMode === "current") {
    if (!Number.isInteger(currentPage) || currentPage < 1 || currentPage > pages.length) {
      throw new Error(`Invalid page selected. This PDF has ${pages.length} pages.`);
    }
  }

  pages.forEach((page, index) => {
    if (pageMode === "current" && index !== currentPage - 1) {
      return;
    }

    const { width: pageWidth, height: pageHeight } = page.getSize();

    const cropX = (cropBox.x / 100) * pageWidth;
    const cropWidth = (cropBox.width / 100) * pageWidth;

    const topFromScreen = (cropBox.y / 100) * pageHeight;
    const cropHeight = (cropBox.height / 100) * pageHeight;
    const cropY = pageHeight - topFromScreen - cropHeight;

    page.setCropBox(cropX, cropY, cropWidth, cropHeight);
  });

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

async function signPdf(file, outputPath, options = {}) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);

  pdf.registerFontkit(fontkit);

  const pages = pdf.getPages();

  if (!pages.length) {
    throw new Error("This PDF has no pages to sign.");
  }

  const signatureText = String(options.signatureText || "").trim();

  if (!signatureText) {
    throw new Error("Please enter a signature before signing the PDF.");
  }

  const pageNumber = Number(options.currentPage || 1);

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages.length) {
    throw new Error(`Invalid page selected. This PDF has ${pages.length} pages.`);
  }

  const signatureStyle = String(options.signatureStyle || "sevenDay");

  const customFonts = {
    autoSignature: "AAutoSignature-1GD9j.ttf",
    autography: "Autography-DOLnW.otf",
    brittany: "BrittanySignature-LjyZ.otf",
    darlington: "DarlingtonDemo-z8xjG.ttf",
    sevenDay: "SevenDaySignature-RpKO3.otf",
    signerica: "SignericaMedium-RXOo.ttf",
  };

  const builtInFonts = {
    classic: StandardFonts.TimesRomanItalic,
    elegant: StandardFonts.TimesRomanBoldItalic,
    bold: StandardFonts.HelveticaBold,
    simple: StandardFonts.Helvetica,
    formal: StandardFonts.CourierOblique,
  };

  let font;

  if (customFonts[signatureStyle]) {
    const fontPath = path.join(fontsDir, customFonts[signatureStyle]);

    if (!fs.existsSync(fontPath)) {
      throw new Error(`Signature font file is missing: ${customFonts[signatureStyle]}`);
    }

    const fontBytes = fs.readFileSync(fontPath);
    font = await pdf.embedFont(fontBytes);
  } else {
    const selectedFont = builtInFonts[signatureStyle] || StandardFonts.TimesRomanItalic;
    font = await pdf.embedFont(selectedFont);
  }

  const page = pages[pageNumber - 1];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const xPercent = normalizePercent(options.x, 50);
  const yPercent = normalizePercent(options.y, 75);
  const fontSize = Math.max(8, Math.min(120, Number(options.fontSize || 42)));
  const color = parseHexColor(options.color || "#0f172a");

  const textWidth = font.widthOfTextAtSize(signatureText, fontSize);

  const pdfX = (xPercent / 100) * pageWidth - textWidth / 2;
  const pdfY = pageHeight - (yPercent / 100) * pageHeight - fontSize / 2;

  page.drawText(signatureText, {
    x: Math.max(0, Math.min(pageWidth - textWidth, pdfX)),
    y: Math.max(0, Math.min(pageHeight - fontSize, pdfY)),
    size: fontSize,
    font,
    color,
  });

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}
async function annotatePdf(file, outputPath, options = {}) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages();

  if (!pages.length) {
    throw new Error("This PDF has no pages to annotate.");
  }

  const annotations = Array.isArray(options.annotations)
    ? options.annotations
    : [];

  if (!annotations.length) {
    throw new Error("Please add at least one annotation before saving.");
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const annotation of annotations) {
    const pageNumber = Number(annotation.page || 1);

    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pages.length) {
      continue;
    }

    const page = pages[pageNumber - 1];
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const color = parseHexColor(annotation.color || "#2563eb");
    const opacity = Math.max(0.05, Math.min(1, Number(annotation.opacity || 1)));

    if (annotation.type === "text") {
      const text = String(annotation.text || "").trim();

      if (!text) continue;

      const xPercent = normalizePercent(annotation.x, 10);
      const yPercent = normalizePercent(annotation.y, 10);
      const fontSize = Math.max(8, Math.min(72, Number(annotation.fontSize || 18)));

      const pdfX = (xPercent / 100) * pageWidth;
      const pdfY = pageHeight - (yPercent / 100) * pageHeight - fontSize;

      page.drawText(text, {
        x: Math.max(0, Math.min(pageWidth - 20, pdfX)),
        y: Math.max(0, Math.min(pageHeight - fontSize, pdfY)),
        size: fontSize,
        font,
        color,
        opacity,
      });
    }

    if (annotation.type === "highlight") {
      const xPercent = normalizePercent(annotation.x, 10);
      const yPercent = normalizePercent(annotation.y, 10);
      const widthPercent = normalizePercent(annotation.width, 30);
      const heightPercent = normalizePercent(annotation.height, 6);

      const rectX = (xPercent / 100) * pageWidth;
      const rectWidth = (widthPercent / 100) * pageWidth;
      const topFromScreen = (yPercent / 100) * pageHeight;
      const rectHeight = (heightPercent / 100) * pageHeight;
      const rectY = pageHeight - topFromScreen - rectHeight;

      page.drawRectangle({
        x: rectX,
        y: rectY,
        width: rectWidth,
        height: rectHeight,
        color,
        opacity: Math.max(0.1, Math.min(0.6, opacity)),
      });
    }

    if (annotation.type === "draw") {
      const points = Array.isArray(annotation.points) ? annotation.points : [];

      if (points.length < 2) continue;

      const thickness = Math.max(1, Math.min(20, Number(annotation.thickness || 3)));

      for (let i = 0; i < points.length - 1; i++) {
        const start = points[i];
        const end = points[i + 1];

        const startX = (normalizePercent(start.x, 0) / 100) * pageWidth;
        const startY = pageHeight - (normalizePercent(start.y, 0) / 100) * pageHeight;

        const endX = (normalizePercent(end.x, 0) / 100) * pageWidth;
        const endY = pageHeight - (normalizePercent(end.y, 0) / 100) * pageHeight;

        page.drawLine({
          start: { x: startX, y: startY },
          end: { x: endX, y: endY },
          thickness,
          color,
          opacity,
        });
      }
    }
  }

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}
async function mergePdf(files, outputPath) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const bytes = fs.readFileSync(file.path);
    const pdf = await PDFDocument.load(bytes);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    pages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedBytes = await mergedPdf.save();
  fs.writeFileSync(outputPath, mergedBytes);
}

async function rotatePdf(file, outputPath, angle = 90) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);

  const safeAngle = Number(angle) || 90;

  pdf.getPages().forEach((page) => {
    page.setRotation(degrees(safeAngle));
  });

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

async function splitPdf(file, outputPath) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);

  const zip = new AdmZip();

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);

    newPdf.addPage(page);

    const pageBytes = await newPdf.save();

    zip.addFile(`page-${i + 1}.pdf`, Buffer.from(pageBytes));
  }

  zip.writeZip(outputPath);
}

async function addWatermark(file, outputPath, text = "PDFDoer") {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);

  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();

    page.drawText(text, {
      x: width / 2 - 120,
      y: height / 2,
      size: 48,
      color: rgb(0.7, 0.7, 0.7),
      opacity: 0.35,
      rotate: degrees(35),
    });
  });

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

async function jpgToPdf(files, outputPath) {
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const imageBuffer = await sharp(file.path).jpeg().toBuffer();

    const image = await pdf.embedJpg(imageBuffer);
    const page = pdf.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

async function pdfToJpg(file, outputPath) {
  const baseOutputName = path.parse(outputPath).name;
  const outputFolder = path.join(outputDir, baseOutputName);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const options = {
    format: "jpeg",
    out_dir: outputFolder,
    out_prefix: "page",
    page: null,
  };

  await pdfPoppler.convert(file.path, options);

  const zip = new AdmZip();
  const convertedFiles = fs.readdirSync(outputFolder);

  convertedFiles.forEach((fileName) => {
    const filePath = path.join(outputFolder, fileName);

    if (fs.statSync(filePath).isFile()) {
      zip.addLocalFile(filePath);
    }
  });

  zip.writeZip(outputPath);
}

async function compressPdf(file, outputPath, quality = "ebook") {
  const allowedQualities = ["screen", "ebook", "printer", "prepress"];
  const selectedQuality = allowedQualities.includes(quality) ? quality : "ebook";

  const args = [
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.4",
    `-dPDFSETTINGS=/${selectedQuality}`,
    "-dNOPAUSE",
    "-dQUIET",
    "-dBATCH",
    `-sOutputFile=${outputPath}`,
    file.path,
  ];

  await execFileAsync("gswin64c", args);
}

async function wordToPdf(file, outputPath) {
  const tempOutputFolder = path.join(outputDir, `word-to-pdf-${Date.now()}`);

  if (!fs.existsSync(tempOutputFolder)) {
    fs.mkdirSync(tempOutputFolder, { recursive: true });
  }

  const args = [
    "--headless",
    "--convert-to",
    "pdf",
    "--outdir",
    tempOutputFolder,
    file.path,
  ];

  await execFileAsync(LIBREOFFICE_PATH, args);

  const convertedFiles = fs.readdirSync(tempOutputFolder);
  const pdfFile = convertedFiles.find((fileName) =>
    fileName.toLowerCase().endsWith(".pdf")
  );

  if (!pdfFile) {
    throw new Error("LibreOffice did not create a PDF file.");
  }

  const convertedPdfPath = path.join(tempOutputFolder, pdfFile);

  fs.copyFileSync(convertedPdfPath, outputPath);

  safeRemoveFolder(tempOutputFolder);
}
async function pdfToWord(file, outputPath) {
  const tempFolder = path.join(outputDir, `pdf-to-word-${Date.now()}`);

  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const options = {
    format: "png",
    out_dir: tempFolder,
    out_prefix: "page",
    page: null,
  };

  await pdfPoppler.convert(file.path, options);

  const imageFiles = fs
    .readdirSync(tempFolder)
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!imageFiles.length) {
    safeRemoveFolder(tempFolder);
    throw new Error("PDF to Word could not read any pages from this PDF.");
  }

  const docChildren = [];

  docChildren.push(
    new Paragraph({
      text: "Converted PDF Document",
      heading: HeadingLevel.TITLE,
      spacing: {
        after: 300,
      },
    })
  );

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = path.join(tempFolder, imageFiles[i]);
    const imageBuffer = fs.readFileSync(imagePath);

    const dimensions = imageSize(imageBuffer);
    const originalWidth = dimensions.width || 800;
    const originalHeight = dimensions.height || 1100;

    const maxWordWidth = 560;
    const scale = maxWordWidth / originalWidth;

    const wordImageWidth = Math.round(originalWidth * scale);
    const wordImageHeight = Math.round(originalHeight * scale);

    const pageText = await runTesseract(imagePath);

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Page ${i + 1}`,
            bold: true,
            size: 28,
          }),
        ],
        spacing: {
          before: 250,
          after: 150,
        },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: imageBuffer,
            transformation: {
              width: wordImageWidth,
              height: wordImageHeight,
            },
            type: "png",
          }),
        ],
        spacing: {
          after: 250,
        },
      })
    );

    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Editable text from this page:",
            bold: true,
            size: 24,
          }),
        ],
        spacing: {
          before: 120,
          after: 120,
        },
      })
    );

    const lines = String(pageText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) {
      docChildren.push(
        new Paragraph({
          text: "No readable text detected on this page.",
          spacing: {
            after: 120,
          },
        })
      );
    } else {
      for (const line of lines) {
        docChildren.push(
          new Paragraph({
            text: line,
            spacing: {
              after: 80,
            },
          })
        );
      }
    }

    if (i < imageFiles.length - 1) {
      docChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  fs.writeFileSync(outputPath, buffer);

  safeRemoveFolder(tempFolder);
}
function splitTextIntoExcelRows(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];

  for (const line of lines) {
    let columns = [];

    if (line.includes("\t")) {
      columns = line.split("\t");
    } else if (line.includes("|")) {
      columns = line.split("|");
    } else if (/\s{2,}/.test(line)) {
      columns = line.split(/\s{2,}/);
    } else {
      columns = [line];
    }

    rows.push(columns.map((cell) => String(cell || "").trim()));
  }

  return rows;
}

async function pdfToExcel(file, outputPath) {
  const tempFolder = path.join(outputDir, `pdf-to-excel-${Date.now()}`);

  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const options = {
    format: "png",
    out_dir: tempFolder,
    out_prefix: "page",
    page: null,
  };

  await pdfPoppler.convert(file.path, options);

  const imageFiles = fs
    .readdirSync(tempFolder)
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!imageFiles.length) {
    safeRemoveFolder(tempFolder);
    throw new Error("PDF to Excel could not read any pages from this PDF.");
  }

  const workbook = XLSX.utils.book_new();

  const allRows = [["Page", "Column 1", "Column 2", "Column 3", "Column 4", "Column 5"]];

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = path.join(tempFolder, imageFiles[i]);
    const pageText = await runTesseract(imagePath);

    const rows = splitTextIntoExcelRows(pageText);

    if (!rows.length) {
      allRows.push([`Page ${i + 1}`, "No readable text detected"]);
      continue;
    }

    for (const row of rows) {
      allRows.push([`Page ${i + 1}`, ...row]);
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet(allRows);

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");

  XLSX.writeFile(workbook, outputPath);

  safeRemoveFolder(tempFolder);
}
async function unlockPdf(file, outputPath, password = "") {
  const safePassword = String(password || "").trim();

  if (!safePassword) {
    throw new Error("Please enter the PDF password to unlock this file.");
  }

  const args = [
    `--password=${safePassword}`,
    "--decrypt",
    file.path,
    outputPath,
  ];

  await execFileAsync(QPDF_PATH, args);
}

async function runTesseract(imagePath) {
  const result = await execFileAsync(
    TESSERACT_PATH,
    [imagePath, "stdout", "-l", "eng"],
    {
      maxBuffer: 50 * 1024 * 1024,
    }
  );

  return result.stdout || "";
}

async function ocrImageFile(file, outputPath) {
  const tempFolder = path.join(outputDir, `ocr-image-${Date.now()}`);

  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const imagePath = path.join(tempFolder, "ocr-input.png");

  await sharp(file.path)
    .rotate()
    .grayscale()
    .normalize()
    .png()
    .toFile(imagePath);

  const text = await runTesseract(imagePath);

  fs.writeFileSync(
    outputPath,
    text.trim() || "No readable text was detected in this file.",
    "utf8"
  );

  safeRemoveFolder(tempFolder);
}

async function ocrPdfFile(file, outputPath) {
  const tempFolder = path.join(outputDir, `ocr-pdf-${Date.now()}`);

  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const options = {
    format: "png",
    out_dir: tempFolder,
    out_prefix: "page",
    page: null,
  };

  await pdfPoppler.convert(file.path, options);

  const imageFiles = fs
    .readdirSync(tempFolder)
    .filter((fileName) => fileName.toLowerCase().endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!imageFiles.length) {
    safeRemoveFolder(tempFolder);
    throw new Error("OCR could not convert this PDF into readable pages.");
  }

  let finalText = "";

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = path.join(tempFolder, imageFiles[i]);
    const pageText = await runTesseract(imagePath);

    finalText += `Page ${i + 1}\n`;
    finalText += `${pageText.trim() || "No readable text detected on this page."}\n\n`;
  }

  fs.writeFileSync(
    outputPath,
    finalText.trim() || "No readable text was detected in this PDF.",
    "utf8"
  );

  safeRemoveFolder(tempFolder);
}

async function ocrTextRecognition(file, outputPath) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === ".pdf") {
    await ocrPdfFile(file, outputPath);
    return;
  }

  if ([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"].includes(ext)) {
    await ocrImageFile(file, outputPath);
    return;
  }

  throw new Error("Please upload a PDF or image file for OCR text recognition.");
}

app.get("/", (req, res) => {
  res.json({
    message: "PDFDoer backend is running",
  });
});

app.post("/api/pdf/:toolSlug", upload.array("files", 20), async (req, res) => {
  const files = req.files || [];

  try {
    const { toolSlug } = req.params;
    const options = req.body.options ? JSON.parse(req.body.options) : {};

        if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const usageContext = getUsageContext(req);

    if (usageContext.actionsUsed >= usageContext.actionsLimit) {
      cleanupUploadedFiles(files);

      return res.status(403).json({
        success: false,
        message: getLimitReachedMessage(usageContext),
        usage: formatUsage(usageContext),
      });
    }

    const firstFile = files[0];
    const baseName = getBaseName(firstFile.originalname);
    let outputFileName = `${baseName}_processed.pdf`;

    if (toolSlug === "merge-pdf") {
      if (files.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Please upload at least 2 PDF files to merge.",
        });
      }

      outputFileName = `${baseName}_merged.pdf`;
      await mergePdf(files, path.join(outputDir, outputFileName));
    } else if (toolSlug === "split-pdf") {
      outputFileName = `${baseName}_split.zip`;
      await splitPdf(firstFile, path.join(outputDir, outputFileName));
    } else if (toolSlug === "rotate-pdf") {
      outputFileName = `${baseName}_rotated.pdf`;

      const rotateAngle = Number(options.angle) || 90;

      await rotatePdf(
        firstFile,
        path.join(outputDir, outputFileName),
        rotateAngle
      );
    } else if (toolSlug === "delete-pages") {
      outputFileName = `${baseName}_pages_deleted.pdf`;

      await deletePagesFromPdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options.pagesToDelete || options.pages || ""
      );
    } else if (toolSlug === "crop-pdf") {
      outputFileName = `${baseName}_cropped.pdf`;

      await cropPdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options
      );
    } else if (toolSlug === "annotate-pdf") {
      outputFileName = `${baseName}_annotated.pdf`;

      await annotatePdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options
      );
    } else if (toolSlug === "edit-pdf") {
      outputFileName = `${baseName}_edited.pdf`;

      await annotatePdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options
      );
    } else if (toolSlug === "sign-pdf") {
      outputFileName = `${baseName}_signed.pdf`;

      await signPdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options
      );
    } else if (toolSlug === "add-watermark") {
      outputFileName = `${baseName}_watermarked.pdf`;

      await addWatermark(
        firstFile,
        path.join(outputDir, outputFileName),
        options.watermarkText || "PDFDoer"
      );
    } else if (toolSlug === "jpg-to-pdf") {
      outputFileName = `${baseName}.pdf`;
      await jpgToPdf(files, path.join(outputDir, outputFileName));
    } else if (toolSlug === "pdf-to-jpg") {
      outputFileName = `${baseName}_jpg_pages.zip`;
      await pdfToJpg(firstFile, path.join(outputDir, outputFileName));
    } else if (toolSlug === "compress-pdf") {
      outputFileName = `${baseName}_compressed.pdf`;
      await compressPdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options.quality || "ebook"
      );
    } else if (toolSlug === "word-to-pdf") {
      const ext = path.extname(firstFile.originalname).toLowerCase();

      if (![".doc", ".docx"].includes(ext)) {
        return res.status(400).json({
          success: false,
          message: "Please upload a Word document, either .doc or .docx.",
        });
      }

      outputFileName = `${baseName}.pdf`;
      await wordToPdf(firstFile, path.join(outputDir, outputFileName));
    } else if (toolSlug === "password-protect") {
      outputFileName = `${baseName}_protected.pdf`;
      await protectPdf(
        firstFile,
        path.join(outputDir, outputFileName),
        options.password || "123456"
      );
    } else if (toolSlug === "unlock-pdf") {
      const unlockPassword =
        options.password ||
        options.pdfPassword ||
        options.unlockPassword ||
        options.userPassword ||
        "";

      if (!unlockPassword) {
        return res.status(400).json({
          success: false,
          message: "Please enter the correct password to unlock this PDF.",
        });
      }

      outputFileName = `${baseName}_unlocked.pdf`;
      await unlockPdf(
        firstFile,
        path.join(outputDir, outputFileName),
        unlockPassword
      );
    } else if (toolSlug === "pdf-to-word") {
      const ext = path.extname(firstFile.originalname).toLowerCase();

      if (ext !== ".pdf") {
        return res.status(400).json({
          success: false,
          message: "Please upload a PDF file.",
        });
      }

      outputFileName = `${baseName}.docx`;

      await pdfToWord(
        firstFile,
        path.join(outputDir, outputFileName)
      );
    } else if (toolSlug === "pdf-to-excel") {
      const ext = path.extname(firstFile.originalname).toLowerCase();

      if (ext !== ".pdf") {
        return res.status(400).json({
          success: false,
          message: "Please upload a PDF file.",
        });
      }

      outputFileName = `${baseName}.xlsx`;

      await pdfToExcel(
        firstFile,
        path.join(outputDir, outputFileName)
      );
    } else if (toolSlug === "ocr-text-recognition") {
      outputFileName = `${baseName}_ocr_text.txt`;
      await ocrTextRecognition(firstFile, path.join(outputDir, outputFileName));
    } else {
      return res.status(501).json({
        success: false,
        message: `${toolSlug} is not connected yet.`,
      });
    }

    const outputPath = path.join(outputDir, outputFileName);

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({
        success: false,
        message: "Output file was not created.",
      });
    }

    const stats = fs.statSync(outputPath);

        const updatedUsage = recordSuccessfulUsage(usageContext);

    cleanupUploadedFiles(files);

    res.json({
      success: true,
      message: "Your file has been successfully processed.",
      downloadUrl: getFileUrl(req, outputFileName),
      fileName: outputFileName,
      fileSize: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      timestamp: new Date().toLocaleTimeString(),
      usage: updatedUsage,
    });
  } catch (error) {
    console.error(error);

    cleanupUploadedFiles(files);

    const errorText = String(error?.message || error || "");

    let cleanMessage = "Server error while processing file. Please try again.";

    if (errorText.toLowerCase().includes("invalid password")) {
      cleanMessage = "Password is incorrect. Please try again.";
    } else if (errorText.toLowerCase().includes("password")) {
      cleanMessage = "Please check your PDF password and try again.";
    } else if (errorText.toLowerCase().includes("tesseract")) {
      cleanMessage = "OCR engine error. Please make sure Tesseract is installed correctly.";
    } else if (errorText) {
      cleanMessage = errorText;
    }

    res.status(500).json({
      success: false,
      message: cleanMessage,
    });
  }
});

app.listen(PORT, () => {
  console.log(`PDFDoer backend running on http://localhost:${PORT}`);
});