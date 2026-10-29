import { RunnableLambda } from "@langchain/core/runnables"
import config from "../config"
import {ChatOpenAI} from "@langchain/openai"
import type { BaseLanguageModelInput } from "@langchain/core/language_models/base"
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings"


const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

// fallback model set up
const fallbackChatModels = (config.openrouter_fallback_chat_models ?? "").split(",").map((model)=>model.trim()).filter(Boolean)


const openRouterChatModel = new ChatOpenAI({
    model: config.opernrouter_chat_model,
    apiKey: config.openrouter_api_key,
    temperature: 0.2,

    modelKwargs: {
        models: [config.opernrouter_chat_model, ...fallbackChatModels]
    },

    configuration:{
        baseURL: OPENROUTER_BASE_URL,
        defaultHeaders: {
            "HTTP-Referer": config.frontend_url ?? "http://localhost:3000",
            "X-Title": "PH Healtcare"
        }
    }
})

export const chatModel = RunnableLambda.from(
    async (input  : BaseLanguageModelInput, options) =>{
        try{
            return await openRouterChatModel.invoke(input, options)
        }catch(error){
            throw error instanceof TypeError ? new Error(`Openrouter returned no completion: ${error.message}`): error;
        }
    }
).withRetry({stopAfterAttempt: 3})


type TOpenRouterEmbeddingResponse = {
    data: {embedding: number[], index: number}[]
}

class OpenRouterEmbeddings extends Embeddings {
  private readonly model: string;
  private readonly apiKey: string;

  constructor(model: string, apiKey: string, params: EmbeddingsParams = {}){
    super(params);
    this.model = model;
    this.apiKey = apiKey;
  }

  private async embed(input: string[]):Promise<number[][]> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
            AUthorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: this.model,
            input,
            encoding_format: "float",
        }),
    })

    if(!response.ok){
        throw new Error(`OpenRouter embeddings failed: ${response.status} ${await response.text()}`)
    }

    const result = (await response.json()) as TOpenRouterEmbeddingResponse

    return result.data.sort((a,b)=> a.index - b.index).map((item)=> item.embedding)
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
      return this.caller.call(()=> this.embed(texts));
  }

  async embedQuery(text: string): Promise<number[]>{
    const [vector] = await this.caller.call(()=>this.embed([text]))
    return vector
  }

  
}

export const embeddings = new OpenRouterEmbeddings(
    config.openrouter_embedding_model,config.openrouter_api_key,{maxRetries: 3}
)