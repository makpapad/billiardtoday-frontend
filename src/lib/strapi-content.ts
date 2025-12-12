import { strapiAuth } from './strapi-auth';

interface LandingContent {
  id?: number;
  key: string;
  content: string;
  page: string;
  component: string;
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export class StrapiContentService {
  private static instance: StrapiContentService;

  private constructor() {}

  static getInstance(): StrapiContentService {
    if (!StrapiContentService.instance) {
      StrapiContentService.instance = new StrapiContentService();
    }
    return StrapiContentService.instance;
  }

  async saveContent(key: string, content: string, page: string = 'landing', component: string = 'general'): Promise<LandingContent> {
    const jwt = strapiAuth.getJwt();
    if (!jwt) {
      throw new Error('Not authenticated');
    }

    try {
      // First try to find existing content
      const existing = await this.getContent(key);
      
      if (existing) {
        // Update existing content
        const response = await fetch(`${STRAPI_URL}/api/landing-contents/${existing.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            data: {
              content,
              page,
              component,
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to update content: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
      } else {
        // Create new content
        const response = await fetch(`${STRAPI_URL}/api/landing-contents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            data: {
              key,
              content,
              page,
              component,
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create content: ${response.status}`);
        }

        const result = await response.json();
        return result.data;
      }
    } catch (error) {
      console.error('Error saving content to Strapi:', error);
      throw error;
    }
  }

  async getContent(key: string): Promise<LandingContent | null> {
    const jwt = strapiAuth.getJwt();
    
    try {
      const response = await fetch(`${STRAPI_URL}/api/landing-contents?filters[key][$eq]=${key}`, {
        headers: {
          'Authorization': jwt ? `Bearer ${jwt}` : '',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Try without auth for public content
          const publicResponse = await fetch(`${STRAPI_URL}/api/landing-contents?filters[key][$eq]=${key}`);
          if (publicResponse.ok) {
            const result = await publicResponse.json();
            return result.data?.[0] || null;
          }
        }
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const result = await response.json();
      return result.data?.[0] || null;
    } catch (error) {
      console.error('Error fetching content from Strapi:', error);
      return null;
    }
  }

  async getAllContent(page: string = 'landing'): Promise<LandingContent[]> {
    const jwt = strapiAuth.getJwt();
    
    try {
      const response = await fetch(`${STRAPI_URL}/api/landing-contents?filters[page][$eq]=${page}`, {
        headers: {
          'Authorization': jwt ? `Bearer ${jwt}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching content from Strapi:', error);
      return [];
    }
  }
}

export const strapiContent = StrapiContentService.getInstance();
