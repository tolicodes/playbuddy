import OpenAI from "openai";

const openai = new OpenAI();

// Use OpenAI to extract event details from the email content.
export async function extractEventDetailsFromEmail(
  emailText: string,
): Promise<void> {
  console.time("OpenAI Request");
  const EVENT_FORMAT = `{
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        location: string;
        price: string;
        imageUrl: string;
        organizer: string;
        organizerUrl: string;
        eventUrl: string;
        summary: string;
        tags: string[];
        min_ticket_price: string;
        max_ticket_price: string;
    }`;

  const modelPrompt = `Extract the event details in JSON from the following email. Use JSON format as shown below:\n\n' + ${EVENT_FORMAT}.
    - Summary should be the full content of the description in the email.
    - start_date and end_date should be in iso
    - price should be a number
    - tags should be play party, workshop, bdsm, ropes, etc.
    `;
  const prompt = emailText;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: modelPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],

    response_format: {
      type: "json_object",
    },
    temperature: 0,
  });

  if (!completion.choices[0]?.message?.content) {
    return;
  }

  console.timeEnd("OpenAI Request");
}
