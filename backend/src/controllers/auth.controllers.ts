import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma"
import { signJwt } from "../utils/jwt"

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Create user in Prisma
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // 4. Generate Token
    const token = signJwt({ userId: user.id, email: user.email });

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

    const token = signJwt({ userId: user.id, email: user.email });

    res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};