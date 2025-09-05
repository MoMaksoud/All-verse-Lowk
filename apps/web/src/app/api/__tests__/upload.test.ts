import { NextRequest } from 'next/server';
import { POST } from '../upload/route';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

// Mock crypto
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

describe('/api/upload', () => {
  describe('POST', () => {
    it('should upload a single image file', async () => {
      const formData = new FormData();
      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.urls).toHaveLength(1);
      expect(data.data.urls[0]).toBe('/uploads/test-uuid-123.jpg');
    });

    it('should upload multiple image files', async () => {
      const formData = new FormData();
      const file1 = new File(['test image 1'], 'test1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['test image 2'], 'test2.png', { type: 'image/png' });
      formData.append('files', file1);
      formData.append('files', file2);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.urls).toHaveLength(2);
      expect(data.data.urls[0]).toBe('/uploads/test-uuid-123.jpg');
      expect(data.data.urls[1]).toBe('/uploads/test-uuid-123.png');
    });

    it('should reject non-image files', async () => {
      const formData = new FormData();
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('Only image files are allowed');
    });

    it('should reject too many files', async () => {
      const formData = new FormData();
      for (let i = 0; i < 6; i++) {
        const file = new File(['test image'], `test${i}.jpg`, { type: 'image/jpeg' });
        formData.append('files', file);
      }

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('Maximum 5 files allowed');
    });

    it('should reject files that are too large', async () => {
      const formData = new FormData();
      // Create a large file (11MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      formData.append('files', file);

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(413);
      expect(data.error.code).toBe('TOO_LARGE');
      expect(data.error.message).toBe('File size must be less than 10MB');
    });

    it('should reject requests with no files', async () => {
      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('BAD_REQUEST');
      expect(data.error.message).toBe('No files provided');
    });
  });
});
