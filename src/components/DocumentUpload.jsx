import { useState } from 'react';
import { API_URL } from '../config';

/**
 * Document Upload Component
 * Allows users to upload PDF files to Document Engine
 */
function DocumentUpload({ onDocumentUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('File size must be less than 50MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Upload to backend
      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      console.log('✓ Document uploaded successfully:', data);

      // Notify parent component
      if (onDocumentUploaded) {
        onDocumentUploaded(data);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'sans-serif',
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        padding: '30px',
        border: '2px dashed #ccc',
        borderRadius: '8px',
        background: '#f9f9f9',
      }}>
        <h2 style={{ marginTop: 0 }}>Upload PDF Document</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Select a PDF file to upload to Document Engine
        </p>

        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{ display: 'none' }}
          id="file-input"
        />

        <label
          htmlFor="file-input"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: uploading ? '#ccc' : '#007bff',
            color: 'white',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
          }}
        >
          {uploading ? 'Uploading...' : 'Choose PDF File'}
        </label>

        {error && (
          <div style={{
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          fontSize: '14px',
          color: '#666',
        }}>
          <p>Max file size: 50MB</p>
          <p>Supported format: PDF</p>
        </div>
      </div>
    </div>
  );
}

export default DocumentUpload;
