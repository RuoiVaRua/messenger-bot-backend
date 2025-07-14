const AWS = require('aws-sdk');
require('dotenv').config();

const s3Config = {
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000', // Default for Minio
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  s3ForcePathStyle: true, // Required for Minio
  signatureVersion: 'v4',
  region: process.env.S3_REGION || 'us-east-1', // Default region
};

const s3 = new AWS.S3(s3Config);

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'messenger-bot-attachments';

/**
 * Tải lên một file lên S3/Minio.
 * @param {string} key - Tên file trên S3/Minio.
 * @param {Buffer} body - Nội dung file dưới dạng Buffer.
 * @param {string} contentType - Loại nội dung của file (ví dụ: 'image/jpeg').
 * @returns {Promise<AWS.S3.ManagedUpload.SendData>} - Dữ liệu phản hồi từ S3/Minio.
 */
async function uploadFile(key, body, contentType) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  };

  try {
    const data = await s3.upload(params).promise();
    console.log(`File uploaded successfully: ${data.Location}`);
    return data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Lấy một file từ S3/Minio.
 * @param {string} key - Tên file trên S3/Minio.
 * @returns {Promise<AWS.S3.GetObjectOutput>} - Dữ liệu file từ S3/Minio.
 */
async function getFile(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const data = await s3.getObject(params).promise();
    console.log(`File retrieved successfully: ${key}`);
    return data;
  } catch (error) {
    console.error('Error retrieving file:', error);
    throw error;
  }
}

/**
 * Tạo một URL có chữ ký để truy cập file.
 * @param {string} key - Tên file trên S3/Minio.
 * @param {number} expires - Thời gian hết hạn của URL (tính bằng giây).
 * @returns {string} - URL có chữ ký.
 */
function getSignedUrl(key, expires = 3600) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expires,
  };
  try {
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

/**
 * Xóa một file từ S3/Minio.
 * @param {string} key - Tên file trên S3/Minio.
 * @returns {Promise<AWS.S3.DeleteObjectOutput>} - Dữ liệu phản hồi từ S3/Minio.
 */
async function deleteFile(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  try {
    const data = await s3.deleteObject(params).promise();
    console.log(`File deleted successfully: ${key}`);
    return data;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

module.exports = {
  uploadFile,
  getFile,
  getSignedUrl,
  deleteFile,
};