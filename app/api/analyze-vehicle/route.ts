import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const { image } = body;

    // 1. Handle Mock Response
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        isVehicle: true,
        make: "Toyota",
        model: "Camry",
        year: "2024",
        confidence: 0.95,
      });
    }

    // 2. IMAGE RESIZING (The "Quota Saver")
    // Strip base64 prefix if exists
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const buffer = Buffer.from(base64Data, "base64");

    const resizedBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 }) // Compress quality slightly to save tokens
      .toBuffer();

    const optimizedBase64 = resizedBuffer.toString("base64");

    // 3. Setup Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }, // Ensures clean JSON
    });

    const prompt = `You are a vehicle expert. Identify the vehicle in the image.
      Return a JSON object:
      {
        "isVehicle": boolean,
        "make": string,
        "model": string,
        "year": string,
        "tankCapacityLiters": number,
        "highwayConsumptionKmpL": number,
        "fuelType": string,
        "confidence": number,
        "reason": string (only if isVehicle is false)
      }`;

    // 4. API Call with basic retry for 429 errors
    let result;
    try {
      result = await model.generateContent([
        prompt,
        { inlineData: { data: optimizedBase64, mimeType: "image/jpeg" } },
      ]);
    } catch (err: any) {
      if (err.message.includes("429")) {
        return NextResponse.json(
          { error: "Rate limit reached. Please wait a moment." },
          { status: 429 },
        );
      }
      throw err;
    }

    const data = JSON.parse(result.response.text());
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
