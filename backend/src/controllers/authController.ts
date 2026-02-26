import { Request, Response, NextFunction } from 'express';
import AuthService, { AuthError } from '../services/authService';
import { registerSchema, formatZodErrors, RegisterInput } from '../utils/validation';

export class AuthController {
  /**
   * POST /api/v1/auth/register
   * Register a new user
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate input
      const validationResult = registerSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: formatZodErrors(validationResult.error),
          },
        });
        return;
      }

      const data: RegisterInput = validationResult.data;

      // Register user
      const result = await AuthService.register(data);

      // Return success response
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          session: result.session,
        },
        message: 'Registration successful. Please check your email to verify your account.',
      });
    } catch (error) {
      // Handle known auth errors
      const authError = error as AuthError;
      if (authError.code && authError.statusCode) {
        res.status(authError.statusCode).json({
          success: false,
          error: {
            code: authError.code,
            message: authError.message,
          },
        });
        return;
      }

      // Pass unknown errors to error handler
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/login
   * Login user (placeholder for future implementation)
   */
  static async login(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Login endpoint coming soon',
      },
    });
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token (placeholder for future implementation)
   */
  static async refresh(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Token refresh endpoint coming soon',
      },
    });
  }

  /**
   * POST /api/v1/auth/logout
   * Logout user (placeholder for future implementation)
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Logout endpoint coming soon',
      },
    });
  }

  /**
   * POST /api/v1/auth/verify-email
   * Verify email address (placeholder for future implementation)
   */
  static async verifyEmail(_req: Request, res: Response): Promise<void> {
    res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Email verification endpoint coming soon',
      },
    });
  }
}

export default AuthController;
