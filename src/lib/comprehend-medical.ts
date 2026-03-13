import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy",
});

export async function detectMedicalEntities(text: string): Promise<ComprehendMedicalEntity[]> {
  try {
    const prompt = `Extract all anatomical facts, body parts, and muscles from the following text.
Return the result strictly as a JSON object with a key "entities" containing an array of objects with this exact structure:
{
  "entities": [
    {
      "Id": 1,
      "Text": "trapezius",
      "Category": "ANATOMY",
      "Type": "SYSTEM_ORGAN_SITE",
      "Score": 0.99,
      "BeginOffset": 0,
      "EndOffset": 9
    }
  ]
}

Text: "${text}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{"entities": []}';
    let entities: any[] = [];
    
    try {
      const json = JSON.parse(content);
      entities = Array.isArray(json) ? json : (json.entities || json.Entities || []);
    } catch {
      entities = [];
    }
    
    return (entities as ComprehendMedicalEntity[]).filter(entity =>
      entity.Category === "ANATOMY" &&
      (
        entity.Type === "SYSTEM_ORGAN_SITE" ||
        entity.Text.toLowerCase().includes("muscle")
      )
    );
  } catch (error) {
    console.error("Error detecting medical entities via LLM:", error);
    return [];
  }
} 