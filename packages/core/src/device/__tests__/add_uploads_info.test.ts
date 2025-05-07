import {
  addUploadsInfo,
  getUploadsInfo,
  clearUploadsInfo,
  cleanupUploadTracker
} from '../addUploadsInfo';

describe('Upload Info Management', () => {
  beforeEach(() => {
    clearUploadsInfo();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should add new upload info correctly', () => {
    const newUpload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'uploading' as const,
      totalSize: 1000,
      uploadedSize: 200,
      progress: 20,
    };

    const result = addUploadsInfo([newUpload]);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...newUpload,
      progress: 20, // (200/1000) * 100
    });
    expect(result[0].timeRemaining).toBeDefined();
  });

  it('should update existing upload info', () => {
    const initialUpload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'uploading' as const,
      totalSize: 1000,
      uploadedSize: 200,
      progress: 20,
    };

    addUploadsInfo([initialUpload]);

    const updatedUpload = {
      ...initialUpload,
      uploadedSize: 500,
      progress: 50,
    };

    const result = addUploadsInfo([updatedUpload]);
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...updatedUpload,
      progress: 50, // (500/1000) * 100
    });
  });

  it('should handle multiple uploads', () => {
    const uploads = [
      {
        filename: 'test1.txt',
        fileType: 'text/plain',
        status: 'uploading' as const,
        totalSize: 1000,
        uploadedSize: 200,
        progress: 20,
      },
      {
        filename: 'test2.txt',
        fileType: 'text/plain',
        status: 'uploading' as const,
        totalSize: 2000,
        uploadedSize: 1000,
        progress: 50,
      },
    ];

    const result = addUploadsInfo(uploads);
    
    expect(result).toHaveLength(2);
    expect(result[0].progress).toBe(20);
    expect(result[1].progress).toBe(50);
  });

  it('should calculate time remaining correctly', () => {
    jest.setSystemTime(new Date('2024-01-01T00:00:00'));
    
    const upload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'uploading' as const,
      totalSize: 1000,
      uploadedSize: 200,
      progress: 20,
    };

    addUploadsInfo([upload]);

    // Simulate progress after 1 second
    jest.advanceTimersByTime(1000);
    
    const updatedUpload = {
      ...upload,
      uploadedSize: 400,
      progress: 40,
    };

    const result = addUploadsInfo([updatedUpload]);
    
    expect(result[0].timeRemaining).toBeDefined();
    expect(typeof result[0].timeRemaining).toBe('number');
  });

  it('should not calculate time remaining for completed uploads', () => {
    const completedUpload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'completed' as const,
      totalSize: 1000,
      uploadedSize: 1000,
      progress: 100,
    };

    const result = addUploadsInfo([completedUpload]);
    
    expect(result[0].timeRemaining).toBeUndefined();
  });

  it('should cleanup upload tracker correctly', () => {
    const upload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'uploading' as const,
      totalSize: 1000,
      uploadedSize: 200,
      progress: 20,
    };

    addUploadsInfo([upload]);
    cleanupUploadTracker(upload.filename);

    // Add the same upload again - should calculate new time remaining
    const result = addUploadsInfo([upload]);
    
    expect(result[0].timeRemaining).toBeDefined();
  });

  it('should get current uploads info', () => {
    const upload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'uploading' as const,
      totalSize: 1000,
      uploadedSize: 200,
      progress: 20,
    };

    addUploadsInfo([upload]);
    const result = getUploadsInfo();
    
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...upload,
      progress: 20,
    });
  });

  it('should clear uploads info', () => {
    const upload = {
      filename: 'test.txt',
      fileType: 'text/plain',
      status: 'uploading' as const,
      totalSize: 1000,
      uploadedSize: 200,
      progress: 20,
    };

    addUploadsInfo([upload]);
    clearUploadsInfo();
    
    const result = getUploadsInfo();
    expect(result).toHaveLength(0);
  });
}); 
