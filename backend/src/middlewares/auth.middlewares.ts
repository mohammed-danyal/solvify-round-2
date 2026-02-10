import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt"

export const protect = (req: any, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthenticated" });

    const decoded = verifyJwt(token);
    if (!decoded) return res.status(401).json({ message: "Invalid or expired token" });

    // Attach user info to the request object for use in the next function
    req.user = decoded; 
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};