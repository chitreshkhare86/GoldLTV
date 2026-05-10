import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/kyc/verify", async (req, res) => {
    const { idType, idNumber, fullName } = req.body;

    if (!idNumber || !idType) {
      return res.status(400).json({ error: "ID Type and Number are required" });
    }

    if (!process.env.PROTEAN_CLIENT_ID || !process.env.PROTEAN_CLIENT_SECRET) {
      const isValid = idNumber.length >= 10;
      return res.json({ 
        success: isValid, 
        message: isValid ? "Verified successfully (Demo Mode)" : "Invalid ID format",
        demo: true 
      });
    }

    try {
      const authRes = await fetch("https://api.risewithprotean.io/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.PROTEAN_CLIENT_ID,
          client_secret: process.env.PROTEAN_CLIENT_SECRET,
          grant_type: "client_credentials"
        })
      });
      const authData = await authRes.json();

      if (!authData.access_token) throw new Error("Failed to get access token");

      const targetEndpoint = idType === "PAN" 
        ? "https://api.risewithprotean.io/kyc/pan/verify"
        : "https://api.risewithprotean.io/kyc/aadhaar/verify";

      const verifyRes = await fetch(targetEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authData.access_token}`,
          "Content-Type": "application/json",
          "x-api-key": process.env.PROTEAN_API_KEY || ""
        },
        body: JSON.stringify({ id_number: idNumber, full_name: fullName })
      });

      const verifyData = await verifyRes.json();
      res.json({ success: verifyData.status === "VALID", data: verifyData });

    } catch (error) {
      res.status(500).json({ error: "Verification service unavailable" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
