import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

/**
 * Text Extraction Component
 * Displays extracted text from PDF documents as plain text with paragraphs
 */
function TextExtraction({ documentId, onExtractionComplete }) {
  const [extractedText, setExtractedText] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(0);

  // Reset state when documentId changes
  useEffect(() => {
    setExtractedText(null);
    setError(null);
    setSelectedPage(0);
    setLoading(false);
  }, [documentId]);

  const handleExtract = async () => {
    if (!documentId) {
      setError('No document ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/documents/${documentId}/extract`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'english' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Extraction failed');
      }

      const data = await response.json();
      setExtractedText(data.extractedText);
      setSelectedPage(0);
      console.log('✓ Text extracted successfully:', data);

      // Call callback with extracted data
      if (onExtractionComplete) {
        onExtractionComplete(data);
      }
    } catch (err) {
      console.error('Extraction error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!documentId) {
    return (
      <div style={styles.container}>
        <p style={styles.message}>No document loaded. Upload a document first.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <strong>Error:</strong> {error}
        </div>
        <button onClick={handleExtract} style={styles.button}>
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Extracting text from document...</p>
        </div>
      </div>
    );
  }

  if (!extractedText) {
    return (
      <div style={styles.container}>
        <div style={styles.intro}>
          <h2>Extract Text</h2>
          <p>Extract plain text from this PDF document.</p>
          <button onClick={handleExtract} style={styles.button}>
            Extract Text
          </button>
        </div>
      </div>
    );
  }

  const currentPage = extractedText.pages[selectedPage];

  return (
    <div style={styles.container}>
      {/* Header with page navigation */}
      <div style={styles.header}>
        <h2 style={styles.title}>Extracted Text</h2>
        <div style={styles.pageNav}>
          <button
            onClick={() => setSelectedPage(Math.max(0, selectedPage - 1))}
            disabled={selectedPage === 0}
            style={{
              ...styles.navButton,
              ...(selectedPage === 0 ? styles.navButtonDisabled : {}),
            }}
          >
            ← Previous
          </button>
          <span style={styles.pageInfo}>
            Page {selectedPage + 1} of {extractedText.pages.length}
          </span>
          <button
            onClick={() =>
              setSelectedPage(Math.min(extractedText.pages.length - 1, selectedPage + 1))
            }
            disabled={selectedPage === extractedText.pages.length - 1}
            style={{
              ...styles.navButton,
              ...(selectedPage === extractedText.pages.length - 1 ? styles.navButtonDisabled : {}),
            }}
          >
            Next →
          </button>
        </div>
        <button onClick={handleExtract} style={styles.refreshButton}>
          Re-extract
        </button>
      </div>

      {/* Extracted text content */}
      <div style={styles.content}>
        <pre style={styles.plainText}>{currentPage.plainText || 'No text found on this page.'}</pre>
      </div>

      {/* Statistics */}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Total Pages:</span>
          <span style={styles.statValue}>{extractedText.pages.length}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Paragraphs:</span>
          <span style={styles.statValue}>{currentPage.paragraphs?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '100%',
    height: '100%',
    overflowY: 'auto',
    fontFamily: 'sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  message: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '16px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '48px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  intro: {
    textAlign: 'center',
    padding: '48px 24px',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  pageNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  navButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  refreshButton: {
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    overflowY: 'auto',
    marginBottom: '16px',
  },
  plainText: {
    fontFamily: 'monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
    margin: 0,
    color: '#1f2937',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
};

export default TextExtraction;