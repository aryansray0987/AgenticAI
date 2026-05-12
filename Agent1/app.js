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

//fetchTextFromUrl tool calling...........................................
const fetchTextFromUrl = tool(
    async ({ url }) => {
        console.log(url)
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

const fetchJsonFromUrl = tool(
    async ({ url }) => {
        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                return `Fetch failed: HTTP ${resp.status} ${resp.statusText}`;
            }
            const data = await resp.json();
            return JSON.stringify(data, null, 2);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return `Fetch failed: ${msg}`;
        }
    },
    {
        name: "fetch_json_from_url",
        description: "Fetch JSON data from a REST API endpoint and return it as formatted JSON",
        schema: z.object({
            url: z.url()
        })
    }
)



const agent = createAgent({
  model: "openai:google/gemini-2.5-flash-lite",
  tools: [getWeather, fetchTextFromUrl, fetchJsonFromUrl],
  systemPrompt: 'You are a helpful assistant. You can answer general questions using your own knowledge. Only use tools when the user explicitly asks for weather data, fetching a URL, or fetching JSON from an API. For all other questions, respond directly without using any tools. Do NOT call any tool unless the user\'s request specifically requires it.'
});


const response =   await agent.invoke({
    messages: [{ role: "user", content: "what is the weather in Gorakhpur"}],
})

console.log(response.messages[response.messages.length-1].content)


