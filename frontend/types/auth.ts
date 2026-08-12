export interface LoginCredentials { email: string; password: string }
export interface SignupData extends LoginCredentials { fullName: string; college: string; year: string; branch?: string }
export interface AuthError { code: string; message: string }
