import { useEffect, useRef, useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import TextExtraction from './components/TextExtraction';

/**
 * Nutrient Web SDK with Document Engine integration
 *
 * This component demonstrates:
 * 1. Uploading documents to Document Engine
 * 2. Fetching JWT from the backend
 * 3. Loading documents with Instant sync for real-time collaboration
 */
function App() {
  const containerRef = useRef(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [instance, setInstance] = useState(null);

  // Load document in the viewer
  const loadDocument = async (documentData) => {
    const container = containerRef.current;

    if (!container || !window.NutrientViewer) {
      console.error('Viewer container not ready');
      return;
    }

    try {
      // Unload previous document if exists
      if (instance) {
        await window.NutrientViewer.unload(container);
        setInstance(null);
      }

      // Clear any leftover content in the container
      container.innerHTML = '';

      const { jwt, documentId, documentEngineUrl } = documentData;

      // Load the document with Document Engine
      const loadedInstance = await window.NutrientViewer.load({
        container,
        documentId,
        serverUrl: documentEngineUrl+'/',
        authPayload: { jwt },
        instant: true, // Enable real-time collaboration

        // Optional: Configure auto-save behavior
        autoSaveMode: window.NutrientViewer.AutoSaveMode.INTELLIGENT,
      });

      setInstance(loadedInstance);
      setCurrentDocument(documentData);

      console.log('✓ Document loaded successfully:', documentId);
    } catch (err) {
      console.error('Failed to load document:', err);
      // Don't set error state - just log to console
    }
  };

  // Handle document upload
  const handleDocumentUploaded = (uploadedDocument) => {
    console.log('Document uploaded, setting current document:', uploadedDocument);
    setCurrentDocument(uploadedDocument);
  };

  // Handle extraction complete - log the original JSON data
  const handleExtractionComplete = (extractionData) => {
    console.log('=== ORIGINAL EXTRACTED DATA (JSON) ===');
    console.log(JSON.stringify(extractionData, null, 2));
    console.log('======================================');
  };

  // Load document when currentDocument changes and container is ready
  useEffect(() => {
    const container = containerRef.current;

    if (currentDocument && container && window.NutrientViewer) {
      loadDocument(currentDocument);
    }

    // Cleanup: unload when component unmounts or document changes
    return () => {
      if (instance && container) {
        window.NutrientViewer.unload(container).catch(err => {
          console.error('Error unloading viewer:', err);
        });
      }
    };
  }, [currentDocument]);

  // Always show all elements in DOM
  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar - always visible */}
      <div style={{
        padding: '10px 20px',
        background: '#fff',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {currentDocument ? (
            <>
              <span style={{ fontWeight: 'bold' }}>Current Document:</span>
              <span>{currentDocument.filename}</span>
              <div style={{ flexBasis: '100%', height: 0 }}></div>
              <span style={{
                fontSize: '12px',
                color: '#666',
                padding: '4px 8px',
                background: '#f0f0f0',
                borderRadius: '4px',
                fontFamily: 'monospace'
              }}>
                {currentDocument.documentId}
              </span>
            </>
          ) : (
            <span style={{ fontWeight: 'bold' }}>No document loaded</span>
          )}
        </div>

        <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
      </div>

      {/* Content Area - PDF Viewer and Text Extraction side by side - always in DOM */}
      <div style={{ flex: 1, display: 'flex', width: '100%', minHeight: 0, overflow: 'hidden' }}>
        {/* PDF Viewer - Left Side */}
        <div
          ref={containerRef}
          style={{ width: '50%', height: '100%', borderRight: '1px solid #ddd', background: '#f5f5f5' }}
        >
          {!currentDocument && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontFamily: 'sans-serif',
              color: '#666',
              fontSize: '14px'
            }}>
              Upload a PDF to view it here
            </div>
          )}
        </div>

        {/* Text Extraction - Right Side */}
        <div style={{ width: '50%', height: '100%', overflow: 'auto', background: '#fafafa' }}>
          {currentDocument ? (
            <TextExtraction
              documentId={currentDocument.documentId}
              onExtractionComplete={handleExtractionComplete}
            />
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              fontFamily: 'sans-serif',
              color: '#666',
              fontSize: '14px'
            }}>
              Extracted text will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
