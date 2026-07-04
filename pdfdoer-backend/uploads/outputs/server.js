import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import sharp from "sharp";
import { PDFDocument, degrees, rgb } from "pdf-lib";

const app = express();
const PORT = process.env.PORT || 5000;

const __dirname = process.cwd();
const uploadDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "outputs");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

app.use(helmet());

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json());
app.use("/outputs", express.static(outputDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

function getBaseName(fileName) {
  return path.parse(fileName).name;
}

function getFileUrl(req, fileName) {
  return `${req.protocol}://${req.get("host")}/outputs/${fileName}`;
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

  pdf.getPages().forEach((page) => {
    page.setRotation(degrees(angle));
  });

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

async function splitPdf(file, outputPath) {
  const bytes = fs.readFileSync(file.path);
  const pdf = await PDFDocument.load(bytes);

  const archiveOutput = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(archiveOutput);

  for (let i = 0; i < pdf.getPageCount(); i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);

    const pageBytes = await newPdf.save();

    archive.append(Buffer.from(pageBytes), {
      name: `page-${i + 1}.pdf`
    });
  }

  await archive.finalize();

  return new Promise((resolve, reject) => {
    archiveOutput.on("close", resolve);
    archive.on("error", reject);
  });
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
      rotate: degrees(35)
    });
  });

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

async function jpgToPdf(files, outputPath) {
  const pdf = await PDFDocument.create();

  for (const file of files) {
    const imageBuffer = await sharp(file.path)
      .jpeg()
      .toBuffer();

    const image = await pdf.embedJpg(imageBuffer);
    const page = pdf.addPage([image.width, image.height]);

    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    });
  }

  const outputBytes = await pdf.save();
  fs.writeFileSync(outputPath, outputBytes);
}

app.get("/", (req, res) => {
  res.json({
    message: "PDFDoer backend is running"
  });
});

app.post("/api/pdf/:toolSlug", upload.array("files", 20), async (req, res) => {
  try {
    const { toolSlug } = req.params;
    const files = req.files || [];
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    if (!files.length) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded"
      });
    }

    const firstFile = files[0];
    const baseName = getBaseName(firstFile.originalname);
    let outputFileName = `${baseName}_processed.pdf`;

    if (toolSlug === "merge-pdf") {
      outputFileName = `${baseName}_merged.pdf`;
      await mergePdf(files, path.join(outputDir, outputFileName));
    } else if (toolSlug === "split-pdf") {
      outputFileName = `${baseName}_split.zip`;
      await splitPdf(firstFile, path.join(outputDir, outputFileName));
    } else if (toolSlug === "rotate-pdf") {
      outputFileName = `${baseName}_rotated.pdf`;
      await rotatePdf(firstFile, path.join(outputDir, outputFileName), options.angle || 90);
    } else if (toolSlug === "add-watermark") {
      outputFileName = `${baseName}_watermarked.pdf`;
      await addWatermark(firstFile, path.join(outputDir, outputFileName), options.watermarkText || "PDFDoer");
    } else if (toolSlug === "jpg-to-pdf") {
      outputFileName = `${baseName}.pdf`;
      await jpgToPdf(files, path.join(outputDir, outputFileName));
    } else {
      return res.status(501).json({
        success: false,
        message: `${toolSlug} is not connected yet.`
      });
    }

    const outputPath = path.join(outputDir, outputFileName);
    const stats = fs.statSync(outputPath);

    res.json({
      success: true,
      message: "Your file has been successfully processed.",
      downloadUrl: getFileUrl(req, outputFileName),
      fileName: outputFileName,
      fileSize: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      timestamp: new Date().toLocaleTimeString()
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message || "Server error while processing file"
    });
  }
});

app.listen(PORT, () => {
  console.log(`PDFDoer backend running on http://localhost:${PORT}`);
});