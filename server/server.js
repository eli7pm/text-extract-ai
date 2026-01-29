import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (project root)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Anthropic client for text cleanup
let anthropic;
if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
  anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  console.log('✓ Anthropic API client initialized for text cleanup');
} else {
  console.log('⚠ Anthropic API key not configured - AI text cleanup will be unavailable');
}

// Load JWT private key
let privateKey;
try {
  const keyPath = path.resolve(process.cwd(), process.env.JWT_PRIVATE_KEY_PATH || './keys/private_key.pem');
  privateKey = fs.readFileSync(keyPath, 'utf8');
  console.log('✓ Private key loaded successfully');
} catch (error) {
  console.error('✗ Failed to load private key:', error.message);
  console.log('Please generate JWT keys using the instructions in server/.env.example');
}

/**
 * Generate a JWT token for Document Engine authentication
 * @param {string} documentId - The document ID in Document Engine
 * @param {object} options - Additional JWT options
 * @returns {string} JWT token
 */
function generateJWT(documentId, options = {}) {
  const {
    layer = 'default',
    permissions = ['read-document', 'write', 'download'],
    expiresIn = '1h',
  } = options;

  const payload = {
    document_id: documentId,
    layer,
    permissions,
  };

  const token = jwt.sign(payload, privateKey, {
    algorithm: process.env.JWT_ALGORITHM || 'RS256',
    expiresIn,
  });

  return token;
}

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Nutrient Backend Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      jwt: 'POST /api/jwt',
      upload: 'POST /api/documents/upload',
      extract: 'POST /api/documents/:documentId/extract (with optional AI cleanup)',
      demoJwt: 'GET /api/demo-jwt',
    },
    features: {
      jwtKeysLoaded: !!privateKey,
      aiCleanupAvailable: !!anthropic,
    },
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    documentEngineUrl: process.env.DOCUMENT_ENGINE_URL,
    jwtKeysLoaded: !!privateKey,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Get JWT token for a document
 * POST /api/jwt
 * Body: { documentId: string, layer?: string, permissions?: string[] }
 */
app.post('/api/jwt', (req, res) => {
  try {
    const { documentId, layer, permissions } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    if (!privateKey) {
      return res.status(500).json({ error: 'JWT private key not configured' });
    }

    const token = generateJWT(documentId, { layer, permissions });

    res.json({
      jwt: token,
      documentId,
      documentEngineUrl: process.env.DOCUMENT_ENGINE_URL,
    });
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).json({ error: 'Failed to generate JWT' });
  }
});

