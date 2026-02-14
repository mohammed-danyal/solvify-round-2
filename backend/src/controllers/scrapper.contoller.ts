import { Request, Response } from "express";
import { useScrapper } from "../services/useScrapper";
//import {protect } from "../middlewares/auth.middlewares";
import prisma from "../lib/prisma";
export const useScrapperController = async (
    req: Request,
    res: Response
) => {
    try {
        const { prompt } = req.body;
        const url = req.url;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({
                success: false,
                message: "Prompt is required",
            });
        }

        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // This URL should probably be an environment variable or passed in the request
        const targetUrl = process.env.GANDALF_URL || "https://gandalf.lakera.ai/";
        const answer = await useScrapper({ url: targetUrl, prompt })

        await prisma.promptQuery.create({
            data: {
                userId,
                prompt,
                response: answer,
            }
        })

        return res.status(500).json({
            success: true,
            data: { answer }
        })
    } catch (error) {
        console.error(`[GandalfController] error for user ${(req as any).user?.userId}`, error)

        return res.status(500).json({
            success: false,
            message: "An internal error occured while processing your request"
        });
    }
}