import 'dotenv/config'
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  async (input) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return "Error: OPENWEATHER_API_KEY is not set";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(input.city)}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return `Error: Failed to fetch weather (HTTP ${res.status})`;
    const data = await res.json();
    return `Weather in ${data.name}: ${data.main.temp}°C, ${data.weather[0].description}. Humidity: ${data.main.humidity}%, Wind: ${data.wind.speed} m/s`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city using OpenWeatherMap API",
    schema: z.object({
      city: z.string().describe("The city to get the weather for"),
    }),
  }

);



const fetchTextFromUrl = tool(
    async ({ url }) => {
        const controller = new AbortController(); //  For aborting the fetch request 
        const timeoutId = setTimeout(() => controller.abort(), 120000);
        try {
            const resp = await fetch(url, {
                headers: {
                "User-Agent": "Mozilla/5.0 (compatible; quickstart-research/1.0)",
                },
                signal: controller.signal,// connecting the AbortController with fetch so that if timeout then fetch call is rejected 
            });
            if (!resp.ok) {
                return `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;
            }
            return await resp.text();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return `Fetch failed: ${msg}`;
        } finally {
            clearTimeout(timeoutId);
        }
    },
    {
        name:"fetch_text_from_url",
        description:"Fetch the document from the URL",
        schema:z.object({
            url:z.url()
        })
    }
)

const agent = createAgent({
  model: "google-genai:gemini-2.5-flash-lite",
  tools: [getWeather , fetchTextFromUrl],
});


  const result = await agent.invoke({
    messages: [{ role: "user", content: "Fetch the content from https://something.com" }],
  });
//   console.log(result.messages)
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(lastMessage.content);