/**
 * Upload a PDF document to Document Engine
 * POST /api/documents/upload
 * Body: multipart/form-data with 'file' field
 */
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!privateKey) {
      return res.status(500).json({ error: 'JWT private key not configured' });
    }

    // Upload to Document Engine with raw PDF data
    const headers = {
      'Content-Type': 'application/pdf',
    };

    if (process.env.API_AUTH_TOKEN) {
      headers['Authorization'] = `Token token=${process.env.API_AUTH_TOKEN}`;
    }

    const response = await fetch(`${process.env.DOCUMENT_ENGINE_URL}/api/documents`, {
      method: 'POST',
      body: req.file.buffer,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Document Engine upload failed:');
      console.error('  Status:', response.status, response.statusText);
      console.error('  Response:', errorText);
      console.error('  Request headers:', headers);
      throw new Error(`Document Engine upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const documentId = data.data['document_id'];

    // Generate JWT for the uploaded document
    const token = generateJWT(documentId);

    console.log(`✓ Document uploaded: ${documentId} (${req.file.originalname})`);

    res.json({
      documentId,
      jwt: token,
      documentEngineUrl: process.env.DOCUMENT_ENGINE_URL,
      filename: req.file.originalname,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      error: 'Failed to upload document',
      details: error.message
    });
  }
});

/**
 * Extract structured text from a document using /pages/text endpoint
 * POST /api/documents/:documentId/extract
 * Returns clean text with paragraphs and bounding boxes
 */
app.post('/api/documents/:documentId/extract', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { useAI = true } = req.body; // Allow disabling AI cleanup via request

    console.log(`Extracting text from document: ${documentId} (AI cleanup: ${useAI && anthropic ? 'enabled' : 'disabled'})`);

    // Call Document Engine /pages/text endpoint
    const headers = {
      'Accept': 'application/json',
    };

    if (process.env.API_AUTH_TOKEN) {
      headers['Authorization'] = `Token token=${process.env.API_AUTH_TOKEN}`;
    }

    const response = await fetch(
      `${process.env.DOCUMENT_ENGINE_URL}/api/documents/${documentId}/pages/text`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Document Engine text extraction error:', errorText);
      throw new Error(`Text extraction failed: ${response.status} ${response.statusText}`);
    }

    const pagesData = await response.json();

    // Transform to frontend-expected format with optional AI cleanup
    const processedData = await processTextLines(pagesData, { useAI });

    console.log(`✓ Text extracted from ${documentId}: ${processedData.pages.length} pages`);

    res.json({
      documentId,
      extractedText: processedData,
      pageCount: processedData.pages.length,
      aiCleaned: useAI && !!anthropic,
    });
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({
      error: 'Failed to extract text',
      details: error.message,
    });
  }
});

/**
 * Sanitize text content to handle quotes and special characters properly
 * This ensures text is safe for JSON serialization
 */
function sanitizeText(text) {
  if (!text) return '';

  // The text should already be clean from Document Engine,
  // but we ensure it's properly handled for JSON
  return text;
}

/**
 * Clean up extracted text using Claude AI
 * Fixes spacing, formatting, and organizes into proper paragraphs
 */
async function cleanTextWithAI(rawText, pageIndex) {
  if (!anthropic) {
    console.log(`  Page ${pageIndex}: Skipping AI cleanup (Anthropic not configured)`);
    return rawText;
  }

  // Skip AI cleanup for very short or empty text
  const trimmedText = rawText.trim();
  if (trimmedText.length < 100) {
    console.log(`  Page ${pageIndex}: Skipping AI cleanup (text too short: ${trimmedText.length} chars)`);
    return rawText;
  }

  try {
    const prompt = `You are a text formatting assistant. Your ONLY job is to fix formatting issues in extracted PDF text.

CRITICAL RULES:
1. If there is no substantial text content (just titles, page numbers, etc.), return it EXACTLY as provided without any changes
2. DO NOT expand on the existing information - do not add explanations, context, summaries, or any new content whatsoever
3. DO NOT remove or replace content with placeholders like "(details remain as in original)" - include ALL content
4. DO NOT skip table content - format it as readable text with all data preserved
5. ONLY fix spacing and formatting problems in the EXACT text that was provided
6. The output should contain ALL the SAME information as the input, just better formatted

WHAT TO FIX:
- Add spaces between concatenated words (e.g., "keepthemstill" → "keep them still")
- Join lines that are part of the same sentence
- Add proper paragraph breaks (double newline) between distinct paragraphs
- Format table data as readable text (keep all rows and columns, just make it cleaner)
- Remove or format figure references like (1), (2), [Fig. 71] only if they interrupt text flow
- Fix obvious OCR errors (missing spaces, wrong characters)

WHAT NOT TO DO:
- ❌ DO NOT write placeholders like "(The semester details remain as they were in the original text)"
- ❌ DO NOT skip or summarize table content
- ❌ DO NOT remove any information that was in the input

EXAMPLE:
Input: "silverfiligreeornaments; gold and silverflower-stands"
Output: "silver filigree ornaments; gold and silver flower-stands"

TEXT TO CLEAN:
${rawText}

Output the cleaned text only with ALL content preserved. Do not remove or replace anything with placeholders.`;

    console.log(`  Page ${pageIndex}: Cleaning text with AI...`);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const cleanedText = message.content[0].text.trim();

    // Detect if AI added content instead of just cleaning
    // If the cleaned text is significantly longer than input, something went wrong
    const lengthRatio = cleanedText.length / rawText.length;
    if (lengthRatio > 2.0) {
      console.log(`  Page ${pageIndex}: AI added too much content (${lengthRatio.toFixed(1)}x longer), using original`);
      return rawText;
    }

    console.log(`  Page ${pageIndex}: ✓ Text cleaned successfully`);

    return cleanedText;
  } catch (error) {
    console.error(`  Page ${pageIndex}: AI cleanup failed:`, error.message);
    return rawText; // Fallback to original text
  }
}

/**
 * Process text lines from Document Engine /pages/text endpoint
 * Combines simple line joining with smart paragraph grouping and AI cleanup
 */
async function processTextLines(pagesData, options = {}) {
  const { useAI = true } = options;

  const pages = await Promise.all(
    pagesData.map(async (pageData) => {
      const { pageIndex, textLines } = pageData;

      // Approach 1: Simple join preserving Document Engine's line breaks
      // This respects the natural \n characters in contents
      const rawText = textLines
        .map((line) => sanitizeText(line.contents))
        .join("")
        .replace(/\n{3,}/g, "\n\n") // Clean up excessive newlines
        .trim();

      // Approach 2: AI cleanup to fix spacing and formatting
      const plainText = useAI && anthropic
        ? await cleanTextWithAI(rawText, pageIndex)
        : rawText;

      // Approach 3: Smart paragraph grouping for bounding boxes
      // Filter out newline-only lines for spatial analysis
      const contentLines = textLines.filter(
        line => line.contents && line.contents.trim() !== '' && line.contents !== '\n'
      );

      // Group lines into paragraphs based on vertical spacing
      const paragraphs = groupLinesIntoParagraphs(contentLines);

      return {
        pageIndex,
        plainText,
        paragraphs,
      };
    })
  );

  return { pages };
}

/**
 * Group text lines into paragraphs using multiple heuristics
 * This provides structured paragraph data with bounding boxes
 */
function groupLinesIntoParagraphs(textLines) {
  if (textLines.length === 0) return [];

  // Calculate average line height for the page
  const avgHeight = textLines.reduce((sum, line) => sum + line.height, 0) / textLines.length;

  // Calculate average vertical gap between lines
  const gaps = [];
  for (let i = 1; i < textLines.length; i++) {
    const prevBottom = textLines[i - 1].top + textLines[i - 1].height;
    const gap = textLines[i].top - prevBottom;
    gaps.push(gap);
  }
  const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;

  const paragraphs = [];
  let currentParagraph = {
    lines: [textLines[0]],
    text: sanitizeText(textLines[0].contents),
    bbox: {
      left: textLines[0].left,
      top: textLines[0].top,
      width: textLines[0].width,
      height: textLines[0].height,
    },
  };

  for (let i = 1; i < textLines.length; i++) {
    const prevLine = textLines[i - 1];
    const currentLine = textLines[i];

    // Calculate metrics
    const prevBottom = prevLine.top + prevLine.height;
    const gap = currentLine.top - prevBottom;
    const gapRatio = gap / avgGap;
    const heightDiff = Math.abs(currentLine.height - prevLine.height);
    const heightChange = heightDiff / avgHeight;
    const indentChange = Math.abs(currentLine.left - prevLine.left);

    // Check if previous line ends with sentence-ending punctuation
    const prevContents = sanitizeText(prevLine.contents);
    const prevEndsWithPunctuation = /[.!?]$/.test(prevContents.trim());

    // Determine if this is a paragraph break based on multiple signals
    const isParagraphBreak = (
      // Large vertical gap (50% more than average)
      (gapRatio > 1.5) ||

      // Significant font size change (indicates heading or section change)
      (heightChange > 0.2) ||

      // Large indentation change (indicates new paragraph or column)
      (indentChange > 30) ||

      // Combination: Medium gap + ends with punctuation
      (gapRatio > 1.2 && prevEndsWithPunctuation) ||

      // Very large gap (definitely new paragraph)
      (gap > avgHeight * 1.5)
    );

    if (isParagraphBreak) {
      // Start new paragraph
      paragraphs.push(currentParagraph);

      currentParagraph = {
        lines: [currentLine],
        text: sanitizeText(currentLine.contents),
        bbox: {
          left: currentLine.left,
          top: currentLine.top,
          width: currentLine.width,
          height: currentLine.height,
        },
      };
    } else {
      // Add line to current paragraph
      currentParagraph.lines.push(currentLine);

      // Add space between lines unless previous line ends with hyphen
      const separator = prevContents.trim().endsWith('-') ? '' : ' ';
      currentParagraph.text += separator + sanitizeText(currentLine.contents);

      // Update bounding box to encompass all lines
      const minLeft = Math.min(currentParagraph.bbox.left, currentLine.left);
      const maxRight = Math.max(
        currentParagraph.bbox.left + currentParagraph.bbox.width,
        currentLine.left + currentLine.width
      );

      currentParagraph.bbox.left = minLeft;
      currentParagraph.bbox.width = maxRight - minLeft;
      currentParagraph.bbox.height =
        currentLine.top + currentLine.height - currentParagraph.bbox.top;
    }
  }

  // Add last paragraph
  paragraphs.push(currentParagraph);

  // Clean up and format paragraphs
  return paragraphs.map(p => ({
    text: p.text.trim(),
    bbox: p.bbox,
    lineCount: p.lines.length,
  }));
}

/**
 * Get JWT for a demo document
 * This assumes you have a document already uploaded to Document Engine
 */
app.get('/api/demo-jwt', (req, res) => {
  try {
    if (!privateKey) {
      return res.status(500).json({ error: 'JWT private key not configured' });
    }

    // Use a default document ID for demo purposes
    // Replace 'demo-document' with an actual document ID from your Document Engine
    const documentId = 'demo-document';
    const token = generateJWT(documentId);

    res.json({
      jwt: token,
      documentId,
      documentEngineUrl: process.env.DOCUMENT_ENGINE_URL,
      note: 'This is a demo JWT. Replace "demo-document" with a real document ID.',
    });
  } catch (error) {
    console.error('Error generating demo JWT:', error);
    res.status(500).json({ error: 'Failed to generate JWT' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📄 Document Engine URL: ${process.env.DOCUMENT_ENGINE_URL}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /api/jwt - Generate JWT for a document`);
  console.log(`  POST /api/documents/upload - Upload a document`);
  console.log(`  GET  /api/demo-jwt - Get a demo JWT\n`);
});
