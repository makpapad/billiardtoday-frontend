export interface StrapiAuthResponse {
  jwt: string;
  user: {
    id: number;
    email: string;
    username: string;
    firstname: string;
    lastname: string;
  };
}

interface LoginCredentials {
  identifier: string; // email or username
  password: string;
}

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

export class StrapiAuth {
  private static instance: StrapiAuth;
  private jwt: string | null = null;
  private user: StrapiAuthResponse['user'] | null = null;

  private constructor() {
    // Load from localStorage on init
    if (typeof window !== 'undefined') {
      this.jwt = localStorage.getItem('strapi_jwt');
      const userStr = localStorage.getItem('strapi_user');
      if (userStr) {
        this.user = JSON.parse(userStr);
      }
    }
  }

  static getInstance(): StrapiAuth {
    if (!StrapiAuth.instance) {
      StrapiAuth.instance = new StrapiAuth();
    }
    return StrapiAuth.instance;
  }

  async login(credentials: LoginCredentials): Promise<StrapiAuthResponse> {
    try {
      const response = await fetch(`${STRAPI_URL}/api/admin/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Strapi login response:', errorData);
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }

      const data: StrapiAuthResponse = await response.json();
      
      this.jwt = data.jwt;
      this.user = data.user;

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('strapi_jwt', data.jwt);
        localStorage.setItem('strapi_user', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Strapi login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.jwt = null;
    this.user = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('strapi_jwt');
      localStorage.removeItem('strapi_user');
    }
  }

  isAuthenticated(): boolean {
    return !!this.jwt && !!this.user;
  }

  getJwt(): string | null {
    return this.jwt;
  }

  getUser(): StrapiAuthResponse['user'] | null {
    return this.user;
  }

  async refreshToken(): Promise<boolean> {
    // Implement refresh token logic if needed
    return false;
  }
}

export const strapiAuth = StrapiAuth.getInstance();
