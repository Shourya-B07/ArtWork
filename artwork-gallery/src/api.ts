import type { ArtworkApiResponse } from './types';

export async function fetchArtworks(pageNumber: number): Promise<ArtworkApiResponse> {
  try {
    const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${pageNumber}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: ArtworkApiResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching artworks:', error);
    throw error;
  }
}
