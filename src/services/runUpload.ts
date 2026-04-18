import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';

/**
 * Upload a run media file (images, videos, etc.) to the workout-media bucket
 * Files are organized by userId for security (RLS policies enforce this)
 * 
 * @param userId - The authenticated user's ID
 * @param file - Base64 string or file data to upload
 * @param fileName - Name of the file (e.g., 'run-photo.png')
 * @param contentType - MIME type (default: 'image/png')
 * @returns Public URL of the uploaded file
 */
export const uploadRunMedia = async (
  userId: string,
  file: string,
  fileName: string,
  contentType: string = 'image/png'
): Promise<string> => {
  try {
    console.log(`📤 Starting media upload: ${fileName} (${contentType})`);
    console.log(`👤 User ID: ${userId}, File size: ${file.length} bytes`);
    
    const filePath = `${userId}/${new Date().getTime()}-${fileName}`;
    console.log(`📁 File path: ${filePath}`);

    const decodedFile = decode(file);
    console.log(`✅ Base64 decoded successfully: ${decodedFile.byteLength} bytes`);

    const { data, error } = await supabase.storage
      .from('workout-media')
      .upload(filePath, decodedFile, { contentType });

    if (error) {
      console.error(`❌ Upload error for ${fileName}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log(`✅ File uploaded successfully: ${filePath}`);

    const { data: { publicUrl } } = supabase.storage
      .from('workout-media')
      .getPublicUrl(filePath);

    console.log(`🔗 Public URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('❌ Error uploading run media:', error);
    throw error;
  }
};

/**
 * Upload a map snapshot to the map-snapshots bucket
 * Files are organized by userId for security (RLS policies enforce this)
 * 
 * @param userId - The authenticated user's ID
 * @param file - Base64 string or file data to upload
 * @param fileName - Name of the file (e.g., 'route-map.png')
 * @param contentType - MIME type (default: 'image/png')
 * @returns Public URL of the uploaded file
 */
export const uploadMapSnapshot = async (
  userId: string,
  file: string,
  fileName: string,
  contentType: string = 'image/png'
): Promise<string> => {
  try {
    const filePath = `${userId}/${new Date().getTime()}-${fileName}`;
    const decodedFile = decode(file);

    const { error } = await supabase.storage
      .from('map-snapshots')
      .upload(filePath, decodedFile, { contentType });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('map-snapshots')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading map snapshot:', error);
    throw error;
  }
};

export const snapRouteToRoads = async (coords: { latitude: number; longitude: number }[]): Promise<any> => {
  const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (!MAPBOX_TOKEN) {
    throw new Error('Mapbox token is not configured');
  }

  const coordinates = coords.map(c => `${c.longitude},${c.latitude}`).join(';');
  const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coordinates}?access_token=${MAPBOX_TOKEN}&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.code !== 'Ok') {
      throw new Error(`Mapbox Matching API error: ${data.message}`);
    }
    return data.matchings[0].geometry;
  } catch (error) {
    console.error('Error snapping route to roads:', error);
    throw error;
  }
};

/**
 * Delete a file from the workout-media bucket
 * 
 * @param userId - The authenticated user's ID
 * @param fileName - Name of the file to delete
 */
export const deleteRunMedia = async (
  userId: string,
  fileName: string
): Promise<void> => {
  try {
    const filePath = `${userId}/${fileName}`;
    const { error } = await supabase.storage
      .from('workout-media')
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting run media:', error);
    throw error;
  }
};

/**
 * Delete a file from the map-snapshots bucket
 * 
 * @param userId - The authenticated user's ID
 * @param fileName - Name of the file to delete
 */
export const deleteMapSnapshot = async (
  userId: string,
  fileName: string
): Promise<void> => {
  try {
    const filePath = `${userId}/${fileName}`;
    const { error } = await supabase.storage
      .from('map-snapshots')
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting map snapshot:', error);
    throw error;
  }
};
