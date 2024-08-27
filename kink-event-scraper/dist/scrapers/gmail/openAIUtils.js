import OpenAI from "openai";
const openai = new OpenAI();
export async function extractEventDetailsFromEmail(emailText) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbkFJVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvc2NyYXBlcnMvZ21haWwvb3BlbkFJVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7QUFHNUIsTUFBTSxDQUFDLEtBQUssVUFBVSw0QkFBNEIsQ0FDaEQsU0FBaUI7SUFFakIsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sWUFBWSxHQUFHOzs7Ozs7Ozs7Ozs7Ozs7TUFlakIsQ0FBQztJQUVMLE1BQU0sV0FBVyxHQUFHLHNHQUFzRyxZQUFZOzs7OztLQUtuSSxDQUFDO0lBQ0osTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDO0lBRXpCLE1BQU0sVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO1FBQ3RELEtBQUssRUFBRSxhQUFhO1FBQ3BCLFFBQVEsRUFBRTtZQUNSO2dCQUNFLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSxXQUFXO2FBQ3JCO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLE1BQU07Z0JBQ1osT0FBTyxFQUFFLE1BQU07YUFDaEI7U0FDRjtRQUVELGVBQWUsRUFBRTtZQUNmLElBQUksRUFBRSxhQUFhO1NBQ3BCO1FBQ0QsV0FBVyxFQUFFLENBQUM7S0FDZixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDN0MsT0FBTztJQUNULENBQUM7SUFFRCxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDcEMsQ0FBQyJ9