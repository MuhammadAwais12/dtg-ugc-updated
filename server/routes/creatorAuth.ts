import { Router } from "express";
import {
  authenticateCreator,
  findCreatorByEmail,
  createCreator
} from "../notion.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { name, code } = req.body || {};

    if (!name || !name.trim() || !code || !code.trim()) {
      return res.status(400).json({
        isValid: false,
        error: "Name and Code are required"
      });
    }

    const creator = await authenticateCreator(code.trim(), name.trim());

    if (!creator) {
      return res.status(401).json({
        isValid: false,
        error: "Invalid name or code"
      });
    }

    return res.json({
      isValid: true,
      code: creator.code,
      name: creator.name,
      email: creator.email
    });
  } catch (error: any) {
    console.error("Error during creator login:", error);

    return res.status(500).json({
      isValid: false,
      error: error?.message || "Login failed, please try again"
    });
  }
});

// Signup: new creator provides Name + Email, gets an auto-assigned unique CR-Code
// and a new record created in Notion.
router.post("/signup", async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name || !name.trim() || !email || !email.trim()) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await findCreatorByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({
        error: "This email is already registered. Please log in with your existing CR-Code instead.",
        code: existing.code,
      });
    }

    const creator = await createCreator(name.trim(), normalizedEmail);
    res.status(201).json({ name: creator.name, email: creator.email, code: creator.code });
  } catch (error: any) {
    console.error("Error during creator signup:", error);
    res.status(500).json({ error: error?.message || "Signup failed, please try again" });
  }
});

export default router;
