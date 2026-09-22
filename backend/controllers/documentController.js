import Document from '../models/Document.js';
import Flashcard from '../models/Flashcard.js';
import Quiz from '../models/Quiz.js';
import ChatHistory from '../models/ChatHistory.js';
import { extractTextFromPDF } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../uploads/documents');

// @desc    Upload PDF document
// @route   POST /api/documents/upload
// @access  Private
export const uploadDocument = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Please upload a PDF file',
                statusCode: 400
            });
        }

        const { title } = req.body;

        if (!title) {
            // Delete uploaded file if no title provided
            await fs.unlink(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Please provide a document title',
                statusCode: 400
            });
        }

        // Construct the URL for the uploaded file
        // const baseUrl = ` http://localhost: ${process.env.PORT || 8000}`;
        const fileUrl = `${process.env.BASE_URL}/uploads/documents/${req.file.filename}`;

        // Create document record
        const document = await Document.create({
            userId: req.user._id,
            title,
            fileName: req.file.originalname,
            filePath: fileUrl, // Store the URL instead of the local path
            fileSize: req.file.size,
            status: 'processing'
        });

        // Process PDF in background (in production, use a queue like Bull)
        processPDF(document._id, req.file.path).catch(err => {
            console.error('PDF processing error:', err);
        });

        res.status(201).json({
            success: true,
            data: document,
            message: 'Document uploaded successfully. Processing in progress...'
        });
    } catch (error) {
        // Clean up file on error
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }
        next(error);
    }
};

// Helper function to process PDF
const processPDF = async (documentId, filePath) => {
  try {
    const { extractedText } = await extractTextFromPDF(filePath);

    // Create chunks
    const chunks = chunkText(extractedText, 500, 50);

    // Update document
    await Document.findByIdAndUpdate(
      documentId,
      {
        extractedText,
        chunks,
        status: "ready",
      },
      {
        new: true,
        runValidators: true,
      }
    );
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);

    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
    });
  }
};

// @desc    Get all user documents
// @route   GET /api/documents
// @access  Private
export const getDocuments = async (req, res, next) => {
    try {
        const documents = await Document.aggregate([
            {
                $match: { userId: new mongoose.Types.ObjectId(req.user._id) }
            },
            {
                $lookup: {
                    from: 'flashcards',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'flashcardSets'
                }
            },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'documentId',
                    as: 'quizzes'
                }
            },
            {
                $addFields: {
                    flashcardCount: { $size: '$flashcardSets' },
                    quizCount: { $size: '$quizzes' }
                }
            },
            {
                $project: {
                    extractedText: 0,
                    chunks: 0,
                    flashcardSets: 0,
                    quizzes: 0
                }
            },
            {
                $sort: { uploadDate: -1 }
            }
        ]);
        res.status(200).json({
            success: true,
            count: documents.length,
            data: documents
        });
    } catch (error) {
        next(error);
    }
};


// @desc    Get single document with chunks
// @route   GET /api/documents/:id
// @access  Private
export const getDocument = async (req, res, next) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                statusCode: 404
            });
        }

        // Get counts of associated flashcards and quizzes
        const flashcardCount = await Flashcard.countDocuments({ documentId: document._id, userId: req.user._id });
        const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user._id });

        // Update last accessed
        document.lastAccessed = Date.now();
        await document.save();

        // Combine document data with counts
        const documentData = document.toObject();
        documentData.flashcardCount = flashcardCount;
        documentData.quizCount = quizCount;

        res.status(200).json({
            success: true,
            data: documentData
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete document and all associated data
// @route   DELETE /api/documents/:id
// @access  Private
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found',
        statusCode: 404
      });
    }

    // Count associated data before deletion for response
    const flashcardCount = await Flashcard.countDocuments({ documentId: document._id, userId: req.user._id });
    const quizCount = await Quiz.countDocuments({ documentId: document._id, userId: req.user._id });
    const chatHistoryCount = await ChatHistory.countDocuments({ documentId: document._id, userId: req.user._id });

    // Delete all associated flashcards
    await Flashcard.deleteMany({ documentId: document._id, userId: req.user._id });

    // Delete all associated quizzes
    await Quiz.deleteMany({ documentId: document._id, userId: req.user._id });

    // Delete all associated chat histories
    await ChatHistory.deleteMany({ documentId: document._id, userId: req.user._id });

    // Delete physical file from filesystem
    // Extract filename from the stored URL (format: BASE_URL/uploads/documents/filename)
    try {
      const url = new URL(document.filePath);
      const filename = path.basename(url.pathname);
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.unlink(filePath);
    } catch (fileError) {
      // Log but don't fail the deletion if file removal fails
      console.warn('Could not delete physical file:', fileError.message);
    }

    // Delete document
    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document and all associated data deleted successfully',
      deletedCounts: {
        flashcards: flashcardCount,
        quizzes: quizCount,
        chatHistories: chatHistoryCount
      }
    });
  } catch (error) {
    next(error);
  }
};