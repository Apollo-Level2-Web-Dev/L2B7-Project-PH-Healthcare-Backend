import { chatModel, embeddings } from "../lib/llm"


const main = async() =>{
    const vector = await embeddings.embedQuery("Cardiologist with 10 years of exprerience")

    console.log("Embedding Dimension:", vector.length)
    console.log("First 5 numbers:", vector.slice(0,5))

    const reply = await chatModel.invoke(
        "Say hello to PH Healthcare."
    )

    console.log("Chat reply: ", reply.content)

}

main().catch((error)=>{
    console.log(error)
    process.exit(1)
})