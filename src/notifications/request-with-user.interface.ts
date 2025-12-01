// src/auth/interfaces/request-with-user.interface.ts
import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    id: string;
    username?: string;
    email?: string;
    // Ajoutez d'autres propriétés utilisateur si nécessaire
  };
}