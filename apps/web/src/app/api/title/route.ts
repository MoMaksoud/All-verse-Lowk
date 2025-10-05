import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { GenerateTitleRequest, GenerateTitleResponse } from '@/types/chat';

// POST /api/title - Generate a conversation title
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GenerateTitleRequest = await request.json();
    const { firstMessage } = body;

    if (!firstMessage || !firstMessage.trim()) {
      return NextResponse.json({ error: 'First message is required' }, { status: 400 });
    }

    // Simple title generation based on first message
    // TODO: Replace with real LLM service (OpenAI, Anthropic, etc.)
    let title = firstMessage.trim();
    
    // If message is too long, truncate and add ellipsis
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }
    
    // If message is too short, add a prefix
    if (title.length < 10) {
      title = `Chat: ${title}`;
    }
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const response: GenerateTitleResponse = {
      title
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating title:', error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}

// Real LLM title generation (to be implemented)
async function generateTitleWithLLM(firstMessage: string): Promise<string> {
  // TODO: Implement with OpenAI, Anthropic, or other LLM provider
  // Example with OpenAI:
  // const response = await openai.chat.completions.create({
  //   model: "gpt-3.5-turbo",
  //   messages: [
  //     { role: "system", content: "Generate a short, descriptive title for this conversation starter. Keep it under 50 characters." },
  //     { role: "user", content: firstMessage }
  //   ],
  //   max_tokens: 20
  // });
  // return response.choices[0].message.content || 'New Chat';
  
  throw new Error('LLM title generation not implemented yet');
}
