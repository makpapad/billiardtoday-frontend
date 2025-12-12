// Debug utility for testing Strapi authentication
export const debugAuth = {
  testConnection: async () => {
    const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    console.log('Testing Strapi connection to:', STRAPI_URL);
    
    try {
      const response = await fetch(`${STRAPI_URL}/api/admin/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: 'test',
          password: 'test'
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const text = await response.text();
      console.log('Response body:', text);
      
      return {
        status: response.status,
        ok: response.ok,
        body: text
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { error: errorMessage };
    }
  }
};
