import { Request, Response, NextFunction } from 'express';
import { clerkClient, requireAuth, getAuth } from '@clerk/express';
import { AuthUser } from '@sync/shared';
import * as usersService from '../services/users';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Middleware to require authentication
export const requireAuthentication = requireAuth();

// Middleware to attach user to request (after requireAuth)
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);

    if (!auth.userId) {
      return next();
    }

    // Get or create user in our database
    let user = await usersService.getUserByClerkId(auth.userId);

    if (!user) {
      // Fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(auth.userId);

      // Create user in our database
      user = await usersService.createUser({
        clerkId: auth.userId,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
          : clerkUser.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
        avatarUrl: clerkUser.imageUrl,
      });
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };

    next();
  } catch (error) {
    console.error('Error attaching user:', error);
    next(error);
  }
}

// Combined middleware for protected routes
export const protectedRoute = [requireAuthentication, attachUser];

// Optional auth - attaches user if authenticated but doesn't require it
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);

    if (auth.userId) {
      let user = await usersService.getUserByClerkId(auth.userId);

      if (user) {
        req.user = {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail on optional auth errors
    next();
  }
}
